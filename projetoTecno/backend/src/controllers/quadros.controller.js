import { quadros, salas, usuarios, listas } from "../services/dados.js";
import { PAPEIS_VALIDOS, obterPapelNaSala, obterPapelNoQuadro, usuarioAdministraSala, usuarioTemAcessoAoQuadro } from "../services/permissoes.js";
import { registrarAtividade } from "../services/atividades.js";


const MODELOS_QUADRO = {
    vazio: { nome: "Quadro em branco", listas: [] },
    kanban_basico: { nome: "Kanban básico", listas: ["A Fazer", "Em Andamento", "Concluído"] },
    desenvolvimento_software: { nome: "Desenvolvimento de software", listas: ["Backlog", "A Fazer", "Em Desenvolvimento", "Em Revisão", "Concluído"] },
    marketing: { nome: "Marketing", listas: ["Ideias", "Planejado", "Em Produção", "Em Revisão", "Publicado"] },
};

export function listarModelosQuadro(req, res) {
    return res.status(200).json(Object.entries(MODELOS_QUADRO).map(([id, modelo]) => ({
        id,
        nome: modelo.nome,
        quantidade_listas: modelo.listas.length,
        listas: [...modelo.listas],
    })));
}

export function listarQuadros(req, res) {
    const quadrosDoUsuario = quadros.filter((quadro) => usuarioTemAcessoAoQuadro(quadro.id, req.usuario.id));
    return res.status(200).json(quadrosDoUsuario.map((quadro) => ({ ...quadro, meu_papel: obterPapelNoQuadro(quadro, req.usuario.id) })));
}

export function criarQuadro(req, res) {
    const { nome, sala_id, visibilidade, modelo } = req.body ?? {};
    if (typeof nome !== "string" || !nome.trim()) return res.status(400).json({ erro: "O nome do quadro é obrigatório." });

    const salaId = Number(sala_id);
    if (!Number.isInteger(salaId) || salaId <= 0) return res.status(400).json({ erro: "Informe um sala_id válido." });
    const sala = salas.find((item) => item.id === salaId);
    if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });
    if (!sala.membros.includes(req.usuario.id)) return res.status(403).json({ erro: "Você não é membro desta sala." });
    if (obterPapelNaSala(sala, req.usuario.id) === "observador") {
        return res.status(403).json({ erro: "Observadores não podem criar quadros." });
    }

    const visibilidadesPermitidas = ["privado", "sala", "publico"];
    const visibilidadeFinal = visibilidade ?? "sala";
    if (!visibilidadesPermitidas.includes(visibilidadeFinal)) return res.status(400).json({ erro: "Visibilidade inválida. Use privado, sala ou publico." });

    const modeloId = modelo ?? "vazio";
    if (!Object.hasOwn(MODELOS_QUADRO, modeloId)) {
        return res.status(400).json({ erro: "Modelo inválido.", modelos_disponiveis: Object.keys(MODELOS_QUADRO) });
    }

    const novoQuadro = {
        id: quadros.length ? Math.max(...quadros.map((quadro) => quadro.id)) + 1 : 1,
        nome: nome.trim(), sala_id: salaId, visibilidade: visibilidadeFinal,
        criado_por: req.usuario.id, membros_especificos: [], modelo: modeloId,
    };
    quadros.push(novoQuadro);

    const listasCriadas = MODELOS_QUADRO[modeloId].listas.map((nomeLista, indice) => ({
        id: listas.length ? Math.max(...listas.map((lista) => lista.id)) + indice + 1 : indice + 1,
        nome: nomeLista,
        quadro_id: novoQuadro.id,
        ordem: indice + 1,
    }));
    listas.push(...listasCriadas);

    registrarAtividade({ entidade_tipo: "quadro", entidade_id: novoQuadro.id, quadro_id: novoQuadro.id, usuario_id: req.usuario.id, acao: "quadro.criado", detalhes: { nome: novoQuadro.nome, visibilidade: novoQuadro.visibilidade, modelo: modeloId, listas_criadas: listasCriadas.length } });
    return res.status(201).json({ ...novoQuadro, listas: listasCriadas });
}

