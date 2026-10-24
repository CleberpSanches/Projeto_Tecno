import { supabase, ApiError, traduzirErroBanco } from "../database.js";
import {
    obterSalaPorId,
    membrosDaSala,
} from "../services/permissoes.js";

const STATUS_VALIDOS = ["pendente", "em_andamento", "concluida"];
const PRIORIDADES_VALIDAS = ["baixa", "media", "alta"];

function validarDataPrazo(valor) {
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [ano, mes, dia] = valor.split("-").map(Number);
    const calendario = new Date(Date.UTC(ano, mes - 1, dia));
    return (
        calendario.getUTCFullYear() === ano &&
        calendario.getUTCMonth() === mes - 1 &&
        calendario.getUTCDate() === dia
    );
}

// Garante acesso ao usuário e devolve a tarefa (ou responde erro). Observador só lê se exigirEdicao=false.
async function carregarTarefaAcessivel(idTarefa, idUsuario, exigirEdicao = false) {
    if (!Number.isInteger(idTarefa) || idTarefa <= 0) {
        throw new ApiError(400, "O ID da tarefa é inválido.");
    }

    const { data: tarefa, error } = await supabase
        .from("tarefa")
        .select("id, id_sala, titulo, status, prioridade, prazo, id_criador")
        .eq("id", idTarefa)
        .maybeSingle();

    if (error) throw traduzirErroBanco(error);
    if (!tarefa) throw new ApiError(404, "Tarefa não encontrada.");

    const { data: vinculo, error: erroVinculo } = await supabase
        .from("sala_usuario")
        .select("papel")
        .eq("id_sala", tarefa.id_sala)
        .eq("id_usuario", Number(idUsuario))
        .maybeSingle();

    if (erroVinculo) throw traduzirErroBanco(erroVinculo);
    if (!vinculo) throw new ApiError(403, "Você não participa da sala desta tarefa.");
    if (exigirEdicao && vinculo.papel === "observador") {
        throw new ApiError(403, "Seu papel nesta sala permite apenas leitura.");
    }

    return { tarefa, papel: vinculo.papel };
}

async function usuariosResponsaveis(idTarefa) {
    const { data, error } = await supabase
        .from("usuario_tarefa")
        .select("id_usuario")
        .eq("id_tarefa", idTarefa)
        .order("id_usuario");

    if (error) throw traduzirErroBanco(error);
    return data.map((r) => r.id_usuario);
}

async function substituirResponsaveis(idTarefa, idsResponsaveis) {
    const { error: erroRemocao } = await supabase
        .from("usuario_tarefa")
        .delete()
        .eq("id_tarefa", idTarefa);
    if (erroRemocao) throw traduzirErroBanco(erroRemocao);

    if (idsResponsaveis.length > 0) {
        const { error: erroInsercao } = await supabase
            .from("usuario_tarefa")
            .insert(idsResponsaveis.map((idUsuario) => ({ id_tarefa: idTarefa, id_usuario: idUsuario })));
        if (erroInsercao) throw traduzirErroBanco(erroInsercao);
    }
}

async function validarIdsResponsaveis(ids, idSala) {
    // Todos os IDs devem ser inteiros positivos e membros da sala.
    if (!ids.every((id) => Number.isInteger(id) && id > 0)) {
        throw new ApiError(400, "Todos os responsáveis devem ser IDs de usuários válidos.");
    }
    if (ids.length > 0) {
        const membros = await membrosDaSala(idSala);
        const membrosSet = new Set(membros);
        const estrangeiros = ids.filter((id) => !membrosSet.has(id));
        if (estrangeiros.length > 0) {
            throw new ApiError(400, "Todos os responsáveis devem ser membros da sala.");
        }
    }
}

