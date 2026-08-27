-- As fotos de manutencao sao enviadas como data-URL (base64 embutido), do mesmo
-- jeito que a assinatura do tecnico -- que ja usa TEXT (maintenances.signature_data_url).
-- Com VARCHAR(500) qualquer foto real estoura a coluna e a conclusao da manutencao
-- falha no INSERT. Alargar para TEXT nao perde dado nem quebra registro existente.
ALTER TABLE maintenance_photos ALTER COLUMN url TYPE TEXT;
