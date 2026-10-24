import { usuarios, tarefas, listas, quadros, salas, etiquetas } from "../services/dados.js";
import { usuarioTemAcessoAoQuadro, usuarioPodeEditarQuadro } from "../services/permissoes.js";
import { registrarAtividade } from "../services/atividades.js";

function usuarioTemAcessoATarefa(tarefa, usuarioId) {
    if (tarefa.quadro_id) return usuarioTemAcessoAoQuadro(tarefa.quadro_id, usuarioId);
    const sala = salas.find((item) => item.id === tarefa.sala_id);
    return Boolean(sala && sala.membros.includes(usuarioId));
}

function usuarioPodeEditarTarefa(tarefa, usuarioId) {
    if (tarefa.quadro_id) return usuarioPodeEditarQuadro(tarefa.quadro_id, usuarioId);
    const sala = salas.find((item) => item.id === tarefa.sala_id);
    return Boolean(sala && sala.membros.includes(usuarioId));
}

function dataIsoComHorarioValida(valor) {
    if (typeof valor !== "string") return false;
    const partes = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:Z|([+-])(\d{2}):?(\d{2}))?$/.exec(valor);
    if (!partes) return false;
    const [, anoTexto, mesTexto, diaTexto, horaTexto, minutoTexto, segundoTexto = "00", , offsetHoraTexto, offsetMinutoTexto] = partes;
    const ano = Number(anoTexto), mes = Number(mesTexto), dia = Number(diaTexto);
    const hora = Number(horaTexto), minuto = Number(minutoTexto), segundo = Number(segundoTexto);
    const calendario = new Date(Date.UTC(ano, mes - 1, dia));
    if (calendario.getUTCFullYear() !== ano || calendario.getUTCMonth() !== mes - 1 || calendario.getUTCDate() !== dia) return false;
    if (hora > 23 || minuto > 59 || segundo > 59) return false;
    if (offsetHoraTexto !== undefined && (Number(offsetHoraTexto) > 23 || Number(offsetMinutoTexto) > 59)) return false;
    return !Number.isNaN(Date.parse(valor));
}

