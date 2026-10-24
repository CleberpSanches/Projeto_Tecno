import { createClient } from "@supabase/supabase-js";

/* ==========================================================================
   ARQUIVO UNIFICADO de conexão (ex-src/services/supabase.js + database.js)
   - lado SERVIDOR (src/server/**): cliente do banco + tradução de erros
   - lado NAVEGADOR (src/api/**):   helper HTTP para a API + sessão do usuário
   Detecta o ambiente automaticamente: em Node usa process.env, no navegador
   usa import.meta.env (variáveis VITE_ do Vite).
   ========================================================================== */

export class ApiError extends Error {
    constructor(status, mensagem, extras = {}) {
        super(mensagem);
        this.status = status;
        Object.assign(this, extras);
    }
}

/* ---------- Configuração por ambiente ---------- */

const NAVEGADOR = typeof window !== "undefined" && typeof document !== "undefined";

function lerConfig() {
    if (NAVEGADOR) {
        const env = import.meta.env ?? {};
        return {
            url: env.VITE_SUPABASE_URL ?? null,
            anonKey: env.VITE_SUPABASE_ANON_KEY ?? null,
            serviceKey: null, // a service_role NUNCA vai para o navegador
            apiUrl: env.VITE_API_URL ?? null,
        };
    }
    return {
        url: process.env.SUPABASE_URL ?? null,
        anonKey: process.env.SUPABASE_ANON_KEY ?? null,
        // Com RLS ativado no Supabase, prefira a service_role no servidor:
        // ela contorna as políticas RLS (uso exclusivo do backend).
        // Sem ela, o servidor opera com a anon key e as tabelas exigem as
        // políticas de dev em supabase/rls.sql.
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
        apiUrl: null,
    };
}

const config = lerConfig();

const CHAVE_ATIVA = config.serviceKey ?? config.anonKey;

/**
 * Cliente do banco. No servidor usa SUPABASE_SERVICE_ROLE_KEY (se configurada)
 * ou SUPABASE_ANON_KEY. No navegador fica null quando não há credenciais
 * VITE_ — o frontend conversa com a API via requestAPI, não direto pelo banco.
 */
export const supabase = config.url && CHAVE_ATIVA
    ? createClient(config.url, CHAVE_ATIVA, { auth: { persistSession: false } })
    : null;

if (!NAVEGADOR && !supabase) {
    throw new Error(
        "SUPABASE_URL e SUPABASE_ANON_KEY são obrigatórios no .env para conectar o backend ao banco."
    );
}

/* ---------- Conversão de erros do Postgres (servidor) ---------- */

/**
 * Codes relevantes:
 * - 23505: violação de unicidade            -> 409
 * - 23503: violação de chave estrangeira    -> 409
 * - 42501: negado (RLS sem política/GRANT)  -> 403
 * - 23502 / 22P02: dados inválidos          -> 400
 * - PGRST116: .single() sem linha, .maybeSingle() acima de 1 -> 404
 */
export function traduzirErroBanco(erro) {
    if (!erro) return new ApiError(500, "Erro interno do servidor.");
    const codigo = erro.code ?? "";
    if (codigo === "23505") {
        return new ApiError(409, erro.message ?? "Registro duplicado.", { causa: "unicidade" });
    }
    if (codigo === "23503") {
        return new ApiError(409, erro.message ?? "Operação bloqueada por vínculo no banco.", { causa: "chave_estrangeira" });
    }
    if (codigo === "42501") {
        return new ApiError(403, erro.message ?? "Permissão de banco negada (verifique as políticas RLS).");
    }
    if (codigo === "PGRST116") {
        return new ApiError(404, erro.message ?? "Registro não encontrado.");
    }
    if (codigo === "22P02" || codigo === "23502") {
        return new ApiError(400, erro.message ?? "Dados inválidos para o banco.");
    }
    return new ApiError(500, erro.message ?? "Erro interno do servidor.");
}

/* ---------- Frontend: acesso HTTP à API e sessão ---------- */

export const API_BASE_URL = config.apiUrl ?? "http://localhost:3000";

export async function requestAPI(caminho, { metodo = "GET", corpo, token } = {}) {
    const headers = {};
    if (corpo !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const resposta = await fetch(`${API_BASE_URL}${caminho}`, {
        method: metodo,
        headers,
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });

    const texto = await resposta.text();
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }

    if (!resposta.ok) {
        const erro = new Error(dados?.erro ?? "Erro na requisição ao servidor.");
        erro.status = resposta.status;
        throw erro;
    }
    return dados;
}

// Sessão do usuário logada (token JWT devolvido por /api/auth/*).
const CHAVE_SESSAO = "sessao_tecno";

export function salvarSessao({ token, usuario }) {
    if (!NAVEGADOR) return;
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token, usuario, salvo_em: new Date().toISOString() }));
}

export function lerSessao() {
    if (!NAVEGADOR) return null;
    try {
        const bruto = localStorage.getItem(CHAVE_SESSAO);
        return bruto ? JSON.parse(bruto) : null;
    } catch {
        return null;
    }
}

export function limparSessao() {
    if (!NAVEGADOR) return;
    localStorage.removeItem(CHAVE_SESSAO);
}
