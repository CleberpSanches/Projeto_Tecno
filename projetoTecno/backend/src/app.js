import express from "express";
import cors from "cors";
import "dotenv/config";

import { autenticarUsuario } from "./middlewares/auth.middleware.js";
import salasRoutes from "./routes/salas.routes.js";
import tarefasRoutes from "./routes/tarefas.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensagem: "API funcionando",
    });
});


app.use("/api/auth", authRoutes);
app.use("/api/salas", autenticarUsuario, salasRoutes);
app.use("/api/tarefas", autenticarUsuario, tarefasRoutes);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});