export function listarTarefas(req, res) {
    // Por padrão, não exibe tarefas arquivadas. Para incluí-las, use ?incluir_arquivadas=true.
    const incluirArquivadas = req.query.incluir_arquivadas === "true";
    const textoBusca = typeof req.query.q === "string" ? req.query.q.trim().toLocaleLowerCase("pt-BR") : "";
    const quadroId = req.query.quadro_id === undefined ? null : Number(req.query.quadro_id);
    const listaId = req.query.lista_id === undefined ? null : Number(req.query.lista_id);
    const responsavelId = req.query.responsavel_id === undefined ? null : Number(req.query.responsavel_id);
    const etiquetaId = req.query.etiqueta_id === undefined ? null : Number(req.query.etiqueta_id);
    const status = typeof req.query.status === "string" ? req.query.status.trim().toLocaleLowerCase("pt-BR") : "";
    const prazoVencido = req.query.prazo_vencido === "true";
    const agora = new Date();

    function interpretarDataFiltro(valor, nome, fimDoDia = false) {
        if (valor === undefined) return { valor: null };
        if (typeof valor !== "string" || !valor.trim()) {
            return { erro: `O parâmetro ${nome} deve conter uma data válida.` };
        }
        const dataSomente = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
        if (dataSomente) {
            const ano = Number(dataSomente[1]), mes = Number(dataSomente[2]), dia = Number(dataSomente[3]);
            const calendario = new Date(Date.UTC(ano, mes - 1, dia));
            if (calendario.getUTCFullYear() !== ano || calendario.getUTCMonth() !== mes - 1 || calendario.getUTCDate() !== dia) {
                return { erro: `O parâmetro ${nome} deve conter uma data válida.` };
            }
        }
        const normalizado = dataSomente
            ? `${valor}T${fimDoDia ? "23:59:59.999" : "00:00:00.000"}Z`
            : valor;
        const timestamp = Date.parse(normalizado);
        if (Number.isNaN(timestamp)) return { erro: `O parâmetro ${nome} deve conter uma data válida.` };
        return { valor: new Date(timestamp) };
    }

    const prazoDeResultado = interpretarDataFiltro(req.query.prazo_de, "prazo_de");
    if (prazoDeResultado.erro) return res.status(400).json({ erro: prazoDeResultado.erro });
    const prazoAteResultado = interpretarDataFiltro(req.query.prazo_ate, "prazo_ate", true);
    if (prazoAteResultado.erro) return res.status(400).json({ erro: prazoAteResultado.erro });
    const prazoDe = prazoDeResultado.valor;
    const prazoAte = prazoAteResultado.valor;
    if (prazoDe && prazoAte && prazoDe > prazoAte) {
        return res.status(400).json({ erro: "prazo_de não pode ser posterior a prazo_ate." });
    }

    for (const [nome, valor] of [["quadro_id", quadroId], ["lista_id", listaId], ["responsavel_id", responsavelId], ["etiqueta_id", etiquetaId]]) {
        if (valor !== null && (!Number.isInteger(valor) || valor <= 0)) {
            return res.status(400).json({ erro: `O parâmetro ${nome} deve ser um número inteiro positivo.` });
        }
    }

    const tarefasDoUsuario = tarefas
        .filter((tarefa) => usuarioTemAcessoATarefa(tarefa, req.usuario.id))
        .filter((tarefa) => incluirArquivadas || !tarefa.arquivada)
        .filter((tarefa) => quadroId === null || tarefa.quadro_id === quadroId)
        .filter((tarefa) => listaId === null || tarefa.lista_id === listaId)
        .filter((tarefa) => responsavelId === null || (tarefa.responsaveis ?? []).includes(responsavelId))
        .filter((tarefa) => etiquetaId === null || (tarefa.etiqueta_ids ?? []).includes(etiquetaId))
        .filter((tarefa) => !status || String(tarefa.status ?? "").toLocaleLowerCase("pt-BR") === status)
        .filter((tarefa) => !textoBusca || `${tarefa.titulo ?? ""} ${tarefa.descricao ?? ""}`.toLocaleLowerCase("pt-BR").includes(textoBusca))
        .filter((tarefa) => !prazoVencido || (tarefa.prazo && !Number.isNaN(Date.parse(tarefa.prazo)) && new Date(tarefa.prazo) < agora && tarefa.status !== "concluida"))
        .filter((tarefa) => {
            if (!prazoDe && !prazoAte) return true;
            if (!tarefa.prazo) return false;
            const prazo = new Date(tarefa.prazo);
            if (Number.isNaN(prazo.getTime())) return false;
            if (prazoDe && prazo < prazoDe) return false;
            if (prazoAte && prazo > prazoAte) return false;
            return true;
        })
        .map((tarefa) => {
            const sala = salas.find((item) => item.id === tarefa.sala_id);
            const etiquetasDaTarefa = etiquetas.filter((etiqueta) => (tarefa.etiqueta_ids ?? []).includes(etiqueta.id));
            return {
                ...tarefa,
                etiqueta_ids: tarefa.etiqueta_ids ?? [],
                etiquetas: etiquetasDaTarefa,
                sala: sala ? { id: sala.id, nome: sala.nome } : null,
            };
        });

    return res.status(200).json(tarefasDoUsuario);
}

