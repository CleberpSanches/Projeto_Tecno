import { Router } from "express";
import {
    listarSalas, criarSala, entrarNaSala, listarMembrosSala,
    convidarMembroSala, listarConvitesRecebidos, aceitarConviteSala, atualizarPapelMembroSala, removerMembroSala,
} from "../controllers/salas.controller.js";

const router = Router();
router.get("/", listarSalas);
router.post("/", criarSala);
router.post("/entrar", entrarNaSala);
router.get("/convites/recebidos", listarConvitesRecebidos);
router.post("/convites/:token/aceitar", aceitarConviteSala);
router.get("/:id/membros", listarMembrosSala);
router.post("/:id/convites", convidarMembroSala);
router.patch("/:id/membros/:usuarioId/papel", atualizarPapelMembroSala);
router.delete("/:id/membros/:usuarioId", removerMembroSala);
export default router;
