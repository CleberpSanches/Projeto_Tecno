import {
    usuarios,
    tarefas,
    salas,
    itensChecklist,
    comentarios,
} from "../services/dados.js";
import { usuarioTemAcessoAoQuadro, usuarioPodeEditarQuadro } from "../services/permissoes.js";
import { registrarAtividade } from "../services/atividades.js";

function encontrarTarefaAcessivel(tarefaId, usuarioId) {
    const tarefa = tarefas.find((item) => item.id === Number(tarefaId));
    if (!tarefa) return { erro: "Tarefa não encontrada.", status: 404 };

    let temAcesso = false;
    if (tarefa.quadro_id) {
        temAcesso = usuarioTemAcessoAoQuadro(tarefa.quadro_id, usuarioId);
    } else {
        const sala = salas.find((item) => item.id === tarefa.sala_id);
        temAcesso = Boolean(sala?.membros?.includes(Number(usuarioId)));
    }

    if (!temAcesso) return { erro: "Você não tem acesso a esta tarefa.", status: 403 };
    return { tarefa };
}

function podeEditarTarefa(tarefa, usuarioId) {
    if (tarefa.quadro_id) return usuarioPodeEditarQuadro(tarefa.quadro_id, usuarioId);
    const sala = salas.find((item) => item.id === tarefa.sala_id);
    return Boolean(sala?.membros?.includes(Number(usuarioId)));
}

function calcularProgresso(tarefaId) {
    const itens = itensChecklist.filter((item) => item.tarefa_id === Number(tarefaId));
    const concluidos = itens.filter((item) => item.concluida).length;
    return {
        total: itens.length,
        concluidos,
        percentual: itens.length === 0 ? 0 : Math.round((concluidos / itens.length) * 100),
    };
}

function responderComErro(res, resultado) {
    return res.status(resultado.status).json({ erro: resultado.erro });
}

// RF15 — Lista os itens de checklist de um cartão e o progresso calculado.
export function listarChecklist(req, res) {
    const acesso = encontrarTarefaAcessivel(req.params.id, req.usuario.id);
    if (acesso.erro) return responderComErro(res, acesso);

    const itens = itensChecklist
        .filter((item) => item.tarefa_id === acesso.tarefa.id)
        .map((item) => ({ ...item }));
    return res.status(200).json({ itens, progresso: calcularProgresso(acesso.tarefa.id) });
}

// RF15 — Adiciona uma subtarefa ao cartão.
export function criarItemChecklist(req, res) {
    const acesso = encontrarTarefaAcessivel(req.params.id, req.usuario.id);
    if (acesso.erro) return responderComErro(res, acesso);
    if (!podeEditarTarefa(acesso.tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel permite apenas leitura." });
    }

    const texto = req.body?.texto;
    if (typeof texto !== "string" || !texto.trim()) {
        return res.status(400).json({ erro: "O campo texto é obrigatório." });
    }

    const item = {
        id: itensChecklist.length ? Math.max(...itensChecklist.map((x) => x.id)) + 1 : 1,
        tarefa_id: acesso.tarefa.id,
        texto: texto.trim(),
        concluida: false,
        criado_por: Number(req.usuario.id),
        criado_em: new Date().toISOString(),
    };
    itensChecklist.push(item);
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: acesso.tarefa.id, tarefa_id: acesso.tarefa.id, quadro_id: acesso.tarefa.quadro_id, usuario_id: req.usuario.id, acao: "checklist.item_criado", detalhes: { item_id: item.id, texto: item.texto } });
    return res.status(201).json({ item, progresso: calcularProgresso(acesso.tarefa.id) });
}

// RF15 — Marca/desmarca uma subtarefa como concluída.
export function atualizarItemChecklist(req, res) {
    const acesso = encontrarTarefaAcessivel(req.params.id, req.usuario.id);
    if (acesso.erro) return responderComErro(res, acesso);
    if (!podeEditarTarefa(acesso.tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel permite apenas leitura." });
    }

    const item = itensChecklist.find(
        (x) => x.id === Number(req.params.itemId) && x.tarefa_id === acesso.tarefa.id
    );
    if (!item) return res.status(404).json({ erro: "Item de checklist não encontrado." });

    const { texto, concluida } = req.body ?? {};
    const antes = { texto: item.texto, concluida: item.concluida };
    // Valida todos os campos antes de alterar o item para evitar atualizações parciais.
    if (texto !== undefined && (typeof texto !== "string" || !texto.trim())) {
        return res.status(400).json({ erro: "O texto não pode ficar vazio." });
    }
    if (concluida !== undefined && typeof concluida !== "boolean") {
        return res.status(400).json({ erro: "O campo concluida deve ser true ou false." });
    }
    if (texto !== undefined) item.texto = texto.trim();
    if (concluida !== undefined) item.concluida = concluida;

    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: acesso.tarefa.id, tarefa_id: acesso.tarefa.id, quadro_id: acesso.tarefa.quadro_id, usuario_id: req.usuario.id, acao: "checklist.item_atualizado", detalhes: { item_id: item.id, antes, depois: { texto: item.texto, concluida: item.concluida } } });
    return res.status(200).json({ item, progresso: calcularProgresso(acesso.tarefa.id) });
}