export function criarTarefa(req, res) {
    const { titulo, descricao, prazo, lista_id } = req.body ?? {};

    if (typeof titulo !== "string" || !titulo.trim()) {
        return res.status(400).json({ erro: "O título da tarefa é obrigatório." });
    }

    const listaId = Number(lista_id);
    if (!Number.isInteger(listaId) || listaId <= 0) {
        return res.status(400).json({ erro: "Informe um lista_id válido para criar a tarefa dentro de uma lista." });
    }

    const lista = listas.find((item) => item.id === listaId);
    if (!lista) {
        return res.status(404).json({ erro: "Lista não encontrada." });
    }

    const quadro = quadros.find((item) => item.id === lista.quadro_id);
    if (!quadro) {
        return res.status(404).json({ erro: "O quadro desta lista não foi encontrado." });
    }

    const sala = salas.find((item) => item.id === quadro.sala_id);
    if (!sala || !usuarioTemAcessoAoQuadro(quadro.id, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não tem acesso à lista onde deseja criar a tarefa." });
    }
    if (!usuarioPodeEditarQuadro(quadro.id, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    if (prazo && Number.isNaN(Date.parse(prazo))) {
        return res.status(400).json({ erro: "O prazo informado não é uma data válida." });
    }

    const novaTarefa = {
        id: tarefas.length > 0 ? Math.max(...tarefas.map((tarefa) => tarefa.id)) + 1 : 1,
        titulo: titulo.trim(),
        descricao: typeof descricao === "string" ? descricao : "",
        prazo: prazo || null,
        status: "pendente",
        sala_id: sala.id,
        quadro_id: quadro.id,
        lista_id: lista.id,
        responsaveis: [],
        arquivada: false,
        formato_descricao: "markdown",
    };

    tarefas.push(novaTarefa);
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: novaTarefa.id, tarefa_id: novaTarefa.id, quadro_id: quadro.id, usuario_id: req.usuario.id, acao: "tarefa.criada", detalhes: { titulo: novaTarefa.titulo, lista_id: lista.id } });

    return res.status(201).json({
        ...novaTarefa,
        sala: { id: sala.id, nome: sala.nome },
        quadro: { id: quadro.id, nome: quadro.nome },
        lista: { id: lista.id, nome: lista.nome },
    });
}

export function arquivarTarefa(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "O ID da tarefa é inválido." });
    }

    const tarefa = tarefas.find((item) => item.id === id);
    if (!tarefa) {
        return res.status(404).json({ erro: "Tarefa não encontrada." });
    }

    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não tem acesso a esta tarefa." });
    }
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    tarefa.arquivada = true;
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id, acao: "tarefa.arquivada" });
    return res.status(200).json({ mensagem: "Tarefa arquivada com sucesso.", tarefa });
}

export function desarquivarTarefa(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "O ID da tarefa é inválido." });
    }

    const tarefa = tarefas.find((item) => item.id === id);
    if (!tarefa) {
        return res.status(404).json({ erro: "Tarefa não encontrada." });
    }

    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não tem acesso a esta tarefa." });
    }
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    tarefa.arquivada = false;
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id, acao: "tarefa.desarquivada" });
    return res.status(200).json({ mensagem: "Tarefa desarquivada com sucesso.", tarefa });
}

export function excluirTarefa(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: "O ID da tarefa é inválido." });
    }

    const indice = tarefas.findIndex((item) => item.id === id);
    if (indice === -1) {
        return res.status(404).json({ erro: "Tarefa não encontrada." });
    }

    const tarefa = tarefas[indice];
    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não tem acesso a esta tarefa." });
    }
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id, acao: "tarefa.excluida", detalhes: { titulo: tarefa.titulo } });
    tarefas.splice(indice, 1);
    return res.status(200).json({ mensagem: "Tarefa excluída permanentemente com sucesso." });
}

export function concluirTarefa(req, res) {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            erro: "O ID da tarefa é inválido.",
        });
    }

    const tarefa = tarefas.find((item) => item.id === id);

    if (!tarefa) {
        return res.status(404).json({
            erro: "Tarefa não encontrada.",
        });
    }

    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({
            erro: "Você não tem acesso a esta tarefa.",
        });
    }
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    const statusAnterior = tarefa.status;
    tarefa.status = "concluida";
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id, acao: "tarefa.concluida", detalhes: { status_anterior: statusAnterior, status_novo: tarefa.status } });

    return res.status(200).json({
        mensagem: "Tarefa concluída com sucesso.",
        tarefa,
    });
}

