-- migrar_cuadrillas.sql

-- 1. Crear la tabla de Cuadrillas
CREATE TABLE IF NOT EXISTS cuadrillas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  internal_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  company_name TEXT,
  leader_name TEXT,
  contact_info TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar Seguridad y Políticas
ALTER TABLE cuadrillas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cuadrillas' AND policyname = 'Allow all'
    ) THEN
        CREATE POLICY "Allow all" ON cuadrillas FOR ALL USING (true);
    END IF;
END $$;

-- 3. Migrar las cuadrillas existentes desde los puntos
INSERT INTO cuadrillas (internal_name, display_name, company_name)
SELECT DISTINCT 
  "cuadrilla" as internal_name,
  
  -- Nomenclatura: C=Cusco, L=Lima
  CASE 
    WHEN "cuadrilla" LIKE '%-C' THEN REPLACE("cuadrilla", 'CUADRILLA-', '') || ' (Cusco)'
    WHEN "cuadrilla" LIKE '%-L' THEN REPLACE("cuadrilla", 'CUADRILLA-', '') || ' (Lima)'
    ELSE "cuadrilla"
  END as display_name,
  
  -- Asignación automática de Empresa (El usuario lo puede modificar luego)
  CASE 
    WHEN "cuadrilla" LIKE '%01-C%' OR "cuadrilla" LIKE '%02-C%' THEN 'Empresa Local Cusco'
    WHEN "cuadrilla" LIKE '%03-L%' OR "cuadrilla" LIKE '%04-L%' THEN 'Empresa Local Lima'
    ELSE 'Empresa Contratista General'
  END as company_name

FROM puntos_instalacion
WHERE "cuadrilla" IS NOT NULL AND "cuadrilla" != ''
ON CONFLICT (internal_name) DO NOTHING;
