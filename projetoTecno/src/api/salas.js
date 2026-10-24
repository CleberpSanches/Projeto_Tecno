// Salas / áreas de trabalho.
import { requestAPI, lerSessao } from "../server/database.js";

export async function listarSalas() {
    const sessao = lerSessao();
    return requestAPI("/api/salas", { token: sessao?.token });
}

export async function obterSala(idSala) {
    const sessao = lerSessao();
    return requestAPI(`/api/salas/${idSala}`, { token: sessao?.token });
}

export async function criarSala(nome) {
    const sessao = lerSessao();
    return requestAPI("/api/salas", { metodo: "POST", corpo: { nome }, token: sessao?.token });
}

export async function entrarNaSala(codigo) {
    const sessao = lerSessao();
    return requestAPI("/api/salas/entrar", { metodo: "POST", corpo: { codigo }, token: sessao?.token });
}

export async function excluirSala(idSala) {
    const sessao = lerSessao();
    return requestAPI(`/api/salas/${idSala}`, { metodo: "DELETE", token: sessao?.token });
}
