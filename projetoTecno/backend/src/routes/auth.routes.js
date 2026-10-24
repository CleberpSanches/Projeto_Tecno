import { Router } from "express";
import { autenticarUsuario } from "../middlewares/auth.middleware.js";

import {
    cadastrarUsuario,
    loginUsuario,
    excluirPropriaConta,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/cadastro", cadastrarUsuario);
router.post("/login", loginUsuario);
// A rota de exclusão exige autenticação, sem proteger cadastro/login.
router.delete("/conta", autenticarUsuario, excluirPropriaConta);

export default router;