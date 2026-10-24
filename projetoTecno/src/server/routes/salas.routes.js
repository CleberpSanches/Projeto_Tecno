import { Router } from "express";
import { autenticarUsuario } from "../middlewares/auth.middleware.js";
import {
    listarSalas, criarSala, detalheSala, entrarNaSala, listarMembrosSala,
    atualizarPapelMembroSala, removerMembroSala, excluirSala,
} from "../controllers/salas.controller.js";

const router = Router();
router.use(autenticarUsuario);

router.get("/", listarSalas);
router.post("/", criarSala);
router.post("/entrar", entrarNaSala);
router.get("/:id", detalheSala);
router.get("/:id/membros", listarMembrosSala);
router.patch("/:id/membros/:usuarioId/papel", atualizarPapelMembroSala);
router.delete("/:id/membros/:usuarioId", removerMembroSala);
router.delete("/:id", excluirSala);

export default router;
