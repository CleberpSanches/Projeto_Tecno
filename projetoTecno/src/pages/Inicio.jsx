
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import LoginCadastro from "./LoginCadastro";

export default function Inicio() {
    const [mostrarLogin, setMostrarLogin] = useState(true);

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white">
            <Sidebar />

            {/* fundo */}
            <main className="ml-64 min-h-screen p-8 md:p-12">
                <span className="text-blue-400 text-sm uppercase tracking-widest">
                    Sobre a aplicação
                </span>

                <h1 className="text-4xl font-bold mt-4">
                    Bem-vindo ao{" "}
                    <span className="text-blue-400">TecnoPlan</span>
                </h1>

                <p className="text-gray-400 mt-4 max-w-2xl leading-relaxed">
                    Um espaço desenvolvido para facilitar a organização,
                    a colaboração e o desenvolvimento de atividades em equipe
                    por meio de salas virtuais.
                </p>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                    <article className="bg-[#111827] border border-gray-800 rounded-2xl p-6">

                        <h2 className="text-xl font-semibold mb-3">
                            Colaboração
                        </h2>
                        <p className="text-gray-400 leading-relaxed">
                            Facilite o trabalho em equipe e a troca de ideias
                            entre os participantes.
                        </p>
                    </article>

                    <article className="bg-[#111827] border border-gray-800 rounded-2xl p-6">

                        <h2 className="text-xl font-semibold mb-3">
                            Organização
                        </h2>
                        <p className="text-gray-400 leading-relaxed">
                            Reúna atividades e informações em espaços
                            organizados.
                        </p>
                    </article>

                    <article className="bg-[#111827] border border-gray-800 rounded-2xl p-6">
                        <h2 className="text-xl font-semibold mb-3">
                            Produtividade
                        </h2>
                        <p className="text-gray-400 leading-relaxed">
                            Acompanhe atividades e desenvolva projetos
                            de forma colaborativa.
                        </p>
                    </article>
                </section>

                <button
                    onClick={() => setMostrarLogin(true)}
                    className="mt-8 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition"
                >
                    Entrar na minha conta
                </button>
            </main>

            {/* janela */}
            {mostrarLogin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Fundo escurecido e desfocado */}
                    <button
                        type="button"
                        aria-label="Fechar janela de login"
                        onClick={() => setMostrarLogin(false)}
                        className="absolute inset-0 w-full h-full bg-black/60 backdrop-blur-sm cursor-default"
                    />

                    {/* Modal */}
                    <div className="relative z-10 w-full max-w-md">
                        <LoginCadastro
                            onClose={() => setMostrarLogin(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
