import { salas, tarefas } from "../services/dados.js";

export function listarTarefas(req, res) {
    const tarefasComSala = tarefas.map((tarefa) => {
        const sala = salas.find(
            (item) => item.id === tarefa.sala_id
        );

        return {
            ...tarefa,
            sala: sala
                ? {
                    id: sala.id,
                    nome: sala.nome,
                }
                : null,
        };
    });

    return res.status(200).json(tarefasComSala);
}

export function criarTarefa(req, res) {
    const { titulo, descricao, prazo, sala_id } = req.body;

    if (!titulo || !titulo.trim()) {
        return res.status(400).json({
            erro: "O título da tarefa é obrigatório.",
        });
    }

    const salaId = Number(sala_id);

    if (!sala_id || !Number.isInteger(salaId)) {
        return res.status(400).json({
            erro: "Um ID de sala válido é obrigatório.",
        });
    }

    const sala = salas.find((item) => item.id === salaId);

    if (!sala) {
        return res.status(404).json({
            erro: "Sala não encontrada.",
        });
    }

    const novaTarefa = {
        id: tarefas.length > 0
            ? Math.max(...tarefas.map((tarefa) => tarefa.id)) + 1
            : 1,
        titulo: titulo.trim(),
        descricao: descricao || "",
        prazo: prazo || null,
        status: "pendente",
        sala_id: salaId,
    };

    tarefas.push(novaTarefa);

    return res.status(201).json({
        ...novaTarefa,
        sala: {
            id: sala.id,
            nome: sala.nome,
        },
    });
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

    tarefa.status = "concluida";

    return res.status(200).json({
        mensagem: "Tarefa concluída com sucesso.",
        tarefa,
    });
}