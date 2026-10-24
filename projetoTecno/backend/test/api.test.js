import test, { after } from "node:test";
import assert from "node:assert/strict";

process.env.NODE_ENV = "test";
const { app } = await import("../src/app.js");

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(method, path, { token, body, rawBody, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.Authorization = `Bearer ${token}`;
  if (body !== undefined) requestHeaders["Content-Type"] = "application/json";
  if (rawBody !== undefined) requestHeaders["Content-Type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: response.status, data };
}

test("API: segurança, permissões, validações e funcionalidades principais", async (t) => {
  let adminToken;
  let memberToken;
  let outsiderToken;
  let privateBoardId;
  let privateListId;
  let taskId;
  let checklistId;
  let labelId;

  await t.test("healthcheck e autenticação", async () => {
    assert.equal((await request("GET", "/")).status, 200);
    assert.equal((await request("GET", "/api/salas")).status, 401);
    assert.equal((await request("GET", "/api/salas", { token: "token-invalido" })).status, 401);
    assert.equal((await request("POST", "/api/auth/cadastro", { body: { nome: 42, email: {}, senha: null } })).status, 400);
    assert.equal((await request("POST", "/api/auth/cadastro", { rawBody: "{" })).status, 400);

    const admin = await request("POST", "/api/auth/cadastro", { body: { nome: "Admin Teste", email: "admin@test.local", senha: "SenhaSegura123" } });
    assert.equal(admin.status, 201, JSON.stringify(admin.data));
    adminToken = admin.data.token;
    const duplicate = await request("POST", "/api/auth/cadastro", { body: { nome: "Admin Teste", email: "ADMIN@test.local", senha: "SenhaSegura123" } });
    assert.equal(duplicate.status, 409);
    assert.equal((await request("POST", "/api/auth/login", { body: { email: "admin@test.local", senha: "errada123" } })).status, 401);
    assert.equal((await request("POST", "/api/auth/login", { body: null })).status, 400);

    const member = await request("POST", "/api/auth/cadastro", { body: { nome: "Membro Teste", email: "membro@test.local", senha: "SenhaSegura123" } });
    assert.equal(member.status, 201);
    memberToken = member.data.token;
    const outsider = await request("POST", "/api/auth/cadastro", { body: { nome: "Visitante Teste", email: "visitante@test.local", senha: "SenhaSegura123" } });
    assert.equal(outsider.status, 201);
    outsiderToken = outsider.data.token;
  });

  await t.test("membro entra na sala e cria quadro privado", async () => {
    assert.equal((await request("POST", "/api/salas/entrar", { token: memberToken, body: { codigo: "TECNO123" } })).status, 200);
    const board = await request("POST", "/api/quadros", { token: adminToken, body: { nome: "Quadro Privado Teste", sala_id: 1, visibilidade: "privado", modelo: "kanban_basico" } });
    assert.equal(board.status, 201, JSON.stringify(board.data));
    privateBoardId = board.data.id;
    privateListId = board.data.listas[0].id;
    assert.equal(board.data.listas.length, 3);
    assert.equal((await request("GET", `/api/listas?quadro_id=${privateBoardId}`, { token: memberToken })).status, 403);
    assert.equal((await request("POST", "/api/tarefas", { token: memberToken, body: { titulo: "Não permitido", lista_id: privateListId } })).status, 403);
  });

  await t.test("quadro público é leitura para visitante sem acesso à sala", async () => {
    const board = await request("POST", "/api/quadros", { token: adminToken, body: { nome: "Quadro Público Teste", sala_id: 1, visibilidade: "publico", modelo: "kanban_basico" } });
    assert.equal(board.status, 201);
    const boardId = board.data.id;
    const listId = board.data.listas[0].id;
    assert.equal((await request("GET", `/api/listas?quadro_id=${boardId}`, { token: outsiderToken })).status, 200);
    assert.equal((await request("POST", "/api/listas", { token: outsiderToken, body: { nome: "Tentativa", quadro_id: boardId } })).status, 403);
    assert.equal((await request("POST", "/api/tarefas", { token: outsiderToken, body: { titulo: "Tentativa", lista_id: listId } })).status, 403);
  });

  await t.test("validação de filtros e prazo", async () => {
    assert.equal((await request("GET", "/api/tarefas?quadro_id=abc", { token: adminToken })).status, 400);
    assert.equal((await request("GET", "/api/tarefas?prazo_de=nao-e-data", { token: adminToken })).status, 400);
    assert.equal((await request("GET", "/api/tarefas?prazo_de=2026-12-31&prazo_ate=2026-01-01", { token: adminToken })).status, 400);
    assert.equal((await request("PATCH", "/api/tarefas/1/prazo", { token: adminToken, body: { prazo: "data-invalida", lembretes_minutos_antes: [] } })).status, 400);
    assert.equal((await request("PATCH", "/api/tarefas/1/prazo", { token: adminToken, body: { prazo: "2026-02-31T18:00:00-03:00", lembretes_minutos_antes: [] } })).status, 400);
    assert.equal((await request("PATCH", "/api/tarefas/1/prazo", { token: adminToken, body: { prazo: "2026-11-10T18:00:00-03:00", lembretes_minutos_antes: [15, 15] } })).status, 400);
  });

  await t.test("criação de tarefa, checklist, comentário, etiquetas e histórico", async () => {
    const task = await request("POST", "/api/tarefas", { token: adminToken, body: { titulo: "Tarefa de integração", descricao: "Descrição", lista_id: privateListId } });
    assert.equal(task.status, 201, JSON.stringify(task.data));
    taskId = task.data.id;

    assert.equal((await request("POST", "/api/tarefas", { token: adminToken, body: { titulo: 7, lista_id: privateListId } })).status, 400);
    assert.equal((await request("POST", "/api/tarefas/99999/checklists", { token: adminToken, body: { texto: "x" } })).status, 404);
    assert.equal((await request("POST", `/api/tarefas/${taskId}/checklists`, { token: adminToken, body: { texto: "   " } })).status, 400);
    const checklist = await request("POST", `/api/tarefas/${taskId}/checklists`, { token: adminToken, body: { texto: "Testar rota" } });
    assert.equal(checklist.status, 201);
    checklistId = checklist.data.item.id;
    assert.equal((await request("PATCH", `/api/tarefas/${taskId}/checklists/${checklistId}`, { token: adminToken, body: { texto: "Não deve salvar", concluida: "sim" } })).status, 400);
    const unchanged = await request("GET", `/api/tarefas/${taskId}/checklists`, { token: adminToken });
    assert.equal(unchanged.data.itens.find((item) => item.id === checklistId).texto, "Testar rota");
    assert.equal((await request("PATCH", `/api/tarefas/${taskId}/checklists/${checklistId}`, { token: adminToken, body: { concluida: true } })).status, 200);
    assert.equal((await request("PATCH", `/api/tarefas/${taskId}/prazo`, { token: adminToken, body: { lembretes_minutos_antes: [15] } })).status, 400);

    assert.equal((await request("POST", `/api/tarefas/${taskId}/comentarios`, { token: adminToken, body: { texto: " " } })).status, 400);
    assert.equal((await request("POST", `/api/tarefas/${taskId}/comentarios`, { token: adminToken, body: { texto: "Comentário válido" } })).status, 201);

    assert.equal((await request("POST", "/api/etiquetas", { token: adminToken, body: { quadro_id: privateBoardId, nome: "Urgente", cor: "vermelho" } })).status, 400);
    const label = await request("POST", "/api/etiquetas", { token: adminToken, body: { quadro_id: privateBoardId, nome: "Urgente", cor: "#FF0000" } });
    assert.equal(label.status, 201);
    labelId = label.data.id;
    assert.equal((await request("PATCH", `/api/etiquetas/${labelId}`, { token: adminToken, body: { nome: "Prioridade", cor: "#00FF00" } })).status, 200);
    const boardHistory = await request("GET", `/api/quadros/${privateBoardId}/atividades`, { token: adminToken });
    const labelUpdate = boardHistory.data.find((event) => event.acao === "etiqueta.atualizada");
    assert.equal(labelUpdate.detalhes.antes.nome, "Urgente");
    assert.equal(labelUpdate.detalhes.depois.nome, "Prioridade");
    assert.equal((await request("PUT", `/api/tarefas/${taskId}/etiquetas`, { token: adminToken, body: { etiqueta_ids: [labelId] } })).status, 200);
    assert.equal((await request("GET", `/api/tarefas/${taskId}/atividades`, { token: adminToken })).status, 200);
  });

  await t.test("observador não pode alterar a sala", async () => {
    assert.equal((await request("PATCH", "/api/salas/1/membros/2/papel", { token: adminToken, body: { papel: "observador" } })).status, 200);
    assert.equal((await request("POST", "/api/quadros", { token: memberToken, body: { nome: "Bloqueado", sala_id: 1 } })).status, 403);
    assert.equal((await request("POST", "/api/listas", { token: memberToken, body: { nome: "Bloqueado", quadro_id: 1 } })).status, 403);
    assert.equal((await request("PATCH", `/api/tarefas/${taskId}/prazo`, { token: memberToken, body: { prazo: "2026-11-10T18:00:00-03:00", lembretes_minutos_antes: [15] } })).status, 403);
  });

  await t.test("convite precisa ser aceito e conta pode ser excluída", async () => {
    const convite = await request("POST", "/api/salas/1/convites", { token: adminToken, body: { email: "visitante@test.local", papel: "membro" } });
    assert.equal(convite.status, 201, JSON.stringify(convite.data));
    const tokenConvite = convite.data.convite.token;
    assert.equal((await request("GET", "/api/salas/convites/recebidos", { token: outsiderToken })).status, 200);
    assert.equal((await request("POST", `/api/salas/convites/${tokenConvite}/aceitar`, { token: memberToken })).status, 403);
    assert.equal((await request("POST", `/api/salas/convites/${tokenConvite}/aceitar`, { token: outsiderToken })).status, 200);
    assert.equal((await request("POST", `/api/salas/convites/${tokenConvite}/aceitar`, { token: outsiderToken })).status, 409);
    assert.equal((await request("DELETE", "/api/auth/conta", { token: outsiderToken })).status, 200);
    assert.equal((await request("GET", "/api/salas", { token: outsiderToken })).status, 401);
  });
});
