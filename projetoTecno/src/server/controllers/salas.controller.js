import { randomBytes } from "node:crypto";
import { supabase, ApiError, traduzirErroBanco } from "../database.js";
import {
    PAPEIS_VALIDOS,
    obterPapelNaSala,
    obterSalaPorId,
    usuarioAdministraSala,
    exigirAcessoASala,
    obterSalaPorCodigo,
} from "../services/permissoes.js";

function gerarCodigoSala() {
    return randomBytes(6).toString("hex").toUpperCase();
}

// GET /salas — salas em que o usuário autenticado é membro.
export async function listarSalas(req, res) {
    const idUsuario = Number(req.usuario.id);

    const { data: vinculos, error: erroVinculos } = await supabase
        .from("sala_usuario")
        .select("id_sala, papel")
        .eq("id_usuario", idUsuario);

    if (erroVinculos) {
        console.error("Erro ao listar vínculos de sala:", erroVinculos);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }

    if (vinculos.length === 0) return res.status(200).json([]);

    const idsSalas = vinculos.map((v) => v.id_sala);

    const { data: salas, error: erroSalas } = await supabase
        .from("sala")
        .select("id, nome, codigo_sala, sala_dono")
        .in("id", idsSalas)
        .order("id");

    if (erroSalas) {
        console.error("Erro ao listar salas:", erroSalas);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }

    const papeis = new Map(vinculos.map((v) => [v.id_sala, v.papel]));
    return res.status(200).json(
        salas.map((sala) => ({ ...sala, meu_papel: papeis.get(sala.id) ?? null }))
    );
}

// POST /salas — cria a sala e insere o criador como administrador em sala_usuario.
export async function criarSala(req, res) {
    const { nome } = req.body ?? {};
    const idUsuario = Number(req.usuario.id);

    if (typeof nome !== "string" || !nome.trim()) {
        return res.status(400).json({ erro: "O nome da sala é obrigatório." });
    }

    const ultimaTentativa = 5;
    for (let tentativa = 1; tentativa <= ultimaTentativa; tentativa++) {
        const codigoSala = gerarCodigoSala();

        const { data: sala, error: erroCriacao } = await supabase
            .from("sala")
            .insert({
                nome: nome.trim(),
                codigo_sala: codigoSala,
                sala_dono: idUsuario,
            })
            .select("id, nome, codigo_sala, sala_dono")
            .single();

        if (erroCriacao) {
            if (erroCriacao.code === "23505" && tentativa < ultimaTentativa) continue; // codigo_sala colidiu; sorteia outro
            console.error("Erro ao criar sala:", erroCriacao);
            return res.status(500).json({ erro: "Erro interno ao criar sala." });
        }

        const { error: erroMembro } = await supabase
            .from("sala_usuario")
            .insert({ id_sala: sala.id, id_usuario: idUsuario, papel: "administrador" });

        if (erroMembro) {
            console.error("Erro ao inserir dono como membro:", erroMembro);
            return res.status(500).json({ erro: "Sala criada, mas falha ao registrar o dono como membro." });
        }

        return res.status(201).json({ ...sala, meu_papel: "administrador" });
    }

    return res.status(500).json({ erro: "Não foi possível gerar um código de sala único. Tente novamente." });
}

// GET /salas/:id — detalhes da sala para membros.
export async function detalheSala(req, res) {
    try {
        const idUsuario = Number(req.usuario.id);
        const idSala = Number(req.params.id);
        if (!Number.isInteger(idSala) || idSala <= 0) {
            return res.status(400).json({ erro: "O ID da sala é inválido." });
        }

        const papel = await exigirAcessoASala(idSala, idUsuario);
        if (papel === null) return res.status(404).json({ erro: "Sala não encontrada." });

        const sala = await obterSalaPorId(idSala);
        if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });

        return res.status(200).json({ ...sala, meu_papel: papel });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro na detalhe da sala:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// POST /salas/entrar — entra em uma sala informando o codigo_sala.
export async function entrarNaSala(req, res) {
    const { codigo } = req.body ?? {};
    const idUsuario = Number(req.usuario.id);

    if (typeof codigo !== "string" || !codigo.trim()) {
        return res.status(400).json({ erro: "O código da sala é obrigatório." });
    }

    const sala = await obterSalaPorCodigo(codigo);
    if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });

    const papelAtual = await obterPapelNaSala(sala.id, idUsuario);
    if (papelAtual) {
        return res.status(409).json({ erro: "Você já participa desta sala." });
    }

    const { error } = await supabase
        .from("sala_usuario")
        .insert({ id_sala: sala.id, id_usuario: idUsuario, papel: "membro" });

    if (error) {
        if (error.code === "23505") {
            return res.status(409).json({ erro: "Você já participa desta sala." });
        }
        console.error("Erro ao entrar na sala:", error);
        return res.status(500).json({ erro: "Erro interno ao entrar na sala." });
    }

    return res.status(200).json({
        mensagem: "Você entrou na sala com sucesso.",
        sala: { id: sala.id, nome: sala.nome },
        papel: "membro",
    });
}

