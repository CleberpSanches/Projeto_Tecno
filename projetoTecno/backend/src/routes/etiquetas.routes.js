import { Router } from "express";
import { listarEtiquetas, criarEtiqueta, atualizarEtiqueta, excluirEtiqueta } from "../controllers/etiquetas.controller.js";

const router = Router();
router.get("/", listarEtiquetas);
router.post("/", criarEtiqueta);
router.patch("/:id", atualizarEtiqueta);
router.delete("/:id", excluirEtiqueta);
export default router;
