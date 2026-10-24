import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { usuarios } from "../services/dados.js";

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
        const { nome, email, senha } = req.body;

        if (!nome?.trim() || !email?.trim() || !senha) {
            return res.status(400).json({
                erro: "Nome, e-mail e senha são obrigatórios.",
            });
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
        const { email, senha } = req.body;

        if (!email?.trim() || !senha) {
            return res.status(400).json({
                erro: "E-mail e senha são obrigatórios.",
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