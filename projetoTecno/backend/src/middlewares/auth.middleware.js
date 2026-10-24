import jwt from "jsonwebtoken";
import { usuarios } from "../services/dados.js";

export function autenticarUsuario(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (!autorizacao) {
        return res.status(401).json({
            erro: "Token de autenticação não informado.",
        });
    }

    const [tipo, token] = autorizacao.split(" ");

    if (tipo !== "Bearer" || !token) {
        return res.status(401).json({
            erro: "Formato do token inválido.",
        });
    }

    try {
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET || "segredo-temporario-tecnoplan"
        );

        const usuarioAtivo = usuarios.find((item) => item.id === Number(usuario.id));
        if (!usuarioAtivo) {
            return res.status(401).json({ erro: "A conta associada a este token não está mais ativa." });
        }

        req.usuario = {
            id: usuario.id,
            email: usuario.email,
        };

        return next();
    } catch (erro) {
        return res.status(401).json({
            erro: "Token inválido ou expirado.",
        });
    }
}