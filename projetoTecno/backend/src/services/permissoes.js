import { salas, quadros } from "./dados.js";

export const PAPEIS_VALIDOS = ["administrador", "membro", "observador"];

export function buscarSala(salaId) {
    return salas.find((sala) => sala.id === Number(salaId));
}

export function buscarQuadro(quadroId) {
    return quadros.find((quadro) => quadro.id === Number(quadroId));
}

export function obterPapelNaSala(sala, usuarioId) {
    if (!sala || !sala.membros?.includes(Number(usuarioId))) return null;

    const papelSalvo = sala.papeis?.[String(usuarioId)];
    if (PAPEIS_VALIDOS.includes(papelSalvo)) return papelSalvo;

    // Compatibilidade com a sala inicial e com dados criados antes do controle de papéis.
    if (sala.criado_por === Number(usuarioId) || sala.membros[0] === Number(usuarioId)) {
        return "administrador";
    }
    return "membro";
}

export function obterPapelNoQuadro(quadro, usuarioId) {
    if (!quadro) return null;
    const id = Number(usuarioId);
    const acessoEspecifico = (quadro.membros_especificos ?? []).find(
        (membro) => Number(membro.usuario_id) === id
    );
    if (acessoEspecifico) return acessoEspecifico.papel;

    const sala = buscarSala(quadro.sala_id);
    const papelSala = obterPapelNaSala(sala, id);
    if (papelSala && quadro.visibilidade !== "privado") return papelSala;

    // Quadros privados ficam acessíveis ao criador e aos convidados explícitos.
    if (quadro.criado_por === id) return "administrador";
    if (quadro.visibilidade === "publico") return "observador";
    return null;
}

export function usuarioTemAcessoAoQuadro(quadroId, usuarioId) {
    return obterPapelNoQuadro(buscarQuadro(quadroId), usuarioId) !== null;
}

export function usuarioPodeEditarQuadro(quadroId, usuarioId) {
    const papel = obterPapelNoQuadro(buscarQuadro(quadroId), usuarioId);
    return papel === "administrador" || papel === "membro";
}

export function usuarioAdministraSala(sala, usuarioId) {
    return obterPapelNaSala(sala, usuarioId) === "administrador";
}

export function usuarioAdministraQuadro(quadro, usuarioId) {
    if (!quadro) return false;
    const papel = obterPapelNoQuadro(quadro, usuarioId);
    return papel === "administrador";
}
