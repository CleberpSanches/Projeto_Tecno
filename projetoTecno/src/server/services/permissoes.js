import { supabase, ApiError, traduzirErroBanco } from "../database.js";

export const PAPEIS_VALIDOS = ["administrador", "membro", "observador"];

/** Retorna o papel do usuário na sala ou null se não for membro. */
export async function obterPapelNaSala(idSala, idUsuario) {
    const { data, error } = await supabase
        .from("sala_usuario")
        .select("papel")
        .eq("id_sala", Number(idSala))
        .eq("id_usuario", Number(idUsuario))
        .maybeSingle();

    if (error) throw traduzirErroBanco(error);
    return data?.papel ?? null;
}

export async function usuarioTemAcessoASala(idSala, idUsuario) {
    return (await obterPapelNaSala(idSala, idUsuario)) !== null;
}

/** Membros podem editar tarefas; observador somente leitura. */
export async function usuarioPodeEditarSala(idSala, idUsuario) {
    const papel = await obterPapelNaSala(idSala, idUsuario);
    return papel === "administrador" || papel === "membro";
}

export async function usuarioAdministraSala(idSala, idUsuario) {
    return (await obterPapelNaSala(idSala, idUsuario)) === "administrador";
}

/** Busca a sala pelo código de convite (comparação sem diferenciar maiúsculas). */
export async function obterSalaPorCodigo(codigo) {
    const { data, error } = await supabase
        .from("sala")
        .select("id, nome, codigo_sala, sala_dono")
        .ilike("codigo_sala", String(codigo).trim())
        .maybeSingle();

    if (error) throw traduzirErroBanco(error);
    return data;
}

/** Busca a sala pelo ID (ou null caso não exista). */
export async function obterSalaPorId(idSala) {
    const { data, error } = await supabase
        .from("sala")
        .select("id, nome, codigo_sala, sala_dono")
        .eq("id", Number(idSala))
        .maybeSingle();

    if (error) throw traduzirErroBanco(error);
    return data;
}

/** Confirma acesso e nível de edição em uma sala; lança ApiError em caso negativo. */
export async function exigirAcessoASala(idSala, idUsuario, exigirEdicao = false) {
    const papel = await obterPapelNaSala(idSala, idUsuario);
    if (!papel) throw new ApiError(403, "Você não participa desta sala.");
    if (exigirEdicao && papel === "observador") {
        throw new ApiError(403, "Seu papel nesta sala permite apenas leitura.");
    }
    return papel;
}

/** Retorna os IDs dos membros de uma sala. */
export async function membrosDaSala(idSala) {
    const { data, error } = await supabase
        .from("sala_usuario")
        .select("id_usuario")
        .eq("id_sala", Number(idSala));

    if (error) throw traduzirErroBanco(error);
    return data.map((m) => m.id_usuario);
}
