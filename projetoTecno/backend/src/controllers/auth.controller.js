import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { usuarios, salas, quadros, listas, tarefas, itensChecklist, comentarios, etiquetas, atividades, convites, notificacoes } from "../services/dados.js";

function gerarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
        },
        process.env.JWT_SECRET || "segredo-temporario-tecnoplan",
        {
            expiresIn: "2h",
        }
    );
}

export async function cadastrarUsuario(req, res) {
    try {
        const corpo = req.body && typeof req.body === "object" && !Array.isArray(req.body)
            ? req.body
            : {};
        const { nome, email, senha } = corpo;

        if (typeof nome !== "string" || !nome.trim() || typeof email !== "string" || !email.trim() || typeof senha !== "string" || !senha) {
            return res.status(400).json({
                erro: "Nome, e-mail e senha são obrigatórios e devem ser textos.",
            });
        }
        if (nome.trim().length > 100) {
            return res.status(400).json({ erro: "O nome deve ter no máximo 100 caracteres." });
        }
        if (Buffer.byteLength(senha, "utf8") > 72) {
            return res.status(400).json({ erro: "A senha deve ter no máximo 72 bytes." });
        }

        const emailNormalizado = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            return res.status(400).json({
                erro: "Informe um e-mail válido.",
            });
        }

        if (senha.length < 8) {
            return res.status(400).json({
                erro: "A senha deve ter pelo menos 8 caracteres.",
            });
        }

        const usuarioExistente = usuarios.find(
            (usuario) => usuario.email === emailNormalizado
        );

        if (usuarioExistente) {
            return res.status(409).json({
                erro: "Este e-mail já está cadastrado.",
            });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuario = {
            id: usuarios.length > 0
                ? Math.max(...usuarios.map((usuario) => usuario.id)) + 1
                : 1,
            nome: nome.trim(),
            email: emailNormalizado,
            senhaHash,
        };

        usuarios.push(novoUsuario);

        const token = gerarToken(novoUsuario);

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso.",
            usuario: {
                id: novoUsuario.id,
                nome: novoUsuario.nome,
                email: novoUsuario.email,
            },
            token,
        });
    } catch (erro) {
        console.error("Erro ao cadastrar usuário:", erro);

        return res.status(500).json({
            erro: "Erro interno ao cadastrar usuário.",
        });
    }
}

export async function loginUsuario(req, res) {
    try {
        const corpo = req.body && typeof req.body === "object" && !Array.isArray(req.body)
            ? req.body
            : {};
        const { email, senha } = corpo;

        if (typeof email !== "string" || !email.trim() || typeof senha !== "string" || !senha) {
            return res.status(400).json({
                erro: "E-mail e senha são obrigatórios e devem ser textos.",
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const usuario = usuarios.find(
            (item) => item.email === emailNormalizado
        );

        if (!usuario) {
            return res.status(401).json({
                erro: "E-mail ou senha incorretos.",
            });
        }

        const senhaCorreta = await bcrypt.compare(
            senha,
            usuario.senhaHash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: "E-mail ou senha incorretos.",
            });
        }

        const token = gerarToken(usuario);

        return res.status(200).json({
            mensagem: "Login realizado com sucesso.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
            },
            token,
        });
    } catch (erro) {
        console.error("Erro ao realizar login:", erro);

        return res.status(500).json({
            erro: "Erro interno ao realizar login.",
        });
    }
}

// RF01 — Exclui a conta autenticada e remove suas associações pessoais dos dados em memória.
export function excluirPropriaConta(req, res) {
    const usuarioId = Number(req.usuario.id);
    const indiceUsuario = usuarios.findIndex((usuario) => usuario.id === usuarioId);
    if (indiceUsuario < 0) return res.status(404).json({ erro: "Usuário não encontrado." });

    // Evita deixar salas sem administrador. O usuário deve transferir a administração antes.
    const salaAdministradaSoPorEle = salas.find((sala) =>
        sala.membros.includes(usuarioId) &&
        (sala.papeis?.[String(usuarioId)] === "administrador" || sala.criado_por === usuarioId) &&
        !sala.membros.some((id) => id !== usuarioId && (sala.papeis?.[String(id)] === "administrador"))
    );
    if (salaAdministradaSoPorEle) {
        return res.status(409).json({ erro: "Transfira a administração da sala antes de excluir sua conta.", sala_id: salaAdministradaSoPorEle.id });
    }

    for (const sala of salas) {
        sala.membros = sala.membros.filter((id) => id !== usuarioId);
        if (sala.papeis) delete sala.papeis[String(usuarioId)];
    }
    for (const quadro of quadros) {
        quadro.membros_especificos = (quadro.membros_especificos ?? []).filter((m) => Number(m.usuario_id) !== usuarioId);
    }
    for (const tarefa of tarefas) {
        tarefa.responsaveis = (tarefa.responsaveis ?? []).filter((id) => Number(id) !== usuarioId);
    }
    for (let i = itensChecklist.length - 1; i >= 0; i--) if (Number(itensChecklist[i].criado_por) === usuarioId) itensChecklist.splice(i, 1);
    for (let i = comentarios.length - 1; i >= 0; i--) if (Number(comentarios[i].usuario_id) === usuarioId) comentarios.splice(i, 1);
    for (let i = convites.length - 1; i >= 0; i--) if (Number(convites[i].convidado_por) === usuarioId || Number(convites[i].usuario_id) === usuarioId) convites.splice(i, 1);
    for (let i = notificacoes.length - 1; i >= 0; i--) if (Number(notificacoes[i].usuario_id) === usuarioId) notificacoes.splice(i, 1);

    // O histórico é mantido para auditoria; a identidade é anonimizada.
    for (const atividade of atividades) {
        if (Number(atividade.usuario_id) === usuarioId) {
            atividade.usuario_id = null;
            atividade.usuario_nome = "Usuário excluído";
        }
    }
    usuarios.splice(indiceUsuario, 1);
    return res.status(200).json({ mensagem: "Conta excluída com sucesso." });
}
