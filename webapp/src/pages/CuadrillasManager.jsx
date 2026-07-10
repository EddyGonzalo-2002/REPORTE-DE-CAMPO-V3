import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Users, Edit2, Trash2, CheckSquare, Square, Plus, Save, X } from 'lucide-react';

export const CuadrillasManager = ({ cuadrillasList, fetchCuadrillas }) => {
  const [formData, setFormData] = useState({ internal_name: '', display_name: '', company_name: '', leader_name: '', contact_info: '', is_active: true });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

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
    setFormData(c);
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

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      <div className="responsive-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Users size={24} color="var(--primary)" /> Gestión de Cuadrillas
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Administra los equipos de trabajo en campo y contratistas.</p>
        </div>
        <button className="splash-btn primary" onClick={() => { setEditingId(null); setFormData({ internal_name: '', display_name: '', company_name: '', leader_name: '', contact_info: '', is_active: true }); setShowForm(!showForm); }}>
          {showForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Nueva Cuadrilla</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0 }}>{editingId ? 'Editar Cuadrilla' : 'Crear Nueva Cuadrilla'}</h4>
          
          <div className="form-responsive-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Identificador Interno (Obligatorio)</label>
              <input type="text" className="splash-input" required value={formData.internal_name} onChange={e => setFormData({...formData, internal_name: e.target.value})} placeholder="Ej. CUADRILLA-1" disabled={!!editingId} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nombre a Mostrar</label>
              <input type="text" className="splash-input" required value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} placeholder="Ej. Cuadrilla 1" />
            </div>
          </div>

          <div className="form-responsive-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Empresa / Contratista</label>
              <input type="text" className="splash-input" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} placeholder="Ej. Consorcio ABC" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Líder Responsable</label>
              <input type="text" className="splash-input" value={formData.leader_name} onChange={e => setFormData({...formData, leader_name: e.target.value})} placeholder="Nombre del capataz" />
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="splash-btn primary" style={{ minWidth: '160px', width: 'auto' }}>
              <Save size={18} /> {editingId ? 'Guardar Cambios' : 'Crear Cuadrilla'}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        {cuadrillasList.map(c => (
          <div key={c.id} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: c.is_active ? 1 : 0.5, flexWrap: 'wrap', gap: '1rem', border: '1px solid var(--border-light)' }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={16} color="var(--primary)"/> {c.display_name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Empresa: {c.company_name || 'N/A'} | Líder: {c.leader_name || 'N/A'}</p>
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
        ))}
        {cuadrillasList.length === 0 && (
          <div className="empty-state">
            <Users size={48} opacity={0.2} />
            <p>No hay cuadrillas registradas.</p>
          </div>
        )}
      </div>
    </div>
  );
};
