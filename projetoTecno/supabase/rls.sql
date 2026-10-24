-- Políticas RLS para uso com a chave "anon" do Supabase (backend usa anon key).
-- AVISO: essas políticas liberam acesso completo ao papel anon e servem apenas
-- para desenvolvimento/protótipo. Em produção use a service_role no servidor
-- e restrinja as políticas por usuário autenticado.

ALTER TABLE usuario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sala          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sala_usuario  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefa        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_tarefa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_acesso_total ON usuario;
CREATE POLICY anon_acesso_total ON usuario
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_acesso_total ON sala;
CREATE POLICY anon_acesso_total ON sala
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_acesso_total ON sala_usuario;
CREATE POLICY anon_acesso_total ON sala_usuario
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_acesso_total ON tarefa;
CREATE POLICY anon_acesso_total ON tarefa
    FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_acesso_total ON usuario_tarefa;
CREATE POLICY anon_acesso_total ON usuario_tarefa
    FOR ALL TO anon USING (true) WITH CHECK (true);

-- Garante as permissões básicas de DML para o papel anon (normalmente já existem no Supabase).
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
