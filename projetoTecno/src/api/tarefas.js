// Tarefas (cartões) e responsáveis.
import { requestAPI, lerSessao } from "../server/supabase.js";

function tokenSessao() {
    return lerSessao()?.token;
}

export async function listarTarefas(filtros = {}) {
    const parametros = new URLSearchParams();
    for (const [chave, valor] of Object.entries(filtros)) {
        if (valor !== undefined && valor !== null && valor !== "") parametros.set(chave, String(valor));
    }
    const query = parametros.toString();
    return requestAPI(`/api/tarefas${query ? `?${query}` : ""}`, { token: tokenSessao() });
}

export async function obterTarefa(idTarefa) {
    return requestAPI(`/api/tarefas/${idTarefa}`, { token: tokenSessao() });
}

export async function criarTarefa({ id_sala, titulo, status, prioridade, prazo, responsaveis }) {
    return requestAPI("/api/tarefas", {
        metodo: "POST",
        corpo: { id_sala, titulo, status, prioridade, prazo, responsaveis },
        token: tokenSessao(),
    });
}

export async function atualizarTarefa(idTarefa, campos) {
    return requestAPI(`/api/tarefas/${idTarefa}`, {
        metodo: "PATCH",
        corpo: campos,
        token: tokenSessao(),
    });
}

export async function concluirTarefa(idTarefa) {
    return atualizarTarefa(idTarefa, { status: "concluida" });
}

export async function definirResponsaveis(idTarefa, responsaveis) {
    return requestAPI(`/api/tarefas/${idTarefa}/responsaveis`, {
        metodo: "PUT",
        corpo: { responsaveis },
        token: tokenSessao(),
    });
}

export async function excluirTarefa(idTarefa) {
    return requestAPI(`/api/tarefas/${idTarefa}`, { metodo: "DELETE", token: tokenSessao() });
}
