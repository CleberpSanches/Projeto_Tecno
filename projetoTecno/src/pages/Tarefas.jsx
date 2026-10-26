import { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { listarTarefas, concluirTarefa } from "../api/tarefas.js";

function normalizarLista(resposta, chaves = []) {
    if (Array.isArray(resposta)) return resposta;

    for (const chave of chaves) {
        if (Array.isArray(resposta?.[chave])) return resposta[chave];
    }

    return [];
}

function lerPrazo(prazo) {
    if (!prazo) return null;

    const [ano, mes, dia] = String(prazo).slice(0, 10).split("-").map(Number);

    if (!ano || !mes || !dia) return null;

    return new Date(ano, mes - 1, dia);
}

function inicioDoDia(data = new Date()) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function estaAtrasada(tarefa) {
    if (tarefa.status === "concluida") return false;

    const prazo = lerPrazo(tarefa.prazo);
    if (!prazo) return false;

    // Só fica atrasada depois que o dia do prazo termina.
    return prazo.getTime() < inicioDoDia().getTime();
}

function formatarPrazo(prazo) {
    if (!prazo) return "Sem prazo definido";

    const data = lerPrazo(prazo);
    if (!data) return "Prazo inválido";

    return data.toLocaleDateString("pt-BR");
}

function obterIdSala(tarefa) {
    return (
        tarefa.id_sala ??
        tarefa.sala_id ??
        tarefa.sala?.id ??
        tarefa.salas?.id ??
        null
    );
}

function obterNomeSala(tarefa) {
    const nome = tarefa.sala?.nome ?? tarefa.salas?.nome ?? tarefa.nome_sala;
    if (nome) return nome;

    const idSala = obterIdSala(tarefa);
    return idSala != null ? `Sala #${idSala}` : "Sem sala";
}

function obterSituacao(tarefa) {
    if (tarefa.status === "concluida") {
        return {
            texto: "Concluída",
            classe: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        };
    }

    if (estaAtrasada(tarefa)) {
        return {
            texto: "Atrasada",
            classe: "border-red-500/30 bg-red-500/10 text-red-300",
        };
    }

    if (tarefa.status === "em_andamento") {
        return {
            texto: "Em andamento",
            classe: "border-amber-500/30 bg-amber-500/10 text-amber-300",
        };
    }

    return {
        texto: "Pendente",
        classe: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    };
}

// Tarefas com prazo mais próximo primeiro; sem prazo vão para o fim.
function compararPorPrazo(a, b) {
    const prazoA = lerPrazo(a.prazo)?.getTime() ?? Infinity;
    const prazoB = lerPrazo(b.prazo)?.getTime() ?? Infinity;
    return prazoA - prazoB;
}

export default function Tarefas() {
    const [tarefas, setTarefas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processandoId, setProcessandoId] = useState(null);
    const [mensagem, setMensagem] = useState("");
    const [filtro, setFiltro] = useState("todas");

    const carregarTarefas = useCallback(async () => {
        try {
            setCarregando(true);
            setMensagem("");

            const dados = await listarTarefas();
            setTarefas(normalizarLista(dados, ["tarefas"]));
        } catch (error) {
            setMensagem(
                error.message || "Não foi possível carregar suas tarefas."
            );
        } finally {
            setCarregando(false);
        }
    }, []);

    useEffect(() => {
        carregarTarefas();
    }, [carregarTarefas]);

    async function handleConcluir(tarefa) {
        try {
            setProcessandoId(tarefa.id);
            setMensagem("");

            await concluirTarefa(tarefa.id);

            setTarefas((atuais) =>
                atuais.map((item) =>
                    item.id === tarefa.id
                        ? { ...item, status: "concluida" }
                        : item
                )
            );
        } catch (error) {
            setMensagem(
                error.message || "Não foi possível concluir a tarefa."
            );
        } finally {
            setProcessandoId(null);
        }
    }

    const tarefasFiltradas = tarefas.filter((tarefa) => {
        if (filtro === "concluidas") return tarefa.status === "concluida";
        if (filtro === "atrasadas") return estaAtrasada(tarefa);
        if (filtro === "pendentes") {
            return tarefa.status !== "concluida" && !estaAtrasada(tarefa);
        }
        return true;
    });

    // Agrupa por sala, ordena as salas por nome e as tarefas por prazo.
    const grupos = Object.values(
        tarefasFiltradas.reduce((resultado, tarefa) => {
            const idSala = obterIdSala(tarefa);
            const chave = String(idSala ?? "sem-sala");

            if (!resultado[chave]) {
                resultado[chave] = {
                    id: chave,
                    nome: obterNomeSala(tarefa),
                    tarefas: [],
                };
            }

            resultado[chave].tarefas.push(tarefa);
            return resultado;
        }, {})
    )
        .map((grupo) => ({
            ...grupo,
            tarefas: [...grupo.tarefas].sort(compararPorPrazo),
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    const totalConcluidas = tarefas.filter(
        (tarefa) => tarefa.status === "concluida"
    ).length;

    const totalAtrasadas = tarefas.filter(estaAtrasada).length;

    const totalPendentes = tarefas.filter(
        (tarefa) => tarefa.status !== "concluida" && !estaAtrasada(tarefa)
    ).length;

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white">
            <Sidebar />

            <main className="ml-64 min-h-screen p-8">
                <header className="mb-8">
                    <p className="mb-2 text-sm text-blue-400">
                        ORGANIZAÇÃO PESSOAL
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">
                                Minhas tarefas
                            </h1>
                            <p className="mt-2 text-gray-400">
                                Acompanhe suas responsabilidades em todas as salas.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={carregarTarefas}
                            disabled={carregando}
                            className="rounded-xl border border-gray-700 px-4 py-3 text-sm transition hover:bg-gray-800 disabled:opacity-50"
                        >
                            ↻ Atualizar
                        </button>
                    </div>
                </header>

                {mensagem && (
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                        <span>{mensagem}</span>
                        <button
                            type="button"
                            onClick={carregarTarefas}
                            className="underline"
                        >
                            Tentar novamente
                        </button>
                    </div>
                )}

                <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5">
                        <p className="text-sm text-gray-400">Pendentes</p>
                        <p className="mt-2 text-3xl font-bold text-violet-300">
                            {totalPendentes}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5">
                        <p className="text-sm text-gray-400">Atrasadas</p>
                        <p className="mt-2 text-3xl font-bold text-red-300">
                            {totalAtrasadas}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-5">
                        <p className="text-sm text-gray-400">Concluídas</p>
                        <p className="mt-2 text-3xl font-bold text-emerald-300">
                            {totalConcluidas}
                        </p>
                    </div>
                </section>

                <section>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <h2 className="text-xl font-bold">Tarefas por sala</h2>

                        <select
                            value={filtro}
                            onChange={(e) => setFiltro(e.target.value)}
                            className="rounded-xl border border-gray-700 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-violet-500"
                        >
                            <option value="todas">Todas as tarefas</option>
                            <option value="pendentes">Pendentes</option>
                            <option value="atrasadas">Atrasadas</option>
                            <option value="concluidas">Concluídas</option>
                        </select>
                    </div>

                    {carregando ? (
                        <p className="text-gray-400">Carregando suas tarefas...</p>
                    ) : tarefasFiltradas.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-700 p-12 text-center">
                            <h3 className="text-lg font-semibold">
                                Nenhuma tarefa encontrada
                            </h3>
                            <p className="mt-2 text-sm text-gray-400">
                                Não há tarefas para exibir neste filtro.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {grupos.map((grupo) => (
                                <section key={grupo.id}>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                                            ▦
                                        </div>

                                        <div>
                                            <h3 className="font-semibold">
                                                {grupo.nome}
                                            </h3>
                                            <p className="text-xs text-gray-500">
                                                {grupo.tarefas.length} tarefa(s)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                        {grupo.tarefas.map((tarefa) => {
                                            const situacao = obterSituacao(tarefa);
                                            const concluida =
                                                tarefa.status === "concluida";

                                            return (
                                                <article
                                                    key={tarefa.id}
                                                    className="flex flex-col rounded-2xl border border-gray-800 bg-[#111827] p-5 transition hover:border-violet-500/40"
                                                >
                                                    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                                                        <span
                                                            className={`rounded-lg border px-2.5 py-1 text-xs ${situacao.classe}`}
                                                        >
                                                            {situacao.texto}
                                                        </span>

                                                    </div>

                                                    <h4 className="break-words text-lg font-semibold">
                                                        {tarefa.titulo}
                                                    </h4>


                                                    <div className="mt-5 border-t border-gray-800 pt-4">
                                                        <p className="text-xs text-gray-500">
                                                            Sala
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-300">
                                                            {grupo.nome}
                                                        </p>

                                                        <p className="mt-4 text-xs text-gray-500">
                                                            Prazo
                                                        </p>
                                                        <p
                                                            className={`mt-1 text-sm ${
                                                                estaAtrasada(tarefa)
                                                                    ? "text-red-300"
                                                                    : "text-gray-300"
                                                            }`}
                                                        >
                                                            {formatarPrazo(tarefa.prazo)}
                                                        </p>
                                                    </div>

                                                    {concluida ? (
                                                        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                                                            ✓ Tarefa concluída
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleConcluir(tarefa)
                                                            }
                                                            disabled={
                                                                processandoId ===
                                                                tarefa.id
                                                            }
                                                            className="mt-5 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {processandoId === tarefa.id
                                                                ? "Salvando..."
                                                                : "✓ Marcar como pronta"}
                                                        </button>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}