// GET /salas/:id/membros
export async function listarMembrosSala(req, res) {
    try {
        const idSala = Number(req.params.id);
        if (!Number.isInteger(idSala) || idSala <= 0) {
            return res.status(400).json({ erro: "O ID da sala é inválido." });
        }

        await exigirAcessoASala(idSala, req.usuario.id);

        const { data, error } = await supabase
            .from("sala_usuario")
            .select("id_usuario, papel, usuario:usuario(id, nome, email)")
            .eq("id_sala", idSala)
            .order("id_usuario");

        if (error) throw traduzirErroBanco(error);

        return res.status(200).json(
            data.map((v) => ({
                id: v.usuario.id,
                nome: v.usuario.nome,
                email: v.usuario.email,
                papel: v.papel,
            }))
        );
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao listar membros:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// PATCH /salas/:id/membros/:usuarioId/papel — somente administradores.
export async function atualizarPapelMembroSala(req, res) {
    try {
        const idSala = Number(req.params.id);
        const usuarioId = Number(req.params.usuarioId);
        const papel = req.body?.papel;

        if (!Number.isInteger(idSala) || idSala <= 0 || !Number.isInteger(usuarioId) || usuarioId <= 0) {
            return res.status(400).json({ erro: "IDs inválidos." });
        }
        if (!PAPEIS_VALIDOS.includes(papel)) {
            return res.status(400).json({ erro: "Papel inválido. Use administrador, membro ou observador." });
        }

        const sala = await obterSalaPorId(idSala);
        if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });

        if (!(await usuarioAdministraSala(idSala, req.usuario.id))) {
            return res.status(403).json({ erro: "Somente administradores podem alterar papéis." });
        }

        const papelAlvo = await obterPapelNaSala(idSala, usuarioId);
        if (!papelAlvo) return res.status(404).json({ erro: "O usuário não participa desta sala." });

        if (usuarioId === Number(req.usuario.id) && papel !== "administrador") {
            return res.status(400).json({ erro: "Você não pode remover seu próprio papel de administrador por esta rota." });
        }

        const { error } = await supabase
            .from("sala_usuario")
            .update({ papel })
            .eq("id_sala", idSala)
            .eq("id_usuario", usuarioId);

        if (error) throw traduzirErroBanco(error);

        return res.status(200).json({ mensagem: "Papel atualizado com sucesso.", usuario_id: usuarioId, papel });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao atualizar papel:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// DELETE /salas/:id/membros/:usuarioId — somente administradores; o dono não pode ser removido.
export async function removerMembroSala(req, res) {
    try {
        const idSala = Number(req.params.id);
        const usuarioId = Number(req.params.usuarioId);

        if (!Number.isInteger(idSala) || idSala <= 0 || !Number.isInteger(usuarioId) || usuarioId <= 0) {
            return res.status(400).json({ erro: "IDs inválidos." });
        }

        const sala = await obterSalaPorId(idSala);
        if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });

        if (!(await usuarioAdministraSala(idSala, req.usuario.id))) {
            return res.status(403).json({ erro: "Somente administradores podem remover membros." });
        }

        if (usuarioId === sala.sala_dono) {
            return res.status(400).json({ erro: "O dono da sala não pode ser removido. Exclua a sala para isso." });
        }
        if (usuarioId === Number(req.usuario.id)) {
            return res.status(400).json({ erro: "Você não pode remover a si mesmo por esta rota." });
        }

        const papelAlvo = await obterPapelNaSala(idSala, usuarioId);
        if (!papelAlvo) return res.status(404).json({ erro: "O usuário não participa desta sala." });

        const { error } = await supabase
            .from("sala_usuario")
            .delete()
            .eq("id_sala", idSala)
            .eq("id_usuario", usuarioId);

        if (error) throw traduzirErroBanco(error);

        return res.status(200).json({ mensagem: "Membro removido da sala." });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao remover membro:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}

// DELETE /salas/:id — somente o dono (sala_dono). Exclui tarefas e vínculos em cascata.
export async function excluirSala(req, res) {
    try {
        const idSala = Number(req.params.id);
        if (!Number.isInteger(idSala) || idSala <= 0) {
            return res.status(400).json({ erro: "O ID da sala é inválido." });
        }

        const sala = await obterSalaPorId(idSala);
        if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });

        if (sala.sala_dono !== Number(req.usuario.id)) {
            return res.status(403).json({ erro: "Somente o dono da sala pode eliminá-la." });
        }

        const { error } = await supabase.from("sala").delete().eq("id", idSala);
        if (error) throw traduzirErroBanco(error);

        return res.status(200).json({ mensagem: "Sala excluída com sucesso." });
    } catch (erro) {
        if (erro instanceof ApiError) return res.status(erro.status).json({ erro: erro.message });
        console.error("Erro ao excluir sala:", erro);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
}
