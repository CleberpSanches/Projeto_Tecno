import { Router } from "express";

import {
    listarTarefas,
    criarTarefa,
    concluirTarefa,
} from "../controllers/tarefas.controller.js";

const router = Router();

router.get("/", listarTarefas);
router.post("/", criarTarefa);
router.patch("/:id/concluir", concluirTarefa);

export default router;