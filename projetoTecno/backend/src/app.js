import express from "express";
import cors from "cors";
import "dotenv/config";

import { autenticarUsuario } from "./middlewares/auth.middleware.js";
import salasRoutes from "./routes/salas.routes.js";
import tarefasRoutes from "./routes/tarefas.routes.js";
import authRoutes from "./routes/auth.routes.js";
import quadrosRoutes from "./routes/quadros.routes.js";
import listasRoutes from "./routes/listas.routes.js";
import cartoesInternosRoutes from "./routes/cartoes-internos.routes.js";
import etiquetasRoutes from "./routes/etiquetas.routes.js";
import notificacoesRoutes from "./routes/notificacoes.routes.js";
import { iniciarAgendadorLembretes } from "./services/lembretes.js";

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
    });
});


app.use("/api/auth", authRoutes);
app.use("/api/salas", autenticarUsuario, salasRoutes);
app.use("/api/tarefas", autenticarUsuario, tarefasRoutes);
app.use("/api/tarefas/:id", autenticarUsuario, cartoesInternosRoutes);
app.use("/api/quadros", autenticarUsuario, quadrosRoutes);
app.use("/api/etiquetas", autenticarUsuario, etiquetasRoutes);
app.use("/api/listas", autenticarUsuario, listasRoutes);
app.use("/api/notificacoes", autenticarUsuario, notificacoesRoutes);

app.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro);
    if (erro instanceof SyntaxError && erro.status === 400 && "body" in erro) {
        return res.status(400).json({ erro: "O corpo da requisição contém JSON inválido." });
    }
    console.error("Erro não tratado na API:", erro);
    return res.status(500).json({ erro: "Erro interno do servidor." });
});

export { app };

const PORT = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV !== "test") {
    iniciarAgendadorLembretes();
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}