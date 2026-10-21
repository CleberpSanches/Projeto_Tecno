
import { useState } from "react";

export default function LoginCadastro({ onClose }) {
    const [tela, setTela] = useState("login");

    function handleSubmit(e) {
        e.preventDefault();

        // conectar a api
    }

    return (
        <div className="relative bg-[#111827] border border-gray-700 rounded-2xl shadow-2xl p-6 sm:p-8 text-white max-h-[90vh] overflow-y-auto">

            {/* Botão fechar */}
            <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="absolute right-5 top-5 text-gray-400 hover:text-white text-2xl transition"
            >
                ×
            </button>

            {/* Alternância entre telas */}
            <div className="flex bg-[#0B0F1A] rounded-xl p-1 mb-8 mr-6">
                <button
                    type="button"
                    onClick={() => setTela("login")}
                    className={`w-1/2 py-3 rounded-lg font-medium transition ${
                        tela === "login"
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:text-white"
                    }`}
                >
                    Login
                </button>

                <button
                    type="button"
                    onClick={() => setTela("cadastro")}
                    className={`w-1/2 py-3 rounded-lg font-medium transition ${
                        tela === "cadastro"
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:text-white"
                    }`}
                >
                    Cadastro
                </button>
            </div>

            {tela === "login" ? (
                <>
                    <h1 className="text-3xl font-bold mb-2">
                        Bem-vindo de volta
                    </h1>

                    <p className="text-gray-400 mb-7">
                        Entre na sua conta para continuar.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="login-email" className="block text-sm text-gray-300 mb-2">
                                E-mail
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                autoComplete="email"
                                placeholder="seu@email.com"
                                required
                                className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="login-senha" className="block text-sm text-gray-300 mb-2">
                                Senha
                            </label>
                            <input
                                id="login-senha"
                                type="password"
                                autoComplete="current-password"
                                placeholder="Digite sua senha"
                                required
                                className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold transition"
                        >
                            Entrar
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-400 mt-6">
                        Ainda não tem conta?{" "}
                        <button
                            type="button"
                            onClick={() => setTela("cadastro")}
                            className="text-blue-400 hover:underline"
                        >
                            Cadastre-se
                        </button>
                    </p>
                </>
            ) : (
                <>
                    <h1 className="text-3xl font-bold mb-2">
                        Criar conta
                    </h1>

                    <p className="text-gray-400 mb-7">
                        Preencha os dados para começar.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="cadastro-nome" className="block text-sm text-gray-300 mb-2">
                                Nome completo
                            </label>
                            <input
                                id="cadastro-nome"
                                type="text"
                                autoComplete="name"
                                placeholder="Seu nome"
                                required
                                className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="cadastro-email" className="block text-sm text-gray-300 mb-2">
                                E-mail
                            </label>
                            <input
                                id="cadastro-email"
                                type="email"
                                autoComplete="email"
                                placeholder="seu@email.com"
                                required
                                className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="cadastro-senha" className="block text-sm text-gray-300 mb-2">
                                Senha (mínimo 8 caracteres)
                            </label>
                            <input
                                id="cadastro-senha"
                                type="password"
                                autoComplete="new-password"
                                minLength={8}
                                placeholder="Crie uma senha"
                                required
                                className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <div>
                            <label htmlFor="cadastro-confirmar" className="block text-sm text-gray-300 mb-2">
                                Confirmar senha
                            </label>
                            <input
                                id="cadastro-confirmar"
                                type="password"
                                autoComplete="new-password"
                                minLength={8}
                                placeholder="Repita sua senha"
                                required
                                className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-semibold transition"
                        >
                            Criar conta
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-400 mt-6">
                        Já tem uma conta?{" "}
                        <button
                            type="button"
                            onClick={() => setTela("login")}
                            className="text-blue-400 hover:underline"
                        >
                            Fazer login
                        </button>
                    </p>
                </>
            )}
        </div>
    );
}
