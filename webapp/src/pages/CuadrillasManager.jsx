import React, { useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, Edit2, Trash2, CheckSquare, Square, Plus, Save, X, Wrench, 
  ArrowRight, CheckCircle2, Search, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { getPuntoName } from '../utils/helpers';

export const CuadrillasManager = ({ cuadrillasList, fetchCuadrillas, data = {}, fetchData, sectoresList = [] }) => {
  const [activeTab, setActiveTab] = useState('LISTA'); // 'LISTA' o 'ASIGNAR'
  const [formData, setFormData] = useState({ 
    internal_name: '', 
    display_name: '', 
    company_name: '', 
    leader_name: '', 
    contact_info: '', 
    tipo: 'MANTENIMIENTO',
    is_active: true 
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estados para Selección y Asignación de Puntos a Mantenimiento
  const [selectedDestinoCuadrilla, setSelectedDestinoCuadrilla] = useState('');
  const [selectedTipoMantenimiento, setSelectedTipoMantenimiento] = useState('PREVENTIVO');
  const [searchFilter, setSearchFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [asignacionFilter, setAsignacionFilter] = useState('ALL'); // 'ALL' | 'SIN_MANTENIMIENTO' | 'CON_MANTENIMIENTO'
  const [selectedPointIds, setSelectedPointIds] = useState(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState('');

  const puntosList = useMemo(() => Object.values(data), [data]);
  const sectoresDisponibles = useMemo(() => {
    return Array.from(new Set(puntosList.map(p => p.sector).filter(Boolean)));
  }, [puntosList]);

  // Puntos filtrados según los controles de búsqueda
  const filteredPuntos = useMemo(() => {
    return puntosList.filter(p => {
      if (sectorFilter !== 'ALL' && p.sector !== sectorFilter) return false;
      if (asignacionFilter === 'SIN_MANTENIMIENTO' && p.cuadrilla_mantenimiento) return false;
      if (asignacionFilter === 'CON_MANTENIMIENTO' && !p.cuadrilla_mantenimiento) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const name = getPuntoName(p).toLowerCase();
        const dest = (p.destino_esp || '').toLowerCase();
        const sec = (p.sector || '').toLowerCase();
        const cuad = (p.cuadrilla || '').toLowerCase();
        const cuadMant = (p.cuadrilla_mantenimiento || '').toLowerCase();
        if (!name.includes(q) && !dest.includes(q) && !sec.includes(q) && !cuad.includes(q) && !cuadMant.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [puntosList, sectorFilter, asignacionFilter, searchFilter]);

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
      tipo: c.tipo || 'MANTENIMIENTO',
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

  // Alternar rápidamente entre Instalación y Mantenimiento
  const toggleCuadrillaTipo = async (id, currentTipo) => {
    const newTipo = currentTipo === 'MANTENIMIENTO' ? 'INSTALACION' : 'MANTENIMIENTO';
    await supabase.from('cuadrillas').update({ tipo: newTipo }).eq('id', id);
    fetchCuadrillas();
  };

  // Acciones de Selección de Puntos
  const toggleSelectPunto = (id) => {
    setSelectedPointIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedPointIds(prev => {
      const next = new Set(prev);
      filteredPuntos.forEach(p => next.add(p.id));
      return next;
    });
  };

  const deselectAll = () => {
    setSelectedPointIds(new Set());
  };

  // Ejecución de Asignación Directa de Puntos Seleccionados
  const handleEjecutarAsignacion = async () => {
    if (!selectedDestinoCuadrilla) {
      alert("Por favor selecciona la cuadrilla de mantenimiento destino.");
      return;
    }

    if (selectedPointIds.size === 0) {
      alert("Por favor selecciona al menos un punto de la lista.");
      return;
    }

    const targetCuad = cuadrillasList.find(c => c.internal_name === selectedDestinoCuadrilla);
    const targetName = targetCuad?.display_name || selectedDestinoCuadrilla;

    const confirmMsg = `¿Confirmas asignar ${selectedPointIds.size} punto(s) a la cuadrilla "${targetName}" para Mantenimiento ${selectedTipoMantenimiento}?\n\n(Nota: La cuadrilla de instalación original NO se verá alterada en la base de datos).`;
    if (!window.confirm(confirmMsg)) return;

    setIsAssigning(true);
    try {
      const updatePayload = {
        cuadrilla_mantenimiento: selectedDestinoCuadrilla,
        mantenimiento_tipo: selectedTipoMantenimiento,
        mantenimiento_completado: false,
        mantenimiento_observado: false
      };

      const idsArray = Array.from(selectedPointIds);
      const chunkSize = 100;
      for (let i = 0; i < idsArray.length; i += chunkSize) {
        const chunk = idsArray.slice(i, i + chunkSize);
        const { error } = await supabase.from('puntos_instalacion').update(updatePayload).in('id', chunk);
        if (error) throw error;
      }

      if (fetchData) await fetchData();
      setAssignSuccessMsg(`¡Éxito! ${idsArray.length} punto(s) asignados correctamente a "${targetName}".`);
      setSelectedPointIds(new Set());
      setTimeout(() => setAssignSuccessMsg(''), 5000);
    } catch (err) {
      console.error("Error al asignar puntos a mantenimiento:", err);
      alert("Ocurrió un error al asignar los puntos: " + err.message);
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
          <p style={{ color: 'var(--text-muted)' }}>Crea cuadrillas para Instalación o Mantenimiento y asigna puntos directamente.</p>
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
                setFormData({ internal_name: '', display_name: '', company_name: '', leader_name: '', contact_info: '', tipo: 'MANTENIMIENTO', is_active: true }); 
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
                  <input type="text" className="splash-input" required value={formData.internal_name} onChange={e => setFormData({...formData, internal_name: e.target.value})} placeholder="Ej. PERUVIAN-MANT o CUADRILLA-1" disabled={!!editingId} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nombre a Mostrar</label>
                  <input type="text" className="splash-input" required value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} placeholder="Ej. PE o Cuadrilla Mantenimiento 1" />
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
                    <option value="MANTENIMIENTO">🔧 Mantenimiento Preventivo/Correctivo</option>
                    <option value="INSTALACION">🛠️ Instalación / Obra</option>
                  </select>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Empresa / Contratista</label>
                  <input type="text" className="splash-input" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} placeholder="Ej. PERUVIAN o Consorcio ABC" />
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
                      <span 
                        onClick={() => toggleCuadrillaTipo(c.id, c.tipo)}
                        style={{ 
                          fontSize: '0.72rem', 
                          padding: '3px 9px', 
                          borderRadius: '12px', 
                          background: isMant ? 'rgba(99, 102, 241, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isMant ? 'var(--secondary)' : 'var(--primary)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          border: isMant ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                        }}
                        title="Clic para cambiar entre Mantenimiento e Instalación"
                      >
                        {isMant ? '🔧 Mantenimiento' : '🛠️ Instalación'}
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
          PESTAÑA 2: SELECCIÓN Y ASIGNACIÓN DIRECTA DE PUNTOS
      ============================================================ */}
      {activeTab === 'ASIGNAR' && (
        <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Banner informativo de seguridad de datos */}
          <div style={{ padding: '0.9rem 1.2rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', display: 'flex', alignItems: 'flex-start', gap: '0.8rem' }}>
            <ShieldCheck size={22} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', lineHeight: '1.45', color: 'var(--text-main)' }}>
              <strong>Independencia de Roles:</strong> Asignar puntos a una cuadrilla de mantenimiento <strong>NO altera ni sobreescribe</strong> la cuadrilla que realizó la instalación original. El instalador original queda registrado permanentemente en el campo <code>cuadrilla</code>, y aquí solo se asigna el responsable en <code>cuadrilla_mantenimiento</code>.
            </div>
          </div>

          {assignSuccessMsg && (
            <div style={{ padding: '0.8rem 1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} /> {assignSuccessMsg}
            </div>
          )}

          {/* Panel de Configuración de Destino */}
          <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', color: 'var(--secondary)' }}>
              <Wrench size={20} /> 1. Configurar Destino de Mantenimiento
            </h3>

            <div className="form-responsive-row" style={{ gap: '1rem', alignItems: 'flex-end' }}>
              <div style={{ flex: 1.3 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Cuadrilla de Mantenimiento Destino:
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
                      {c.display_name || c.internal_name} {c.company_name ? `(${c.company_name})` : ''} - {c.tipo === 'MANTENIMIENTO' ? '🔧 Mantenimiento' : '🛠️ Instalación'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
                  Tipo de Mantenimiento:
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

              <div>
                <button
                  type="button"
                  onClick={handleEjecutarAsignacion}
                  disabled={isAssigning || selectedPointIds.size === 0 || !selectedDestinoCuadrilla}
                  className="splash-btn primary"
                  style={{ 
                    background: selectedPointIds.size > 0 && selectedDestinoCuadrilla ? 'var(--secondary)' : undefined, 
                    minWidth: '220px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontWeight: 600
                  }}
                >
                  <Wrench size={18} /> {isAssigning ? 'Asignando...' : `Asignar ${selectedPointIds.size} Puntos`}
                </button>
              </div>
            </div>
          </div>

          {/* Panel de Selección Directa de Puntos */}
          <div style={{ background: 'var(--bg-card)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>2. Seleccionar Puntos en Cuestión</h3>
                <span style={{ fontSize: '0.8rem', background: 'var(--bg-main)', padding: '3px 10px', borderRadius: '10px', color: selectedPointIds.size > 0 ? 'var(--secondary)' : 'var(--text-muted)', border: '1px solid var(--border-light)', fontWeight: 600 }}>
                  {selectedPointIds.size} seleccionados de {filteredPuntos.length} filtrados (Total: {puntosList.length})
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="splash-btn secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                >
                  Seleccionar visibles ({filteredPuntos.length})
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="splash-btn secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', width: 'auto' }}
                  disabled={selectedPointIds.size === 0}
                >
                  Limpiar selección
                </button>
              </div>
            </div>

            {/* Chips de puntos seleccionados actualmente */}
            {selectedPointIds.size > 0 && (
              <div style={{ 
                padding: '0.8rem 1rem', 
                background: 'var(--bg-main)', 
                borderRadius: '8px', 
                border: '1px solid var(--border-light)', 
                marginBottom: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--secondary)' }}>
                    Puntos específicos elegidos para asignar ({selectedPointIds.size}):
                  </span>
                  <button 
                    type="button" 
                    onClick={deselectAll}
                    style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Quitar todos
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '130px', overflowY: 'auto' }}>
                  {Array.from(selectedPointIds).map(id => {
                    const p = data[id] || puntosList.find(item => item.id === id);
                    if (!p) return null;
                    const name = getPuntoName(p);
                    return (
                      <span 
                        key={id} 
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.35rem', 
                          padding: '4px 9px', 
                          background: 'rgba(99, 102, 241, 0.15)', 
                          color: 'var(--secondary)', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          border: '1px solid rgba(99, 102, 241, 0.3)'
                        }}
                      >
                        📍 {name} {p.sector ? `(${p.sector})` : ''}
                        <X 
                          size={13} 
                          style={{ cursor: 'pointer', marginLeft: '3px' }} 
                          onClick={(e) => { e.stopPropagation(); toggleSelectPunto(id); }} 
                          title="Quitar este punto de la selección"
                        />
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filtros de búsqueda */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ flex: '1 1 240px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="splash-input"
                  placeholder="Buscar por código de punto, nombre, dirección..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  style={{ paddingLeft: '2.2rem', width: '100%' }}
                />
              </div>

              <div style={{ flex: '0 1 180px' }}>
                <select
                  className="splash-input"
                  value={sectorFilter}
                  onChange={e => setSectorFilter(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="ALL">Todos los Sectores</option>
                  {sectoresDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ flex: '0 1 220px' }}>
                <select
                  className="splash-input"
                  value={asignacionFilter}
                  onChange={e => setAsignacionFilter(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="ALL">Cualquier Estado de Mant.</option>
                  <option value="SIN_MANTENIMIENTO">Sin Cuadrilla de Mantenimiento</option>
                  <option value="CON_MANTENIMIENTO">Con Mantenimiento Asignado</option>
                </select>
              </div>
            </div>

            {/* Lista scrollable de puntos interactiva */}
            <div style={{ maxHeight: '440px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
              {filteredPuntos.map(p => {
                const isSelected = selectedPointIds.has(p.id);
                const puntoName = getPuntoName(p);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelectPunto(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '8px',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-main)',
                      border: isSelected ? '1px solid var(--secondary)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {isSelected ? <CheckSquare size={20} color="var(--secondary)" /> : <Square size={20} color="var(--text-muted)" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--secondary)' : 'var(--text-main)' }}>
                          {puntoName}
                        </span>
                        {p.sector && (
                          <span style={{ fontSize: '0.72rem', background: 'var(--bg-card)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-light)', color: 'var(--text-muted)' }}>
                            {p.sector}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.destino_esp || 'Sin dirección específica'}
                      </p>
                    </div>

                    {/* Badges de Cuadrillas: Instalación vs Mantenimiento */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        🛠️ Instaló: {p.cuadrilla || 'N/A'}
                      </span>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        color: p.cuadrilla_mantenimiento ? 'var(--secondary)' : 'var(--text-muted)', 
                        background: p.cuadrilla_mantenimiento ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontWeight: 600 
                      }}>
                        🔧 Mant: {p.cuadrilla_mantenimiento || 'Sin asignar'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredPuntos.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No se encontraron puntos con los filtros aplicados.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
