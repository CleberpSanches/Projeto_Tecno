import { randomBytes } from "node:crypto";
import { salas, usuarios, convites } from "../services/dados.js";
import { PAPEIS_VALIDOS, obterPapelNaSala, usuarioAdministraSala } from "../services/permissoes.js";

function proximoId() {
    return salas.length ? Math.max(...salas.map((sala) => sala.id)) + 1 : 1;
}

export function listarSalas(req, res) {
    const usuarioId = req.usuario.id;
    const salasDoUsuario = salas
        .filter((sala) => sala.membros.includes(usuarioId))
        .map((sala) => ({ ...sala, meu_papel: obterPapelNaSala(sala, usuarioId) }));
    return res.status(200).json(salasDoUsuario);
}

export function criarSala(req, res) {
    const { nome } = req.body ?? {};
    const usuarioId = req.usuario.id;

    if (typeof nome !== "string" || !nome.trim()) {
        return res.status(400).json({ erro: "O nome da sala é obrigatório." });
    }

    const novaSala = {
        id: proximoId(),
        nome: nome.trim(),
        codigo: randomBytes(9).toString("base64url").slice(0, 12).toUpperCase(),
        membros: [usuarioId],
        criado_por: usuarioId,
        papeis: { [String(usuarioId)]: "administrador" },
    };

    salas.push(novaSala);
    return res.status(201).json(novaSala);
}

export function entrarNaSala(req, res) {
    const { codigo } = req.body ?? {};
    const usuarioId = req.usuario.id;

    if (typeof codigo !== "string" || !codigo.trim()) {
        return res.status(400).json({ erro: "O código da sala é obrigatório." });
    }

    const sala = salas.find((item) => item.codigo === codigo.trim().toUpperCase());
    if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });
    if (sala.membros.includes(usuarioId)) {
        return res.status(409).json({ erro: "Você já participa desta sala." });
    }

    sala.membros.push(usuarioId);
    sala.papeis ??= {};
    sala.papeis[String(usuarioId)] = "membro";

    return res.status(200).json({ mensagem: "Você entrou na sala com sucesso.", sala });
}

export function listarMembrosSala(req, res) {
    const sala = salas.find((item) => item.id === Number(req.params.id));
    if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });
    if (!sala.membros.includes(req.usuario.id)) {
        return res.status(403).json({ erro: "Você não participa desta sala." });
    }

    const membros = sala.membros.map((id) => {
        const usuario = usuarios.find((item) => item.id === id);
        return { id, nome: usuario?.nome ?? "Usuário", email: usuario?.email ?? null, papel: obterPapelNaSala(sala, id) };
    });
    return res.status(200).json(membros);
}

export function convidarMembroSala(req, res) {
    const sala = salas.find((item) => item.id === Number(req.params.id));
    if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });
    if (!usuarioAdministraSala(sala, req.usuario.id)) {
        return res.status(403).json({ erro: "Somente administradores podem convidar membros para a sala." });
    }

    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const papel = req.body?.papel ?? "membro";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ erro: "Informe um e-mail válido para o convite." });
    if (!PAPEIS_VALIDOS.filter((item) => item !== "administrador").includes(papel)) {
        return res.status(400).json({ erro: "O papel deve ser 'membro' ou 'observador'." });
    }
    const usuario = usuarios.find((item) => item.email === email);
    if (usuario && sala.membros.includes(usuario.id)) return res.status(409).json({ erro: "Este usuário já participa da sala." });
    const conviteExistente = convites.find((item) => item.sala_id === sala.id && item.email === email && item.status === "pendente" && Date.parse(item.expira_em) > Date.now());
    if (conviteExistente) return res.status(409).json({ erro: "Já existe um convite pendente para este e-mail nesta sala." });

    const token = randomBytes(24).toString("base64url");
    const convite = {
        id: convites.length ? Math.max(...convites.map((item) => item.id)) + 1 : 1,
        token,
        sala_id: sala.id,
        email,
        usuario_id: usuario?.id ?? null,
        papel,
        convidado_por: Number(req.usuario.id),
        status: "pendente",
        criado_em: new Date().toISOString(),
        expira_em: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    convites.push(convite);
    // Nesta versão não há serviço de e-mail: o token é devolvido para integração/teste.
    return res.status(201).json({ mensagem: "Convite criado. Compartilhe o token com o convidado.", convite: { id: convite.id, sala_id: convite.sala_id, email: convite.email, papel: convite.papel, status: convite.status, expira_em: convite.expira_em, token: convite.token } });
}

