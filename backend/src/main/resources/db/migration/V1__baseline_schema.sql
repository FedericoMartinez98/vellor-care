-- =============================================================================
-- Vellor Care — Schema baseline
-- Gestão de ativos de TI e manutenção preventiva de computadores.
--
-- Convenções:
--   * Chaves primárias UUID geradas na aplicação (Hibernate) — sem extensão pgcrypto.
--   * Enums modelados como VARCHAR + CHECK, para permitir evolução sem ALTER TYPE.
--   * Timestamps em TIMESTAMPTZ, sempre gravados em UTC.
--   * Toda FK tem índice explícito (o Postgres não cria automaticamente).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Unidades / filiais
-- -----------------------------------------------------------------------------
CREATE TABLE units (
    id          UUID         PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    code        VARCHAR(20)  NOT NULL,
    address     VARCHAR(255),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_units_code UNIQUE (code)
);

-- -----------------------------------------------------------------------------
-- Setores
-- -----------------------------------------------------------------------------
CREATE TABLE sectors (
    id           UUID         PRIMARY KEY,
    name         VARCHAR(120) NOT NULL,
    code         VARCHAR(20)  NOT NULL,
    unit_id      UUID         NOT NULL,
    manager      VARCHAR(120),
    cost_center  VARCHAR(40),
    color        VARCHAR(40)  NOT NULL DEFAULT 'var(--chart-1)',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_sectors_code UNIQUE (code),
    CONSTRAINT fk_sectors_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT
);
CREATE INDEX idx_sectors_unit ON sectors (unit_id);

-- -----------------------------------------------------------------------------
-- Usuários do sistema
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id             UUID         PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    email          VARCHAR(180) NOT NULL,
    password_hash  VARCHAR(120),
    role           VARCHAR(20)  NOT NULL,
    sector_id      UUID,
    avatar_url     VARCHAR(500),
    phone          VARCHAR(30),
    active         BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Preparação para Active Directory: quando preenchido, autenticação é delegada ao AD.
    ad_object_guid VARCHAR(64),
    ad_upn         VARCHAR(180),
    last_login_at  TIMESTAMPTZ,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT uk_users_ad_guid UNIQUE (ad_object_guid),
    CONSTRAINT ck_users_role CHECK (role IN ('ADMINISTRADOR', 'TECNICO', 'VISUALIZADOR')),
    CONSTRAINT fk_users_sector FOREIGN KEY (sector_id) REFERENCES sectors (id) ON DELETE SET NULL
);
CREATE INDEX idx_users_sector ON users (sector_id);
CREATE INDEX idx_users_role ON users (role);