// RF15 — Remove uma subtarefa.
export function excluirItemChecklist(req, res) {
    const acesso = encontrarTarefaAcessivel(req.params.id, req.usuario.id);
    if (acesso.erro) return responderComErro(res, acesso);
    if (!podeEditarTarefa(acesso.tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel permite apenas leitura." });
    }

    const indice = itensChecklist.findIndex(
        (x) => x.id === Number(req.params.itemId) && x.tarefa_id === acesso.tarefa.id
    );
    if (indice < 0) return res.status(404).json({ erro: "Item de checklist não encontrado." });
    const itemRemovido = itensChecklist[indice];
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: acesso.tarefa.id, tarefa_id: acesso.tarefa.id, quadro_id: acesso.tarefa.quadro_id, usuario_id: req.usuario.id, acao: "checklist.item_excluido", detalhes: { item_id: itemRemovido.id, texto: itemRemovido.texto } });
    itensChecklist.splice(indice, 1);
    return res.status(200).json({ mensagem: "Item de checklist removido.", progresso: calcularProgresso(acesso.tarefa.id) });
}

function identificarMencoes(texto, tarefa) {
    const tokens = [...texto.matchAll(/@([\p{L}\p{N}._-]+)/gu)].map((m) => m[1].toLocaleLowerCase("pt-BR"));
    const ids = new Set();
    for (const token of tokens) {
        const usuario = usuarios.find((u) => {
            const nome = (u.nome ?? "").toLocaleLowerCase("pt-BR");
            const emailPrefixo = (u.email ?? "").split("@")[0].toLocaleLowerCase("pt-BR");
            return nome.split(/\s+/).some((parte) => parte === token) || emailPrefixo === token;
        });
        if (!usuario || usuario.id === Number(tarefa.criado_por)) continue;
        let temAcesso = false;
        if (tarefa.quadro_id) temAcesso = usuarioTemAcessoAoQuadro(tarefa.quadro_id, usuario.id);
        else {
            const sala = salas.find((s) => s.id === tarefa.sala_id);
            temAcesso = Boolean(sala?.membros?.includes(usuario.id));
        }
        if (temAcesso) ids.add(usuario.id);
    }
    return [...ids];
}

// RF16 — Lista os comentários de um cartão.
export function listarComentarios(req, res) {
    const acesso = encontrarTarefaAcessivel(req.params.id, req.usuario.id);
    if (acesso.erro) return responderComErro(res, acesso);
    const resultado = comentarios
        .filter((c) => c.tarefa_id === acesso.tarefa.id)
        .map((c) => ({ ...c }));
    return res.status(200).json(resultado);
}

// RF16 — Adiciona comentário e identifica menções reconhecidas com @nome ou @email.
export function criarComentario(req, res) {
    const acesso = encontrarTarefaAcessivel(req.params.id, req.usuario.id);
    if (acesso.erro) return responderComErro(res, acesso);
    if (!podeEditarTarefa(acesso.tarefa, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel permite apenas leitura." });
    }

    const texto = req.body?.texto;
    if (typeof texto !== "string" || !texto.trim()) {
        return res.status(400).json({ erro: "O campo texto é obrigatório." });
    }

    const autor = usuarios.find((u) => u.id === Number(req.usuario.id));
    const comentario = {
        id: comentarios.length ? Math.max(...comentarios.map((x) => x.id)) + 1 : 1,
        tarefa_id: acesso.tarefa.id,
        usuario_id: Number(req.usuario.id),
        usuario_nome: autor?.nome ?? req.usuario.email,
        texto: texto.trim(),
        mencoes_usuario_ids: identificarMencoes(texto, acesso.tarefa),
        criado_em: new Date().toISOString(),
    };
    comentarios.push(comentario);
    registrarAtividade({ entidade_tipo: "tarefa", entidade_id: acesso.tarefa.id, tarefa_id: acesso.tarefa.id, quadro_id: acesso.tarefa.quadro_id, usuario_id: req.usuario.id, acao: "comentario.criado", detalhes: { comentario_id: comentario.id, mencoes_usuario_ids: comentario.mencoes_usuario_ids } });
    return res.status(201).json(comentario);
}
