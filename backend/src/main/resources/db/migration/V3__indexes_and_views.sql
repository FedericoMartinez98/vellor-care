-- =============================================================================
-- Vellor Care — Índices de consulta e views de negócio
--
-- View 1: v_computer_latest_health — snapshot de telemetria mais recente por máquina
-- View 2: v_sector_compliance — métricas agregadas de conformidade por setor
-- Índices adicionais para performance em relatórios e dashboard
-- =============================================================================

-- -----------------------------------------------------------------------------
-- View: Snapshot de telemetria mais recente de cada computador
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_computer_latest_health AS
SELECT DISTINCT ON (h.computer_id)
    h.id AS snapshot_id,
    h.computer_id,
    c.asset_tag,
    c.hostname,
    c.employee_name,
    c.sector_id,
    s.name AS sector_name,
    h.collected_at,
    h.ssd_health_percent,
    h.ssd_power_on_hours,
    h.cpu_temp_c,
    h.gpu_temp_c,
    h.ssd_temp_c,
    h.cpu_usage_percent,
    h.ram_usage_percent,
    h.disk_free_percent,
    h.disk_free_gb,
    h.uptime_hours,
    h.last_boot_at,
    h.source
FROM computer_health_snapshots h
JOIN computers c ON c.id = h.computer_id
JOIN sectors s ON s.id = c.sector_id
ORDER BY h.computer_id, h.collected_at DESC;

-- -----------------------------------------------------------------------------
-- View: Conformidade de manutenção preventiva por setor
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_sector_compliance AS
SELECT
    s.id AS sector_id,
    s.name AS sector_name,
    s.code AS sector_code,
    s.color AS sector_color,
    u.name AS unit_name,
    COUNT(c.id) AS total_computers,
    COUNT(c.id) FILTER (
        WHERE c.status = 'ATIVO'
          AND c.next_maintenance_at IS NOT NULL
          AND c.next_maintenance_at >= CURRENT_DATE
    ) AS computers_on_schedule,
    COUNT(c.id) FILTER (
        WHERE c.status = 'ATIVO'
          AND (c.next_maintenance_at IS NULL OR c.next_maintenance_at < CURRENT_DATE)
    ) AS computers_overdue,
    COUNT(c.id) FILTER (WHERE c.status = 'EM_MANUTENCAO') AS computers_in_maintenance,
    COUNT(c.id) FILTER (WHERE c.status = 'RESERVA') AS computers_reserve,
    COUNT(c.id) FILTER (WHERE c.status = 'DESATIVADO') AS computers_decommissioned,
    ROUND(
        CASE
            WHEN COUNT(c.id) FILTER (WHERE c.status = 'ATIVO') = 0 THEN 100.0
            ELSE (
                COUNT(c.id) FILTER (
                    WHERE c.status = 'ATIVO'
                      AND c.next_maintenance_at IS NOT NULL
                      AND c.next_maintenance_at >= CURRENT_DATE
                )::NUMERIC / COUNT(c.id) FILTER (WHERE c.status = 'ATIVO')::NUMERIC
            ) * 100.0
        END,
        1
    ) AS compliance_percent
FROM sectors s
JOIN units u ON u.id = s.unit_id
LEFT JOIN computers c ON c.sector_id = s.id
GROUP BY s.id, s.name, s.code, s.color, u.name;

-- -----------------------------------------------------------------------------
-- Índices complementares
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_maintenances_type_scheduled
    ON maintenances (type, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_maintenances_sector_status
    ON maintenances (sector_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_parts_low_stock
    ON inventory_parts (quantity, minimum_quantity)
    WHERE quantity <= minimum_quantity;

CREATE INDEX IF NOT EXISTS idx_notifications_unread_user
    ON notifications (target_user_id, read_flag, created_at DESC)
    WHERE read_flag = FALSE;
