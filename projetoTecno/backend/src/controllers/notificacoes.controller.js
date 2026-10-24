import { notificacoes, tarefas } from "../services/dados.js";
import { usuarioTemAcessoAoQuadro } from "../services/permissoes.js";

export function listarNotificacoes(req, res) {
    const usuarioId = Number(req.usuario.id);
    const naoLidas = req.query.nao_lidas === "true";
    const resultado = notificacoes
        .filter((item) => Number(item.usuario_id) === usuarioId && (!naoLidas || !item.lida))
        .filter((item) => {
            const tarefa = tarefas.find((t) => t.id === item.tarefa_id);
            return tarefa && (!tarefa.quadro_id || usuarioTemAcessoAoQuadro(tarefa.quadro_id, usuarioId));
        })
        .map((item) => ({ ...item }));
    return res.status(200).json(resultado);
}

export function marcarNotificacaoLida(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ erro: "ID da notificação inválido." });
    const notificacao = notificacoes.find((item) => item.id === id && Number(item.usuario_id) === Number(req.usuario.id));
    if (!notificacao) return res.status(404).json({ erro: "Notificação não encontrada." });
    notificacao.lida = true;
    return res.status(200).json({ mensagem: "Notificação marcada como lida.", notificacao: { ...notificacao } });
}
