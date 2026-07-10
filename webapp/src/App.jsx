import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronDown, MapPin, Package, CalendarDays, Camera, 
  Video, Volume2, ShieldAlert, Wifi, Link2, Layers, 
  HardHat, Box, Cable, Zap, Server, Filter, Activity,
  Target, Menu, X, Navigation, Sun, Moon, CheckSquare, Square, LogOut, LogIn, Download, Map, BarChart2, Award, Search, AlertTriangle, Users
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { SplashScreen } from './components/SplashScreen';
import { LocationCard } from './components/LocationCard';
import { getPuntoName, getMaterialIcon } from './utils/helpers';

// Admin Pages
import { AdminMapDashboard } from './pages/AdminMapDashboard';
import { SectoresManager } from './pages/SectoresManager';
import { CuadrillasManager } from './pages/CuadrillasManager';
import { InventoryManager } from './pages/InventoryManager';
import { RulesManager } from './pages/RulesManager';
import { AdminDashboard } from './pages/AdminDashboard';
import { OperativoDashboard } from './pages/OperativoDashboard';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  // Operativo State
  const [activeCuadrilla, setActiveCuadrilla] = useState('');
  const [filterSector, setFilterSector] = useState('ALL');
  const [filterEquipo, setFilterEquipo] = useState('ALL');
  const [filterFecha, setFilterFecha] = useState('ALL');
  const [filterPunto, setFilterPunto] = useState('ALL');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  
  // Data State
  const [cuadrillasList, setCuadrillasList] = useState([]);
  const [cuadrillasMap, setCuadrillasMap] = useState({});
  const [sectoresList, setSectoresList] = useState([]);
  const [sectoresMap, setSectoresMap] = useState({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If user logs in and is on splash screen, navigate to dashboard
      if (session && location.pathname === '/') {
        navigate('/admin/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [location.pathname, navigate]);

  const fetchData = async () => {
    setLoading(true);
    let allData = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase.from('puntos_instalacion').select('*').range(from, from + step - 1).order('id', { ascending: true });
      if (!error && data && data.length > 0) {
        allData = [...allData, ...data];
        from += step;
      }
      if (error || !data || data.length < step) {
        hasMore = false;
      }
    }
    
    // Fetch materiales
    let allMats = [];
    from = 0;
    hasMore = true;
    while (hasMore) {
      const { data, error } = await supabase.from('materiales_punto').select('*').range(from, from + step - 1);
      if (!error && data && data.length > 0) {
        allMats = [...allMats, ...data];
        from += step;
      }
      if (error || !data || data.length < step) {
        hasMore = false;
      }
    }
    
    const map = {};
    allData.forEach(r => {
      const mats = allMats.filter(m => m.punto_id === r.id).map(m => ({ Item: m.item, Cantidad: m.cantidad }));
      map[r.id] = { ...r, MaterialesPunto: mats };
    });
    setData(map);
    setLoading(false);
  };

  const fetchCuadrillas = async () => {
    const { data: records, error } = await supabase.from('cuadrillas').select('*');
    if (!error && records) {
      setCuadrillasList(records);
      const cmap = {};
      records.forEach(c => cmap[c.internal_name] = c);
      setCuadrillasMap(cmap);
    }
  };

  const fetchSectores = async () => {
    const { data: records, error } = await supabase.from('sectores').select('*');
    if (!error && records) {
      setSectoresList(records);
      const smap = {};
      records.forEach(s => smap[s.internal_name] = s);
      setSectoresMap(smap);
    }
  };

  useEffect(() => {
    fetchData();
    fetchCuadrillas();
    fetchSectores();
  }, []);

  const handleUpdatePunto = () => {
    fetchData();
  };

  const getHeaderTitle = () => {
    switch(location.pathname) {
      case '/operativo': return 'Vista Operativa';
      case '/admin/dashboard': return 'Dashboard General';
      case '/admin/mapa': return 'Mapa de Puntos';
      case '/admin/sectores': return 'Zonas / Sectores';
      case '/admin/cuadrillas': return 'Cuadrillas';
      case '/admin/inventario': return 'Inventario Base';
      case '/admin/reglas': return 'Reglas Generación';
      default: return 'Dashboard';
    }
  };

  if (sessionLoading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-main)' }}><Activity className="spin" color="var(--primary)" /></div>;
  }

  // Hide sidebar and header layout on splash screen
  if (location.pathname === '/') {
    return session ? <Navigate to="/admin/dashboard" replace /> : <SplashScreen onGuest={() => navigate('/operativo')} session={session} />;
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
          <Activity size={24} color="var(--primary)" />
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>Dashboard</span>
          
          <button 
            onClick={toggleTheme} 
            style={{
              background: 'none', border: 'none', color: 'var(--text-main)', 
              padding: '0.25rem', cursor: 'pointer', display: 'flex', marginLeft: 'auto',
              marginRight: isSidebarOpen ? '2rem' : '0'
            }}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button className="menu-btn" onClick={() => setIsSidebarOpen(false)} style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', display: isSidebarOpen ? 'block' : 'none', background: 'none', border: 'none', color: 'var(--text-main)' }}>
            <X size={20} />
          </button>
        </div>
        
        <div className="sidebar-scroll">
          <nav className="cuadrilla-nav">
            {session && (
              <>
                <p className="sidebar-title" style={{ marginTop: '0.5rem' }}>ADMINISTRACIÓN</p>
                <NavLink to="/admin/dashboard" className={({ isActive }) => `cuadrilla-nav-btn ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                  <BarChart2 size={18} /> Dashboard General
                </NavLink>
                <NavLink to="/admin/mapa" className={({ isActive }) => `cuadrilla-nav-btn ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                  <Map size={18} /> Mapa de Puntos
                </NavLink>
                <NavLink to="/admin/sectores" className={({ isActive }) => `cuadrilla-nav-btn ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                  <Map size={18} /> Zonas / Sectores
                </NavLink>
                <NavLink to="/admin/cuadrillas" className={({ isActive }) => `cuadrilla-nav-btn ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                  <Users size={18} /> Cuadrillas
                </NavLink>
                <NavLink to="/admin/inventario" className={({ isActive }) => `cuadrilla-nav-btn ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                  <Package size={18} /> Inventario Base
                </NavLink>
                <NavLink to="/admin/reglas" className={({ isActive }) => `cuadrilla-nav-btn ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
                  <Layers size={18} /> Reglas Generación
                </NavLink>
              </>
            )}

            <p className="sidebar-title" style={{ marginTop: '1.5rem' }}>OPERACIÓN</p>
            <NavLink to="/operativo" className={({ isActive }) => `cuadrilla-nav-btn ${isActive ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}>
              <Target size={18} /> Vista Operativa
            </NavLink>

            {location.pathname === '/operativo' && (
              <div style={{ padding: '1rem', marginTop: '0.5rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <h3 className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                    <Search size={14} /> Búsqueda Global
                  </h3>
                  <input 
                    type="text" 
                    className="splash-input" 
                    placeholder="Buscar punto..."
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem', fontSize: '0.85rem' }}
                  />
                </div>

                {!globalSearchQuery && (
                  <>
                    <h3 className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                      <HardHat size={14} /> Cuadrilla Activa
                    </h3>
                    <select 
                      value={activeCuadrilla} 
                      onChange={(e) => setActiveCuadrilla(e.target.value)}
                      className="splash-input"
                      style={{ width: '100%', marginBottom: '1rem', padding: '0.4rem', fontSize: '0.85rem' }}
                    >
                      {Array.from(new Set(Object.values(data).map(p => p.cuadrilla).filter(Boolean))).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <h3 className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                      <Filter size={14} /> Filtros
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="filter-group">
                        <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} className="splash-input" style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem' }}>
                          <option value="ALL">Todos los Sectores</option>
                          {Array.from(new Set(Object.values(data).filter(loc => loc.cuadrilla === activeCuadrilla).map(p => p.sector).filter(Boolean))).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {session && (
                        <div className="filter-group">
                          <select value={filterEquipo} onChange={(e) => setFilterEquipo(e.target.value)} className="splash-input" style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem' }}>
                            <option value="ALL">Cualquier Estado</option>
                            <option value="COMPLETADOS">Completados</option>
                            <option value="OBSERVADOS">Con Observaciones</option>
                            <option value="PENDIENTES">Pendientes</option>
                          </select>
                        </div>
                      )}
                      <div className="filter-group">
                        <select value={filterFecha} onChange={(e) => setFilterFecha(e.target.value)} className="splash-input" style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem' }}>
                          <option value="ALL">Cualquier Día</option>
                          {Array.from(new Set(Object.values(data).filter(loc => loc.cuadrilla === activeCuadrilla).map(p => p.dia_programado).filter(Boolean))).map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => { setFilterSector('ALL'); setFilterEquipo('ALL'); setFilterFecha('ALL'); setFilterPunto('ALL'); }}
                      className="splash-btn secondary"
                      style={{ width: '100%', marginTop: '1rem', padding: '0.4rem', fontSize: '0.8rem' }}
                    >
                      Limpiar Filtros
                    </button>
                  </>
                )}
              </div>
            )}
          </nav>
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-light)', background: 'var(--bg-sidebar)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {session && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }} title={session.user.email}>
                {session.user.email}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                {session.user.user_metadata?.role || 'Administrador'}
              </span>
            </div>
          )}
          
          {session ? (
            <button className="cuadrilla-nav-btn" onClick={() => supabase.auth.signOut()} style={{ color: 'var(--error)', justifyContent: 'center' }}>
              <LogOut size={18} /> Cerrar Sesión
            </button>
          ) : (
            <NavLink to="/" className="cuadrilla-nav-btn" onClick={() => setIsSidebarOpen(false)} style={{ color: 'var(--primary)', justifyContent: 'center' }}>
              <LogIn size={18} /> Iniciar Sesión
            </NavLink>
          )}
        </div>
      </div>

      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100vh', overflow: 'hidden' }}>
        <header className="mobile-header">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="mobile-header-title">
            <Activity size={20} color="var(--primary)" />
            <h2>{getHeaderTitle()}</h2>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={toggleTheme} 
              style={{
                background: 'none', border: 'none', color: 'var(--text-main)', 
                padding: '0.25rem', cursor: 'pointer', display: 'flex', marginRight: session ? '1rem' : '0'
              }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {session && (
              <button onClick={() => supabase.auth.signOut()} style={{ background: 'none', border: 'none', color: 'var(--error)', padding: '0.5rem', cursor: 'pointer' }}>
                <LogOut size={20} />
              </button>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/operativo" element={
            <OperativoDashboard 
              data={data} 
              session={session} 
              onUpdatePunto={handleUpdatePunto} 
              cuadrillasMap={cuadrillasMap} 
              filters={{
                activeCuadrilla, filterSector, filterEquipo, filterFecha, filterPunto, globalSearchQuery, setActiveCuadrilla
              }}
            />
          } />
          
          {/* Protected Routes */}
          <Route path="/admin/dashboard" element={session ? <AdminDashboard data={data} /> : <Navigate to="/" replace />} />
          <Route path="/admin/mapa" element={session ? <AdminMapDashboard data={data} onUpdatePunto={handleUpdatePunto} fetchData={fetchData} cuadrillasMap={cuadrillasMap} sectoresList={sectoresList} sectoresMap={sectoresMap} /> : <Navigate to="/" replace />} />
          <Route path="/admin/sectores" element={session ? <SectoresManager sectoresList={sectoresList} fetchSectores={fetchSectores} /> : <Navigate to="/" replace />} />
          <Route path="/admin/cuadrillas" element={session ? <CuadrillasManager cuadrillasList={cuadrillasList} fetchCuadrillas={fetchCuadrillas} /> : <Navigate to="/" replace />} />
          <Route path="/admin/inventario" element={session ? <InventoryManager /> : <Navigate to="/" replace />} />
          <Route path="/admin/reglas" element={session ? <RulesManager /> : <Navigate to="/" replace />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to={session ? "/admin/dashboard" : "/"} replace />} />
        </Routes>
      </div>
    </div>
  );
}