export function listarConvitesRecebidos(req, res) {
    const usuario = usuarios.find((item) => item.id === Number(req.usuario.id));
    if (!usuario) return res.status(401).json({ erro: "Usuário não encontrado." });
    const agora = Date.now();
    const recebidos = convites.filter((item) => item.email === usuario.email && item.status === "pendente" && Date.parse(item.expira_em) > agora)
        .map(({ token, id, sala_id, email, papel, criado_em, expira_em }) => ({ token, id, sala_id, email, papel, criado_em, expira_em }));
    return res.status(200).json(recebidos);
}

export function aceitarConviteSala(req, res) {
    const usuario = usuarios.find((item) => item.id === Number(req.usuario.id));
    if (!usuario) return res.status(401).json({ erro: "Usuário não encontrado." });
    const convite = convites.find((item) => item.token === req.params.token);
    if (!convite) return res.status(404).json({ erro: "Convite não encontrado." });
    if (convite.status !== "pendente") return res.status(409).json({ erro: "Este convite não está mais pendente." });
    if (Date.parse(convite.expira_em) <= Date.now()) {
        convite.status = "expirado";
        return res.status(410).json({ erro: "Este convite expirou." });
    }
    if (usuario.email !== convite.email) return res.status(403).json({ erro: "Entre com a conta correspondente ao e-mail convidado." });
    const sala = salas.find((item) => item.id === convite.sala_id);
    if (!sala) return res.status(404).json({ erro: "A sala do convite não existe mais." });
    if (sala.membros.includes(usuario.id)) {
        convite.status = "aceito";
        return res.status(409).json({ erro: "Você já participa desta sala." });
    }
    sala.membros.push(usuario.id);
    sala.papeis ??= {};
    sala.papeis[String(usuario.id)] = convite.papel;
    convite.usuario_id = usuario.id;
    convite.status = "aceito";
    convite.aceito_em = new Date().toISOString();
    return res.status(200).json({ mensagem: "Convite aceito. Você agora participa da sala.", sala: { id: sala.id, nome: sala.nome }, papel: convite.papel });
}

export function atualizarPapelMembroSala(req, res) {
    const sala = salas.find((item) => item.id === Number(req.params.id));
    if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });
    if (!usuarioAdministraSala(sala, req.usuario.id)) return res.status(403).json({ erro: "Somente administradores podem alterar papéis." });

    const usuarioId = Number(req.params.usuarioId);
    const papel = req.body?.papel;
    if (!sala.membros.includes(usuarioId)) return res.status(404).json({ erro: "O usuário não participa desta sala." });
    if (!PAPEIS_VALIDOS.includes(papel)) return res.status(400).json({ erro: "Papel inválido. Use administrador, membro ou observador." });
    if (usuarioId === req.usuario.id && papel !== "administrador") return res.status(400).json({ erro: "Você não pode remover seu próprio papel de administrador por esta rota." });

    sala.papeis ??= {};
    sala.papeis[String(usuarioId)] = papel;
    return res.status(200).json({ mensagem: "Papel atualizado com sucesso.", usuario_id: usuarioId, papel });
}

export function removerMembroSala(req, res) {
    const sala = salas.find((item) => item.id === Number(req.params.id));
    if (!sala) return res.status(404).json({ erro: "Sala não encontrada." });
    if (!usuarioAdministraSala(sala, req.usuario.id)) return res.status(403).json({ erro: "Somente administradores podem remover membros." });

    const usuarioId = Number(req.params.usuarioId);
    if (!sala.membros.includes(usuarioId)) return res.status(404).json({ erro: "O usuário não participa desta sala." });
    if (usuarioId === req.usuario.id) return res.status(400).json({ erro: "Você não pode remover a si mesmo por esta rota." });

    sala.membros = sala.membros.filter((id) => id !== usuarioId);
    if (sala.papeis) delete sala.papeis[String(usuarioId)];
    return res.status(200).json({ mensagem: "Membro removido da sala." });
}
