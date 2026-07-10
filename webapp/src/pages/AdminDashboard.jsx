import React, { useState } from 'react';
import { BarChart2, CheckSquare, Target, Zap, Server, Activity, Award, AlertTriangle, MapPin, Camera, Video, Volume2, ShieldAlert, ChevronDown, X } from 'lucide-react';
import { getPuntoName } from '../utils/helpers';

export const AdminDashboard = ({ data }) => {
  const [expandedCuadrilla, setExpandedCuadrilla] = useState(null);
  const [showObservadosModal, setShowObservadosModal] = useState(false);

  if (!data) return null;

  const rankings = [];
  let totalCompletados = 0;
  let totalObservados = 0;
  let totalAsignados = 0;

  let ptzCompletadas = 0;
  let multiCompletadas = 0;
  let altavocesCompletados = 0;
  let botonesCompletados = 0;
  
  const observadosDetalle = [];

  const puntosPorCuadrilla = {};
  Object.values(data).forEach(loc => {
    const c = loc.cuadrilla || 'Sin Cuadrilla';
    if (!puntosPorCuadrilla[c]) puntosPorCuadrilla[c] = [];
    puntosPorCuadrilla[c].push(loc);
  });

  Object.keys(puntosPorCuadrilla).forEach(cuadrilla => {
    let completados = 0;
    let asignados = puntosPorCuadrilla[cuadrilla].length;
    const completadosList = [];

    puntosPorCuadrilla[cuadrilla].forEach(i => {
      if (i.completado) {
        completados++;
        completadosList.push(getPuntoName(i));
        if (i.camara_ptz && i.camara_ptz !== '0') ptzCompletadas++;
        if (i.camara_multisensor && i.camara_multisensor !== '0') multiCompletadas++;
        if (i.altavoz_ip && i.altavoz_ip !== '0') altavocesCompletados++;
        if (i.boton_panico && i.boton_panico !== '0') botonesCompletados++;
      }
      if (i.observado) {
        totalObservados++;
        observadosDetalle.push({ nombre: getPuntoName(i), cuadrilla: cuadrilla.replace('CUADRILLA-', 'C-') });
      }
    });

    totalCompletados += completados;
    totalAsignados += asignados;
    rankings.push({ 
      cuadrilla: cuadrilla.replace('CUADRILLA-', 'C-'), 
      completados, 
      asignados,
      progreso: asignados > 0 ? ((completados / asignados) * 100).toFixed(1) : 0,
      completadosList
    });
  });

  rankings.sort((a,b) => b.completados - a.completados);

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <BarChart2 size={24} color="var(--primary)" /> Panel de Métricas
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Vista global de avances por cuadrilla y estado del proyecto.</p>
      </div>

      <div className="kpi-grid admin-kpi-top" style={{ marginBottom: '1rem' }}>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div className="kpi-icon" style={{color: 'var(--primary)'}}><Award size={32}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '2rem' }}>{totalCompletados}</span>
            <span className="kpi-lbl">Puntos Completados Global</span>
          </div>
        </div>
        <div 
          className="kpi-card" 
          style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.1))', borderColor: 'rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}
          onClick={() => setShowObservadosModal(true)}
          title="Haz clic para ver detalles"
        >
          <div className="kpi-icon" style={{color: 'var(--error)'}}><AlertTriangle size={32}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '2rem', color: 'var(--error)' }}>{totalObservados}</span>
            <span className="kpi-lbl">Puntos Observados Global</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{color: 'var(--text-muted)'}}><MapPin size={32}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '2rem' }}>{totalAsignados}</span>
            <span className="kpi-lbl">Total de Puntos Asignados</span>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipos Instalados</h3>
      <div className="kpi-grid admin-kpi-bottom" style={{ marginBottom: '2rem' }}>
        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-icon" style={{color: 'var(--c-ptz)'}}><Camera size={20}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '1.4rem' }}>{ptzCompletadas}</span>
            <span className="kpi-lbl">PTZ Instaladas</span>
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-icon" style={{color: 'var(--c-multi)'}}><Video size={20}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '1.4rem' }}>{multiCompletadas}</span>
            <span className="kpi-lbl">Multi Instaladas</span>
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-icon" style={{color: 'var(--c-altavoz)'}}><Volume2 size={20}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '1.4rem' }}>{altavocesCompletados}</span>
            <span className="kpi-lbl">Altavoces IP</span>
          </div>
        </div>
        <div className="kpi-card" style={{ padding: '1rem' }}>
          <div className="kpi-icon" style={{color: 'var(--c-boton)'}}><ShieldAlert size={20}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '1.4rem' }}>{botonesCompletados}</span>
            <span className="kpi-lbl">Botones Pánico</span>
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.9rem' }}>Ranking de Cuadrillas</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {rankings.map((r, i) => (
          <div key={i} className="ranking-card" style={{ flexDirection: 'column', alignItems: 'stretch', background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', cursor: 'pointer', flexWrap: 'wrap' }}
              onClick={() => setExpandedCuadrilla(expandedCuadrilla === r.cuadrilla ? null : r.cuadrilla)}
            >
              <div className="ranking-position" style={{ color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-muted)', width: '40px', fontSize: '1.5rem', fontWeight: 800 }}>
                #{i + 1}
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {r.cuadrilla} 
                    <ChevronDown size={16} style={{ color: 'var(--text-muted)', transform: expandedCuadrilla === r.cuadrilla ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.completados} / {r.asignados} pts</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'var(--overlay-w-10)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.progreso}%`, background: 'var(--primary)', transition: 'width 1s ease-out' }}></div>
                </div>
              </div>
              <div className="ranking-score" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {r.progreso}%
              </div>
            </div>

            {expandedCuadrilla === r.cuadrilla && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Puntos Completados:</h4>
                {r.completadosList.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {r.completadosList.map((ptName, pIdx) => (
                      <span key={pIdx} style={{ background: 'var(--overlay-w-05)', padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}>
                        <CheckSquare size={12} style={{ color: 'var(--c-ptz)', display: 'inline', marginRight: '0.3rem', verticalAlign: 'middle' }} />
                        {ptName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ningún punto completado aún.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Puntos Observados */}
      {showObservadosModal && (
        <div className="splash-overlay" onClick={() => setShowObservadosModal(false)}>
          <div className="splash-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%', padding: '1.5rem', background: 'var(--bg-main)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', margin: 0 }}>
                <AlertTriangle size={24} /> Detalle de Puntos Observados
              </h3>
              <button onClick={() => setShowObservadosModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }} className="sidebar-scroll">
              {observadosDetalle.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {observadosDetalle.map((obs, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', background: 'var(--bg-sidebar)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{obs.nombre}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>
                        {obs.cuadrilla}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No hay puntos observados registrados actualmente.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
