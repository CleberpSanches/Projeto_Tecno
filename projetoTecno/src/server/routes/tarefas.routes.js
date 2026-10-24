import { Router } from "express";
import { autenticarUsuario } from "../middlewares/auth.middleware.js";

import {
    listarTarefas,
    detalheTarefa,
    criarTarefa,
    atualizarTarefa,
    atualizarStatusTarefa,
    atribuirResponsaveis,
    excluirTarefa,
} from "../controllers/tarefas.controller.js";

const router = Router();
router.use(autenticarUsuario);

router.get("/", listarTarefas);
router.post("/", criarTarefa);
router.get("/:id", detalheTarefa);
router.patch("/:id", atualizarTarefa);
// Atalho mantido por compatibilidade: alternar o status completo via PATCH /:id/status.
router.patch("/:id/status", atualizarStatusTarefa);
router.put("/:id/responsaveis", atribuirResponsaveis);
router.delete("/:id", excluirTarefa);

export default router;
