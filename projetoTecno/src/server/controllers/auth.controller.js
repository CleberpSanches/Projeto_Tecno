import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase, ApiError, traduzirErroBanco } from "../supabase.js";

function gerarToken(usuario) {
    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email,
        },
        process.env.JWT_SECRET || "segredo-temporario-tecnoplan",
        {
            expiresIn: "2h",
        }
    );
}

function validarCorpo(body) {
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
}

export async function cadastrarUsuario(req, res) {
    try {
        const corpo = validarCorpo(req.body);
        const { nome, email, senha } = corpo;

        if (typeof nome !== "string" || !nome.trim() || typeof email !== "string" || !email.trim() || typeof senha !== "string" || !senha) {
            return res.status(400).json({
                erro: "Nome, e-mail e senha são obrigatórios e devem ser textos.",
            });
        }
        if (nome.trim().length > 100) {
            return res.status(400).json({ erro: "O nome deve ter no máximo 100 caracteres." });
        }
        if (Buffer.byteLength(senha, "utf8") > 72) {
            return res.status(400).json({ erro: "A senha deve ter no máximo 72 bytes." });
        }

        const emailNormalizado = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
            return res.status(400).json({
                erro: "Informe um e-mail válido.",
            });
        }

        if (senha.length < 8) {
            return res.status(400).json({
                erro: "A senha deve ter pelo menos 8 caracteres.",
            });
        }

        // A coluna email é citext: o banco já trata duplicações sem diferenciar maiúsculas.
        const senhaHash = await bcrypt.hash(senha, 10);

        const { data: novoUsuario, error } = await supabase
            .from("usuario")
            .insert({
                email: emailNormalizado,
                nome: nome.trim(),
                senha: senhaHash,
            })
            .select("id, email, nome, criado_em")
            .single();

        if (error) {
            if (error.code === "23505") {
                return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
            }
            throw traduzirErroBanco(error);
        }

        const token = gerarToken(novoUsuario);

        return res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso.",
            usuario: {
                id: novoUsuario.id,
                nome: novoUsuario.nome,
                email: novoUsuario.email,
            },
            token,
        });
    } catch (erro) {
        if (erro instanceof ApiError) {
            return res.status(erro.status).json({ erro: erro.message });
        }
        console.error("Erro ao cadastrar usuário:", erro);
        return res.status(500).json({ erro: "Erro interno ao cadastrar usuário." });
    }
}

export async function loginUsuario(req, res) {
    try {
        const corpo = validarCorpo(req.body);
        const { email, senha } = corpo;

        if (typeof email !== "string" || !email.trim() || typeof senha !== "string" || !senha) {
            return res.status(400).json({
                erro: "E-mail e senha são obrigatórios e devem ser textos.",
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const { data: usuario, error } = await supabase
            .from("usuario")
            .select("id, email, nome, senha")
            .eq("email", emailNormalizado)
            .maybeSingle();

        if (error) throw traduzirErroBanco(error);

        const senhaCorreta = usuario ? await bcrypt.compare(senha, usuario.senha) : false;

        if (!usuario || !senhaCorreta) {
            return res.status(401).json({ erro: "E-mail ou senha incorretos." });
        }

        const token = gerarToken(usuario);

        return res.status(200).json({
            mensagem: "Login realizado com sucesso.",
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
            },
            token,
        });
    } catch (erro) {
        if (erro instanceof ApiError) {
            return res.status(erro.status).json({ erro: erro.message });
        }
        console.error("Erro ao realizar login:", erro);
        return res.status(500).json({ erro: "Erro interno ao realizar login." });
    }
}

// Dados da própria conta autenticada (tabela usuario).
export async function obterPropriaConta(req, res) {
    const { id } = req.usuario;
    const { data: usuario, error } = await supabase
        .from("usuario")
        .select("id, email, nome, criado_em")
        .eq("id", Number(id))
        .maybeSingle();

    if (error) {
        console.error("Erro ao buscar conta:", error);
        return res.status(500).json({ erro: "Erro interno do servidor." });
    }
    if (!usuario) return res.status(404).json({ erro: "Usuário não encontrado." });

    return res.status(200).json({ usuario });
}

// Exclui a própria conta. As associações em sala_usuario e usuario_tarefa
// são removidas pelo ON DELETE CASCADE; salas em que o usuário é dono
// (sala_dono é RESTRICT) ou tarefas criadas por ele (id_criador é RESTRICT)
// impedem a exclusão até serem transferidas/removidas.
export async function excluirPropriaConta(req, res) {
    try {
        const idUsuario = Number(req.usuario.id);

        const { error } = await supabase
            .from("usuario")
            .delete()
            .eq("id", idUsuario);

        if (error) {
            // 23503: violação de chave estrangeira (RESTRICT em sala_dono / id_criador).
            if (error.code === "23503") {
                return res.status(409).json({
                    erro: "Sua conta ainda é dona de salas ou criadora de tarefas. Exclua-as ou transfira a administração antes de excluir a conta.",
                });
            }
            if (error.code === "PGRST116") {
                return res.status(404).json({ erro: "Usuário não encontrado." });
            }
            throw traduzirErroBanco(error);
        }

        return res.status(200).json({ mensagem: "Conta excluída com sucesso." });
    } catch (erro) {
        if (erro instanceof ApiError) {
            return res.status(erro.status).json({ erro: erro.message });
        }
        console.error("Erro ao excluir conta:", erro);
        return res.status(500).json({ erro: "Erro interno ao excluir conta." });
    }
}
