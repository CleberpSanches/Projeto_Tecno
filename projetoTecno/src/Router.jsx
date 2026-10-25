
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Inicio from "./pages/Inicio";
import LoginCadastro from "./pages/LoginCadastro";
import Perfil from "./pages/Perfil";
import Projetos from "./pages/Projetos";
import DetalhesSala from "./pages/DetalhesSala";
import Tarefas from "./pages/Tarefas";
import Calendario from "./pages/Calendario";


export default function Router() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Inicio />} />

                <Route path="/projetos" element={<Projetos />} />
                {/*<Route
                    path="/projetos/:id"
                    element={<DetalhesSala />}
                /> */}
                <Route path="/perfil" element={<Perfil />} />
                <Route path="/tarefas" element={<Tarefas />} />
                <Route path="/calendario" element={<Calendario />} />
                <Route path="/projetos" element={<Projetos />} />
                <Route path= "/projetos/:id" element={<DetalhesSala />} />
            </Routes>
        </BrowserRouter>
    );
}
