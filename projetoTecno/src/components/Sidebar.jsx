
import { NavLink } from "react-router-dom";

export default function Sidebar() {
    const links = [
        { nome: "Início", caminho: "/", icone: "⌂" },
        { nome: "Projetos", caminho: "/projetos", icone: "▣" },
        { nome: "Tarefas", caminho: "/tarefas", icone: "☑" },
        { nome: "Calendário", caminho: "/calendario", icone: "▦" },
        { nome: "Perfil", caminho: "/perfil", icone: "◉" },
    ];

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-[#111827] border-r border-gray-800 flex flex-col px-4 py-6">

            {/* Logo */}
            <div className="px-4 mb-10">
                <h1 className="text-2xl font-bold text-white">
                    Tecno<span className="text-blue-400">Plan</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Painel de navegação
                </p>
            </div>

            {/* Links */}
            <nav className="flex flex-col gap-2">
                {links.map((link) => (
                    <NavLink
                        key={link.caminho}
                        to={link.caminho}
                        end={link.caminho === "/"}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-4 py-3 rounded-xl transition duration-200 ${
                                isActive
                                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/20"
                                    : "text-gray-400 hover:bg-[#1F2937] hover:text-white"
                            }`
                        }
                    >
                        <span className="text-xl w-6 text-center">
                            {link.icone}
                        </span>

                        <span className="font-medium">
                            {link.nome}
                        </span>
                    </NavLink>
                ))}
            </nav>

            {/* Rodapé */}
            <div className="mt-auto border-t border-gray-800 pt-4">
                <button
                    onClick={() => {
                        // colocar logout
                    }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition"
                >
                    <span className="text-xl w-6 text-center">↪</span>
                    <span className="font-medium">Sair</span>
                </button>
            </div>

        </aside>
    );
}
