import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.routes.js";
import salasRoutes from "./routes/salas.routes.js";
import tarefasRoutes from "./routes/tarefas.routes.js";
import { ApiError } from "./supabase.js";
import "./supabase.js"; // valida as credenciais do Supabase no boot

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET é obrigatório em produção. Configure a variável de ambiente antes de iniciar a API.");
}

const app = express();

const origensPermitidas = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origem) => origem.trim())
    .filter(Boolean);
app.use(cors(process.env.NODE_ENV === "production"
    ? { origin: origensPermitidas.length ? origensPermitidas : false }
    : { origin: true }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
    res.json({
        mensagem: "API funcionando",
        versao: "2.0",
        escopo: "auth, salas e tarefas (persistidos no Supabase)",
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/salas", salasRoutes);
app.use("/api/tarefas", tarefasRoutes);

app.use((req, res) => {
    return res.status(404).json({ erro: "Rota não encontrada." });
});

app.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro);
    if (erro instanceof SyntaxError && erro.status === 400 && "body" in erro) {
        return res.status(400).json({ erro: "O corpo da requisição contém JSON inválido." });
    }
    if (erro instanceof ApiError) {
        return res.status(erro.status).json({ erro: erro.message });
    }
    console.error("Erro não tratado na API:", erro);
    return res.status(500).json({ erro: "Erro interno do servidor." });
});

export { app };

const PORT = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}
