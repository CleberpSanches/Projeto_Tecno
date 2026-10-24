import { Router } from "express";

import {
    listarSalas,
    criarSala,
    entrarNaSala,
} from "../controllers/salas.controller.js";

const router = Router();

router.get("/", listarSalas);
router.post("/", criarSala);
router.post("/entrar", entrarNaSala);

export default router;