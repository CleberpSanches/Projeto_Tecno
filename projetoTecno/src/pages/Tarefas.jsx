
import { useCallback, useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";


function estaAtrasada(tarefa) {
    if (!tarefa.prazo || tarefa.status === "concluida") {
        return false;
    }

    return new Date(tarefa.prazo).getTime() < Date.now();
}

function formatarPrazo(prazo) {
    if (!prazo) return "Sem prazo definido";

    const data = new Date(prazo);

    if (Number.isNaN(data.getTime())) {
        return "Prazo inválido";
    }

    return data.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    });
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

            const dados = await listarTarefasDoUsuario();
            setTarefas(dados);
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
        if (filtro === "concluidas") {
            return tarefa.status === "concluida";
        }

        if (filtro === "atrasadas") {
            return estaAtrasada(tarefa);
        }

        if (filtro === "pendentes") {
            return tarefa.status !== "concluida" && !estaAtrasada(tarefa);
        }

        return true;
    });

    const grupos = Object.values(
        tarefasFiltradas.reduce((resultado, tarefa) => {
            const chave = String(tarefa.sala_id);

            if (!resultado[chave]) {
                resultado[chave] = {
                    id: tarefa.sala_id,
                    nome: tarefa.sala.nome,
                    tarefas: [],
                };
            }

            resultado[chave].tarefas.push(tarefa);
            return resultado;
        }, {})
    );

    const totalConcluidas = tarefas.filter(
        (tarefa) => tarefa.status === "concluida"
    ).length;

    const totalAtrasadas = tarefas.filter(estaAtrasada).length;

    const totalPendentes = tarefas.filter(
        (tarefa) =>
            tarefa.status !== "concluida" && !estaAtrasada(tarefa)
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
                        <h2 className="text-xl font-bold">
                            Tarefas por sala
                        </h2>

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
                        <p className="text-gray-400">
                            Carregando suas tarefas...
                        </p>
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
                                            const situacao =
                                                obterSituacao(tarefa);

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

                                                        <span className="text-xs text-gray-500">
                                                            #{tarefa.id}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-lg font-semibold">
                                                        {tarefa.titulo}
                                                    </h4>

                                                    <p className="mt-2 min-h-10 flex-1 whitespace-pre-wrap break-words text-sm text-gray-400">
                                                        {tarefa.descricao ||
                                                            "Sem descrição."}
                                                    </p>

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
                                                            className={`mt-1 text-sm ${estaAtrasada(tarefa)
                                                                    ? "text-red-300"
                                                                    : "text-gray-300"
                                                                }`}
                                                        >
                                                            {formatarPrazo(
                                                                tarefa.prazo
                                                            )}
                                                        </p>
                                                    </div>

                                                    {concluida ? (
                                                        <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                                                            ✓ Tarefa concluída
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                handleConcluir(tarefa)
                                                            }
                                                            disabled={
                                                                processandoId ===
                                                                tarefa.id
                                                            }
                                                            className="mt-5 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            {processandoId ===
                                                                tarefa.id
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
