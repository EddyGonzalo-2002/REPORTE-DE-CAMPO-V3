const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
global.WebSocket = require('ws');

// Obtener credenciales de variables de entorno o reemplazarlas directamente
const SUPABASE_URL = 'https://ihqwemggxjyrbciogosl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlocXdlbWdneGp5cmJjaW9nb3NsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjA3ODc2NCwiZXhwIjoyMDk3NjU0NzY0fQ.ROFYbAjTyjgSY1li9l1vQQf59aYgrHxRv0vPD2RTTXg';

if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error("Por favor configura SUPABASE_URL y SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrate() {
  console.log("Iniciando migración...");
  const rawData = fs.readFileSync('webapp/src/data.json', 'utf-8');
  const data = JSON.parse(rawData);

  let puntoIdCounter = 1;

  for (const cuadrilla of Object.keys(data)) {
    const sectores = data[cuadrilla];
    for (const sector of Object.keys(sectores)) {
      const instalaciones = sectores[sector].Instalaciones || [];
      const materiales = sectores[sector].Materiales || [];

      // 1. Insertar instalaciones (Puntos)
      for (const loc of instalaciones) {
        // Encontrar o generar un nombre para el punto
        let rawPuntoName = loc['CAMARA PTZ'] && loc['CAMARA PTZ'] !== '0' ? loc['CAMARA PTZ'] :
                           loc['CAMARA MULTISENSOR'] && loc['CAMARA MULTISENSOR'] !== '0' ? loc['CAMARA MULTISENSOR'] :
                           loc['ALTAVOZ IP'] && loc['ALTAVOZ IP'] !== '0' ? loc['ALTAVOZ IP'] :
                           `${loc['DESTINO ESP.']} - Frente ${loc['FRENTE']}`;

        const { data: puntoData, error: errPunto } = await supabase
          .from('puntos_instalacion')
          .insert({
            cuadrilla: cuadrilla,
            sector: sector,
            destino_esp: loc['DESTINO ESP.'],
            frente: loc['FRENTE'],
            nombre_punto: rawPuntoName,
            camara_ptz: loc['CAMARA PTZ'] || '',
            camara_multisensor: loc['CAMARA MULTISENSOR'] || '',
            altavoz_ip: loc['ALTAVOZ IP'] || '',
            boton_panico: loc['BOTON DE PANICO'] || '',
            material_base: loc['MATERIAL BASE'] || '',
            metodo_anclaje: loc['METODO DE ANCLAJE'] || '',
            medio_comunicacion: loc['MEDIO DE COMUNICACION'] || '',
            estado_operativo: loc['ESTADO OPERATIVO'] || '',
            latitud: loc.Latitud || null,
            longitud: loc.Longitud || null,
            dia_programado: loc['FECHAS DE INSTALACION CAMARAS PTZ Y MULTISENSOR , MEGAFONOS IP , BOTON DE PANICO'] || '',
            completado: false
          })
          .select()
          .single();

        if (errPunto) {
          console.error("Error insertando punto:", errPunto);
          continue;
        }

        const newPuntoId = puntoData.id;

        // 2. Insertar materiales del punto
        const materialesPunto = loc.MaterialesPunto || [];
        for (const mat of materialesPunto) {
          const { error: errMat } = await supabase
            .from('materiales_punto')
            .insert({
              punto_id: newPuntoId,
              item: mat.Item,
              cantidad: mat.Cantidad
            });
          
          if (errMat) {
            console.error("Error insertando material:", errMat);
          }
        }
        
        console.log(`Punto migrado: ${rawPuntoName}`);
      }

      // Podríamos insertar también la logística global (Materiales) si fuera necesario,
      // pero por ahora priorizamos los puntos.
    }
  }

  console.log("Migración finalizada con éxito.");
}

migrate();
