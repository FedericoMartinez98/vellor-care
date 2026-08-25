-- =============================================================================
-- Vellor Care — Dados de referência
--
-- Contém apenas dados estruturais que o sistema precisa para funcionar:
-- unidades, setores e o catálogo inicial de peças.
--
-- O usuário administrador NÃO é criado aqui de propósito: a senha precisa passar
-- pelo PasswordEncoder do Spring Security, então quem o cria é o
-- `AdminUserInitializer` (infrastructure/config) na primeira subida da aplicação.
-- Gravar um hash BCrypt fixo numa migration deixaria a credencial pública no
-- repositório e impediria trocar o algoritmo depois.
--
-- Dados de demonstração (computadores, manutenções, movimentações) ficam no
-- `DemoDataSeeder`, ativado somente com o profile `demo`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Unidades
-- -----------------------------------------------------------------------------
INSERT INTO units (id, name, code, address) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Matriz',                  'MTZ', 'Av. Principal, 1000'),
  ('a1000000-0000-4000-8000-000000000002', 'Centro de Distribuição',  'CD',  'Rod. BR-101, km 42'),
  ('a1000000-0000-4000-8000-000000000003', 'Loja Centro',             'LJC', 'Rua do Comércio, 250');

-- -----------------------------------------------------------------------------
-- Setores
-- -----------------------------------------------------------------------------
INSERT INTO sectors (id, name, code, unit_id, manager, cost_center, color) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'ADM',          'ADM',     'a1000000-0000-4000-8000-000000000001', NULL, '1010', 'var(--chart-1)'),
  ('b2000000-0000-4000-8000-000000000002', 'RH',           'RH',      'a1000000-0000-4000-8000-000000000001', NULL, '1020', 'var(--chart-2)'),
  ('b2000000-0000-4000-8000-000000000003', 'Financeiro',   'FIN',     'a1000000-0000-4000-8000-000000000001', NULL, '1030', 'var(--chart-3)'),
  ('b2000000-0000-4000-8000-000000000004', 'Marketing',    'MKT',     'a1000000-0000-4000-8000-000000000001', NULL, '1040', 'var(--chart-4)'),
  ('b2000000-0000-4000-8000-000000000005', 'Expedição',    'EXP',     'a1000000-0000-4000-8000-000000000001', NULL, '2010', 'var(--chart-5)'),
  ('b2000000-0000-4000-8000-000000000006', 'Estoque',      'EST',     'a1000000-0000-4000-8000-000000000001', NULL, '2020', 'var(--chart-6)'),
  ('b2000000-0000-4000-8000-000000000007', 'Conferência',  'CNF',     'a1000000-0000-4000-8000-000000000001', NULL, '2030', 'var(--chart-1)'),
  ('b2000000-0000-4000-8000-000000000008', 'Atacado ADM',  'ATA-ADM', 'a1000000-0000-4000-8000-000000000002', NULL, '3010', 'var(--chart-2)'),
  ('b2000000-0000-4000-8000-000000000009', 'Atacado LOG',  'ATA-LOG', 'a1000000-0000-4000-8000-000000000002', NULL, '3020', 'var(--chart-3)'),
  ('b2000000-0000-4000-8000-00000000000a', 'Varejo',       'VAR',     'a1000000-0000-4000-8000-000000000003', NULL, '4010', 'var(--chart-4)');

