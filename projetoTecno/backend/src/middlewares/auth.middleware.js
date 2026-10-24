import jwt from "jsonwebtoken";

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