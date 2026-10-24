import { tarefas, notificacoes } from "./dados.js";

const lembretesDisparados = new Set();

/** Verifica prazos e registra notificações para responsáveis. Pode ser chamada em testes. */
export function processarLembretes(agora = new Date()) {
    const instante = agora.getTime();
    let criados = 0;
    for (const tarefa of tarefas) {
        if (tarefa.arquivada || tarefa.status === "concluida" || !tarefa.prazo) continue;
        const prazo = Date.parse(tarefa.prazo);
        if (!Number.isFinite(prazo)) continue;
        for (const minutos of tarefa.lembretes_minutos_antes ?? []) {
            const disparo = prazo - Number(minutos) * 60_000;
            if (instante < disparo) continue;
            const chave = `${tarefa.id}:${prazo}:${minutos}`;
            if (lembretesDisparados.has(chave)) continue;
            const destinatarios = [...new Set((tarefa.responsaveis ?? []).map(Number))];
            if (destinatarios.length === 0) continue;
            for (const usuario_id of destinatarios) {
                notificacoes.push({
                    id: notificacoes.length ? Math.max(...notificacoes.map((n) => n.id)) + 1 : 1,
                    usuario_id,
                    tarefa_id: tarefa.id,
                    tipo: "lembrete_prazo",
                    mensagem: `A tarefa "${tarefa.titulo}" vence ${Number(minutos) === 0 ? "agora" : `em ${minutos} minuto(s)`}.`,
                    prazo: tarefa.prazo,
                    minutos_antes: Number(minutos),
                    criada_em: agora.toISOString(),
                    lida: false,
                });
                criados++;
            }
            // Marca mesmo se não houver responsáveis, evitando reprocessamento contínuo.
            lembretesDisparados.add(chave);
        }
    }
    return criados;
}

export function iniciarAgendadorLembretes(intervaloMs = 30_000) {
    const timer = setInterval(() => {
        try { processarLembretes(); }
        catch (erro) { console.error("Falha ao processar lembretes:", erro); }
    }, intervaloMs);
    timer.unref?.();
    return timer;
}
