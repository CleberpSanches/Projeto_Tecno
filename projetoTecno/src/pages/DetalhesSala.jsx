import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { obterSala } from "../api/salas";
import { listarMembros } from "../api/membros";
import { listarTarefas, criarTarefa, excluirTarefa } from "../api/tarefas";

const colunas = [
    { id: "pendente", titulo: "A fazer" },
    { id: "em_andamento", titulo: "Em andamento" },
    { id: "concluida", titulo: "Concluídas" },
];

const prioridades = [
    { id: "baixa", titulo: "Baixa" },
    { id: "media", titulo: "Média" },
    { id: "alta", titulo: "Alta" },
];

const formularioInicial = {
    titulo: "",
    status: "pendente",
    prazo: "",
    prioridade: "media",
    responsavelId: "",
};

const coresPrioridade = {
    baixa: "bg-emerald-500/15 text-emerald-300",
    media: "bg-amber-500/15 text-amber-300",
    alta: "bg-red-500/15 text-red-300",
};

const nomesStatus = Object.fromEntries(
    colunas.map((coluna) => [coluna.id, coluna.titulo])
);

function normalizarLista(resposta, chaves = []) {
    if (Array.isArray(resposta)) return resposta;

    for (const chave of chaves) {
        if (Array.isArray(resposta?.[chave])) {
            return resposta[chave];
        }
    }

    return [];
}

// Pega o id do usuário em qualquer formato: id simples, linha de
// usuario_tarefa (id_usuario) ou participante (id).
function obterIdUsuario(item) {
    if (item == null) return null;
    if (typeof item === "string" || typeof item === "number") return item;

    return (
        item.id_usuario ??
        item.usuario_id ??
        item.usuario?.id ??
        item.id ??
        null
    );
}

// Transforma qualquer formato de participante em { id, nome, email }.
function normalizarParticipante(item) {
    const dados = item?.usuario ?? item ?? {};

    return {
        id: obterIdUsuario(item),
        nome: dados.nome,
        email: dados.email,
    };
}

// Retorna os responsáveis da tarefa já com nome e email.
function obterResponsaveis(tarefa, participantes) {
    const relacoes = tarefa.usuario_tarefa ?? tarefa.responsaveis ?? [];

    // Cópia, para nunca alterar o array que está no estado.
    const lista = Array.isArray(relacoes) ? [...relacoes] : [];

    if (lista.length === 0 && tarefa.responsavel_id != null) {
        lista.push(tarefa.responsavel_id);
    }

    return lista
        .map((relacao) => {
            const idUsuario = obterIdUsuario(relacao);
            if (idUsuario == null) return null;

            // 1º usa o usuário que veio no join; 2º procura nos participantes.
            const dados =
                (typeof relacao === "object" ? relacao.usuario : null) ??
                participantes.find(
                    (pessoa) => String(pessoa.id) === String(idUsuario)
                );

            return {
                id: idUsuario,
                nome: dados?.nome,
                email: dados?.email,
            };
        })
        .filter(Boolean);
}

function formatarPrazo(prazo) {
    if (!prazo) return "Sem prazo definido";

    const [ano, mes, dia] = String(prazo).slice(0, 10).split("-").map(Number);
    if (!ano || !mes || !dia) return "Prazo inválido";

    return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR");
}

