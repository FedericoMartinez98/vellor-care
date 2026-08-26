-- Corrige mismatches entre as entidades JPA e o schema criado pelo V1, encontrados
-- ao validar o schema (Hibernate ddl-auto: validate) rodando a aplicacao localmente.

ALTER TABLE maintenance_checklist_items RENAME COLUMN item_group TO checklist_group;

ALTER TABLE notifications RENAME COLUMN read_flag TO is_read;

ALTER TABLE refresh_tokens RENAME COLUMN token_hash TO token;

-- A entidade usa um flag booleano simples de revogacao (nao ha funcionalidade de
-- revogacao com timestamp implementada no codigo), entao convertemos a coluna
-- de TIMESTAMPTZ para BOOLEAN preservando o significado (nao nulo = revogado).
ALTER TABLE refresh_tokens ADD COLUMN revoked BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE refresh_tokens SET revoked = (revoked_at IS NOT NULL);
ALTER TABLE refresh_tokens DROP COLUMN revoked_at;

ALTER TABLE reports RENAME TO report_definitions;
ALTER TABLE report_definitions RENAME COLUMN shared TO is_shared;
