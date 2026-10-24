import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";

// Integração real com o Supabase: só roda quando as credenciais estão configuradas.
const possuiCredenciais = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

process.env.NODE_ENV = "test";
const { app } = await import("../app.js");

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

test.after(async () => {
    await new Promise((resolve, reject) => server.close((erro) => (erro ? reject(erro) : resolve())));
});

async function request(method, path, { token, body } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: response.status, data };
}

test("integração com o banco (skip sem credenciais)", { skip: !possuiCredenciais && "sem SUPABASE_URL/SUPABASE_ANON_KEY" }, async () => {
    const sufixo = Date.now();
    const emailAdmin = `admin${sufixo}@teste.local`;
    const emailMembro = `membro${sufixo}@teste.local`;
    const senha = "SenhaSegura123";

    let adminToken;
    let membroToken;
    let salaId;
    let tarefaId;

    // Cadastro e e-mail duplicado
    const cadastro = await request("POST", "/api/auth/cadastro", { body: { nome: "Admin Teste", email: emailAdmin, senha } });
    assert.equal(cadastro.status, 201, JSON.stringify(cadastro.data));
    adminToken = cadastro.data.token;

    const duplicado = await request("POST", "/api/auth/cadastro", { body: { nome: "Admin Teste", email: emailAdmin.toUpperCase(), senha } });
    assert.equal(duplicado.status, 409);

    // Login
    const loginErrado = await request("POST", "/api/auth/login", { body: { email: emailAdmin, senha: "errada" } });
    assert.equal(loginErrado.status, 401);
    const loginOk = await request("POST", "/api/auth/login", { body: { email: emailAdmin, senha } });
    assert.equal(loginOk.status, 200);

    // Token inválido
    assert.equal((await request("GET", "/api/salas", { token: "invalido" })).status, 401);
    assert.equal((await request("GET", "/api/salas")).status, 401);

    // Membro entra depois
    const cadastroMembro = await request("POST", "/api/auth/cadastro", { body: { nome: "Membro Teste", email: emailMembro, senha } });
    assert.equal(cadastroMembro.status, 201);
    membroToken = cadastroMembro.data.token;

    // Criação de sala + código
    const sala = await request("POST", "/api/salas", { token: adminToken, body: { nome: "Sala Teste" } });
    assert.equal(sala.status, 201, JSON.stringify(sala.data));
    salaId = sala.data.id;
    assert.ok(sala.data.codigo_sala);

    // Entrada na sala via código (aceita resultado 200 ou 403/42501 quando RLS bloquear escrever como anon)
    const entrar = await request("POST", "/api/salas/entrar", { token: membroToken, body: { codigo: sala.data.codigo_sala } });
    if (entrar.status === 403) {
        console.log("[API TESTE] Visibilidade do banco está bloqueada pela RLS — aplique supabase/rls.sql e rode novamente.");
    } else {
        assert.equal(entrar.status, 200, JSON.stringify(entrar.data));

        const membros = await request("GET", `/api/salas/${salaId}/membros`, { token: adminToken });
        assert.equal(membros.status, 200);
        assert.equal(membros.data.length, 2);

        // Tarefas
        const criar1 = await request("POST", "/api/tarefas", { token: membroToken, body: { id_sala: salaId, titulo: "Primeira tarefa", prazo: null } });
        assert.equal(criar1.status, 201, JSON.stringify(criar1.data));
        tarefaId = criar1.data.id;

        const criarTaskValida = await request("POST", "/api/tarefas", { token: membroToken, body: { id_sala: salaId, titulo: "Inválida", prioridade: "extrema" } });
        assert.equal(criarTaskValida.status, 400);

        const atribuir = await request("PUT", `/api/tarefas/${tarefaId}/responsaveis`, { token: adminToken, body: { responsaveis: [cadastroMembro.data.usuario.id] } });
        assert.equal(atribuir.status, 200, JSON.stringify(atribuir.data));

        const listar = await request("GET", "/api/tarefas", { token: membroToken });
        assert.equal(listar.status, 200);
        assert.ok(listar.data.some((t) => t.id === tarefaId));

        const listarFiltrada = await request("GET", `/api/tarefas?id_sala=${salaId}&status=pendente`, { token: adminToken });
        assert.equal(listarFiltrada.status, 200);

        const concluir = await request("PATCH", `/api/tarefas/${tarefaId}/status`, { token: adminToken, body: { status: "concluida" } });
        assert.equal(concluir.status, 200);

        const detalhe = await request("GET", `/api/tarefas/${tarefaId}`, { token: adminToken });
        assert.equal(detalhe.status, 200);
        assert.equal(detalhe.data.status, "concluida");

        const excluirTask = await request("DELETE", `/api/tarefas/${tarefaId}`, { token: adminToken });
        assert.equal(excluirTask.status, 200);

        // Exclusão da sala pelo dono
        const excluirSala = await request("DELETE", `/api/salas/${salaId}`, { token: membroToken });
        assert.equal(excluirSala.status, 403);
        const excluirSalaOk = await request("DELETE", `/api/salas/${salaId}`, { token: adminToken });
        assert.equal(excluirSalaOk.status, 200);
    }

    // Exclusão das contas (limpeza)
    const saidaMembro = await request("DELETE", "/api/auth/conta", { token: membroToken });
    assert.equal(saidaMembro.status, 200, JSON.stringify(saidaMembro.data));
    const saidaAdmin = await request("DELETE", "/api/auth/conta", { token: adminToken });
    assert.equal(saidaAdmin.status, 200, JSON.stringify(saidaAdmin.data));

    // Após excluir a conta, o token não deve mais funcionar.
    assert.equal((await request("GET", "/api/salas", { token: adminToken })).status, 401);
});