-- Permissões granulares por módulo (sobrepõem o padrão do papel)
CREATE TABLE user_permissions (
    id          UUID        PRIMARY KEY,
    user_id     UUID        NOT NULL,
    module      VARCHAR(40) NOT NULL,
    can_read    BOOLEAN     NOT NULL DEFAULT TRUE,
    can_write   BOOLEAN     NOT NULL DEFAULT FALSE,
    can_remove  BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_user_permissions UNIQUE (user_id, module),
    CONSTRAINT fk_user_permissions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_user_permissions_user ON user_permissions (user_id);

-- Refresh tokens emitidos (permite revogação)
CREATE TABLE refresh_tokens (
    id          UUID         PRIMARY KEY,
    user_id     UUID         NOT NULL,
    token_hash  VARCHAR(120) NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_refresh_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

-- -----------------------------------------------------------------------------
-- Computadores
-- -----------------------------------------------------------------------------
CREATE TABLE computers (
    id                         UUID         PRIMARY KEY,
    -- Identificação
    asset_tag                  VARCHAR(40)  NOT NULL,
    hostname                   VARCHAR(80)  NOT NULL,
    serial_number              VARCHAR(80)  NOT NULL,
    model                      VARCHAR(120) NOT NULL,
    manufacturer               VARCHAR(80)  NOT NULL,
    -- Usuário responsável
    employee_name              VARCHAR(120) NOT NULL,
    employee_email             VARCHAR(180) NOT NULL,
    sector_id                  UUID         NOT NULL,
    unit_id                    UUID         NOT NULL,
    location                   VARCHAR(120),
    -- Hardware
    processor                  VARCHAR(120) NOT NULL,
    ram_gb                     INTEGER      NOT NULL,
    ram_detail                 VARCHAR(120),
    storage_type               VARCHAR(20)  NOT NULL,
    storage_gb                 INTEGER      NOT NULL,
    storage_detail             VARCHAR(120),
    gpu                        VARCHAR(120),
    power_supply               VARCHAR(120),
    motherboard                VARCHAR(120),
    acquisition_date           DATE         NOT NULL,
    -- Sistema
    windows_version            VARCHAR(60)  NOT NULL,
    windows_build              VARCHAR(40)  NOT NULL,
    office_version             VARCHAR(60),
    antivirus                  VARCHAR(80),
    last_windows_update        DATE,
    domain_joined              BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Garantia / aquisição
    supplier                   VARCHAR(120),
    invoice_number             VARCHAR(60),
    warranty_until             DATE,
    purchase_value             NUMERIC(12, 2),
    -- Operacional
    status                     VARCHAR(20)  NOT NULL DEFAULT 'ATIVO',
    notes                      TEXT,
    photo_url                  VARCHAR(500),
    qr_payload                 VARCHAR(500) NOT NULL,
    last_maintenance_at        TIMESTAMPTZ,
    next_maintenance_at        DATE,
    maintenance_interval_days  INTEGER      NOT NULL DEFAULT 90,
    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_computers_asset_tag UNIQUE (asset_tag),
    CONSTRAINT uk_computers_hostname UNIQUE (hostname),
    CONSTRAINT uk_computers_serial UNIQUE (serial_number),
    CONSTRAINT ck_computers_status CHECK (status IN ('ATIVO', 'EM_MANUTENCAO', 'RESERVA', 'DESATIVADO')),
    CONSTRAINT ck_computers_storage_type CHECK (storage_type IN ('SSD_NVME', 'SSD_SATA', 'HDD', 'HIBRIDO')),
    CONSTRAINT ck_computers_interval CHECK (maintenance_interval_days BETWEEN 15 AND 365),
    CONSTRAINT fk_computers_sector FOREIGN KEY (sector_id) REFERENCES sectors (id) ON DELETE RESTRICT,
    CONSTRAINT fk_computers_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT
);
CREATE INDEX idx_computers_sector ON computers (sector_id);
CREATE INDEX idx_computers_unit ON computers (unit_id);
CREATE INDEX idx_computers_status ON computers (status);
CREATE INDEX idx_computers_next_maintenance ON computers (next_maintenance_at);
CREATE INDEX idx_computers_employee_email ON computers (employee_email);

-- Busca global: índice trigram sobre os campos textuais mais consultados
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_computers_search_trgm
    ON computers USING gin (
        (asset_tag || ' ' || hostname || ' ' || employee_name || ' ' || model) gin_trgm_ops
    );

-- -----------------------------------------------------------------------------
-- Telemetria / saúde do computador
-- Uma linha por coleta. A mais recente por computador alimenta o painel de saúde.
-- -----------------------------------------------------------------------------
CREATE TABLE computer_health_snapshots (
    id                  UUID        PRIMARY KEY,
    computer_id         UUID        NOT NULL,
    collected_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    ssd_health_percent  NUMERIC(5, 2) NOT NULL,
    ssd_power_on_hours  INTEGER,
    cpu_temp_c          NUMERIC(5, 2) NOT NULL,
    gpu_temp_c          NUMERIC(5, 2),
    ssd_temp_c          NUMERIC(5, 2) NOT NULL,
    cpu_usage_percent   NUMERIC(5, 2) NOT NULL,
    ram_usage_percent   NUMERIC(5, 2) NOT NULL,
    disk_free_percent   NUMERIC(5, 2) NOT NULL,
    disk_free_gb        NUMERIC(10, 2) NOT NULL,
    uptime_hours        NUMERIC(10, 2) NOT NULL,
    last_boot_at        TIMESTAMPTZ,
    source              VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    CONSTRAINT ck_health_source CHECK (source IN ('MANUAL', 'AGENTE')),
    CONSTRAINT fk_health_computer FOREIGN KEY (computer_id) REFERENCES computers (id) ON DELETE CASCADE
);
CREATE INDEX idx_health_computer_collected ON computer_health_snapshots (computer_id, collected_at DESC);

-- -----------------------------------------------------------------------------
-- Estoque de peças
-- -----------------------------------------------------------------------------
CREATE TABLE inventory_parts (
    id                UUID          PRIMARY KEY,
    sku               VARCHAR(40)   NOT NULL,
    name              VARCHAR(160)  NOT NULL,
    category          VARCHAR(30)   NOT NULL,
    quantity          INTEGER       NOT NULL DEFAULT 0,
    minimum_quantity  INTEGER       NOT NULL DEFAULT 0,
    unit              VARCHAR(12)   NOT NULL DEFAULT 'un',
    supplier          VARCHAR(120),
    unit_value        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    location          VARCHAR(80),
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uk_inventory_parts_sku UNIQUE (sku),
    CONSTRAINT ck_inventory_parts_qty CHECK (quantity >= 0),
    CONSTRAINT ck_inventory_parts_min CHECK (minimum_quantity >= 0),
    CONSTRAINT ck_inventory_parts_category CHECK (category IN (
        'SSD', 'HD', 'MEMORIA_RAM', 'PASTA_TERMICA', 'COOLER', 'FONTE',
        'CABO', 'MOUSE', 'TECLADO', 'MONITOR', 'PLACA_VIDEO', 'OUTRO'))
);
CREATE INDEX idx_inventory_parts_category ON inventory_parts (category);

-- -----------------------------------------------------------------------------
-- Manutenções (preventivas e demais tipos)
-- -----------------------------------------------------------------------------
CREATE TABLE maintenances (
    id                 UUID         PRIMARY KEY,
    computer_id        UUID         NOT NULL,
    sector_id          UUID         NOT NULL,
    technician_id      UUID,
    type               VARCHAR(20)  NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'AGENDADA',
    priority           VARCHAR(20)  NOT NULL DEFAULT 'MEDIA',
    scheduled_for      DATE         NOT NULL,
    started_at         TIMESTAMPTZ,
    finished_at        TIMESTAMPTZ,
    duration_minutes   INTEGER,
    notes              TEXT,
    signature_data_url TEXT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_maintenances_type CHECK (type IN (
        'PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'UPGRADE', 'FORMATACAO')),
    CONSTRAINT ck_maintenances_status CHECK (status IN (
        'AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'ATRASADA', 'CANCELADA')),
    CONSTRAINT ck_maintenances_priority CHECK (priority IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
    CONSTRAINT ck_maintenances_duration CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    CONSTRAINT fk_maintenances_computer FOREIGN KEY (computer_id) REFERENCES computers (id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenances_sector FOREIGN KEY (sector_id) REFERENCES sectors (id) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenances_technician FOREIGN KEY (technician_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX idx_maintenances_computer ON maintenances (computer_id);
CREATE INDEX idx_maintenances_sector ON maintenances (sector_id);
CREATE INDEX idx_maintenances_technician ON maintenances (technician_id);
CREATE INDEX idx_maintenances_status ON maintenances (status);
CREATE INDEX idx_maintenances_scheduled ON maintenances (scheduled_for);
CREATE INDEX idx_maintenances_finished ON maintenances (finished_at);

-- Itens do checklist executado
CREATE TABLE maintenance_checklist_items (
    id              UUID         PRIMARY KEY,
    maintenance_id  UUID         NOT NULL,
    item_key        VARCHAR(60)  NOT NULL,
    label           VARCHAR(120) NOT NULL,
    item_group      VARCHAR(20)  NOT NULL,
    done            BOOLEAN      NOT NULL DEFAULT FALSE,
    measured_value  NUMERIC(10, 2),
    note            VARCHAR(500),
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT uk_checklist_item UNIQUE (maintenance_id, item_key),
    CONSTRAINT ck_checklist_group CHECK (item_group IN (
        'LIMPEZA', 'TERMICA', 'PERIFERICOS', 'TESTES', 'SOFTWARE', 'MEDICOES')),
    CONSTRAINT fk_checklist_maintenance FOREIGN KEY (maintenance_id)
        REFERENCES maintenances (id) ON DELETE CASCADE
);
CREATE INDEX idx_checklist_maintenance ON maintenance_checklist_items (maintenance_id);

-- Fotos antes/depois
CREATE TABLE maintenance_photos (
    id              UUID         PRIMARY KEY,
    maintenance_id  UUID         NOT NULL,
    url             VARCHAR(500) NOT NULL,
    caption         VARCHAR(200),
    moment          VARCHAR(10)  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_photo_moment CHECK (moment IN ('ANTES', 'DEPOIS')),
    CONSTRAINT fk_photos_maintenance FOREIGN KEY (maintenance_id)
        REFERENCES maintenances (id) ON DELETE CASCADE
);
CREATE INDEX idx_photos_maintenance ON maintenance_photos (maintenance_id);

-- Peças consumidas na manutenção (dá baixa no estoque)
CREATE TABLE maintenance_parts (
    id              UUID          PRIMARY KEY,
    maintenance_id  UUID          NOT NULL,
    part_id         UUID          NOT NULL,
    part_name       VARCHAR(160)  NOT NULL,
    quantity        INTEGER       NOT NULL,
    unit_cost       NUMERIC(12, 2),
    CONSTRAINT ck_maintenance_parts_qty CHECK (quantity > 0),
    CONSTRAINT fk_maintenance_parts_maintenance FOREIGN KEY (maintenance_id)
        REFERENCES maintenances (id) ON DELETE CASCADE,
    CONSTRAINT fk_maintenance_parts_part FOREIGN KEY (part_id)
        REFERENCES inventory_parts (id) ON DELETE RESTRICT
);
CREATE INDEX idx_maintenance_parts_maintenance ON maintenance_parts (maintenance_id);
CREATE INDEX idx_maintenance_parts_part ON maintenance_parts (part_id);

-- Movimentações de estoque (razão auditável do saldo)
CREATE TABLE inventory_movements (
    id                  UUID         PRIMARY KEY,
    part_id             UUID         NOT NULL,
    part_name           VARCHAR(160) NOT NULL,
    type                VARCHAR(20)  NOT NULL,
    quantity            INTEGER      NOT NULL,
    balance_after       INTEGER      NOT NULL,
    maintenance_id      UUID,
    computer_asset_tag  VARCHAR(40),
    user_id             UUID,
    user_name           VARCHAR(120) NOT NULL,
    reason              VARCHAR(300),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_movements_type CHECK (type IN ('ENTRADA', 'SAIDA', 'AJUSTE', 'DESCARTE')),
    CONSTRAINT ck_movements_qty CHECK (quantity > 0),
    CONSTRAINT fk_movements_part FOREIGN KEY (part_id) REFERENCES inventory_parts (id) ON DELETE CASCADE,
    CONSTRAINT fk_movements_maintenance FOREIGN KEY (maintenance_id)
        REFERENCES maintenances (id) ON DELETE SET NULL,
    CONSTRAINT fk_movements_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX idx_movements_part_created ON inventory_movements (part_id, created_at DESC);
CREATE INDEX idx_movements_maintenance ON inventory_movements (maintenance_id);

-- -----------------------------------------------------------------------------
-- Notificações / alertas automáticos
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id              UUID         PRIMARY KEY,
    type            VARCHAR(40)  NOT NULL,
    severity        VARCHAR(20)  NOT NULL DEFAULT 'INFO',
    title           VARCHAR(160) NOT NULL,
    message         VARCHAR(500) NOT NULL,
    computer_id     UUID,
    maintenance_id  UUID,
    part_id         UUID,
    target_user_id  UUID,
    href            VARCHAR(300),
    read_flag       BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Evita alertas duplicados na varredura diária (ex.: 'PREVENTIVA_ATRASADA:<computerId>:2026-08-25')
    dedup_key       VARCHAR(200),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_notifications_dedup UNIQUE (dedup_key),
    CONSTRAINT ck_notifications_type CHECK (type IN (
        'PREVENTIVA_7_DIAS', 'PREVENTIVA_HOJE', 'PREVENTIVA_ATRASADA', 'SSD_SAUDE_BAIXA',
        'TEMPERATURA_ALTA', 'SEM_MANUTENCAO_120_DIAS', 'ESTOQUE_MINIMO', 'SISTEMA')),
    CONSTRAINT ck_notifications_severity CHECK (severity IN ('INFO', 'AVISO', 'CRITICO')),
    CONSTRAINT fk_notifications_computer FOREIGN KEY (computer_id) REFERENCES computers (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_maintenance FOREIGN KEY (maintenance_id) REFERENCES maintenances (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_part FOREIGN KEY (part_id) REFERENCES inventory_parts (id) ON DELETE CASCADE,
    CONSTRAINT fk_notifications_user FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE CASCADE
);
CREATE INDEX idx_notifications_read_created ON notifications (read_flag, created_at DESC);
CREATE INDEX idx_notifications_computer ON notifications (computer_id);
CREATE INDEX idx_notifications_target_user ON notifications (target_user_id);

-- -----------------------------------------------------------------------------
-- Relatórios salvos (filtros reutilizáveis por usuário)
-- -----------------------------------------------------------------------------
CREATE TABLE reports (
    id           UUID         PRIMARY KEY,
    name         VARCHAR(160) NOT NULL,
    report_key   VARCHAR(60)  NOT NULL,
    description  VARCHAR(400),
    -- Filtros serializados em JSON (from, to, sectorId, technicianId, type, status...)
    filters_json TEXT         NOT NULL DEFAULT '{}',
    owner_id     UUID,
    shared       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_reports_key CHECK (report_key IN (
        'PREVENTIVAS_PERIODO', 'COMPUTADORES_SETOR', 'HISTORICO_EQUIPAMENTO',
        'PECAS_UTILIZADAS', 'PRODUTIVIDADE_TECNICOS')),
    CONSTRAINT fk_reports_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX idx_reports_owner ON reports (owner_id);

-- -----------------------------------------------------------------------------
-- Trilha de auditoria
-- -----------------------------------------------------------------------------
CREATE TABLE audit_log (
    id          UUID         PRIMARY KEY,
    entity      VARCHAR(60)  NOT NULL,
    entity_id   UUID,
    action      VARCHAR(20)  NOT NULL,
    user_id     UUID,
    user_name   VARCHAR(120),
    detail      TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_audit_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'))
);
CREATE INDEX idx_audit_entity ON audit_log (entity, entity_id);
CREATE INDEX idx_audit_created ON audit_log (created_at DESC);
