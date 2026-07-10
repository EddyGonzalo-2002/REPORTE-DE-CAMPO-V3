import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, Eye, EyeOff, ChevronDown, MapPin, Package, CalendarDays, Camera, 
  Video, Volume2, ShieldAlert, Wifi, Link2, Layers, HardHat, Box, Cable, Zap, Server, 
  Filter, Activity, Target, Menu, X, Navigation, Sun, Moon, CheckSquare, Square, 
  LogOut, Download, Map, BarChart2, Award, Search, AlertTriangle, List, Edit2, Plus, Trash2, Save 
} from 'lucide-react';

export const RulesManager = () => {
  const [rules, setRules] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  
  const defaultRule = {
    name: '',
    description: '',
    target_device: 'PTZ',
    item_name: '',
    quantity_per_device: 1,
    fixed_quantity: 0
  };
  const [formData, setFormData] = useState(defaultRule);

  useEffect(() => {
    fetchRules();
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const { data } = await supabase.from('inventory').select('item_name').order('item_name');
    if (data) setInventory(data);
  };

  const fetchRules = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('logistics_rules').select('*').order('created_at');
    if (error) console.error(error);
    else setRules(data || []);
    setLoading(false);
  };

  const toggleRule = async (id, currentState) => {
    await supabase.from('logistics_rules').update({ is_active: !currentState }).eq('id', id);
    fetchRules();
  };

  const handleEdit = (rule) => {
    setEditingRuleId(rule.id);
    setFormData({
      name: rule.name,
      description: rule.description,
      target_device: rule.target_device,
      item_name: rule.item_name,
      quantity_per_device: rule.quantity_per_device,
      fixed_quantity: rule.fixed_quantity
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta regla?')) {
      await supabase.from('logistics_rules').delete().eq('id', id);
      fetchRules();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingRuleId) {
      await supabase.from('logistics_rules').update(formData).eq('id', editingRuleId);
    } else {
      await supabase.from('logistics_rules').insert([formData]);
    }
    setShowForm(false);
    setEditingRuleId(null);
    setFormData(defaultRule);
    fetchRules();
  };

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      <div className="responsive-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Layers size={24} color="var(--primary)" /> Reglas de Logística
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Configura las reglas automáticas para asignar materiales a los puntos.</p>
        </div>
        <button className="splash-btn primary" onClick={() => { setEditingRuleId(null); setFormData(defaultRule); setShowForm(!showForm); }}>
          {showForm ? <><X size={18} /> Cancelar</> : <><Plus size={18} /> Nueva Regla</>}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-main)', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ margin: 0 }}>{editingRuleId ? 'Editar Regla' : 'Crear Nueva Regla'}</h4>
          <div className="form-responsive-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nombre de la Regla</label>
              <input type="text" className="splash-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Descripción</label>
              <input type="text" className="splash-input" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>
          <div className="form-responsive-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Dispositivo Objetivo</label>
              <select className="splash-input" value={formData.target_device} onChange={e => setFormData({...formData, target_device: e.target.value})}>
                <option value="ALL">Todos los dispositivos</option>
                <option value="CAMARA">Cámaras (PTZ y Multi)</option>
                <option value="PTZ">Solo PTZ</option>
                <option value="MULTI">Solo Multisensor</option>
                <option value="ALTAVOZ">Solo Altavoz</option>
                <option value="BOTON">Solo Botón de Pánico</option>
                <option value="SWITCH_CONDITION">Extra (Si hay &gt; 1 dispositivo)</option>
                <option value="NONE">Sin condición (Fijo siempre)</option>
              </select>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Material a asignar</label>
              <input list="inventory-items" className="splash-input" required value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})} placeholder="Escribe o selecciona..." />
              <datalist id="inventory-items">
                {inventory.map((inv, i) => <option key={i} value={inv.item_name} />)}
              </datalist>
            </div>
          </div>
          <div className="form-responsive-row">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cantidad (Por dispositivo)</label>
              <input type="number" className="splash-input" required value={formData.quantity_per_device} onChange={e => setFormData({...formData, quantity_per_device: parseInt(e.target.value) || 0})} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cantidad Fija Extra</label>
              <input type="number" className="splash-input" required value={formData.fixed_quantity} onChange={e => setFormData({...formData, fixed_quantity: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="submit" className="splash-btn primary" style={{ minWidth: '160px' }}>
              <Save size={18} /> {editingRuleId ? 'Actualizar Regla' : 'Guardar Regla'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="empty-state">
          <Layers size={48} opacity={0.2} />
          <p>Cargando reglas...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1.5rem' }}>
          {rules.map(rule => (
            <div key={rule.id} style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: rule.is_active ? 1 : 0.5 }}>
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>{rule.name}</h4>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>{rule.description}</p>
                <div style={{ marginTop: '0.8rem', fontSize: '0.85rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.2rem' }}>
                    <Package size={14} /> Asigna:
                  </span>
                  <span style={{ display: 'block', marginLeft: '1.2rem', color: 'var(--text-main)' }}>
                    {rule.quantity_per_device > 0 ? `${rule.quantity_per_device} por ${rule.target_device}` : ''} {rule.fixed_quantity > 0 ? `+ ${rule.fixed_quantity} fijos` : ''} de <strong>{rule.item_name}</strong>
                  </span>
                </div>
              </div>
              <div className="responsive-actions">
                <button onClick={() => handleEdit(rule)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', color: 'var(--text-main)', border: '1px solid var(--border-light)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <Edit2 size={16} /> Editar
                </button>
                <button onClick={() => handleDelete(rule.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'none', color: 'var(--error)', border: '1px solid var(--error)', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}>
                  <Trash2 size={16} /> Eliminar
                </button>
                <button 
                  onClick={() => toggleRule(rule.id, rule.is_active)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: rule.is_active ? 'var(--primary)' : 'var(--overlay-w-10)', color: rule.is_active ? '#fff' : 'var(--text-main)', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  {rule.is_active ? <CheckSquare size={16} /> : <Square size={16} />}
                  {rule.is_active ? 'Activa' : 'Inactiva'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
