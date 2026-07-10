import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Map, Edit2, Trash2, CheckSquare, Square, Plus, Save, X } from 'lucide-react';

export const SectoresManager = ({ sectoresList, fetchSectores }) => {
  const [formData, setFormData] = useState({ internal_name: '', display_name: '', color: '#4299e1', is_active: true });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let error;
    if (editingId) {
      const res = await supabase.from('sectores').update(formData).eq('id', editingId);
      error = res.error;
    } else {
      const res = await supabase.from('sectores').insert([formData]);
      error = res.error;
    }
    setLoading(false);
    if (error) alert(error.message);
    else {
      setShowForm(false);
      fetchSectores();
    }
  };

  const handleEdit = (c) => {
    setFormData(c);
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar sector? Esto podría afectar los puntos asignados.')) {
      await supabase.from('sectores').delete().eq('id', id);
      fetchSectores();
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    await supabase.from('sectores').update({ is_active: !currentStatus }).eq('id', id);
    fetchSectores();
  };

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      <div className="responsive-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Map size={24} color="var(--primary)" /> Gestión de Sectores
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Administra los sectores geográficos y sus colores representativos.</p>
        </div>
        <button className="splash-btn primary" onClick={() => { setEditingId(null); setFormData({ internal_name: '', display_name: '', color: '#4299e1', is_active: true }); setShowForm(!showForm); }}>
          {showForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Nuevo Sector</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0 }}>{editingId ? 'Editar Sector' : 'Crear Nuevo Sector'}</h4>
          
          <div className="form-responsive-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Identificador Interno (Obligatorio)</label>
              <input type="text" className="splash-input" required value={formData.internal_name} onChange={e => setFormData({...formData, internal_name: e.target.value})} placeholder="Ej. OESTE MP-CUZCO" disabled={!!editingId} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nombre a Mostrar</label>
              <input type="text" className="splash-input" required value={formData.display_name} onChange={e => setFormData({...formData, display_name: e.target.value})} placeholder="Ej. Zona Oeste Cusco" />
            </div>
          </div>
          
          <div className="form-responsive-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Color del Sector (Hex)</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ width: '50px', height: '40px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                <input type="text" className="splash-input" required value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} placeholder="#4299e1" />
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="splash-btn primary" style={{ minWidth: '160px', width: 'auto' }}>
              <Save size={18} /> {editingId ? 'Guardar Cambios' : 'Crear Sector'}
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
        {sectoresList.map(c => (
          <div key={c.id} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: c.is_active ? 1 : 0.5, flexWrap: 'wrap', gap: '1rem', borderLeft: `6px solid ${c.color}` }}>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Map size={16} color={c.color}/> {c.display_name}
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>ID: {c.internal_name}</p>
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
        {sectoresList.length === 0 && (
          <div className="empty-state">
            <Map size={48} opacity={0.2} />
            <p>No hay sectores registrados.</p>
          </div>
        )}
      </div>
    </div>
  );
};
