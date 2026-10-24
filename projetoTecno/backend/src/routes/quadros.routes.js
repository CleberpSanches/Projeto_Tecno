import { Router } from "express";
import { listarQuadros, listarModelosQuadro, criarQuadro, convidarMembroQuadro, listarMembrosQuadro, atualizarPapelMembroQuadro, removerMembroQuadro } from "../controllers/quadros.controller.js";
import { listarAtividadesQuadro } from "../controllers/atividades.controller.js";

const router = Router();
router.get("/", listarQuadros);
router.get("/modelos", listarModelosQuadro);
router.post("/", criarQuadro);
router.get("/:id/membros", listarMembrosQuadro);
router.get("/:id/atividades", listarAtividadesQuadro);
router.post("/:id/convites", convidarMembroQuadro);
router.patch("/:id/membros/:usuarioId/papel", atualizarPapelMembroQuadro);
router.delete("/:id/membros/:usuarioId", removerMembroQuadro);
export default router;
