import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, Eye, EyeOff, ChevronDown, MapPin, Package, CalendarDays, Camera, 
  Video, Volume2, ShieldAlert, Wifi, Link2, Layers, HardHat, Box, Cable, Zap, Server, 
  Filter, Activity, Target, Menu, X, Navigation, Sun, Moon, CheckSquare, Square, 
  LogOut, Download, Map, BarChart2, Award, Search, AlertTriangle, List, Edit2, Plus, Trash2, Save 
} from 'lucide-react';

export const InventoryManager = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState({ item_name: '', stock_quantity: 0 });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('inventory').select('*').order('item_name');
    if (error) console.error(error);
    else setInventory(data || []);
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('inventory').insert([{ item_name: newItem.item_name.toUpperCase(), stock_quantity: newItem.stock_quantity }]);
    if (error) alert(error.message);
    else {
      setNewItem({ item_name: '', stock_quantity: 0 });
      fetchInventory();
    }
  };

  const handleUpdate = async (id, currentQty) => {
    const newQty = window.prompt('Nuevo stock:', currentQty);
    if (newQty !== null && !isNaN(parseInt(newQty))) {
      const { error } = await supabase.from('inventory').update({ stock_quantity: parseInt(newQty) }).eq('id', id);
      if (error) alert(error.message);
      else fetchInventory();
    }
  };

  return (
    <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
      <div className="responsive-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Box size={24} color="var(--primary)" /> Almacén e Inventario General
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>Gestiona el stock global de logística.</p>
        </div>
      </div>
      
      <form onSubmit={handleAdd} className="form-responsive-row" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '2rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nombre del Ítem</label>
          <input type="text" className="splash-input" placeholder="Ej. Cable UTP" value={newItem.item_name} onChange={e => setNewItem({...newItem, item_name: e.target.value})} required />
        </div>
        <div style={{ width: '150px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="mobile-full-width">
          <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Cantidad Inicial</label>
          <input type="number" className="splash-input" placeholder="0" value={newItem.stock_quantity} onChange={e => setNewItem({...newItem, stock_quantity: parseInt(e.target.value)})} required />
        </div>
        <button type="submit" className="splash-btn primary" style={{ width: 'auto', height: '48px', padding: '0 1.5rem' }}>
          <Plus size={18} /> Añadir Ítem
        </button>
      </form>

      {loading ? (
        <div className="empty-state">
          <Package size={48} opacity={0.2} />
          <p>Cargando inventario...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-main)', borderRadius: '8px', overflow: 'hidden' }}>
          <thead style={{ background: 'var(--overlay-w-5)', textAlign: 'left' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Ítem</th>
              <th style={{ padding: '1rem' }}>Stock Disponible</th>
              <th style={{ padding: '1rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '1rem' }}>{item.item_name}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontWeight: 600, color: item.stock_quantity <= 5 ? 'var(--error)' : 'var(--text-main)' }}>{item.stock_quantity}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <button onClick={() => handleUpdate(item.id, item.stock_quantity)} className="splash-btn secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-light)' }}>
                    <Edit2 size={14} /> Actualizar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
};
