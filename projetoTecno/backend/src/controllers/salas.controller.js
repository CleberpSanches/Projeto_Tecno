import { salas } from "../services/dados.js";

export function listarSalas(req, res) {
    return res.status(200).json(salas);
}

export function criarSala(req, res) {
    const { nome, usuarioId } = req.body;

    if (!nome || !nome.trim()) {
        return res.status(400).json({
            erro: "O nome da sala é obrigatório.",
        });
    }

    const novaSala = {
        id: salas.length > 0
            ? Math.max(...salas.map((sala) => sala.id)) + 1
            : 1,
        nome: nome.trim(),
        codigo: Math.random().toString(36).substring(2, 10).toUpperCase(),
        membros: usuarioId ? [usuarioId] : [],
    };

    salas.push(novaSala);

    return res.status(201).json(novaSala);
}

export function entrarNaSala(req, res) {
    const { codigo, usuarioId } = req.body;

    if (!codigo || !usuarioId) {
        return res.status(400).json({
            erro: "O código da sala e o ID do usuário são obrigatórios.",
        });
    }

    const sala = salas.find(
        (item) => item.codigo === codigo.trim().toUpperCase()
    );

    if (!sala) {
        return res.status(404).json({
            erro: "Sala não encontrada.",
        });
    }

    if (sala.membros.includes(usuarioId)) {
        return res.status(409).json({
            erro: "O usuário já participa desta sala.",
        });
    }

    sala.membros.push(usuarioId);

    return res.status(200).json({
        mensagem: "Usuário adicionado à sala.",
        sala,
    });
}