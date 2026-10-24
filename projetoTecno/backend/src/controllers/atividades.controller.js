import { atividades, tarefas, quadros } from "../services/dados.js";
import { usuarioTemAcessoAoQuadro } from "../services/permissoes.js";

export function listarAtividadesTarefa(req, res) {
    const tarefaId = Number(req.params.id);
    if (!Number.isInteger(tarefaId) || tarefaId <= 0) return res.status(400).json({ erro: "O ID da tarefa é inválido." });
    const tarefa = tarefas.find((item) => item.id === tarefaId);
    if (!tarefa) return res.status(404).json({ erro: "Tarefa não encontrada." });
    if (!tarefa.quadro_id || !usuarioTemAcessoAoQuadro(tarefa.quadro_id, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não tem acesso ao histórico desta tarefa." });
    }
    return res.status(200).json(atividades.filter((item) => item.tarefa_id === tarefaId).map((item) => structuredClone(item)));
}

export function listarAtividadesQuadro(req, res) {
    const quadroId = Number(req.params.id);
    if (!Number.isInteger(quadroId) || quadroId <= 0) return res.status(400).json({ erro: "O ID do quadro é inválido." });
    const quadro = quadros.find((item) => item.id === quadroId);
    if (!quadro) return res.status(404).json({ erro: "Quadro não encontrado." });
    if (!usuarioTemAcessoAoQuadro(quadroId, req.usuario.id)) return res.status(403).json({ erro: "Você não tem acesso ao histórico deste quadro." });
    return res.status(200).json(atividades.filter((item) => item.quadro_id === quadroId).map((item) => structuredClone(item)));
}
