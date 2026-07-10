import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Camera, Video, Volume2, ShieldAlert, Wifi, Link2, Layers, HardHat, Package, ChevronDown, Map, Navigation, CheckSquare, Square, AlertTriangle, Download } from 'lucide-react';
import { getMaterialIcon, getPuntoName } from '../utils/helpers';

export const LocationCard = ({ loc, dayLabel, session, onUpdatePunto, cuadrillaGlobal, isCompact = false }) => {
  const [showLogistica, setShowLogistica] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
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

  let cardStatusClass = '';
  if (loc.observado) cardStatusClass = 'observado';
  else if (loc.completado) cardStatusClass = 'completed';

  return (
    <div className={`location-card ${cardStatusClass}`} style={{ 
      opacity: (loc.completado || loc.observado) ? 0.8 : 1,
      borderColor: loc.observado ? 'rgba(239, 68, 68, 0.4)' : undefined,
      boxShadow: loc.observado ? '0 4px 20px rgba(239, 68, 68, 0.1)' : undefined
    }}>
      <div className="loc-card-header">
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

      <div className="loc-actions" style={{ 
        display: 'grid', 
        gap: '0.75rem', 
        gridTemplateColumns: isCompact ? '1fr' : 'repeat(auto-fit, minmax(140px, 1fr))',
        alignItems: 'center'
      }}>
        <a 
          href={mapLink}
          target="_blank"
          rel="noopener noreferrer"
          className="map-nav-btn"
          style={{ background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-light)', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
        >
          <Navigation size={16} /> Cómo Llegar
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
          style={{ background: '#25D366', color: '#fff', border: 'none', textDecoration: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
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
                gap: '0.4rem'
              }}
            >
              {loc.completado ? <CheckSquare size={16} /> : <Square size={16} />}
              {isUpdating ? '...' : loc.completado ? 'Completado' : 'Marcar Completado'}
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
                gap: '0.4rem'
              }}
            >
              <AlertTriangle size={16} />
              {isUpdating ? '...' : loc.observado ? 'Observado (Desmarcar)' : 'Marcar Observado'}
            </button>
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
