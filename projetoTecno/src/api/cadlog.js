// Autenticação: cadastro, login, perfil e exclusão de conta.
import { requestAPI, salvarSessao, limparSessao } from "../server/supabase.js";

export async function cadastrarUsuario({ nome, email, senha }) {
    const resposta = await requestAPI("/api/auth/cadastro", { metodo: "POST", corpo: { nome, email, senha } });
    salvarSessao({ token: resposta.token, usuario: resposta.usuario });
    return resposta;
}

export async function loginUsuario({ email, senha }) {
    const resposta = await requestAPI("/api/auth/login", { metodo: "POST", corpo: { email, senha } });
    salvarSessao({ token: resposta.token, usuario: resposta.usuario });
    return resposta;
}

export async function obterPerfil(token) {
    return requestAPI("/api/auth/conta", { token });
}

export async function excluirConta(token) {
    const resposta = await requestAPI("/api/auth/conta", { metodo: "DELETE", token });
    limparSessao();
    return resposta;
}

export async function atualizarCadastro(token, { nome, email, senha }) {
    const resposta = await requestAPI("/api/auth/conta", {
        metodo: "PUT",
        token,
        corpo: { nome, email, senha }
    });

    salvarSessao({ token: resposta.token ?? token, usuario: resposta.usuario });
    return resposta;
}


export async function alterarSenhaUsuario(token, { senhaAtual, novaSenha }) {
    return requestAPI("/api/auth/alterar-senha", {
        metodo: "PUT",
        token,
        corpo: {
            senhaAtual,
            novaSenha
        }
    });
}


export function encerrarSessao() {
    limparSessao();
}