export function moverTarefa(req, res) {
    const tarefaId = Number(req.params.id);
    const { lista_id } = req.body ?? {};

    if (!Number.isInteger(tarefaId) || tarefaId <= 0) {
        return res.status(400).json({
            erro: "O ID da tarefa é inválido.",
        });
    }

    const tarefa = tarefas.find((item) => item.id === tarefaId);

    if (!tarefa) {
        return res.status(404).json({
            erro: "Tarefa não encontrada.",
        });
    }

    // Valida o acesso à tarefa original antes de permitir movê-la.
    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({
            erro: "Você não tem acesso à tarefa original.",
        });
    }
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    const listaId = Number(lista_id);

    if (!Number.isInteger(listaId) || listaId <= 0) {
        return res.status(400).json({
            erro: "Informe um lista_id válido.",
        });
    }

    const listaDestino = listas.find((item) => item.id === listaId);

    if (!listaDestino) {
        return res.status(404).json({
            erro: "Lista de destino não encontrada.",
        });
    }

    const quadroDestino = quadros.find(
        (item) => item.id === listaDestino.quadro_id
    );

    if (!quadroDestino) {
        return res.status(404).json({
            erro: "Quadro de destino não encontrado.",
        });
    }

    const salaDestino = salas.find(
        (item) => item.id === quadroDestino.sala_id
    );

    if (!salaDestino || !usuarioTemAcessoAoQuadro(quadroDestino.id, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não tem acesso à lista de destino." });
    }
    if (!usuarioPodeEditarQuadro(quadroDestino.id, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel no quadro de destino permite apenas leitura." });
    }

    const localAnterior = { lista_id: tarefa.lista_id, quadro_id: tarefa.quadro_id };
    tarefa.lista_id = listaDestino.id;
    tarefa.quadro_id = quadroDestino.id;
    tarefa.sala_id = quadroDestino.sala_id;
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: quadroDestino.id, usuario_id: req.usuario.id, acao: "tarefa.movida", detalhes: { ...localAnterior, lista_id_nova: listaDestino.id, quadro_id_novo: quadroDestino.id } });

    return res.status(200).json({
        mensagem: "Tarefa movida com sucesso.",
        tarefa,
    });
}

export function atribuirResponsaveis(req, res) {
    const tarefaId = Number(req.params.id);
    const { responsaveis } = req.body ?? {};

    if (!Number.isInteger(tarefaId) || tarefaId <= 0) {
        return res.status(400).json({
            erro: "O ID da tarefa é inválido.",
        });
    }

    const tarefa = tarefas.find((item) => item.id === tarefaId);

    if (!tarefa) {
        return res.status(404).json({
            erro: "Tarefa não encontrada.",
        });
    }

    if (!Array.isArray(responsaveis)) {
        return res.status(400).json({
            erro: "Envie uma lista de IDs no campo responsaveis.",
        });
    }

    const sala = salas.find((item) => item.id === tarefa.sala_id);

    if (!sala || !usuarioTemAcessoATarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não tem acesso a esta tarefa." });
    }
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    const idsResponsaveis = responsaveis.map(Number);
    const idsValidos = idsResponsaveis.every((usuarioId) =>
        Number.isInteger(usuarioId) &&
        usuarioTemAcessoAoQuadro(tarefa.quadro_id, usuarioId) &&
        usuarios.some((usuario) => usuario.id === usuarioId)
    );

    if (!idsValidos) {
        return res.status(400).json({
            erro: "Todos os responsáveis devem ser usuários cadastrados e membros da sala.",
        });
    }

    const responsaveisAnteriores = [...(tarefa.responsaveis ?? [])];
    tarefa.responsaveis = [...new Set(idsResponsaveis)];
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id, acao: "tarefa.responsaveis_atualizados", detalhes: { anteriores: responsaveisAnteriores, atuais: tarefa.responsaveis } });

    return res.status(200).json({
        mensagem: "Responsáveis atualizados com sucesso.",
        tarefa,
    });
}


// RF17 — Associa um conjunto de etiquetas existentes à tarefa.
export function definirEtiquetasTarefa(req, res) {
    const tarefaId = Number(req.params.id);
    if (!Number.isInteger(tarefaId) || tarefaId <= 0) return res.status(400).json({ erro: "O ID da tarefa é inválido." });
    const tarefa = tarefas.find((item) => item.id === tarefaId);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) return res.status(403).json({ erro: "Você não tem acesso a esta tarefa." });
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });

    const etiquetaIds = req.body?.etiqueta_ids;
    if (!Array.isArray(etiquetaIds)) return res.status(400).json({ erro: "Envie um array etiqueta_ids." });
    const ids = etiquetaIds.map(Number);
    if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return res.status(400).json({ erro: "Todos os IDs de etiquetas devem ser inteiros positivos." });
    const idsUnicos = [...new Set(ids)];
    const etiquetasSelecionadas = idsUnicos.map((id) => etiquetas.find((etiqueta) => etiqueta.id === id));
    if (etiquetasSelecionadas.some((etiqueta) => !etiqueta)) return res.status(404).json({ erro: "Uma ou mais etiquetas não foram encontradas." });
    if (etiquetasSelecionadas.some((etiqueta) => etiqueta.quadro_id !== tarefa.quadro_id)) return res.status(400).json({ erro: "Só é possível associar etiquetas do mesmo quadro da tarefa." });

    const anteriores = [...(tarefa.etiqueta_ids ?? [])];
    tarefa.etiqueta_ids = idsUnicos;
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id, acao: "tarefa.etiquetas_atualizadas", detalhes: { anteriores, atuais: idsUnicos } });
    return res.status(200).json({ tarefa, etiquetas: etiquetasSelecionadas });
}



