import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Camera, Video, Volume2, ShieldAlert, Wifi, Link2, Layers, HardHat, Package, ChevronDown, Map, Navigation, CheckSquare, Square, AlertTriangle, Download, Image as ImageIcon, Loader } from 'lucide-react';
import { getMaterialIcon, getPuntoName, compressImageToWebp } from '../utils/helpers';
import { supabase } from '../supabaseClient';

export const LocationCard = ({ loc, dayLabel, session, onUpdatePunto, cuadrillaGlobal, isCompact = false }) => {
  const [showLogistica, setShowLogistica] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const ptz = loc.camara_ptz;
  const multi = loc.camara_multisensor;
  const altavoz = loc.altavoz_ip;
  const boton = loc.boton_panico;
  
  const visibleMaterials = loc.MaterialesPunto || [];

  const handleToggleCompletado = async () => {
    if (!session) return;
    setIsUpdating(true);
    const isNowCompleted = !loc.completado;
    const updateData = { completado: isNowCompleted };
    if (isNowCompleted) updateData.observado = false;
    await onUpdatePunto(loc.id, updateData);
    setIsUpdating(false);
  };

  const handleToggleObservado = async () => {
    if (!session) return;
    setIsUpdating(true);
    const isNowObservado = !loc.observado;
    const updateData = { observado: isNowObservado };
    if (isNowObservado) updateData.completado = false;
    await onUpdatePunto(loc.id, updateData);
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

  const mapLink = loc.latitud && loc.longitud ? `https://maps.google.com/maps?q=${loc.latitud},${loc.longitud}` : '';
  const waText = encodeURIComponent(`Hola, este es el punto *${getPuntoName(loc)}* (${loc.destino_esp}).\n📍 Ubicación: ${mapLink}`);
  const waLink = `https://wa.me/?text=${waText}`;

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

  let cardStatusClass = '';
  if (loc.observado) cardStatusClass = 'observado';
  else if (loc.completado) cardStatusClass = 'completed';

  return (
    <div className={`location-card ${cardStatusClass}`} style={{ 
      opacity: (loc.completado || loc.observado) ? 0.8 : 1,
      borderColor: loc.observado ? 'rgba(239, 68, 68, 0.4)' : undefined,
      boxShadow: loc.observado ? '0 4px 20px rgba(239, 68, 68, 0.1)' : undefined,
      overflow: 'hidden'
    }}>
      
      {/* Banner de Foto */}
      {loc.foto_url && (
        <div style={{
          width: '100%',
          height: isCompact ? '120px' : '200px',
          backgroundImage: `url(${loc.foto_url})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderBottom: '1px solid var(--border-light)'
        }} />
      )}

      <div className="loc-card-header" style={{ paddingTop: loc.foto_url ? '1rem' : undefined }}>
        <div className="loc-destino">
          <span className="destino-lbl">Punto: {getPuntoName(loc)}</span>
          <h4>{loc.destino_esp}</h4>
          {cuadrillaGlobal && (
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.2rem', display: 'inline-block' }}>
              <HardHat size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {cuadrillaGlobal}
            </span>
          )}
        </div>
        <div className="frente-badge" style={{ background: loc.observado ? 'var(--error)' : undefined }}>
          {loc.observado ? 'OBSERVADO' : `Frente ${loc.frente}`}
        </div>
      </div>
      
      <div className="equipos-container">
        {ptz && ptz !== '0' && <div className="equipo-item ptz"><Camera size={14}/> <span>PTZ</span></div>}
        {multi && multi !== '0' && <div className="equipo-item multi"><Video size={14}/> <span>Multi</span></div>}
        {altavoz && altavoz !== '0' && <div className="equipo-item altavoz"><Volume2 size={14}/> <span>Altavoz</span></div>}
        {boton && boton !== '0' && <div className="equipo-item boton"><ShieldAlert size={14}/> <span>Botón</span></div>}
      </div>

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
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="map-nav-btn"
          style={{ background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-light)', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: isCompact ? '0.5rem' : '0.75rem 1rem', flex: isCompact ? '1' : 'auto' }}
          title="Cómo Llegar"
        >
          <Navigation size={16} /> {!isCompact && 'Cómo Llegar'}
        </a>

        {!isCompact && (
          <a 
            href={loc.latitud && loc.longitud ? `https://waze.com/ul?ll=${loc.latitud},${loc.longitud}&navigate=yes` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="map-nav-btn"
            style={{ background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-light)', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
          >
            <Map size={16} /> Waze
          </a>
        )}

        <a 
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="map-nav-btn"
          style={{ background: '#25D366', color: '#fff', border: 'none', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: isCompact ? '0.5rem' : '0.75rem 1rem', flex: isCompact ? '1' : 'auto' }}
          title="WhatsApp"
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
                background: loc.completado ? 'var(--c-ptz)' : 'var(--overlay-w-10)', 
                cursor: 'pointer',
                border: loc.completado ? 'none' : '1px solid var(--border-light)', 
                color: loc.completado ? '#fff' : 'var(--text-main)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isCompact ? '0.5rem' : '0.75rem 1rem',
                flex: isCompact ? '1' : 'auto'
              }}
              title={loc.completado ? 'Completado' : 'Marcar Completado'}
            >
              {loc.completado ? <CheckSquare size={16} /> : <Square size={16} />}
              {!isCompact && (isUpdating ? '...' : loc.completado ? 'Completado' : 'Marcar Completado')}
            </button>

            <button 
              onClick={handleToggleObservado}
              disabled={isUpdating}
              className="map-nav-btn"
              style={{ 
                background: loc.observado ? 'var(--error)' : 'var(--overlay-w-10)', 
                cursor: 'pointer',
                border: loc.observado ? 'none' : '1px solid var(--border-light)', 
                color: loc.observado ? '#fff' : 'var(--error)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '0.4rem',
                padding: isCompact ? '0.5rem' : '0.75rem 1rem',
                flex: isCompact ? '1' : 'auto'
              }}
              title={loc.observado ? 'Observado (Desmarcar)' : 'Marcar Observado'}
            >
              <AlertTriangle size={16} />
              {!isCompact && (isUpdating ? '...' : loc.observado ? 'Observado (Desmarcar)' : 'Marcar Observado')}
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
          </>
        )}

        {!isCompact && (
          <button 
            onClick={exportPointPDF}
            className="map-nav-btn"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#fff', border: 'none', display: 'flex', justifyContent: 'center', width: '100%' }}
          >
            <Download size={16} /> Exportar PDF
          </button>
        )}
      </div>

      {!isCompact && visibleMaterials.length > 0 && (
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
    </div>
  );
};
