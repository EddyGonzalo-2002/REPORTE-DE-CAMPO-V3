-- migrar_mantenimiento.sql
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar columnas de Mantenimiento a la tabla puntos_instalacion
ALTER TABLE public.puntos_instalacion
ADD COLUMN IF NOT EXISTS cuadrilla_mantenimiento TEXT,
ADD COLUMN IF NOT EXISTS mantenimiento_completado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mantenimiento_observado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS mantenimiento_tipo TEXT DEFAULT 'PREVENTIVO',
ADD COLUMN IF NOT EXISTS mantenimiento_fecha TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mantenimiento_foto_url TEXT,
ADD COLUMN IF NOT EXISTS mantenimiento_notas TEXT;

-- 2. Agregar tipo a la tabla de cuadrillas (INSTALACION / MANTENIMIENTO)
ALTER TABLE public.cuadrillas
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'INSTALACION';

-- 3. Crear índice para optimizar consultas por cuadrilla de mantenimiento
CREATE INDEX IF NOT EXISTS idx_puntos_cuadrilla_mantenimiento ON public.puntos_instalacion(cuadrilla_mantenimiento);
