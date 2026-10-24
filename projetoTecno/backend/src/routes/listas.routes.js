import { Router } from "express";
import {
    listarListas,
    criarLista,
    reordenarListas,
} from "../controllers/listas.controller.js";

const router = Router();

router.get("/", listarListas);
router.post("/", criarLista);
router.patch("/reordenar", reordenarListas);

export default router;