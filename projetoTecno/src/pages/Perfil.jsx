
import { useState } from "react";
import Sidebar from "../components/Sidebar";

export default function Perfil() {
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");

    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [mostrarExclusao, setMostrarExclusao] = useState(false);
    const [confirmacao, setConfirmacao] = useState("");
    const [mensagem, setMensagem] = useState("");

    function salvarPerfil(e) {
        e.preventDefault();
        setMensagem("Dados validados! Conecte o perfil ao banco para salvar as alterações.");
    }

    function alterarSenha(e) {
        e.preventDefault();

        if (novaSenha.length < 8) {
            setMensagem("A nova senha deve ter pelo menos 8 caracteres.");
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setMensagem("A confirmação da senha não corresponde.");
            return;
        }

        setMensagem("Senha validada! Conecte a autenticação para efetivar a alteração.");
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarSenha("");
    }

    function excluirPerfil() {
        if (confirmacao !== "EXCLUIR") {
            setMensagem('Digite EXCLUIR para confirmar a intenção.');
            return;
        }

        setMensagem("A exclusão real precisa ser conectada à autenticação e ao banco de dados.");
    }

    return (
        <div className="min-h-screen bg-[#0B0F1A] text-white">
            <Sidebar />

            <main className="ml-64 min-h-screen p-6 md:p-10">
                <div className="max-w-4xl mx-auto">
                    <header className="mb-10">
                        <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">
                            Minha conta
                        </span>

                        <h1 className="text-3xl md:text-4xl font-bold mt-3">
                            Meu perfil
                        </h1>

                        <p className="text-gray-400 mt-3">
                            Gerencie suas informações pessoais e a segurança
                            da sua conta.
                        </p>
                    </header>


                    <section className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-6 flex items-center gap-5">
                        <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl font-bold text-blue-400">
                            {nome.trim() ? nome.trim().charAt(0).toUpperCase() : "U"}
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold">
                                {nome.trim() || "Seu nome"}
                            </h2>

                            <p className="text-gray-400 text-sm mt-1">
                                {email || "Seu e-mail"}
                            </p>
                        </div>
                    </section>

                    {mensagem && (
                        <div
                            role="status"
                            className="bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl p-4 mb-6 text-sm"
                        >
                            {mensagem}
                        </div>
                    )}

                    <section className="bg-[#111827] border border-gray-800 rounded-2xl p-6 md:p-8 mb-6">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold">
                                Dados pessoais
                            </h2>
                            <p className="text-gray-400 text-sm mt-2">
                                Atualize seu nome e seu endereço de e-mail.
                            </p>
                        </div>

                        <form onSubmit={salvarPerfil} className="space-y-5">
                            <div>
                                <label htmlFor="nome" className="block text-sm text-gray-300 mb-2">
                                    Nome completo
                                </label>

                                <input
                                    id="nome"
                                    type="text"
                                    autoComplete="name"
                                    value={nome}
                                    onChange={(e) => {
                                        setNome(e.target.value);
                                        setMensagem("");
                                    }}
                                    placeholder="Digite seu nome"
                                    required
                                    className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm text-gray-300 mb-2">
                                    E-mail
                                </label>

                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        setMensagem("");
                                    }}
                                    placeholder="seu@email.com"
                                    required
                                    className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition"
                                >
                                    Salvar alterações
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="bg-[#111827] border border-gray-800 rounded-2xl p-6 md:p-8 mb-6">
                        <h2 className="text-xl font-semibold">
                            Segurança
                        </h2>

                        <p className="text-gray-400 text-sm mt-2 mb-6">
                            Altere sua senha para manter sua conta protegida.
                        </p>

                        <form onSubmit={alterarSenha} className="space-y-5">
                            <div>
                                <label htmlFor="senha-atual" className="block text-sm text-gray-300 mb-2">
                                    Senha atual
                                </label>

                                <input
                                    id="senha-atual"
                                    type={mostrarSenha ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={senhaAtual}
                                    onChange={(e) => setSenhaAtual(e.target.value)}
                                    placeholder="Digite sua senha atual"
                                    required
                                    className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label htmlFor="nova-senha" className="block text-sm text-gray-300 mb-2">
                                    Nova senha
                                </label>

                                <input
                                    id="nova-senha"
                                    type={mostrarSenha ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={novaSenha}
                                    onChange={(e) => setNovaSenha(e.target.value)}
                                    placeholder="Mínimo de 8 caracteres"
                                    minLength={8}
                                    required
                                    className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmar-senha" className="block text-sm text-gray-300 mb-2">
                                    Confirmar nova senha
                                </label>

                                <input
                                    id="confirmar-senha"
                                    type={mostrarSenha ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={confirmarSenha}
                                    onChange={(e) => setConfirmarSenha(e.target.value)}
                                    placeholder="Repita a nova senha"
                                    minLength={8}
                                    required
                                    className="w-full bg-[#0B0F1A] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={mostrarSenha}
                                    onChange={(e) => setMostrarSenha(e.target.checked)}
                                    className="accent-blue-500"
                                />
                                Mostrar senhas
                            </label>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-semibold transition"
                                >
                                    Alterar senha
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="bg-[#111827] border border-red-500/30 rounded-2xl p-6 md:p-8">
                        <h2 className="text-xl font-semibold text-red-400">
                            Excluir perfil
                        </h2>

                        <p className="text-gray-400 text-sm leading-relaxed mt-3">
                            A exclusão da conta é uma ação importante.
                            Quando implementada, poderá remover seus dados
                            e encerrar seu acesso à aplicação.
                        </p>

                        {!mostrarExclusao ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setMostrarExclusao(true);
                                    setConfirmacao("");
                                    setMensagem("");
                                }}
                                className="mt-6 border border-red-500/50 text-red-400 hover:bg-red-500/10 px-5 py-3 rounded-xl font-semibold transition"
                            >
                                Excluir meu perfil
                            </button>
                        ) : (
                            <div className="mt-6 space-y-4">
                                <p className="text-sm text-gray-300">
                                    Para confirmar sua intenção, digite{" "}
                                    <strong className="text-red-400">EXCLUIR</strong>.
                                </p>

                                <input
                                    type="text"
                                    value={confirmacao}
                                    onChange={(e) => setConfirmacao(e.target.value)}
                                    placeholder="Digite EXCLUIR"
                                    className="w-full bg-[#0B0F1A] border border-red-500/30 rounded-xl px-4 py-3 outline-none focus:border-red-500 transition"
                                />

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={excluirPerfil}
                                        className="bg-red-600 hover:bg-red-700 px-5 py-3 rounded-xl font-semibold transition"
                                    >
                                        Confirmar exclusão
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMostrarExclusao(false);
                                            setConfirmacao("");
                                            setMensagem("");
                                        }}
                                        className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded-xl font-semibold transition"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    <footer className="text-center text-gray-600 text-sm mt-10">
                        TecnoPlan — Configurações da conta
                    </footer>
                </div>
            </main>
        </div>
    );
}
