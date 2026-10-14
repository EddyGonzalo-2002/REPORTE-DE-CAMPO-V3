import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Camera, Video, Volume2, ShieldAlert, Wifi, Link2, Layers, HardHat, Package, ChevronDown, Map, Navigation, CheckSquare, Square, AlertTriangle, Download, Image as ImageIcon, Loader, X, Wrench } from 'lucide-react';
import { getMaterialIcon, getPuntoName, compressImageToWebp } from '../utils/helpers';
import { supabase } from '../supabaseClient';

const sanitizeCoord = (val) => {
  if (val === undefined || val === null || val === '') return null;
  let str = val.toString().trim().replace(',', '.');
  let num = parseFloat(str);
  if (isNaN(num)) return null;
  if (num > 0) num = -num; // En Cusco/Perú son hemisferio Sur y Oeste (negativas)
  return num;
};

export const LocationCard = ({ loc, dayLabel, session, onUpdatePunto, cuadrillaGlobal, isCompact = false, appMode = 'INSTALACION', cuadrillasList = [] }) => {
  const isMantenimiento = appMode === 'MANTENIMIENTO';
  const [showLogistica, setShowLogistica] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const fileInputRef = useRef(null);
  
  const [isEditingCoords, setIsEditingCoords] = useState(false);
  const [tempLat, setTempLat] = useState('');
  const [tempLng, setTempLng] = useState('');

  const handleEditCoordsClick = () => {
    setTempLat(loc.latitud || '');
    setTempLng(loc.longitud || '');
    setIsEditingCoords(true);
  };
  
  const ptz = loc.camara_ptz;
  const multi = loc.camara_multisensor;
  const altavoz = loc.altavoz_ip;
  const boton = loc.boton_panico;
  
  const visibleMaterials = loc.MaterialesPunto || [];

  const handleToggleCompletado = async () => {
    if (!session) return;
    setIsUpdating(true);
    if (isMantenimiento) {
      const isNowCompleted = !loc.mantenimiento_completado;
      const updateData = { 
        mantenimiento_completado: isNowCompleted,
        mantenimiento_fecha: isNowCompleted ? new Date().toISOString() : null
      };
      if (isNowCompleted) updateData.mantenimiento_observado = false;
      await onUpdatePunto(loc.id, updateData);
    } else {
      const isNowCompleted = !loc.completado;
      const updateData = { completado: isNowCompleted };
      if (isNowCompleted) updateData.observado = false;
      await onUpdatePunto(loc.id, updateData);
    }
    setIsUpdating(false);
  };

  const handleToggleObservado = async () => {
    if (!session) return;
    setIsUpdating(true);
    if (isMantenimiento) {
      const isNowObservado = !loc.mantenimiento_observado;
      const updateData = { mantenimiento_observado: isNowObservado };
      if (isNowObservado) updateData.mantenimiento_completado = false;
      await onUpdatePunto(loc.id, updateData);
    } else {
      const isNowObservado = !loc.observado;
      const updateData = { observado: isNowObservado };
      if (isNowObservado) updateData.completado = false;
      await onUpdatePunto(loc.id, updateData);
    }
    setIsUpdating(false);
  };

  const exportPointPDF = () => {
    if (!visibleMaterials || visibleMaterials.length === 0) {
      alert("No hay materiales en este punto para exportar.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`Logística del Punto: ${getPuntoName(loc)}`, 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text(`Destino: ${loc.destino_esp} | Sector: ${loc.sector}`, 14, 28);
    
    const tableColumn = ["Ítem", "Cantidad"];
    const tableRows = visibleMaterials.map(m => [m.Item, m.Cantidad]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, cellPadding: 3 },
      styles: { fontSize: 8, cellPadding: 3, minCellHeight: 4 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { top: 10, bottom: 10, left: 14, right: 14 }
    });
    
    doc.save(`Logistica_Punto_${getPuntoName(loc).replace(/\s/g, '_')}.pdf`);
  };

  const cleanLat = sanitizeCoord(loc.latitud);
  const cleanLng = sanitizeCoord(loc.longitud);
  const hasValidCoords = cleanLat !== null && cleanLng !== null;

  const mapLink = hasValidCoords ? `https://maps.google.com/maps?q=${cleanLat},${cleanLng}` : '';
  const waText = encodeURIComponent(`Hola, este es el punto *${getPuntoName(loc)}* (${loc.destino_esp || ''}).\n📍 Ubicación: ${mapLink}`);
  const waLink = hasValidCoords ? `https://wa.me/?text=${waText}` : '#';

  const handleFotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !session) return;
    
    setIsUploadingFoto(true);
    try {
      // 1. Comprimir a WebP
      const webpBlob = await compressImageToWebp(file, 800, 0.7);
      
      // 2. Crear nombre de archivo único
      const fileName = `punto_${loc.id}_${Date.now()}.webp`;
      
      // 3. Subir a Supabase Storage (bucket "fotos")
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('fotos')
        .upload(fileName, webpBlob, {
          contentType: 'image/webp',
          upsert: true
        });
        
      if (uploadError) throw uploadError;
      
      // 4. Obtener URL pública
      const { data: publicUrlData } = supabase.storage
        .from('fotos')
        .getPublicUrl(fileName);
        
      const fotoUrl = publicUrlData.publicUrl;
      
      // 5. Actualizar la base de datos
      await onUpdatePunto(loc.id, { foto_url: fotoUrl });
      alert("¡Foto subida y guardada exitosamente!");
      
    } catch (error) {
      console.error("Error al subir foto:", error);
      alert("Error al subir la foto. Asegúrate de que el bucket 'fotos' exista y tenga permisos públicos.");
    } finally {
      setIsUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  let isCompleted = isMantenimiento ? loc.mantenimiento_completado : loc.completado;
  let isObservado = isMantenimiento ? loc.mantenimiento_observado : loc.observado;

  let cardStatusClass = '';
  if (isObservado) cardStatusClass = 'observado';
  else if (isCompleted) cardStatusClass = 'completed';

  return (
    <div className={`location-card ${cardStatusClass}`} style={{ 
      opacity: (isCompleted || isObservado) ? 0.8 : 1,
      borderColor: isObservado ? 'rgba(239, 68, 68, 0.4)' : undefined,
      boxShadow: isObservado ? '0 4px 20px rgba(239, 68, 68, 0.1)' : undefined,
      overflow: 'hidden'
    }}>
      
      {/* Banner de Foto */}
      {(loc.mantenimiento_foto_url || loc.foto_url) && (
        <div 
          onClick={() => setShowFullImage(true)}
          style={{
            width: '100%',
            height: isCompact ? '120px' : '200px',
            backgroundImage: `url(${loc.mantenimiento_foto_url || loc.foto_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderBottom: '1px solid var(--border-light)',
            cursor: 'pointer'
          }} 
        />
      )}

      <div className="loc-card-header" style={{ paddingTop: (loc.mantenimiento_foto_url || loc.foto_url) ? '1rem' : undefined }}>
        <div className="loc-destino">
          <span className="destino-lbl">Punto: {getPuntoName(loc)}</span>
          <h4>{loc.destino_esp}</h4>
          
          {/* Cuadrilla Info */}
          {!isMantenimiento ? (
            cuadrillaGlobal && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem', display: 'inline-block' }}>
                <HardHat size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {cuadrillaGlobal}
              </span>
            )
          ) : (
            <div style={{ marginTop: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: loc.cuadrilla_mantenimiento ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Wrench size={12} /> {loc.cuadrilla_mantenimiento || 'Sin Cuadrilla Asignada'}
              </span>

              {/* Selector de Reasignación de Cuadrilla y Tipo para Admin */}
              {session && (
                <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
                  <select
                    value={loc.cuadrilla_mantenimiento || ''}
                    onChange={(e) => onUpdatePunto(loc.id, { cuadrilla_mantenimiento: e.target.value })}
                    style={{
                      fontSize: '0.72rem',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    title="Asignar Cuadrilla de Mantenimiento"
                  >
                    <option value="">-- Asignar Cuadrilla --</option>
                    {cuadrillasList.map(c => (
                      <option key={c.id || c.internal_name} value={c.internal_name}>
                        {c.display_name || c.internal_name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={loc.mantenimiento_tipo || 'PREVENTIVO'}
                    onChange={(e) => onUpdatePunto(loc.id, { mantenimiento_tipo: e.target.value })}
                    style={{
                      fontSize: '0.72rem',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '2px 6px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    title="Tipo de Mantenimiento"
                  >
                    <option value="PREVENTIVO">Preventivo</option>
                    <option value="CORRECTIVO">Correctivo</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Badge de Estado */}
        <div 
          className="frente-badge" 
          style={{ 
            background: isMantenimiento
              ? (isObservado ? 'var(--error)' : isCompleted ? 'var(--success)' : 'var(--secondary)')
              : (isObservado ? 'var(--error)' : undefined) 
          }}
        >
          {isMantenimiento 
            ? (isObservado ? 'OBSERVADO MANT.' : isCompleted ? 'MANT. REALIZADO' : (loc.mantenimiento_tipo || 'PREVENTIVO'))
            : (loc.observado ? 'OBSERVADO' : `Frente ${loc.frente}`)
          }
        </div>
      </div>
      
      <div className="equipos-container">
        {ptz && ptz !== '0' && <div className="equipo-item ptz"><Camera size={14}/> <span>PTZ</span></div>}
        {multi && multi !== '0' && <div className="equipo-item multi"><Video size={14}/> <span>Multi</span></div>}
        {altavoz && altavoz !== '0' && <div className="equipo-item altavoz"><Volume2 size={14}/> <span>Altavoz</span></div>}
        {boton && boton !== '0' && <div className="equipo-item boton"><ShieldAlert size={14}/> <span>Botón</span></div>}
      </div>

      {session && (
        <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
          {!isEditingCoords ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>📍 Lat: {loc.latitud || 'N/A'}, Lng: {loc.longitud || 'N/A'}</span>
              <button 
                onClick={handleEditCoordsClick}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: 0 }}
              >
                Editar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={tempLat} 
                  onChange={e => setTempLat(e.target.value)} 
                  placeholder="Latitud" 
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-main)', minWidth: 0 }}
                />
                <input 
                  type="text" 
                  value={tempLng} 
                  onChange={e => setTempLng(e.target.value)} 
                  placeholder="Longitud" 
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-main)', color: 'var(--text-main)', minWidth: 0 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={async () => {
                    if (!tempLat || !tempLng) return;
                    const parsedLat = sanitizeCoord(tempLat);
                    const parsedLng = sanitizeCoord(tempLng);
                    if (parsedLat === null || parsedLng === null) {
                      alert("Por favor ingrese coordenadas válidas (ejemplo: -13.525, -71.968)");
                      return;
                    }
                    setIsUpdating(true);
                    await onUpdatePunto(loc.id, { latitud: parsedLat.toString(), longitud: parsedLng.toString() });
                    setIsUpdating(false);
                    setIsEditingCoords(false);
                  }}
                  disabled={isUpdating}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                  {isUpdating ? '...' : 'Guardar'}
                </button>
                <button 
                  onClick={() => setIsEditingCoords(false)}
                  disabled={isUpdating}
                  style={{ flex: 1, padding: '0.4rem', fontSize: '0.75rem', fontWeight: 600, background: 'transparent', color: 'var(--text-main)', border: '1px solid var(--border-light)', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!isCompact && (
        <div className="tech-specs">
          <div className="spec-item">
            <Layers size={14} />
            <span>{loc.material_base || 'N/A'}</span>
          </div>
          <div className="spec-item">
            <Link2 size={14} />
            <span>{loc.metodo_anclaje || 'N/A'}</span>
          </div>
          <div className="spec-item">
            <Wifi size={14} />
            <span>{loc.medio_comunicacion || 'N/A'}</span>
          </div>
        </div>
      )}

      {!isCompact && session && (
        <div 
          style={{
            border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border-light)',
            background: isDragging ? 'var(--primary-glow)' : 'var(--overlay-w-10)',
            borderRadius: '8px',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            marginTop: '1rem',
            marginBottom: '1rem',
            transition: 'all 0.3s ease'
          }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFotoUpload({ target: { files: [e.dataTransfer.files[0]] } });
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploadingFoto ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
              <Loader size={24} className="spin" />
              <span style={{ fontSize: '0.85rem' }}>Subiendo foto...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
              <ImageIcon size={24} style={{ color: isDragging ? 'var(--primary)' : 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.85rem' }}>
                {loc.foto_url ? 'Arrastra o haz clic para cambiar la foto' : 'Arrastra una foto aquí o haz clic para subirla'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="loc-actions" style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '0.75rem', 
        justifyContent: isCompact ? 'space-between' : 'flex-start',
        alignItems: 'center'
      }}>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFotoUpload}
        />

        <a 
          href={hasValidCoords ? mapLink : '#'}
          target={hasValidCoords ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="map-nav-btn"
          style={{ 
            background: 'var(--bg-main)', 
            color: hasValidCoords ? 'var(--text-main)' : 'var(--text-muted)', 
            border: '1px solid var(--border-light)', 
            textDecoration: 'none', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: isCompact ? '0.5rem' : '0.75rem 1rem', 
            flex: isCompact ? '1' : 'auto',
            cursor: hasValidCoords ? 'pointer' : 'not-allowed',
            opacity: hasValidCoords ? 1 : 0.6
          }}
          title={hasValidCoords ? "Cómo Llegar en Google Maps" : "Sin coordenadas registradas"}
          onClick={(e) => {
            if (!hasValidCoords) {
              e.preventDefault();
              alert("Este punto no cuenta con coordenadas válidas registradas.");
            }
          }}
        >
          <Navigation size={16} /> {!isCompact && 'Cómo Llegar'}
        </a>

        {!isCompact && (
          <a 
            href={hasValidCoords ? `https://waze.com/ul?ll=${cleanLat},${cleanLng}&navigate=yes` : '#'}
            target={hasValidCoords ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="map-nav-btn"
            style={{ 
              background: 'var(--bg-main)', 
              color: hasValidCoords ? 'var(--text-main)' : 'var(--text-muted)', 
              border: '1px solid var(--border-light)', 
              textDecoration: 'none', 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '0.4rem',
              cursor: hasValidCoords ? 'pointer' : 'not-allowed',
              opacity: hasValidCoords ? 1 : 0.6
            }}
            title={hasValidCoords ? "Navegar con Waze" : "Sin coordenadas registradas"}
            onClick={(e) => {
              if (!hasValidCoords) {
                e.preventDefault();
                alert("Este punto no cuenta con coordenadas válidas registradas.");
              }
            }}
          >
            <Map size={16} /> Waze
          </a>
        )}

        <a 
          href={hasValidCoords ? waLink : '#'}
          target={hasValidCoords ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="map-nav-btn"
          style={{ 
            background: hasValidCoords ? '#25D366' : 'var(--border-light)', 
            color: '#fff', 
            border: 'none', 
            textDecoration: 'none', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: isCompact ? '0.5rem' : '0.75rem 1rem', 
            flex: isCompact ? '1' : 'auto',
            cursor: hasValidCoords ? 'pointer' : 'not-allowed',
            opacity: hasValidCoords ? 1 : 0.6
          }}
          title={hasValidCoords ? "Compartir por WhatsApp" : "Sin coordenadas para compartir"}
          onClick={(e) => {
            if (!hasValidCoords) {
              e.preventDefault();
              alert("No se puede compartir por WhatsApp porque el punto no tiene coordenadas válidas.");
            }
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          {!isCompact && 'WhatsApp'}
        </a>

        {session && (
          <>
            <button 
              onClick={handleToggleCompletado}
              disabled={isUpdating}
              className="map-nav-btn"
              style={{ 
                background: isCompleted ? 'var(--c-ptz)' : 'var(--overlay-w-10)', 
                cursor: 'pointer',
                border: isCompleted ? 'none' : '1px solid var(--border-light)', 
                color: isCompleted ? '#fff' : 'var(--text-main)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isCompact ? '0.5rem' : '0.75rem 1rem',
                flex: isCompact ? '1' : 'auto'
              }}
              title={isMantenimiento ? (isCompleted ? 'Mantenimiento Completado' : 'Marcar Mantenimiento Realizado') : (isCompleted ? 'Completado' : 'Marcar Completado')}
            >
              {isCompleted ? <CheckSquare size={16} /> : <Square size={16} />}
              {!isCompact && (
                isUpdating 
                  ? '...' 
                  : isMantenimiento 
                    ? (isCompleted ? 'Mantenimiento OK' : 'Marcar Realizado')
                    : (isCompleted ? 'Completado' : 'Marcar Completado')
              )}
            </button>

            <button 
              onClick={handleToggleObservado}
              disabled={isUpdating}
              className="map-nav-btn"
              style={{ 
                background: isObservado ? 'var(--error)' : 'var(--overlay-w-10)', 
                cursor: 'pointer',
                border: isObservado ? 'none' : '1px solid var(--border-light)', 
                color: isObservado ? '#fff' : 'var(--error)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isCompact ? '0.5rem' : '0.75rem 1rem',
                flex: isCompact ? '1' : 'auto'
              }}
              title={isObservado ? 'Observado (Desmarcar)' : 'Marcar Observado'}
            >
              <AlertTriangle size={16} />
              {!isCompact && (
                isUpdating 
                  ? '...' 
                  : isMantenimiento
                    ? (isObservado ? 'Observado Mant.' : 'Marcar Observado')
                    : (isObservado ? 'Observado' : 'Marcar Observado')
              )}
            </button>
            
            {isCompact && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFoto}
                className="map-nav-btn"
                style={{ 
                  background: 'var(--overlay-w-10)', 
                  cursor: 'pointer',
                  border: '1px solid var(--border-light)', 
                  color: 'var(--text-main)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem',
                  flex: '1'
                }}
                title="Subir Foto"
              >
                {isUploadingFoto ? <Loader size={16} className="spin" /> : <ImageIcon size={16} />}
              </button>
            )}

            {isMantenimiento && !isCompact && (
              <div style={{ width: '100%', marginTop: '0.4rem' }}>
                <input 
                  type="text" 
                  placeholder="Nota u observación de mantenimiento..."
                  defaultValue={loc.mantenimiento_notas || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (loc.mantenimiento_notas || '')) {
                      onUpdatePunto(loc.id, { mantenimiento_notas: e.target.value });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.8rem',
                    background: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                />
              </div>
            )}
          </>
        )}

        {!isCompact && !isMantenimiento && (
          <button 
            onClick={exportPointPDF}
            className="map-nav-btn"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', display: 'flex', justifyContent: 'center', width: '100%' }}
          >
            <Download size={16} /> Exportar PDF
          </button>
        )}
      </div>

      {!isMantenimiento && !isCompact && visibleMaterials.length > 0 && (
        <div className="loc-materials-container">
          <div 
            className={`loc-materials-toggle ${showLogistica ? 'open' : ''}`} 
            onClick={() => setShowLogistica(!showLogistica)}
          >
            <span><Package size={16} /> Logística del Punto</span>
            <ChevronDown 
              size={18} 
              style={{ 
                transform: showLogistica ? 'rotate(180deg)' : 'none', 
                transition: 'transform 0.3s' 
              }} 
            />
          </div>
          {showLogistica && (
            <div className="loc-materials-list">
              {visibleMaterials.map((m, midx) => (
                <div key={midx} className="loc-mat-item">
                  <div className="loc-mat-item-left">
                    <div className="loc-mat-icon">
                      {getMaterialIcon(m.Item)}
                    </div>
                    <span className="loc-mat-name">{m.Item}</span>
                  </div>
                  <span className="loc-mat-qty">{m.Cantidad}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* Modal para ver foto completa */}
      {showFullImage && loc.foto_url && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 999999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '2rem'
          }}
          onClick={() => setShowFullImage(false)}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setShowFullImage(false); }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <X size={24} />
          </button>
          <img 
            src={loc.foto_url} 
            alt={`Punto ${loc.destino_esp}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </div>
  );
};
