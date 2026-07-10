-- ==============================================
-- MIGRACIÓN PARA INVENTARIO Y REGLAS DE LOGÍSTICA
-- ==============================================

-- 1. Crear tabla de Inventario
CREATE TABLE inventory (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_name text NOT NULL UNIQUE,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Crear tabla de Reglas de Logística
CREATE TABLE logistics_rules (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text,
  target_device text NOT NULL, -- Valores permitidos: 'PTZ', 'MULTI', 'ALTAVOZ', 'BOTON', 'CAMARA' (PTZ+Multi), 'ALL' (Todos los disp), 'NONE' (Fijo siempre)
  item_name text NOT NULL,
  quantity_per_device integer DEFAULT 1,
  fixed_quantity integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Insertar Reglas Predeterminadas
INSERT INTO logistics_rules (name, description, target_device, item_name, quantity_per_device, fixed_quantity) VALUES 
('Pararrayos Ethernet', '1 por cada cámara y altavoz', 'ALL', 'PARARRAYOS ETHERNET (UND)', 1, 0),
('Patchcord por PTZ/MULTI', '2 por cada cámara', 'CAMARA', 'PATCHORE CAT 6A (UN)', 2, 0),
('Patchcord por Altavoz', '1 por altavoz', 'ALTAVOZ', 'PATCHORE CAT 6A (UN)', 1, 0),
('Prensaestopas Base', '3 unidades fijas por cada punto', 'NONE', 'PRENSAESTOPA (UND)', 0, 3),
('Piloto LED Base', '1 piloto LED verde y rojo por punto', 'NONE', 'PILOTO LED VERDE Y ROJO (PAR)', 0, 1),
('Patchcord Extra (Switch)', '1 patchcord adicional si hay más de 1 dispositivo', 'SWITCH_CONDITION', 'PATCHORE CAT 6A (UN)', 0, 1);
