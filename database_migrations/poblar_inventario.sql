-- ==============================================
-- 1. POBLAR INVENTARIO CON ITEMS ACTUALES (Stock Inicial: 500)
-- ==============================================
INSERT INTO inventory (item_name, stock_quantity) VALUES 
('CAMARA PTZ (UND)', 500),
('ALTAVOCES (UND)', 500),
('SWITCH WI-TEK (UND)', 500),
('FUENTE DE PODER DEL SWITCH WI-TEK (UND)', 500),
('INYECTORES POE (UND)', 500),
('LLAVES TERMOMAGNETICAS (UND)', 500),
('LLAVES DIFERENCIALES (UND)', 500),
('UPS (UND)', 500),
('TRANSFORMADOR (UND)', 500),
('SUPRESOR DE PICOS (UND)', 500),
('SOPORTE DE UPS (UND)', 500),
('SOPORTE DE TRANSFORMADOR  (UND)', 500),
('PRENSAESTOPA (UND)', 500),
('CORRUGADO (M)', 500),
('CABLE ETHERNET (M)', 500),
('CABLE ELECTRICO (M)', 500),
('CONECTOR RJ45 CAT 6A (UND)', 500),
('BRAZOS (UND)', 500),
('ABRAZADERAS POSTE CONCRETO (PAR)', 500),
('CINTA BANDIT (M)', 500),
('EBILLAS (UND)', 500),
('PARARRAYOS ETHERNET (UND)', 500),
('PATCHORE CAT 6A (UN)', 500),
('PILOTO LED VERDE Y ROJO (PAR)', 500),
('CAMARA MULTISENSOR (UND)', 500),
('ABRAZADERAS POSTE SEMAFORO (PAR)', 500),
('BASES DE ANCLAJE PLANO (PAR)', 500),
('BASES DE ANCLAJE ANGULAR (PAR)', 500),
('BOTONES DE PANICO (UND)', 500)
ON CONFLICT (item_name) DO NOTHING;

-- ==============================================
-- 2. REAJUSTAR REGLAS LOGÍSTICAS AL MODELO ORIGINAL
-- ==============================================
-- Limpiamos las reglas previas para no tener duplicados
DELETE FROM logistics_rules;

-- Insertamos las reglas precisas
INSERT INTO logistics_rules (name, description, target_device, item_name, quantity_per_device, fixed_quantity) VALUES 
('Pararrayos (PTZ)', '1 por cámara PTZ', 'PTZ', 'PARARRAYOS ETHERNET (UND)', 1, 0),
('Pararrayos (MULTI)', '1 por cámara MULTISENSOR', 'MULTI', 'PARARRAYOS ETHERNET (UND)', 1, 0),
('Pararrayos (ALTAVOZ)', '1 por altavoz IP', 'ALTAVOZ', 'PARARRAYOS ETHERNET (UND)', 1, 0),
('Patchcord por PTZ/MULTI', '2 por cada cámara', 'CAMARA', 'PATCHORE CAT 6A (UN)', 2, 0),
('Patchcord por Altavoz', '1 por altavoz', 'ALTAVOZ', 'PATCHORE CAT 6A (UN)', 1, 0),
('Prensaestopas Base', '3 unidades fijas por cada punto', 'NONE', 'PRENSAESTOPA (UND)', 0, 3),
('Piloto LED Base', '1 piloto LED verde y rojo por punto', 'NONE', 'PILOTO LED VERDE Y ROJO (PAR)', 0, 1),
('Patchcord Extra (Switch)', '1 patchcord adicional si hay más de 1 dispositivo', 'SWITCH_CONDITION', 'PATCHORE CAT 6A (UN)', 0, 1);

-- ==============================================
-- 3. PERMISOS (Opcional por si acaso hay problemas de lectura en tu App)
-- ==============================================
-- Nos aseguramos que la app pueda leer y modificar las nuevas tablas (Deshabilitando RLS si está activo por error)
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_rules DISABLE ROW LEVEL SECURITY;
