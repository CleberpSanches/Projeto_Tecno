import { etiquetas, quadros, tarefas } from "../services/dados.js";
import { usuarioTemAcessoAoQuadro, usuarioPodeEditarQuadro } from "../services/permissoes.js";
import { registrarAtividade } from "../services/atividades.js";

function validarId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function corValida(cor) {
    return typeof cor === "string" && /^#[0-9a-fA-F]{6}$/.test(cor);
}

function quadroAcessivel(quadroId, usuarioId, res, exigirEdicao = false) {
    const quadro = quadros.find((item) => item.id === quadroId);
    if (!quadro) {
        res.status(404).json({ erro: "Quadro não encontrado." });
        return null;
    }
    if (!usuarioTemAcessoAoQuadro(quadroId, usuarioId)) {
        res.status(403).json({ erro: "Você não tem acesso a este quadro." });
        return null;
    }
    if (exigirEdicao && !usuarioPodeEditarQuadro(quadroId, usuarioId)) {
        res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
        return null;
    }
    return quadro;
}

// RF17 — Lista etiquetas de um quadro específico.
export function listarEtiquetas(req, res) {
    const quadroId = validarId(req.query.quadro_id);
    if (!quadroId) return res.status(400).json({ erro: "Informe um quadro_id válido." });
    if (!quadroAcessivel(quadroId, req.usuario.id, res)) return;
    return res.status(200).json(etiquetas.filter((item) => item.quadro_id === quadroId));
}

// RF17 — Cria uma etiqueta dentro de um quadro.
export function criarEtiqueta(req, res) {
    const quadroId = validarId(req.body?.quadro_id);
    const nome = req.body?.nome;
    const cor = req.body?.cor;
    if (!quadroId) return res.status(400).json({ erro: "Informe um quadro_id válido." });
    if (typeof nome !== "string" || !nome.trim()) return res.status(400).json({ erro: "O nome da etiqueta é obrigatório." });
    if (!corValida(cor)) return res.status(400).json({ erro: "A cor deve estar no formato hexadecimal, por exemplo #FF5733." });
    if (!quadroAcessivel(quadroId, req.usuario.id, res, true)) return;

    const nomeNormalizado = nome.trim().toLocaleLowerCase("pt-BR");
    if (etiquetas.some((item) => item.quadro_id === quadroId && item.nome.toLocaleLowerCase("pt-BR") === nomeNormalizado)) {
        return res.status(409).json({ erro: "Já existe uma etiqueta com esse nome neste quadro." });
    }
    const etiqueta = {
        id: etiquetas.length ? Math.max(...etiquetas.map((item) => item.id)) + 1 : 1,
        quadro_id: quadroId,
        nome: nome.trim(),
        cor: cor.toUpperCase(),
        criado_por: Number(req.usuario.id),
    };
    etiquetas.push(etiqueta);
    registrarAtividade({ entidade_tipo: "quadro", entidade_id: quadroId, quadro_id: quadroId, usuario_id: req.usuario.id, acao: "etiqueta.criada", detalhes: { etiqueta_id: etiqueta.id, nome: etiqueta.nome, cor: etiqueta.cor } });
    return res.status(201).json(etiqueta);
}

// RF17 — Edita nome e/ou cor de uma etiqueta.
export function atualizarEtiqueta(req, res) {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ erro: "O ID da etiqueta é inválido." });
    const etiqueta = etiquetas.find((item) => item.id === id);
    if (!etiqueta) return res.status(404).json({ erro: "Etiqueta não encontrada." });
    if (!quadroAcessivel(etiqueta.quadro_id, req.usuario.id, res, true)) return;

    const { nome, cor } = req.body ?? {};
    if (nome !== undefined && (typeof nome !== "string" || !nome.trim())) return res.status(400).json({ erro: "O nome não pode ficar vazio." });
    if (cor !== undefined && !corValida(cor)) return res.status(400).json({ erro: "A cor deve estar no formato hexadecimal, por exemplo #FF5733." });
    const antes = { nome: etiqueta.nome, cor: etiqueta.cor };
    if (nome !== undefined) {
        const normalizado = nome.trim().toLocaleLowerCase("pt-BR");
        if (etiquetas.some((item) => item.id !== id && item.quadro_id === etiqueta.quadro_id && item.nome.toLocaleLowerCase("pt-BR") === normalizado)) {
            return res.status(409).json({ erro: "Já existe uma etiqueta com esse nome neste quadro." });
        }
        etiqueta.nome = nome.trim();
    }
    if (cor !== undefined) etiqueta.cor = cor.toUpperCase();
    registrarAtividade({ entidade_tipo: "quadro", entidade_id: etiqueta.quadro_id, quadro_id: etiqueta.quadro_id, usuario_id: req.usuario.id, acao: "etiqueta.atualizada", detalhes: { etiqueta_id: etiqueta.id, antes, depois: { nome: etiqueta.nome, cor: etiqueta.cor } } });
    return res.status(200).json(etiqueta);
}

// RF17 — Exclui uma etiqueta e remove suas associações com tarefas.
export function excluirEtiqueta(req, res) {
    const id = validarId(req.params.id);
    if (!id) return res.status(400).json({ erro: "O ID da etiqueta é inválido." });
    const indice = etiquetas.findIndex((item) => item.id === id);
    if (indice < 0) return res.status(404).json({ erro: "Etiqueta não encontrada." });
    const etiqueta = etiquetas[indice];
    if (!quadroAcessivel(etiqueta.quadro_id, req.usuario.id, res, true)) return;
    registrarAtividade({ entidade_tipo: "quadro", entidade_id: etiqueta.quadro_id, quadro_id: etiqueta.quadro_id, usuario_id: req.usuario.id, acao: "etiqueta.excluida", detalhes: { etiqueta_id: etiqueta.id, nome: etiqueta.nome } });
    etiquetas.splice(indice, 1);
    for (const tarefa of tarefas) {
        tarefa.etiqueta_ids = (tarefa.etiqueta_ids ?? []).filter((etiquetaId) => etiquetaId !== id);
    }
    return res.status(200).json({ mensagem: "Etiqueta excluída e removida das tarefas." });
}