export default function DetalhesSala() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [sala, setSala] = useState(null);
    const [tarefas, setTarefas] = useState([]);
    const [participantes, setParticipantes] = useState([]);
    const [mostrarParticipantes, setMostrarParticipantes] = useState(false);
    const [carregando, setCarregando] = useState(true);
    const [mensagem, setMensagem] = useState("");
    const [mostrarModal, setMostrarModal] = useState(false);
    const [formulario, setFormulario] = useState(formularioInicial);
    const [salvando, setSalvando] = useState(false);
    const [tarefaSelecionada, setTarefaSelecionada] = useState(null);
    const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
    const [excluindo, setExcluindo] = useState(false);
    const [erroDetalhes, setErroDetalhes] = useState("");

    useEffect(() => {
        let ativo = true;

        async function carregarDados() {
            try {
                setCarregando(true);
                setMensagem("");
                setSala(null);
                setTarefas([]);
                setParticipantes([]);
                setTarefaSelecionada(null);

                const [dadosSala, dadosTarefas, dadosParticipantes] =
                    await Promise.all([
                        obterSala(id),
                        listarTarefas({ id_sala: id }),
                        listarMembros(id),
                    ]);

                if (!ativo) return;

                setSala(dadosSala?.sala ?? dadosSala);

                setTarefas(
                    normalizarLista(dadosTarefas, ["tarefas"]).filter(
                        (tarefa) =>
                            tarefa.id_sala == null ||
                            String(tarefa.id_sala) === String(id)
                    )
                );

                setParticipantes(
                    normalizarLista(dadosParticipantes, [
                        "participantes",
                        "membros",
                        "usuarios",
                    ]).map(normalizarParticipante)
                );
            } catch (error) {
                if (!ativo) return;

                setMensagem(
                    error.message || "Não foi possível carregar a sala."
                );
            } finally {
                if (ativo) setCarregando(false);
            }
        }

        carregarDados();

        return () => {
            ativo = false;
        };
    }, [id]);

    useEffect(() => {
        if (!tarefaSelecionada) return;

        function aoPressionarTecla(evento) {
            if (evento.key === "Escape" && !excluindo) {
                setTarefaSelecionada(null);
                setConfirmandoExclusao(false);
                setErroDetalhes("");
            }
        }

        window.addEventListener("keydown", aoPressionarTecla);
        return () => window.removeEventListener("keydown", aoPressionarTecla);
    }, [tarefaSelecionada, excluindo]);

    async function copiarCodigo() {
        if (!sala?.codigo_sala) {
            setMensagem("O código da sala não está disponível.");
            return;
        }

        try {
            await navigator.clipboard.writeText(sala.codigo_sala);
            setMensagem("Código copiado! Compartilhe com quem deve entrar.");
        } catch {
            setMensagem(
                `Não foi possível copiar automaticamente. Código: ${sala.codigo_sala}`
            );
        }
    }

    function atualizarCampo(campo, valor) {
        setFormulario((atual) => ({
            ...atual,
            [campo]: valor,
        }));
    }

    function abrirModal(statusInicial = "pendente") {
        setFormulario({
            ...formularioInicial,
            status: statusInicial,
        });

        setMensagem("");
        setMostrarModal(true);
    }

    function fecharModal() {
        if (salvando) return;
        setMostrarModal(false);
    }

    function abrirDetalhes(tarefa) {
        setTarefaSelecionada(tarefa);
        setConfirmandoExclusao(false);
        setErroDetalhes("");
    }

    function fecharDetalhes() {
        if (excluindo) return;
        setTarefaSelecionada(null);
        setConfirmandoExclusao(false);
        setErroDetalhes("");
    }

    async function enviarTarefa(evento) {
        evento.preventDefault();

        const titulo = formulario.titulo.trim();

        if (!titulo) {
            setMensagem("Informe um título para a tarefa.");
            return;
        }

        const responsavelSelecionado = participantes.find(
            (pessoa) => String(pessoa.id) === String(formulario.responsavelId)
        );

        try {
            setSalvando(true);
            setMensagem("");

            const resposta = await criarTarefa({
                id_sala: id,
                titulo,
                status: formulario.status,
                prioridade: formulario.prioridade,
                prazo: formulario.prazo || null,
                responsaveis: formulario.responsavelId
                    ? [formulario.responsavelId]
                    : [],
            });

            const dadosTarefa = resposta?.tarefa ?? resposta;

            if (!dadosTarefa || dadosTarefa.id == null) {
                throw new Error(
                    "A API não retornou os dados esperados da tarefa. Verifique a resposta do servidor."
                );
            }

            const usuarioTarefa =
                Array.isArray(dadosTarefa.usuario_tarefa) &&
                dadosTarefa.usuario_tarefa.length > 0
                    ? dadosTarefa.usuario_tarefa
                    : responsavelSelecionado
                    ? [
                          {
                              id_usuario: responsavelSelecionado.id,
                              usuario: responsavelSelecionado,
                          },
                      ]
                    : [];

            const novaTarefa = {
                ...dadosTarefa,
                id_sala: dadosTarefa.id_sala ?? id,
                usuario_tarefa: usuarioTarefa,
            };

            setTarefas((atuais) => [...atuais, novaTarefa]);
            setMostrarModal(false);
            setFormulario(formularioInicial);
            setMensagem("Tarefa criada com sucesso!");
        } catch (error) {
            setMensagem(error.message || "Não foi possível criar a tarefa.");
        } finally {
            setSalvando(false);
        }
    }

    async function handleExcluirTarefa() {
        if (!tarefaSelecionada) return;

        try {
            setExcluindo(true);
            setErroDetalhes("");

            await excluirTarefa(tarefaSelecionada.id);

            setTarefas((atuais) =>
                atuais.filter((item) => item.id !== tarefaSelecionada.id)
            );
            setTarefaSelecionada(null);
            setConfirmandoExclusao(false);
            setMensagem("Tarefa excluída com sucesso!");
        } catch (error) {
            setErroDetalhes(
                error.message || "Ocorreu um erro ao excluir a tarefa."
            );
        } finally {
            setExcluindo(false);
        }
    }

    if (carregando) {
        return (
            <div className="min-h-screen bg-[#0B0F1A] text-gray-300">
                <Sidebar />
                <main className="ml-64 p-8">Carregando sala...</main>
            </div>
        );
    }

    if (!sala) {
        return (
            <div className="min-h-screen bg-[#0B0F1A] text-white">
                <Sidebar />
                <main className="ml-64 p-8">
                    <p className="mb-4 text-red-300">
                        {mensagem || "Sala não encontrada."}
                    </p>

                    <button
                        type="button"
                        onClick={() => navigate("/projetos")}
                        className="rounded-lg bg-violet-600 px-4 py-2 transition hover:bg-violet-500"
                    >
                        Voltar aos projetos
                    </button>
                </main>
            </div>
        );
    }

    // dados do modal de detalhes
    const responsaveisSelecionados = tarefaSelecionada
        ? obterResponsaveis(tarefaSelecionada, participantes)
        : [];

    const criadorSelecionado = tarefaSelecionada
        ? participantes.find(
              (pessoa) =>
                  String(pessoa.id) === String(tarefaSelecionada.id_criador)
          )
        : null;

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white">
            <Sidebar />

            <main className="ml-64 min-h-screen p-8">
                <button
                    type="button"
                    onClick={() => navigate("/projetos")}
                    className="mb-6 text-sm text-gray-400 transition hover:text-violet-300"
                >
                    ← Voltar aos projetos
                </button>

                <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
                    <div>
                        <p className="mb-2 text-sm text-violet-400">
                            SALA DE PROJETO
                        </p>

                        <h1 className="text-3xl font-bold">{sala.nome}</h1>

                        <p className="mt-2 text-gray-400">
                            Organize e acompanhe as tarefas de toda a equipe.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={copiarCodigo}
                        className="rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/20"
                    >
                        Copiar código da sala
                    </button>
                </div>

                {mensagem && (
                    <div
                        role="status"
                        className="mb-5 rounded-xl border border-gray-700 bg-[#111827] p-3 text-sm text-gray-300"
                    >
                        {mensagem}
                    </div>
                )}

                <section className="mb-8 overflow-hidden rounded-2xl border border-gray-800 bg-[#111827]">
                    <button
                        type="button"
                        onClick={() =>
                            setMostrarParticipantes((atual) => !atual)
                        }
                        aria-expanded={mostrarParticipantes}
                        className="flex w-full items-center justify-between p-5 text-left transition hover:bg-gray-800/50"
                    >
                        <div>
                            <h2 className="font-semibold">Participantes</h2>
                            <p className="mt-1 text-sm text-gray-400">
                                {participantes.length} pessoa(s) com acesso à sala
                            </p>
                        </div>

                        <span className="text-xl text-gray-400">
                            {mostrarParticipantes ? "−" : "+"}
                        </span>
                    </button>

                    {mostrarParticipantes && (
                        <div className="border-t border-gray-800 p-4">
                            {participantes.length === 0 ? (
                                <p className="text-sm text-gray-400">
                                    Nenhum participante encontrado.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {participantes.map((pessoa) => (
                                        <div
                                            key={pessoa.id}
                                            className="flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-gray-800/50"
                                        >
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 font-semibold text-violet-200">
                                                {(pessoa.nome || pessoa.email || "?")
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    {pessoa.nome || "Usuário"}
                                                </p>
                                                <p className="truncate text-xs text-gray-400">
                                                    {pessoa.email || ""}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold">Quadro de tarefas</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            {tarefas.length} tarefa(s) nesta sala
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => abrirModal()}
                        className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-500"
                    >
                        + Nova tarefa
                    </button>
                </div>

                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
                    {colunas.map((coluna) => {
                        const tarefasDaColuna = tarefas.filter(
                            (tarefa) => tarefa.status === coluna.id
                        );

                        return (
                            <section
                                key={coluna.id}
                                className="min-h-64 rounded-2xl border border-gray-800 bg-[#111827] p-4"
                            >
                                <div className="mb-4 flex items-center justify-between gap-2">
                                    <h3 className="font-semibold">
                                        {coluna.titulo}
                                    </h3>

                                    <div className="flex items-center gap-2">
                                        <span className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs text-gray-300">
                                            {tarefasDaColuna.length}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() => abrirModal(coluna.id)}
                                            className="text-xs text-gray-400 transition hover:text-violet-300"
                                        >
                                            + Adicionar
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {tarefasDaColuna.map((tarefa) => {
                                        const responsaveis = obterResponsaveis(
                                            tarefa,
                                            participantes
                                        );

                                        return (
                                            <article
                                                key={tarefa.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => abrirDetalhes(tarefa)}
                                                onKeyDown={(evento) => {
                                                    if (
                                                        evento.key === "Enter" ||
                                                        evento.key === " "
                                                    ) {
                                                        evento.preventDefault();
                                                        abrirDetalhes(tarefa);
                                                    }
                                                }}
                                                className="cursor-pointer rounded-xl border border-gray-800 bg-[#0B0F1A] p-4 transition hover:border-violet-500/40 focus:border-violet-500/60 focus:outline-none"
                                            >
                                                <h4 className="break-words font-medium">
                                                    {tarefa.titulo}
                                                </h4>

                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    {tarefa.prioridade && (
                                                        <span
                                                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                                                coresPrioridade[
                                                                    tarefa.prioridade
                                                                ] ||
                                                                "bg-gray-800 text-gray-300"
                                                            }`}
                                                        >
                                                            {prioridades.find(
                                                                (p) =>
                                                                    p.id ===
                                                                    tarefa.prioridade
                                                            )?.titulo ||
                                                                tarefa.prioridade}
                                                        </span>
                                                    )}

                                                    {tarefa.prazo && (
                                                        <span className="text-xs text-gray-400">
                                                            Prazo:{" "}
                                                            {formatarPrazo(
                                                                tarefa.prazo
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                {tarefa.descricao && (
                                                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-400">
                                                        {tarefa.descricao}
                                                    </p>
                                                )}

                                                <div className="mt-4 border-t border-gray-800 pt-3">
                                                    <p className="text-xs text-gray-500">
                                                        Responsável(is)
                                                    </p>

                                                    {responsaveis.length > 0 ? (
                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                            {responsaveis.map(
                                                                (pessoa) => (
                                                                    <span
                                                                        key={pessoa.id}
                                                                        className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200"
                                                                    >
                                                                        {pessoa.nome ||
                                                                            pessoa.email ||
                                                                            "Usuário"}
                                                                    </span>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1 text-sm text-gray-400">
                                                            Não definido
                                                        </p>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}

                                    {tarefasDaColuna.length === 0 && (
                                        <div className="rounded-xl border border-dashed border-gray-800 p-5 text-center text-sm text-gray-500">
                                            Nenhuma tarefa aqui
                                        </div>
                                    )}
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Modal: nova tarefa */}
                {mostrarModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
                        onMouseDown={(evento) => {
                            if (evento.target === evento.currentTarget) {
                                fecharModal();
                            }
                        }}
                    >
                        <form
                            onSubmit={enviarTarefa}
                            className="my-auto w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl"
                        >
                            <h2 className="mb-5 text-xl font-bold">
                                Nova tarefa
                            </h2>

                            <label className="mb-4 block text-sm">
                                <span className="mb-1 block text-gray-400">
                                    Título *
                                </span>

                                <input
                                    type="text"
                                    value={formulario.titulo}
                                    onChange={(evento) =>
                                        atualizarCampo("titulo", evento.target.value)
                                    }
                                    maxLength={100}
                                    required
                                    autoFocus
                                    className="w-full rounded-lg border border-gray-700 bg-[#0B0F1A] px-3 py-2 outline-none focus:border-violet-500"
                                />
                            </label>

                            <label className="mb-4 block text-sm">
                                <span className="mb-1 block text-gray-400">
                                    Responsável
                                </span>

                                <select
                                    value={formulario.responsavelId}
                                    onChange={(evento) =>
                                        atualizarCampo(
                                            "responsavelId",
                                            evento.target.value
                                        )
                                    }
                                    className="w-full rounded-lg border border-gray-700 bg-[#0B0F1A] px-3 py-2 outline-none focus:border-violet-500"
                                >
                                    <option value="">Sem responsável</option>

                                    {participantes.map((pessoa) => (
                                        <option key={pessoa.id} value={pessoa.id}>
                                            {pessoa.nome ||
                                                pessoa.email ||
                                                `Usuário ${pessoa.id}`}
                                        </option>
                                    ))}
                                </select>

                                <span className="mt-1 block text-xs text-gray-500">
                                    Escolha quem ficará responsável por esta tarefa.
                                </span>
                            </label>

                            <div className="mb-4 grid grid-cols-2 gap-4">
                                <label className="block text-sm">
                                    <span className="mb-1 block text-gray-400">
                                        Status
                                    </span>

                                    <select
                                        value={formulario.status}
                                        onChange={(evento) =>
                                            atualizarCampo("status", evento.target.value)
                                        }
                                        className="w-full rounded-lg border border-gray-700 bg-[#0B0F1A] px-3 py-2 outline-none focus:border-violet-500"
                                    >
                                        {colunas.map((coluna) => (
                                            <option key={coluna.id} value={coluna.id}>
                                                {coluna.titulo}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block text-sm">
                                    <span className="mb-1 block text-gray-400">
                                        Prioridade
                                    </span>

                                    <select
                                        value={formulario.prioridade}
                                        onChange={(evento) =>
                                            atualizarCampo(
                                                "prioridade",
                                                evento.target.value
                                            )
                                        }
                                        className="w-full rounded-lg border border-gray-700 bg-[#0B0F1A] px-3 py-2 outline-none focus:border-violet-500"
                                    >
                                        {prioridades.map((prioridade) => (
                                            <option
                                                key={prioridade.id}
                                                value={prioridade.id}
                                            >
                                                {prioridade.titulo}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <label className="mb-6 block text-sm">
                                <span className="mb-1 block text-gray-400">
                                    Prazo
                                </span>

                                <input
                                    type="date"
                                    value={formulario.prazo}
                                    onChange={(evento) =>
                                        atualizarCampo("prazo", evento.target.value)
                                    }
                                    className="w-full rounded-lg border border-gray-700 bg-[#0B0F1A] px-3 py-2 outline-none focus:border-violet-500 [color-scheme:dark]"
                                />
                            </label>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={fecharModal}
                                    disabled={salvando}
                                    className="rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:text-white disabled:opacity-50"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {salvando ? "Salvando..." : "Criar tarefa"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Modal: detalhes da tarefa */}
                {tarefaSelecionada && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4"
                        onMouseDown={(evento) => {
                            if (evento.target === evento.currentTarget) {
                                fecharDetalhes();
                            }
                        }}
                    >
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="my-auto w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl"
                        >
                            <div className="mb-5 flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="mb-1 text-xs text-gray-500">
                                        Tarefa #{tarefaSelecionada.id}
                                    </p>
                                    <h2 className="break-words text-xl font-bold">
                                        {tarefaSelecionada.titulo}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={fecharDetalhes}
                                    disabled={excluindo}
                                    aria-label="Fechar"
                                    className="text-xl leading-none text-gray-400 transition hover:text-white disabled:opacity-50"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="mb-5 flex flex-wrap items-center gap-2">
                                <span className="rounded-md bg-gray-800 px-2 py-0.5 text-xs text-gray-300">
                                    {nomesStatus[tarefaSelecionada.status] ||
                                        tarefaSelecionada.status}
                                </span>

                                {tarefaSelecionada.prioridade && (
                                    <span
                                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                                            coresPrioridade[
                                                tarefaSelecionada.prioridade
                                            ] || "bg-gray-800 text-gray-300"
                                        }`}
                                    >
                                        Prioridade{" "}
                                        {(
                                            prioridades.find(
                                                (p) =>
                                                    p.id ===
                                                    tarefaSelecionada.prioridade
                                            )?.titulo ||
                                            tarefaSelecionada.prioridade
                                        ).toLowerCase()}
                                    </span>
                                )}
                            </div>

                            <dl className="space-y-4 text-sm">
                                <div>
                                    <dt className="text-xs text-gray-500">Prazo</dt>
                                    <dd className="mt-1 text-gray-300">
                                        {formatarPrazo(tarefaSelecionada.prazo)}
                                    </dd>
                                </div>

                                {tarefaSelecionada.descricao && (
                                    <div>
                                        <dt className="text-xs text-gray-500">
                                            Descrição
                                        </dt>
                                        <dd className="mt-1 whitespace-pre-wrap break-words text-gray-300">
                                            {tarefaSelecionada.descricao}
                                        </dd>
                                    </div>
                                )}

                                <div>
                                    <dt className="text-xs text-gray-500">
                                        Responsável(is)
                                    </dt>
                                    <dd className="mt-1">
                                        {responsaveisSelecionados.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {responsaveisSelecionados.map(
                                                    (pessoa) => (
                                                        <span
                                                            key={pessoa.id}
                                                            className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200"
                                                        >
                                                            {pessoa.nome ||
                                                                pessoa.email ||
                                                                "Usuário"}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">
                                                Não definido
                                            </span>
                                        )}
                                    </dd>
                                </div>

                                {criadorSelecionado && (
                                    <div>
                                        <dt className="text-xs text-gray-500">
                                            Criada por
                                        </dt>
                                        <dd className="mt-1 text-gray-300">
                                            {criadorSelecionado.nome ||
                                                criadorSelecionado.email ||
                                                "Usuário"}
                                        </dd>
                                    </div>
                                )}
                            </dl>

                            {erroDetalhes && (
                                <div
                                    role="alert"
                                    className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
                                >
                                    {erroDetalhes}
                                </div>
                            )}

                            <div className="mt-6 border-t border-gray-800 pt-5">
                                {confirmandoExclusao ? (
                                    <div>
                                        <p className="mb-3 text-sm text-gray-300">
                                            Tem certeza que deseja excluir esta
                                            tarefa? Essa ação não pode ser desfeita.
                                        </p>

                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmandoExclusao(false)
                                                }
                                                disabled={excluindo}
                                                className="rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:text-white disabled:opacity-50"
                                            >
                                                Cancelar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleExcluirTarefa}
                                                disabled={excluindo}
                                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {excluindo
                                                    ? "Excluindo..."
                                                    : "Sim, excluir"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-between gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setConfirmandoExclusao(true)}
                                            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 transition hover:bg-red-500/10"
                                        >
                                            Excluir tarefa
                                        </button>

                                        <button
                                            type="button"
                                            onClick={fecharDetalhes}
                                            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold transition hover:bg-violet-500"
                                        >
                                            Fechar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}