// GET /tarefas — lista tarefas das salas em que o usuário participa, com filtros opcionais:
// ?id_sala=&status=&prioridade=&responsavel_id=&prazo_vencido=true&q=
export async function listarTarefas(req, res) {
    try {
        const idUsuario = Number(req.usuario.id);

        // Salas do usuário: base de acesso.
        const { data: vinculos, error: erroVinculos } = await supabase
            .from("sala_usuario")
            .select("id_sala")
            .eq("id_usuario", idUsuario);
        if (erroVinculos) throw traduzirErroBanco(erroVinculos);
        if (vinculos.length === 0) return res.status(200).json([]);

        let consulta = supabase
            .from("tarefa")
            .select("id, id_sala, titulo, status, prioridade, prazo, id_criador, sala:sala(id, nome), usuario_tarefa(id_usuario)")
            .in("id_sala", vinculos.map((v) => v.id_sala))
            .order("id");

        const filtros = req.query ?? {};

        if (filtros.id_sala !== undefined) {
            const idSala = Number(filtros.id_sala);
            if (!Number.isInteger(idSala) || idSala <= 0) {
                return res.status(400).json({ erro: "O parâmetro id_sala deve ser um inteiro positivo." });
            }
            if (!vinculos.some((v) => v.id_sala === idSala)) {
                return res.status(403).json({ erro: "Você não participa desta sala." });
            }
            consulta = consulta.eq("id_sala", idSala);
        }
        if (filtros.status !== undefined && String(filtros.status).trim()) {
            const status = String(filtros.status).trim().toLowerCase();
            if (!STATUS_VALIDOS.includes(status)) {
                return res.status(400).json({ erro: "O parâmetro status deve ser pendente, em_andamento ou concluida." });
            }
            consulta = consulta.eq("status", status);
        }
        if (filtros.prioridade !== undefined && String(filtros.prioridade).trim()) {
            const prioridade = String(filtros.prioridade).trim().toLowerCase();
            if (!PRIORIDADES_VALIDAS.includes(prioridade)) {
                return res.status(400).json({ erro: "O parâmetro prioridade deve ser baixa, media ou alta." });
            }
            consulta = consulta.eq("prioridade", prioridade);
        }
        if (filtros.q !== undefined && String(filtros.q).trim()) {
            // Escape de %, _ e * no pattern ILIKE.
            const padrao = "%" + String(filtros.q).trim().replace(/[%_\\]/g, "\\$&") + "%";
            consulta = consulta.ilike("titulo", padrao);
        }
        if (filtros.responsavel_id !== undefined) {
            const responsavelId = Number(filtros.responsavel_id);
            if (!Number.isInteger(responsavelId) || responsavelId <= 0) {
                return res.status(400).json({ erro: "O parâmetro responsavel_id deve ser um inteiro positivo." });
            }
            // Seleciona somente tarefas com esse responsável vinculado.
            const { data: vinculados, error: erroResponsavel } = await supabase
                .from("usuario_tarefa")
                .select("id_tarefa")
                .eq("id_usuario", responsavelId);
            if (erroResponsavel) throw traduzirErroBanco(erroResponsavel);
            const idsDasResponsaveis = vinculados.map((r) => r.id_tarefa);
            if (idsDasResponsaveis.length === 0) return res.status(200).json([]);
            consulta = consulta.in("id", idsDasResponsaveis);
        }
        if (filtros.prazo_vencido === "true") {
            const hoje = new Date().toISOString().slice(0, 10);
            consulta = consulta.lt("prazo", hoje).neq("status", "concluida").not("prazo", "is", null);
        }

        const { data: tarefas, error } = await consulta;
        if (error) throw traduzirErroBanco(error);

        const resultado = tarefas.map((tarefa) => ({
            id: tarefa.id,
            id_sala: tarefa.id_sala,
            titulo: tarefa.titulo,
            status: tarefa.status,
            prioridade: tarefa.prioridade,
            prazo: tarefa.prazo,
            id_criador: tarefa.id_criador,
            sala: tarefa.sala,
            responsaveis: (tarefa.usuario_tarefa ?? []).map((r) => r.id_usuario),
        }));

        return res.status(200).json(resultado);
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao listar tarefas:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// POST /tarefas — cria a tarefa em uma sala; opcionalmente define responsáveis.
export async function criarTarefa(req, res) {
    try {
        const corpo = req.body && typeof req.body === "object" ? req.body : {};
        const { id_sala, titulo, status, prioridade, prazo, responsaveis } = corpo;
        const idUsuario = Number(req.usuario.id);

        if (typeof titulo !== "string" || !titulo.trim()) {
            return res.status(400).json({ erro: "O título da tarefa é obrigatório." });
        }
        if (titulo.trim().length > 200) {
            return res.status(400).json({ erro: "O título deve ter no máximo 200 caracteres." });
        }

        const idSala = Number(id_sala);
        if (!Number.isInteger(idSala) || idSala <= 0) {
            return res.status(400).json({ erro: "Informe um id_sala válido." });
        }

        const papel = await (async () => {
            const { data, error } = await supabase
                .from("sala_usuario")
                .select("papel")
                .eq("id_sala", idSala)
                .eq("id_usuario", idUsuario)
                .maybeSingle();
            if (error) throw traduzirErroBanco(error);
            return data?.papel ?? null;
        })();

        if (!papel) {
            const salaExiste = await obterSalaPorId(idSala);
            if (!salaExiste) return res.status(404).json({ erro: "Sala não encontrada." });
            return res.status(403).json({ erro: "Você não participa desta sala." });
        }
        if (papel === "observador") {
            return res.status(403).json({ erro: "Seu papel nesta sala permite apenas leitura." });
        }

        const statusFinal = status ?? "pendente";
        if (!STATUS_VALIDOS.includes(statusFinal)) {
            return res.status(400).json({ erro: "O status deve ser pendente, em_andamento ou concluida." });
        }

        const prioridadeFinal = prioridade ?? "media";
        if (!PRIORIDADES_VALIDAS.includes(prioridadeFinal)) {
            return res.status(400).json({ erro: "A prioridade deve ser baixa, media ou alta." });
        }

        if (prazo !== undefined && prazo !== null && !validarDataPrazo(prazo)) {
            return res.status(400).json({ erro: "O prazo deve ser uma data no formato YYYY-MM-DD ou nulo." });
        }

        const { data: novaTarefa, error } = await supabase
            .from("tarefa")
            .insert({
                id_sala: idSala,
                titulo: titulo.trim(),
                status: statusFinal,
                prioridade: prioridadeFinal,
                prazo: prazo ?? null,
                id_criador: idUsuario,
            })
            .select("id, id_sala, titulo, status, prioridade, prazo, id_criador")
            .single();

        if (error) throw traduzirErroBanco(error);

        let responsaveisDefinidos = [];
        if (Array.isArray(responsaveis)) {
            const ids = [...new Set(responsaveis.map(Number))];
            await validarIdsResponsaveis(ids, idSala);
            await substituirResponsaveis(novaTarefa.id, ids);
            responsaveisDefinidos = ids;
        }

        return res.status(201).json({ ...novaTarefa, responsaveis: responsaveisDefinidos });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao criar tarefa:", erro);
        return res.status(500).json({ erro: "Erro interno ao criar tarefa." });
    }
}

// PATCH /tarefas/:id — atualiza titulo/status/prazo/prioridade parcialmente.
export async function atualizarTarefa(req, res) {
    try {
        const idTarefa = Number(req.params.id);
        const { tarefa } = await carregarTarefaAcessivel(idTarefa, req.usuario.id, true);

        const corpo = req.body && typeof req.body === "object" ? req.body : {};
        const campos = {};

        if (corpo.titulo !== undefined) {
            if (typeof corpo.titulo !== "string" || !corpo.titulo.trim()) {
                return res.status(400).json({ erro: "O título não pode ficar vazio." });
            }
            if (corpo.titulo.trim().length > 200) {
                return res.status(400).json({ erro: "O título deve ter no máximo 200 caracteres." });
            }
            campos.titulo = corpo.titulo.trim();
        }
        if (corpo.status !== undefined) {
            if (!STATUS_VALIDOS.includes(corpo.status)) {
                return res.status(400).json({ erro: "O status deve ser pendente, em_andamento ou concluida." });
            }
            campos.status = corpo.status;
        }
        if (corpo.prioridade !== undefined) {
            if (!PRIORIDADES_VALIDAS.includes(corpo.prioridade)) {
                return res.status(400).json({ erro: "A prioridade deve ser baixa, media ou alta." });
            }
            campos.prioridade = corpo.prioridade;
        }
        if (corpo.prazo !== undefined) {
            if (corpo.prazo !== null) {
                if (!validarDataPrazo(corpo.prazo)) {
                    return res.status(400).json({ erro: "O prazo deve ser uma data no formato YYYY-MM-DD ou null para removê-lo." });
                }
                campos.prazo = corpo.prazo;
            } else {
                campos.prazo = null;
            }
        }

        if (Object.keys(campos).length === 0) {
            return res.status(400).json({ erro: "Informe ao menos um campo para atualizar (titulo, status, prioridade ou prazo)." });
        }

        const { data: atualizada, error } = await supabase
            .from("tarefa")
            .update(campos)
            .eq("id", tarefa.id)
            .select("id, id_sala, titulo, status, prioridade, prazo, id_criador")
            .single();

        if (error) throw traduzirErroBanco(error);

        return res.status(200).json({
            mensagem: "Tarefa atualizada com sucesso.",
            tarefa: { ...atualizada, responsaveis: await usuariosResponsaveis(atualizada.id) },
        });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao atualizar tarefa:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// PATCH /tarefas/:id/status — atalho para concluir/reabrir (compatibilidade com a rota antiga).
export async function atualizarStatusTarefa(req, res) {
    const corpo = req.body && typeof req.body === "object" ? req.body : {};
    await atualizarTarefa(
        { ...req, body: { ...corpo, status: corpo.status } },
        res
    );
}

// PUT /tarefas/:id/responsaveis — substitui a lista de responsáveis.
export async function atribuirResponsaveis(req, res) {
    try {
        const idTarefa = Number(req.params.id);
        const { tarefa } = await carregarTarefaAcessivel(idTarefa, req.usuario.id, true);

        const responsaveis = req.body?.responsaveis;
        if (!Array.isArray(responsaveis)) {
            return res.status(400).json({ erro: "Envie uma lista de IDs no campo responsaveis." });
        }

        const ids = [...new Set(responsaveis.map(Number))];
        await validarIdsResponsaveis(ids, tarefa.id_sala);
        await substituirResponsaveis(tarefa.id, ids);

        return res.status(200).json({
            mensagem: "Responsáveis atualizados com sucesso.",
            tarefa: { ...tarefa, responsaveis: ids },
        });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao atribuir responsáveis:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// GET /tarefas/:id — detalhes de uma tarefa acessível (com responsáveis).
export async function detalheTarefa(req, res) {
    try {
        const idTarefa = Number(req.params.id);
        const { tarefa: base } = await carregarTarefaAcessivel(idTarefa, req.usuario.id);
        const responsaveis = await usuariosResponsaveis(base.id);
        return res.status(200).json({ ...base, responsaveis });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao buscar tarefa:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// DELETE /tarefas/:id — exclui a tarefa e o vínculo de responsáveis em cascata.
export async function excluirTarefa(req, res) {
    try {
        const idTarefa = Number(req.params.id);
        const { tarefa } = await carregarTarefaAcessivel(idTarefa, req.usuario.id, true);

        const { error } = await supabase.from("tarefa").delete().eq("id", tarefa.id);
        if (error) throw traduzirErroBanco(error);

        return res.status(200).json({ mensagem: "Tarefa excluída com sucesso." });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao excluir tarefa:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}
