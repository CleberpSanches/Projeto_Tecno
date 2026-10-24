import jwt from "jsonwebtoken";
import { supabase, ApiError } from "../supabase.js";

export async function autenticarUsuario(req, res, next) {
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
        const conteudo = jwt.verify(
            token,
            process.env.JWT_SECRET || "segredo-temporario-tecnoplan"
        );

        // Garante que a conta do token ainda existe no banco.
        const { data: usuario, error } = await supabase
            .from("usuario")
            .select("id, email, nome")
            .eq("id", Number(conteudo.id))
            .maybeSingle();

        if (error) {
            console.error("Erro ao verificar usuário do token:", error);
            return res.status(500).json({ erro: "Erro interno do servidor." });
        }

        if (!usuario) {
            return res.status(401).json({ erro: "A conta associada a este token não está mais ativa." });
        }

        req.usuario = {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
        };

        return next();
    } catch (erro) {
        return res.status(401).json({
            erro: "Token inválido ou expirado.",
        });
    }
}

// Helper reutilizável p/ validar o header Bearer quando necessário fora do middleware.
export function extrairToken(autorizacao) {
    const [tipo, token] = (autorizacao ?? "").split(" ");
    return tipo === "Bearer" ? token : null;
}

export { ApiError };