export function convidarMembroQuadro(req, res) {
    const quadro = quadros.find((item) => item.id === Number(req.params.id));
    if (!quadro) return res.status(404).json({ erro: "Quadro não encontrado." });
    const sala = salas.find((item) => item.id === quadro.sala_id);
    if (!sala || (!usuarioAdministraSala(sala, req.usuario.id) && quadro.criado_por !== req.usuario.id)) {
        return res.status(403).json({ erro: "Somente o administrador da sala ou o criador do quadro pode convidar pessoas." });
    }

    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const papel = req.body?.papel ?? "membro";
    if (!email) return res.status(400).json({ erro: "Informe o e-mail do usuário que deseja convidar." });
    if (!PAPEIS_VALIDOS.filter((item) => item !== "administrador").includes(papel)) return res.status(400).json({ erro: "O papel deve ser 'membro' ou 'observador'." });

    const usuario = usuarios.find((item) => item.email === email);
    if (!usuario) return res.status(404).json({ erro: "Não existe usuário cadastrado com esse e-mail. O convite só pode ser enviado a usuários já cadastrados nesta versão." });
    quadro.membros_especificos ??= [];
    const existente = quadro.membros_especificos.find((item) => item.usuario_id === usuario.id);
    if (existente) return res.status(409).json({ erro: "Este usuário já possui acesso específico ao quadro." });

    quadro.membros_especificos.push({ usuario_id: usuario.id, papel });
    return res.status(201).json({ mensagem: "Acesso ao quadro concedido com sucesso.", membro: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel } });
}

export function listarMembrosQuadro(req, res) {
    const quadro = quadros.find((item) => item.id === Number(req.params.id));
    if (!quadro) return res.status(404).json({ erro: "Quadro não encontrado." });
    if (!usuarioTemAcessoAoQuadro(quadro.id, req.usuario.id)) return res.status(403).json({ erro: "Você não tem acesso a este quadro." });

    const sala = salas.find((item) => item.id === quadro.sala_id);
    const membrosDaSala = (sala?.membros ?? []).map((id) => {
        const usuario = usuarios.find((item) => item.id === id);
        return { id, nome: usuario?.nome ?? "Usuário", email: usuario?.email ?? null, papel: obterPapelNoQuadro(quadro, id), origem: "sala" };
    });
    const convidados = (quadro.membros_especificos ?? []).map((membro) => {
        const usuario = usuarios.find((item) => item.id === membro.usuario_id);
        return { id: membro.usuario_id, nome: usuario?.nome ?? "Usuário", email: usuario?.email ?? null, papel: membro.papel, origem: "quadro" };
    });
    const unicos = new Map([...membrosDaSala, ...convidados].map((membro) => [membro.id, membro]));
    return res.status(200).json([...unicos.values()]);
}


export function atualizarPapelMembroQuadro(req, res) {
    const quadro = quadros.find((item) => item.id === Number(req.params.id));
    if (!quadro) return res.status(404).json({ erro: "Quadro não encontrado." });
    const sala = salas.find((item) => item.id === quadro.sala_id);
    if (!sala || (!usuarioAdministraSala(sala, req.usuario.id) && quadro.criado_por !== req.usuario.id)) {
        return res.status(403).json({ erro: "Somente o administrador da sala ou o criador do quadro pode alterar os acessos." });
    }

    const usuarioId = Number(req.params.usuarioId);
    const papel = req.body?.papel;
    if (!PAPEIS_VALIDOS.filter((item) => item !== "administrador").includes(papel)) {
        return res.status(400).json({ erro: "O papel do quadro deve ser 'membro' ou 'observador'." });
    }
    quadro.membros_especificos ??= [];
    const membro = quadro.membros_especificos.find((item) => item.usuario_id === usuarioId);
    if (!membro) return res.status(404).json({ erro: "Não foi encontrado acesso específico para esse usuário neste quadro." });
    membro.papel = papel;
    return res.status(200).json({ mensagem: "Papel no quadro atualizado.", usuario_id: usuarioId, papel });
}

export function removerMembroQuadro(req, res) {
    const quadro = quadros.find((item) => item.id === Number(req.params.id));
    if (!quadro) return res.status(404).json({ erro: "Quadro não encontrado." });
    const sala = salas.find((item) => item.id === quadro.sala_id);
    if (!sala || (!usuarioAdministraSala(sala, req.usuario.id) && quadro.criado_por !== req.usuario.id)) {
        return res.status(403).json({ erro: "Somente o administrador da sala ou o criador do quadro pode remover acessos." });
    }
    const usuarioId = Number(req.params.usuarioId);
    const tamanhoAnterior = (quadro.membros_especificos ?? []).length;
    quadro.membros_especificos = (quadro.membros_especificos ?? []).filter((item) => item.usuario_id !== usuarioId);
    if (quadro.membros_especificos.length === tamanhoAnterior) return res.status(404).json({ erro: "Acesso específico não encontrado." });
    return res.status(200).json({ mensagem: "Acesso específico ao quadro removido." });
}
