import { Router } from "express";
import { autenticarUsuario } from "../middlewares/auth.middleware.js";

import {
    cadastrarUsuario,
    loginUsuario,
    obterPropriaConta,
    excluirPropriaConta,
    atualizarCadastro,
    alterarSenhaUsuario
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/cadastro", cadastrarUsuario);
router.post("/login", loginUsuario);
// As rotas abaixo exigem autenticação.
router.get("/conta", autenticarUsuario, obterPropriaConta);
router.delete("/conta", autenticarUsuario, excluirPropriaConta);
router.put("/conta", autenticarUsuario, atualizarCadastro);
router.put("/alterar-senha", autenticarUsuario, alterarSenhaUsuario);
export default router;
