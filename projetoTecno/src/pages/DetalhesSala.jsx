
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { obterSala } from "../api/salas.js";

export default function DetalhesSala() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [sala, setSala] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState("");

    useEffect(() => {
        let ativo = true;

        async function carregarSala() {
            try {
                setCarregando(true);
                setErro("");

                const dados = await obterSala(id);

                if (ativo) {
                    setSala(dados.sala ?? dados);
                }
            } catch (error) {
                if (ativo) {
                    setErro(
                        error.message || "Não foi possível carregar esta sala."
                    );
                }
            } finally {
                if (ativo) {
                    setCarregando(false);
                }
            }
        }

        carregarSala();

        return () => {
            ativo = false;
        };
    }, [id]);

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white">
            <Sidebar />

            <main className="ml-64 min-h-screen p-8">
                <button
                    onClick={() => navigate("/projetos")}
                    className="mb-6 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                    ← Voltar aos projetos
                </button>

                {carregando ? (
                    <p className="text-gray-400">Carregando sala...</p>
                ) : erro ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
                        <h1 className="text-xl font-bold text-red-300">
                            Não foi possível abrir a sala
                        </h1>
                        <p className="mt-2 text-red-200">{erro}</p>

                        <button
                            onClick={() => navigate("/projetos")}
                            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 hover:bg-violet-500"
                        >
                            Voltar aos projetos
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="mb-2 text-sm text-violet-400">
                            ÁREA DE TRABALHO
                        </p>

                        <h1 className="text-3xl font-bold">
                            {sala?.nome || "Sala sem nome"}
                        </h1>

                        <p className="mt-3 text-gray-400">
                            Sala #{sala?.id ?? id}
                        </p>

                        <section className="mt-8 rounded-2xl border border-gray-800 bg-[#111827] p-6">
                            <h2 className="text-xl font-semibold">
                                Visão geral
                            </h2>

                            <p className="mt-2 text-gray-400">
                                Você está visualizando os detalhes desta sala.
                            </p>

                            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                <button
                                    onClick={() => navigate("/tarefas")}
                                    className="rounded-xl border border-gray-700 p-5 text-left transition hover:border-violet-500"
                                >
                                    <h3 className="font-semibold">
                                        Minhas tarefas
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-400">
                                        Acessar a página de tarefas.
                                    </p>
                                </button>

                                <button
                                    onClick={() => navigate("/calendario")}
                                    className="rounded-xl border border-gray-700 p-5 text-left transition hover:border-violet-500"
                                >
                                    <h3 className="font-semibold">
                                        Calendário
                                    </h3>
                                    <p className="mt-2 text-sm text-gray-400">
                                        Visualizar o calendário.
                                    </p>
                                </button>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
