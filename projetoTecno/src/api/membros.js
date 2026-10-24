// Membros de uma sala (listagem, papéis e remoção).
import { requestAPI, lerSessao } from "../server/supabase.js";

export async function listarMembros(idSala) {
    const sessao = lerSessao();
    return requestAPI(`/api/salas/${idSala}/membros`, { token: sessao?.token });
}

export async function alterarPapelMembro(idSala, usuarioId, papel) {
    const sessao = lerSessao();
    return requestAPI(`/api/salas/${idSala}/membros/${usuarioId}/papel`, {
        metodo: "PATCH",
        corpo: { papel },
        token: sessao?.token,
    });
}

export async function removerMembro(idSala, usuarioId) {
    const sessao = lerSessao();
    return requestAPI(`/api/salas/${idSala}/membros/${usuarioId}`, {
        metodo: "DELETE",
        token: sessao?.token,
    });
}