-- -----------------------------------------------------------------------------
-- Catálogo inicial de peças
-- Quantidades zeradas: o saldo real entra por movimentação de ENTRADA, para que
-- `inventory_movements` seja a única fonte de verdade do estoque desde o dia 1.
-- -----------------------------------------------------------------------------
INSERT INTO inventory_parts (id, sku, name, category, quantity, minimum_quantity, unit, supplier, unit_value, location) VALUES
  ('c3000000-0000-4000-8000-000000000001', 'SSD-480-SATA',  'SSD 480GB SATA 2.5"',              'SSD',           0, 5,  'un', 'Kingston',   289.90, 'Armário TI - A1'),
  ('c3000000-0000-4000-8000-000000000002', 'SSD-500-NVME',  'SSD 500GB NVMe M.2',               'SSD',           0, 4,  'un', 'Kingston',   349.90, 'Armário TI - A1'),
  ('c3000000-0000-4000-8000-000000000003', 'SSD-1TB-NVME',  'SSD 1TB NVMe M.2',                 'SSD',           0, 2,  'un', 'WD',         529.90, 'Armário TI - A1'),
  ('c3000000-0000-4000-8000-000000000004', 'HD-1TB-SATA',   'HD 1TB SATA 3.5"',                 'HD',            0, 2,  'un', 'Seagate',    269.90, 'Armário TI - A2'),
  ('c3000000-0000-4000-8000-000000000005', 'RAM-8-DDR4',    'Memória 8GB DDR4 2666MHz',         'MEMORIA_RAM',   0, 6,  'un', 'Kingston',   169.90, 'Armário TI - A2'),
  ('c3000000-0000-4000-8000-000000000006', 'RAM-16-DDR4',   'Memória 16GB DDR4 3200MHz',        'MEMORIA_RAM',   0, 4,  'un', 'Kingston',   289.90, 'Armário TI - A2'),
  ('c3000000-0000-4000-8000-000000000007', 'RAM-8-DDR5',    'Memória 8GB DDR5 4800MHz',         'MEMORIA_RAM',   0, 3,  'un', 'Crucial',    239.90, 'Armário TI - A2'),
  ('c3000000-0000-4000-8000-000000000008', 'PT-TERM-4G',    'Pasta térmica 4g',                 'PASTA_TERMICA', 0, 10, 'un', 'Implastec',   24.90, 'Bancada - Gaveta 1'),
  ('c3000000-0000-4000-8000-000000000009', 'PT-TERM-30G',   'Pasta térmica seringa 30g',        'PASTA_TERMICA', 0, 2,  'un', 'Implastec',   89.90, 'Bancada - Gaveta 1'),
  ('c3000000-0000-4000-8000-00000000000a', 'COOLER-92',     'Cooler 92mm 12V',                  'COOLER',        0, 6,  'un', 'Akasa',       39.90, 'Armário TI - B1'),
  ('c3000000-0000-4000-8000-00000000000b', 'COOLER-120',    'Cooler 120mm 12V',                 'COOLER',        0, 6,  'un', 'Akasa',       49.90, 'Armário TI - B1'),
  ('c3000000-0000-4000-8000-00000000000c', 'COOLER-CPU',    'Cooler CPU LGA1200/1700',          'COOLER',        0, 3,  'un', 'DeepCool',   129.90, 'Armário TI - B1'),
  ('c3000000-0000-4000-8000-00000000000d', 'FONTE-500',     'Fonte ATX 500W reais',             'FONTE',         0, 3,  'un', 'Corsair',    329.90, 'Armário TI - B2'),
  ('c3000000-0000-4000-8000-00000000000e', 'FONTE-NB-65',   'Fonte notebook 65W universal',     'FONTE',         0, 4,  'un', 'Multilaser', 139.90, 'Armário TI - B2'),
  ('c3000000-0000-4000-8000-00000000000f', 'CABO-HDMI-2',   'Cabo HDMI 2m',                     'CABO',          0, 8,  'un', 'Multilaser',  29.90, 'Armário TI - C1'),
  ('c3000000-0000-4000-8000-000000000010', 'CABO-DP-2',     'Cabo DisplayPort 2m',              'CABO',          0, 4,  'un', 'Multilaser',  44.90, 'Armário TI - C1'),
  ('c3000000-0000-4000-8000-000000000011', 'CABO-REDE-3',   'Cabo de rede Cat6 3m',             'CABO',          0, 15, 'un', 'Furukawa',    18.90, 'Armário TI - C1'),
  ('c3000000-0000-4000-8000-000000000012', 'CABO-FORCA',    'Cabo de força tripolar 1,8m',      'CABO',          0, 10, 'un', 'Genérico',    16.90, 'Armário TI - C1'),
  ('c3000000-0000-4000-8000-000000000013', 'MOUSE-USB',     'Mouse óptico USB',                 'MOUSE',         0, 10, 'un', 'Logitech',    39.90, 'Armário TI - D1'),
  ('c3000000-0000-4000-8000-000000000014', 'MOUSE-SF',      'Mouse sem fio',                    'MOUSE',         0, 5,  'un', 'Logitech',    89.90, 'Armário TI - D1'),
  ('c3000000-0000-4000-8000-000000000015', 'TECLADO-USB',   'Teclado ABNT2 USB',                'TECLADO',       0, 8,  'un', 'Logitech',    69.90, 'Armário TI - D1'),
  ('c3000000-0000-4000-8000-000000000016', 'TECLADO-SF',    'Teclado sem fio ABNT2',            'TECLADO',       0, 4,  'un', 'Logitech',   159.90, 'Armário TI - D1'),
  ('c3000000-0000-4000-8000-000000000017', 'MON-24',        'Monitor 24" Full HD',              'MONITOR',       0, 2,  'un', 'AOC',        749.90, 'Almoxarifado'),
  ('c3000000-0000-4000-8000-000000000018', 'GPU-GT1030',    'Placa de vídeo GT 1030 2GB',       'PLACA_VIDEO',   0, 1,  'un', 'Asus',       649.90, 'Armário TI - B2'),
  ('c3000000-0000-4000-8000-000000000019', 'AR-COMP',       'Ar comprimido limpeza 300ml',      'OUTRO',         0, 12, 'un', 'Implastec',   32.90, 'Bancada - Gaveta 2'),
  ('c3000000-0000-4000-8000-00000000001a', 'ALC-ISO',       'Álcool isopropílico 1L',           'OUTRO',         0, 3,  'un', 'Implastec',   49.90, 'Bancada - Gaveta 2'),
  ('c3000000-0000-4000-8000-00000000001b', 'PILHA-CR2032',  'Bateria CMOS CR2032',              'OUTRO',         0, 10, 'un', 'Panasonic',    9.90, 'Bancada - Gaveta 2');
