import test from "node:test";
import assert from "node:assert/strict";
import { tarefas, notificacoes } from "../src/services/dados.js";
import { processarLembretes } from "../src/services/lembretes.js";

test("processa lembrete no horário e evita duplicação", () => {
  const originalTarefas = tarefas.map((t) => structuredClone(t));
  const originalNotificacoes = notificacoes.map((n) => structuredClone(n));
  try {
    tarefas.splice(0, tarefas.length, {
      id: 987654, titulo: "Tarefa de teste de lembrete", prazo: "2030-01-01T12:00:00.000Z",
      lembretes_minutos_antes: [10], responsaveis: [77], arquivada: false, status: "pendente",
    });
    notificacoes.splice(0, notificacoes.length);
    assert.equal(processarLembretes(new Date("2030-01-01T11:49:59.000Z")), 0);
    assert.equal(processarLembretes(new Date("2030-01-01T11:50:00.000Z")), 1);
    assert.equal(notificacoes.length, 1);
    assert.equal(notificacoes[0].usuario_id, 77);
    assert.equal(processarLembretes(new Date("2030-01-01T11:51:00.000Z")), 0);
    assert.equal(notificacoes.length, 1);
  } finally {
    tarefas.splice(0, tarefas.length, ...originalTarefas);
    notificacoes.splice(0, notificacoes.length, ...originalNotificacoes);
  }
});
