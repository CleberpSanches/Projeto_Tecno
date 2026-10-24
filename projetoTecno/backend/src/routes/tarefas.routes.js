import { Router } from "express";

import {
  listarTarefas,
  criarTarefa,
  concluirTarefa,
  moverTarefa,
  atribuirResponsaveis,
  arquivarTarefa,
  desarquivarTarefa,
  excluirTarefa,
  definirEtiquetasTarefa,
  atualizarDescricaoTarefa,
  atualizarPrazoTarefa
} from "../controllers/tarefas.controller.js";

const router = Router();

router.get("/", listarTarefas);
router.post("/", criarTarefa);
router.patch("/:id/concluir", concluirTarefa);
router.patch("/:id/mover", moverTarefa);
router.patch("/:id/responsaveis", atribuirResponsaveis);
router.put("/:id/etiquetas", definirEtiquetasTarefa);
router.patch("/:id/descricao", atualizarDescricaoTarefa);
router.patch("/:id/prazo", atualizarPrazoTarefa);
router.patch("/:id/arquivar", arquivarTarefa);
router.patch("/:id/desarquivar", desarquivarTarefa);
router.delete("/:id", excluirTarefa);

export default router;