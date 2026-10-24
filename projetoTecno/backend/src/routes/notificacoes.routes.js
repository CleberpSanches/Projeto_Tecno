import { Router } from "express";
import { listarNotificacoes, marcarNotificacaoLida } from "../controllers/notificacoes.controller.js";
const router = Router();
router.get("/", listarNotificacoes);
router.patch("/:id/lida", marcarNotificacaoLida);
export default router;
