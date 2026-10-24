import { Router } from "express";
import { listarAtividadesTarefa } from "../controllers/atividades.controller.js";
import {
    listarChecklist,
    criarItemChecklist,
    atualizarItemChecklist,
    excluirItemChecklist,
    listarComentarios,
    criarComentario,
} from "../controllers/cartoes-internos.controller.js";

const router = Router({ mergeParams: true });

router.get("/checklists", listarChecklist);
router.post("/checklists", criarItemChecklist);
router.patch("/checklists/:itemId", atualizarItemChecklist);
router.delete("/checklists/:itemId", excluirItemChecklist);
router.get("/comentarios", listarComentarios);
router.get("/atividades", listarAtividadesTarefa);
router.post("/comentarios", criarComentario);

export default router;
