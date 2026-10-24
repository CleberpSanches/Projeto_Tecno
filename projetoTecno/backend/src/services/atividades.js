import { atividades, usuarios } from "./dados.js";

export function registrarAtividade({ entidade_tipo, entidade_id, quadro_id = null, tarefa_id = null, usuario_id, acao, detalhes = {} }) {
    const usuario = usuarios.find((item) => item.id === Number(usuario_id));
    const atividade = {
        id: atividades.length ? Math.max(...atividades.map((item) => item.id)) + 1 : 1,
        entidade_tipo,
        entidade_id: Number(entidade_id),
        quadro_id: quadro_id == null ? null : Number(quadro_id),
        tarefa_id: tarefa_id == null ? null : Number(tarefa_id),
        usuario_id: Number(usuario_id),
        usuario_nome: usuario?.nome ?? usuario?.email ?? `Usuário ${usuario_id}`,
        acao,
        detalhes: structuredClone(detalhes),
        criado_em: new Date().toISOString(),
    };
    atividades.push(atividade);
    return atividade;
}