// RF13 — Define ou remove o prazo da tarefa e configura lembretes personalizados.
export function atualizarPrazoTarefa(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "O ID da tarefa é inválido." });
    const tarefa = tarefas.find((item) => item.id === id);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) return res.status(403).json({ erro: "Você não tem acesso a esta tarefa." });
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });

    const { prazo, lembretes_minutos_antes } = req.body ?? {};
    if (prazo !== undefined && prazo !== null && !dataIsoComHorarioValida(prazo)) {
        return res.status(400).json({ erro: "O prazo deve conter uma data e horário reais em formato ISO 8601, por exemplo 2026-11-10T18:00:00-03:00, ou ser null para removê-lo." });
    }
    if (lembretes_minutos_antes !== undefined) {
        if (!Array.isArray(lembretes_minutos_antes) || lembretes_minutos_antes.some((valor) => !Number.isInteger(valor) || valor < 0 || valor > 43200)) {
            return res.status(400).json({ erro: "lembretes_minutos_antes deve ser uma lista de inteiros entre 0 e 43200 (30 dias)." });
        }
        if (new Set(lembretes_minutos_antes).size !== lembretes_minutos_antes.length) {
            return res.status(400).json({ erro: "Não repita os minutos de antecedência dos lembretes." });
        }
    }

    const prazoEfetivo = prazo !== undefined ? prazo : (tarefa.prazo ?? null);
    if (lembretes_minutos_antes !== undefined && lembretes_minutos_antes.length > 0 && !prazoEfetivo) {
        return res.status(400).json({ erro: "Configure um prazo antes de adicionar lembretes." });
    }

    const antes = { prazo: tarefa.prazo ?? null, lembretes_minutos_antes: tarefa.lembretes_minutos_antes ?? [] };
    if (prazo !== undefined) tarefa.prazo = prazo;
    if (lembretes_minutos_antes !== undefined) tarefa.lembretes_minutos_antes = [...lembretes_minutos_antes].sort((a, b) => b - a);
    if (!tarefa.prazo) tarefa.lembretes_minutos_antes = [];

    registrarAtividade({
        entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id,
        quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id,
        acao: "tarefa.prazo_atualizado",
        detalhes: { antes, depois: { prazo: tarefa.prazo ?? null, lembretes_minutos_antes: tarefa.lembretes_minutos_antes ?? [] } },
    });
    return res.status(200).json({ mensagem: "Prazo e lembretes atualizados.", tarefa });
}

// RF10 — Armazena a descrição como Markdown; a renderização fica a cargo do frontend.
export function atualizarDescricaoTarefa(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "O ID da tarefa é inválido." });
    const tarefa = tarefas.find((item) => item.id === id);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!usuarioTemAcessoATarefa(tarefa, req.usuario.id)) return res.status(403).json({ erro: "Você não tem acesso a esta tarefa." });
    if (!usuarioPodeEditarTarefa(tarefa, req.usuario.id)) return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });

    const { descricao, formato } = req.body ?? {};
    if (typeof descricao !== "string") return res.status(400).json({ erro: "O campo descricao deve ser um texto. Envie Markdown como texto simples." });
    if (descricao.length > 20000) return res.status(400).json({ erro: "A descrição não pode ultrapassar 20.000 caracteres." });
    if (formato !== undefined && formato !== "markdown") return res.status(400).json({ erro: "O formato aceito nesta versão é markdown." });

    const descricaoAnterior = tarefa.descricao ?? "";
    tarefa.descricao = descricao;
    tarefa.formato_descricao = "markdown";
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: tarefa.id, tarefa_id: tarefa.id, quadro_id: tarefa.quadro_id, usuario_id: req.usuario.id, acao: "tarefa.descricao_atualizada", detalhes: { descricao_anterior: descricaoAnterior, descricao_nova: descricao } });
    return res.status(200).json({ mensagem: "Descrição Markdown atualizada.", tarefa });
}
