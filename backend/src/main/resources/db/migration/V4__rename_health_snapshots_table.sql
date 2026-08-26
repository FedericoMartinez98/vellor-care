-- A entidade JPA HealthSnapshotEntity espera a tabela "health_snapshots",
-- mas o V1__baseline_schema.sql criou "computer_health_snapshots". Isso
-- fazia o Hibernate falhar na validacao do schema ao subir a aplicacao
-- (Schema-validation: missing table [health_snapshots]).
ALTER TABLE computer_health_snapshots RENAME TO health_snapshots;
