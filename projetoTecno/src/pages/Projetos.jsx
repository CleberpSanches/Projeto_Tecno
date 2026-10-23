import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function Projetos() {
    const navigate = useNavigate();

    const [salas, setSalas] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [modal, setModal] = useState("");
    const [nomeSala, setNomeSala] = useState("");
    const [codigo, setCodigo] = useState("");
    const [mensagem, setMensagem] = useState("");
    const [processando, setProcessando] = useState(false);

    async function carregarSalas() {
        try {
            setCarregando(true);
            const dados = await listarSalasDoUsuario();
            setSalas(dados);
        } catch (error) {
            setMensagem(error.message || "Ocorreu um erro ao carregar as salas.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregarSalas();
    }, []);

    async function handleCriarSala() {
        e.preventDefault();
        //se tiver vazia para a função
        if (!nomeSala.trim()) return;

        try {
            setProcessando(true);
            setMensagem("");

            const sala = await criarSala(nomeSala.trim);
            //atuais é o paramatro do estado atual armazenado em sala e atualiza o estado para add a nova sala na lista
            setSalas((atuais) => [...atuais, sala]);
            setModal("");
            setNomeSala("");
            navigate(`/projetos/${sala.id}`);
        } catch (error) {
            setMensagem(error.message || "Ocorreu um erro ao criar a sala.");
        } finally {
            setProcessando(false);
        }
    }

    async function handleEntrarNaSala() {
        e.preventDefault();
        if (!codigo.trim()) return;

        try {
            setProcessando(true);
            setMensagem("");

            const sala = await entrarNaSala(codigo);
            setModal("");
            setCodigo("");
            navigate(`/projetos/${sala.id}`);
        } catch (error) {
            setMensagem(error.message || "Ocorreu um erro ao entrar na sala.");
        } finally {
            setProcessando(false);
        }
    }

    return (
        <div className="min-h-sreen bg-[#0B0F1A] text-white">
            <Sidebar />

            <main className="ml-64 min-h-screen p-8">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="mb-2 text-sm text-blue-400">
                            ORGANIZAÇÃO
                        </p>
                        <h1 className="text-3xl font-bold">Meus projetos</h1>
                        <p className="mt-2 text-gray-400">
                            Todas as salas das quais você participa.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => {
                                setMensagem("");
                                setModal("entrar");
                            }}
                            className="rounded-xl border border-gray-700 px-4 py-3 text-sm transition hover:bg-gray-800"
                        >
                            <span className="mr-2">↗</span>
                            Entrar em uma sala
                        </button>

                        <button onClick={() => {
                            setMensagem("");
                            setModal("criar");
                        }}
                            className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold transition hover:bg-blue-600"
                        >
                            <span className="mr-2">+</span>
                            Criar sala
                        </button>
                    </div>
                </div>

                {mensagem && !modal && (
                    <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                        {mensagem}
                    </p>
                )}

                {carregando ? (
                    <p className="text-gray-400">Carregando suas salas...</p>
                ) : salas.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-700 p-12 text-center">
                        <div className="mb-4 text-4xl">▦</div>
                        <h2 className="text-xl font-semibold">
                            Nenhuma sala por enquanto
                        </h2>
                        <p className="mt-2 text-gray-400">
                            Crie uma sala ou entre usando o código de convite.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {salas.map((sala) => (
                            <button
                                key={sala.id}
                                onClick={() =>
                                    navigate(`/projetos/${sala.id}`)
                                }
                                className="group rounded-2xl border border-gray-800 bg-[#111827] p-6 text-left transition hover:-translate-y-1 hover:border-violet-500/60 hover:bg-[#151d2e]"
                            >
                                <div className="mb-5 flex items-start justify-between">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-xl text-violet-300">
                                        ▦
                                    </div>
                                    <span className="text-xl text-gray-500 transition group-hover:translate-x-1 group-hover:text-violet-300">
                                        →
                                    </span>
                                </div>

                                <h2 className="truncate text-lg font-semibold">
                                    {sala.nome}
                                </h2>

                                <p className="mt-2 text-sm text-gray-400">
                                    Acessar tarefas e participantes
                                </p>

                                <div className="mt-6 border-t border-gray-800 pt-4 text-xs text-gray-500">
                                    Abrir sala
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </main>

            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#111827] p-6 shadow-2xl">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-xl font-bold">
                                {modal === "criar"
                                    ? "Criar sala"
                                    : "Entrar em uma sala"}
                            </h2>

                            <button
                                onClick={() => {
                                    setModal("");
                                    setMensagem("");
                                }}
                                aria-label="Fechar"
                                className="rounded-lg px-3 py-1 text-xl text-gray-400 hover:bg-gray-800 hover:text-white"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={
                                modal === "criar"
                                    ? handleCriarSala
                                    : handleEntrarNaSala
                            }
                        >
                            <label className="mb-2 block text-sm text-gray-300">
                                {modal === "criar"
                                    ? "Nome da sala"
                                    : "Código da sala"}
                            </label>

                            <input
                                required
                                value={modal === "criar" ? nomeSala : codigo}
                                onChange={(e) =>
                                    modal === "criar"
                                        ? setNomeSala(e.target.value)
                                        : setCodigo(e.target.value.toUpperCase())
                                }
                                placeholder={
                                    modal === "criar"
                                        ? "Ex.: Desenvolvimento"
                                        : "Digite o código de convite"
                                }
                                className="w-full rounded-xl border border-gray-700 bg-[#0B0F1A] px-4 py-3 outline-none transition focus:border-violet-500"
                            />

                            {mensagem && (
                                <p className="mt-3 text-sm text-red-300">
                                    {mensagem}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={processando}
                                className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 font-semibold transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {processando
                                    ? "Aguarde..."
                                    : modal === "criar"
                                        ? "Criar sala"
                                        : "Entrar na sala"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
