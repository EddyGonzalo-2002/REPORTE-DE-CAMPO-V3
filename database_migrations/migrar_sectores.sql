-- migrar_sectores.sql

-- 1. Crear la tabla de Sectores
CREATE TABLE IF NOT EXISTS sectores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  internal_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Seguridad y Políticas
ALTER TABLE sectores ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sectores' AND policyname = 'Allow all'
    ) THEN
        CREATE POLICY "Allow all" ON sectores FOR ALL USING (true);
    END IF;
END $$;

-- 3. Función auxiliar para color hexadecimal (solo si la usamos en la consulta de abajo)
-- 4. Migrar los sectores existentes desde los puntos
INSERT INTO sectores (internal_name, display_name, color)
SELECT DISTINCT 
  "sector" as internal_name,
  "sector" as display_name,
  -- Generar color hexadecimal aleatorio vibrante
  '#' || lpad(to_hex(abs(random() * 16777215)::int), 6, '0') as color
FROM puntos_instalacion
WHERE "sector" IS NOT NULL AND "sector" != ''
ON CONFLICT (internal_name) DO NOTHING;
