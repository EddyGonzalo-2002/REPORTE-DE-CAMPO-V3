import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Edit2, Trash2, CheckSquare, Square, Plus, Save, X, Wrench, ArrowRight, CheckCircle2 } from 'lucide-react';

export const CuadrillasManager = ({ cuadrillasList, fetchCuadrillas, data = {}, fetchData, sectoresList = [] }) => {
  const [activeTab, setActiveTab] = useState('LISTA'); // 'LISTA' o 'ASIGNAR'
  const [formData, setFormData] = useState({ 
    internal_name: '', 
    display_name: '', 
    company_name: '', 
    leader_name: '', 
    contact_info: '', 
    tipo: 'INSTALACION',
    is_active: true 
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para Asignación Masiva
  const [asignarMetodo, setAsignarMetodo] = useState('SECTOR'); // 'SECTOR' o 'CUADRILLA_PREVIA'
  const [selectedOrigen, setSelectedOrigen] = useState('');
  const [selectedDestinoCuadrilla, setSelectedDestinoCuadrilla] = useState('');
  const [selectedTipoMantenimiento, setSelectedTipoMantenimiento] = useState('PREVENTIVO');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  const puntosList = Object.values(data);
  const sectoresDisponibles = Array.from(new Set(puntosList.map(p => p.sector).filter(Boolean)));
  const cuadrillasInstaladoras = Array.from(new Set(puntosList.map(p => p.cuadrilla).filter(Boolean)));

  // Calcular puntos que coinciden con el origen seleccionado
  const puntosAfectados = puntosList.filter(p => {
    if (!selectedOrigen) return false;
    if (asignarMetodo === 'SECTOR') return p.sector === selectedOrigen;
    if (asignarMetodo === 'CUADRILLA_PREVIA') return p.cuadrilla === selectedOrigen;
    return false;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;
    if (editingId) {
      const res = await supabase.from('cuadrillas').update(formData).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('cuadrillas').insert([formData]);
      error = res.error;
    }
    setLoading(false);
    if (error) alert(error.message);
    else {
      setShowForm(false);
      fetchCuadrillas();
    }
  };

  const handleEdit = (c) => {
    setFormData({
      internal_name: c.internal_name || '',
      display_name: c.display_name || '',
      company_name: c.company_name || '',
      leader_name: c.leader_name || '',
      contact_info: c.contact_info || '',
      tipo: c.tipo || 'INSTALACION',
      is_active: c.is_active !== undefined ? c.is_active : true
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar cuadrilla? Asegúrate de que no tenga puntos asignados.')) {
      await supabase.from('cuadrillas').delete().eq('id', id);
      fetchCuadrillas();
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    await supabase.from('cuadrillas').update({ is_active: !currentStatus }).eq('id', id);
    fetchCuadrillas();
  };

  // Manejador de Asignación Masiva
  const handleEjecutarAsignacion = async () => {
    if (!selectedOrigen || !selectedDestinoCuadrilla) {
      alert("Por favor selecciona el origen y la cuadrilla de mantenimiento destino.");
      return;
    }

    if (puntosAfectados.length === 0) {
      alert("No se encontraron puntos para los criterios seleccionados.");
      return;
    }

    const confirmMsg = `¿Confirmas asignar ${puntosAfectados.length} puntos a la cuadrilla de mantenimiento "${selectedDestinoCuadrilla}"?`;
    if (!window.confirm(confirmMsg)) return;

    setIsAssigning(true);
    try {
      const updatePayload = {
        cuadrilla_mantenimiento: selectedDestinoCuadrilla,
        mantenimiento_tipo: selectedTipoMantenimiento,
        mantenimiento_completado: false,
        mantenimiento_observado: false
      };

      let query = supabase.from('puntos_instalacion').update(updatePayload);

      if (asignarMetodo === 'SECTOR') {
        query = query.eq('sector', selectedOrigen);
      } else {
        query = query.eq('cuadrilla', selectedOrigen);
      }

      const { error } = await query;
      if (error) throw error;

      if (fetchData) await fetchData();
      setAssignSuccessMsg(`¡Éxito! ${puntosAfectados.length} puntos reasignados a ${selectedDestinoCuadrilla}.`);
      setTimeout(() => setAssignSuccessMsg(''), 4000);
    } catch (err) {
      console.error("Error en asignación masiva:", err);
      alert("Ocurrió un error al reasignar puntos: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      
      {/* Header con tabs */}
      <div className="responsive-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={24} color="var(--primary)" /> Gestión y Asignación de Cuadrillas
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Crea cuadrillas para Instalación o Mantenimiento y asigna puntos rápidamente.</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('LISTA')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: activeTab === 'LISTA' ? 'var(--primary)' : 'var(--bg-card)',
              color: activeTab === 'LISTA' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cuadrillas ({cuadrillasList.length})
          </button>
          <button
            onClick={() => setActiveTab('ASIGNAR')}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
              background: activeTab === 'ASIGNAR' ? 'var(--secondary)' : 'var(--bg-card)',
              color: activeTab === 'ASIGNAR' ? '#fff' : 'var(--text-main)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Wrench size={16} /> Asignar a Mantenimiento
          </button>
          {activeTab === 'LISTA' && (
            <button 
              className="splash-btn primary" 
              style={{ width: 'auto' }}
              onClick={() => { 
                setEditingId(null); 
                setFormData({ internal_name: '', display_name: '', company_name: '', leader_name: '', contact_info: '', tipo: 'INSTALACION', is_active: true }); 
                setShowForm(!showForm); 
              }}
            >
              {showForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Nueva Cuadrilla</>}
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
          PESTAÑA 1: LISTADO Y CREACIÓN DE CUADRILLAS
      ============================================================ */}
      {activeTab === 'LISTA' && (
        <>
          {showForm && (
            <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ margin: 0 }}>{editingId ? 'Editar Cuadrilla' : 'Crear Nueva Cuadrilla'}</h4>
              
              <div className="form-responsive-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Identificador Interno (Obligatorio)</label>
                  <input type="text" className="splash-input" required value={formData.internal_name} onChange={e => setFormData({...formData, internal_name: e.target.value})} placeholder="Ej. MANT-01 o CUADRILLA-1" disabled={!!editingId} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nombre a Mostrar</label>
                  <input type="text" className="splash-input" required value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} placeholder="Ej. Cuadrilla Mantenimiento 1" />
                </div>
              </div>

              <div className="form-responsive-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo de Cuadrilla</label>
                  <select 
                    className="splash-input" 
                    value={formData.tipo} 
                    onChange={e => setFormData({...formData, tipo: e.target.value})}
                  >
                    <option value="INSTALACION">🛠️ Instalación / Obra</option>
                    <option value="MANTENIMIENTO">🔧 Mantenimiento Preventivo/Correctivo</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Empresa / Contratista</label>
                  <input type="text" className="splash-input" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} placeholder="Ej. Consorcio ABC" />
                </div>
              </div>

              <div className="form-responsive-row">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Líder Responsable</label>
                  <input type="text" className="splash-input" value={formData.leader_name} onChange={e => setFormData({...formData, leader_name: e.target.value})} placeholder="Nombre del capataz o técnico líder" />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="submit" disabled={loading} className="splash-btn primary" style={{ minWidth: '160px', width: 'auto' }}>
                  <Save size={18} /> {loading ? 'Guardando...' : (editingId ? 'Guardar Cambios' : 'Crear Cuadrilla')}
                </button>
              </div>
            </form>
          )}

          <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
            {cuadrillasList.map(c => {
              const isMant = c.tipo === 'MANTENIMIENTO';
              return (
                <div key={c.id} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: c.is_active ? 1 : 0.5, flexWrap: 'wrap', gap: '1rem', border: '1px solid var(--border-light)' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} color={isMant ? 'var(--secondary)' : 'var(--primary)'}/> 
                      {c.display_name}
                      <span style={{ 
                        fontSize: '0.72rem', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        background: isMant ? 'rgba(99, 102, 241, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        color: isMant ? 'var(--secondary)' : 'var(--primary)',
                        fontWeight: 600
                      }}>
                        {isMant ? 'Mantenimiento' : 'Instalación'}
                      </span>
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Identificador: <code>{c.internal_name}</code> | Empresa: {c.company_name || 'N/A'} | Líder: {c.leader_name || 'N/A'}
                    </p>
                  </div>
                  <div className="responsive-actions">
                    <button onClick={() => handleEdit(c)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', color: 'var(--text-main)', border: '1px solid var(--border-light)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
                      <Edit2 size={16} /> Editar
                    </button>
                    <button onClick={() => handleDelete(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', color: 'var(--error)', border: '1px solid var(--error)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}>
                      <Trash2 size={16} /> Eliminar
                    </button>
                    <button 
                      onClick={() => toggleStatus(c.id, c.is_active)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: c.is_active ? 'var(--primary)' : 'var(--overlay-w-10)', color: c.is_active ? '#fff' : 'var(--text-main)', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      {c.is_active ? <CheckSquare size={16} /> : <Square size={16} />}
                      {c.is_active ? 'Activa' : 'Inactiva'}
                    </button>
                  </div>
                </div>
              );
            })}
            {cuadrillasList.length === 0 && (
              <div className="empty-state">
                <Users size={48} opacity={0.2} />
                <p>No hay cuadrillas registradas.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================
          PESTAÑA 2: ASIGNACIÓN RÁPIDA DE PUNTOS A MANTENIMIENTO
      ============================================================ */}
      {activeTab === 'ASIGNAR' && (
        <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)', marginBottom: '0.5rem' }}>
            <Wrench size={22} /> Reasignar Puntos a Cuadrillas de Mantenimiento
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Selecciona un Sector completo o una Cuadrilla previa de instalación para asignarle todos sus puntos a una nueva cuadrilla de mantenimiento en un solo clic.
          </p>

          {assignSuccessMsg && (
            <div style={{ padding: '0.8rem 1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={18} /> {assignSuccessMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            
            {/* Método de Selección */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                1. ¿Cómo deseas seleccionar los puntos a reasignar?
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="metodo" 
                    value="SECTOR" 
                    checked={asignarMetodo === 'SECTOR'} 
                    onChange={() => { setAsignarMetodo('SECTOR'); setSelectedOrigen(''); }} 
                  />
                  Por Sector / Zona
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input 
                    type="radio" 
                    name="metodo" 
                    value="CUADRILLA_PREVIA" 
                    checked={asignarMetodo === 'CUADRILLA_PREVIA'} 
                    onChange={() => { setAsignarMetodo('CUADRILLA_PREVIA'); setSelectedOrigen(''); }} 
                  />
                  Por Cuadrilla de Instalación Original
                </label>
              </div>
            </div>

            {/* Selector de Origen */}
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                2. Selecciona el {asignarMetodo === 'SECTOR' ? 'Sector de Origen' : 'Cuadrilla Instaladora Original'}
              </label>
              <select 
                className="splash-input"
                value={selectedOrigen}
                onChange={e => setSelectedOrigen(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Elige una opción --</option>
                {asignarMetodo === 'SECTOR' ? (
                  sectoresDisponibles.map(s => <option key={s} value={s}>{s}</option>)
                ) : (
                  cuadrillasInstaladoras.map(c => <option key={c} value={c}>{c}</option>)
                )}
              </select>
            </div>

            {/* Selector de Destino */}
            <div className="form-responsive-row">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  3. Nueva Cuadrilla de Mantenimiento Destino
                </label>
                <select 
                  className="splash-input"
                  value={selectedDestinoCuadrilla}
                  onChange={e => setSelectedDestinoCuadrilla(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Selecciona Cuadrilla de Mantenimiento --</option>
                  {cuadrillasList.map(c => (
                    <option key={c.id || c.internal_name} value={c.internal_name}>
                      {c.display_name || c.internal_name} {c.tipo === 'MANTENIMIENTO' ? '(Mantenimiento)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  4. Tipo de Mantenimiento Inicial
                </label>
                <select 
                  className="splash-input"
                  value={selectedTipoMantenimiento}
                  onChange={e => setSelectedTipoMantenimiento(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="PREVENTIVO">Mantenimiento Preventivo</option>
                  <option value="CORRECTIVO">Mantenimiento Correctivo</option>
                </select>
              </div>
            </div>

            {/* Resumen y Botón de Ejecutar */}
            <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Puntos a reasignar:</span>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: puntosAfectados.length > 0 ? 'var(--secondary)' : 'var(--text-muted)' }}>
                    {puntosAfectados.length} puntos
                  </div>
                </div>

                <button
                  onClick={handleEjecutarAsignacion}
                  disabled={isAssigning || puntosAfectados.length === 0 || !selectedDestinoCuadrilla}
                  className="splash-btn primary"
                  style={{ 
                    background: puntosAfectados.length > 0 && selectedDestinoCuadrilla ? 'var(--secondary)' : undefined, 
                    width: 'auto',
                    minWidth: '220px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <ArrowRight size={18} /> {isAssigning ? 'Reasignando...' : 'Asignar Puntos Ahora'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
