import { listas, quadros, salas } from "../services/dados.js";
import { usuarioTemAcessoAoQuadro, usuarioPodeEditarQuadro } from "../services/permissoes.js";
import { registrarAtividade } from "../services/atividades.js";

function buscarQuadroAcessivel(quadroId, usuarioId) {
    const quadro = quadros.find((item) => item.id === quadroId);
    if (!quadro) return { erro: "Quadro não encontrado.", status: 404 };
    if (!usuarioTemAcessoAoQuadro(quadroId, usuarioId)) {
        return { erro: "Você não tem acesso a este quadro.", status: 403 };
    }
    return { quadro, sala: salas.find((sala) => sala.id === quadro.sala_id) };
}

export function listarListas(req, res) {
    const quadroId = Number(req.query.quadro_id);

    if (!Number.isInteger(quadroId) || quadroId <= 0) {
        return res.status(400).json({
            erro: "Informe um quadro_id válido na URL.",
        });
    }

    const acesso = buscarQuadroAcessivel(quadroId, req.usuario.id);

    if (acesso.erro) {
        return res.status(acesso.status).json({
            erro: acesso.erro,
        });
    }

    const listasDoQuadro = listas
        .filter((lista) => lista.quadro_id === quadroId)
        .sort((a, b) => a.ordem - b.ordem);

    return res.status(200).json(listasDoQuadro);
}

export function criarLista(req, res) {
    const { nome, quadro_id } = req.body ?? {};
    const quadroId = Number(quadro_id);

    if (typeof nome !== "string" || !nome.trim()) {
        return res.status(400).json({
            erro: "O nome da lista é obrigatório.",
        });
    }

    if (!Number.isInteger(quadroId) || quadroId <= 0) {
        return res.status(400).json({
            erro: "Informe um quadro_id válido.",
        });
    }

    const acesso = buscarQuadroAcessivel(quadroId, req.usuario.id);

    if (acesso.erro) {
        return res.status(acesso.status).json({
            erro: acesso.erro,
        });
    }
    if (!usuarioPodeEditarQuadro(quadroId, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    const listasDoQuadro = listas.filter(
        (lista) => lista.quadro_id === quadroId
    );

    const novaLista = {
        id: listas.length > 0
            ? Math.max(...listas.map((lista) => lista.id)) + 1
            : 1,
        nome: nome.trim(),
        quadro_id: quadroId,
        ordem: listasDoQuadro.length > 0
            ? Math.max(...listasDoQuadro.map((lista) => lista.ordem)) + 1
            : 1,
    };

    listas.push(novaLista);
    registrarAtividade({ entidade_tipo: "quadro", entidade_id: quadroId, quadro_id: quadroId, usuario_id: req.usuario.id, acao: "lista.criada", detalhes: { lista_id: novaLista.id, nome: novaLista.nome } });

    return res.status(201).json(novaLista);
}

export function reordenarListas(req, res) {
    const { quadro_id, lista_ids } = req.body ?? {};
    const quadroId = Number(quadro_id);

    if (!Number.isInteger(quadroId) || quadroId <= 0) {
        return res.status(400).json({
            erro: "Informe um quadro_id válido.",
        });
    }

    if (!Array.isArray(lista_ids)) {
        return res.status(400).json({
            erro: "Envie lista_ids como um array na ordem desejada.",
        });
    }

    const acesso = buscarQuadroAcessivel(quadroId, req.usuario.id);

    if (acesso.erro) {
        return res.status(acesso.status).json({
            erro: acesso.erro,
        });
    }
    if (!usuarioPodeEditarQuadro(quadroId, req.usuario.id)) {
        return res.status(403).json({ erro: "Seu papel neste quadro permite apenas leitura." });
    }

    const listasDoQuadro = listas.filter(
        (lista) => lista.quadro_id === quadroId
    );

    const idsAtuais = listasDoQuadro.map((lista) => lista.id);

    const idsRecebidos = lista_ids.map(Number);

    const idsValidos =
        idsRecebidos.every(Number.isInteger) &&
        new Set(idsRecebidos).size === idsRecebidos.length &&
        idsRecebidos.length === idsAtuais.length &&
        idsAtuais.every((id) => idsRecebidos.includes(id));

    if (!idsValidos) {
        return res.status(400).json({
            erro: "Envie todos os IDs das listas deste quadro, sem repetições.",
            ids_esperados: idsAtuais,
        });
    }

    const ordemAnterior = listasDoQuadro.slice().sort((a, b) => a.ordem - b.ordem).map((item) => item.id);
    idsRecebidos.forEach((id, indice) => {
        const lista = listas.find(
            (item) => item.id === id && item.quadro_id === quadroId
        );

        lista.ordem = indice + 1;
    });

    registrarAtividade({ entidade_tipo: "quadro", entidade_id: quadroId, quadro_id: quadroId, usuario_id: req.usuario.id, acao: "listas.reordenadas", detalhes: { ordem_anterior: ordemAnterior, ordem_nova: idsRecebidos } });
    return res.status(200).json(
        listasDoQuadro.sort((a, b) => a.ordem - b.ordem)
    );
}