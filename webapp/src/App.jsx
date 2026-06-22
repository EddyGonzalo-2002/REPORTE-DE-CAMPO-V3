import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  ChevronDown, MapPin, Package, CalendarDays, Camera, 
  Video, Volume2, ShieldAlert, Wifi, Link2, Layers, 
  HardHat, Box, Cable, Zap, Server, Filter, Activity,
  Target, Menu, X, Navigation, Sun, Moon, CheckSquare, Square, LogOut, Download, Map, BarChart2, Award
} from 'lucide-react';
import { supabase } from './supabaseClient';

const getMaterialIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes('cable') || n.includes('fibra') || n.includes('patch')) return <Cable size={20} />;
  if (n.includes('switch') || n.includes('media conver') || n.includes('poe') || n.includes('inyector')) return <Server size={20} />;
  if (n.includes('llave') || n.includes('transformador') || n.includes('supresor') || n.includes('ups') || n.includes('poder') || n.includes('pararrayo')) return <Zap size={20} />;
  if (n.includes('camara') || n.includes('ptz') || n.includes('multisensor')) return <Camera size={20} />;
  if (n.includes('altavoz') || n.includes('megafono')) return <Volume2 size={20} />;
  if (n.includes('boton')) return <ShieldAlert size={20} />;
  if (n.includes('abrazadera') || n.includes('anclaje') || n.includes('cinta') || n.includes('soporte') || n.includes('brazo')) return <Link2 size={20} />;
  return <Box size={20} />;
};

const getPuntoName = (loc) => {
  let raw = '';
  if (loc['CAMARA PTZ'] && loc['CAMARA PTZ'] !== '0') raw = loc['CAMARA PTZ'];
  else if (loc['CAMARA MULTISENSOR'] && loc['CAMARA MULTISENSOR'] !== '0') raw = loc['CAMARA MULTISENSOR'];
  else if (loc['ALTAVOZ IP'] && loc['ALTAVOZ IP'] !== '0') raw = loc['ALTAVOZ IP'];
  
  if (raw) {
    return raw.replace(/^(PTZ|MULTI|ALTAVOZ)-/i, '').trim();
  }
  
  return `${loc['DESTINO ESP.']} - Frente ${loc['FRENTE']}`;
};

const SplashScreen = ({ onLogin, onGuest, session }) => {
  const [view, setView] = useState('main'); // main, login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      alert(error.message);
    } else {
      onLogin();
    }
  };

  return (
    <div className="splash-overlay">
      <div className="splash-container">
        <div className="splash-logo">
          <div className="splash-logo-circle">
            <Activity size={40} color="white" />
          </div>
        </div>
        
        {view === 'main' && (
          <>
            <div>
              <h1 className="splash-title">Cusco Seguro</h1>
              <p className="splash-subtitle">Plataforma Operativa de Logística y Cuadrillas</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="splash-btn primary" onClick={() => setView('login')}>
                <ShieldAlert size={18} /> Entrar como Supervisor (Admin)
              </button>
              <button className="splash-btn secondary" onClick={onGuest}>
                Continuar como Invitado
              </button>
            </div>
          </>
        )}

        {view === 'login' && (
          <>
            <div>
              <h1 className="splash-title">Acceso Restringido</h1>
              <p className="splash-subtitle">Inicia sesión como supervisor</p>
            </div>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <input 
                type="email" 
                placeholder="Correo electrónico" 
                className="splash-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Contraseña" 
                className="splash-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="splash-btn primary" disabled={loading}>
                {loading ? 'Verificando...' : 'Ingresar al Dashboard'}
              </button>
            </form>
            <button className="splash-back" onClick={() => setView('main')} style={{ background: 'transparent' }}>
              Volver
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const LocationCard = ({ loc, dayLabel, session, onToggleCompletado }) => {
  const [showLogistica, setShowLogistica] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const ptz = loc['CAMARA PTZ'];
  const multi = loc['CAMARA MULTISENSOR'];
  const altavoz = loc['ALTAVOZ IP'];
  const boton = loc['BOTON DE PANICO'];
  const estado = loc['ESTADO OPERATIVO']?.toUpperCase();

  const visibleMaterials = loc.MaterialesPunto || [];

  const handleToggle = async () => {
    if (!session) return;
    setIsUpdating(true);
    await onToggleCompletado(loc.id, !loc.completado);
    setIsUpdating(false);
  };

  const exportPointPDF = () => {
    if (!visibleMaterials || visibleMaterials.length === 0) {
      alert("No hay materiales en este punto para exportar.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(`Logística del Punto: ${getPuntoName(loc)}`, 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Destino: ${loc['DESTINO ESP.']} | Sector: ${loc.sector}`, 14, 28);
    
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

  const mapLink = loc.Latitud && loc.Longitud ? `https://maps.google.com/maps?q=${loc.Latitud},${loc.Longitud}` : '';
  const waText = encodeURIComponent(`Hola, este es el punto *${getPuntoName(loc)}* (${loc['DESTINO ESP.']}).\n📍 Ubicación: ${mapLink}`);
  const waLink = `https://wa.me/?text=${waText}`;

  return (
    <div className={`location-card ${loc.completado ? 'completed' : ''}`} style={{ opacity: loc.completado ? 0.7 : 1 }}>
      <div className="loc-card-header">
        <div className="loc-destino">
          <span className="destino-lbl">Punto: {getPuntoName(loc)}</span>
          <h4>{loc['DESTINO ESP.']}</h4>
        </div>
        <div className="frente-badge">Frente {loc['FRENTE']}</div>
      </div>
      
      <div className="equipos-container">
        {ptz && ptz !== '0' && <div className="equipo-item ptz"><Camera size={14}/> <span>PTZ</span></div>}
        {multi && multi !== '0' && <div className="equipo-item multi"><Video size={14}/> <span>Multi</span></div>}
        {altavoz && altavoz !== '0' && <div className="equipo-item altavoz"><Volume2 size={14}/> <span>Altavoz</span></div>}
        {boton && boton !== '0' && <div className="equipo-item boton"><ShieldAlert size={14}/> <span>Botón</span></div>}
      </div>

      <div className="tech-specs">
        <div className="spec-item">
          <Layers size={14} />
          <span>{loc['MATERIAL BASE'] || 'N/A'}</span>
        </div>
        <div className="spec-item">
          <Link2 size={14} />
          <span>{loc['METODO DE ANCLAJE'] || 'N/A'}</span>
        </div>
        <div className="spec-item">
          <Wifi size={14} />
          <span>{loc['MEDIO DE COMUNICACION'] || 'N/A'}</span>
        </div>
      </div>

      <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {loc.Latitud && loc.Longitud && (
          <>
            <a 
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="map-nav-btn"
              style={{ background: 'var(--overlay-w-05)', color: 'var(--text-main)', border: '1px solid var(--border-light)' }}
            >
              <Map size={16} />
              Cómo Llegar
            </a>
            <a 
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="map-nav-btn"
              style={{ background: '#25D366', color: '#fff', border: 'none' }}
            >
              <Navigation size={16} />
              WhatsApp
            </a>
          </>
        )}
        
        {session && (
          <button 
            onClick={handleToggle}
            disabled={isUpdating}
            className="map-nav-btn"
            style={{ 
              background: loc.completado ? 'var(--c-ptz)' : 'var(--overlay-w-10)', 
              cursor: 'pointer',
              border: loc.completado ? 'none' : '1px solid var(--border-light)', 
              color: loc.completado ? '#fff' : 'var(--text-main)'
            }}
          >
            {loc.completado ? <CheckSquare size={16} /> : <Square size={16} />}
            {isUpdating ? 'Guardando...' : loc.completado ? 'Completado (Desmarcar)' : 'Marcar Completado'}
          </button>
        )}

        <button 
          onClick={exportPointPDF}
          className="map-nav-btn"
          style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none' }}
        >
          <Download size={16} /> Exportar PDF
        </button>
      </div>

      {visibleMaterials.length > 0 && (
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

      <div className="card-footer">
        <div className="dates-info">
          <div className="date-item">
            <CalendarDays size={12}/>
            <span><strong>Día Programado:</strong> {dayLabel || '-'}</span>
          </div>
        </div>
        <div className={`status-indicator ${estado === 'ACTIVO' ? 'active' : 'inactive'}`}>
          {estado || 'N/A'}
        </div>
      </div>
    </div>
  );
};

const SectorGlobalLogistics = ({ materiales, sectorName }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!materiales || materiales.length === 0) return null;

  const exportSectorPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`Logística Global del Sector: ${sectorName}`, 14, 20);
    
    const tableColumn = ["Ítem", "Cantidad"];
    const tableRows = materiales.map(m => [m.Item, m.Cantidad]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, cellPadding: 3 },
      styles: { fontSize: 8, cellPadding: 3, minCellHeight: 4 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { top: 10, bottom: 10, left: 14, right: 14 }
    });
    
    doc.save(`Logistica_Global_${sectorName.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="section-block loc-materials-container" style={{ marginTop: 0, marginBottom: '1.5rem', background: 'rgba(255, 255, 255, 0.02)' }}>
      <div 
        className={`loc-materials-toggle ${expanded ? 'open' : ''}`} 
        onClick={() => setExpanded(!expanded)}
        style={{ color: 'var(--text-main)' }}
      >
        <span><Package size={16} color="var(--secondary)" /> Logística Global del Sector</span>
        <ChevronDown size={18} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0)' }} />
      </div>
      
      {expanded && (
        <div style={{ padding: '1rem' }}>
          <button 
            onClick={exportSectorPDF}
            className="map-nav-btn"
            style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', color: '#fff', border: 'none', marginBottom: '1rem', width: 'fit-content' }}
          >
            <Download size={16} /> Exportar PDF Global
          </button>
          <div className="materials-grid" style={{ marginBottom: 0 }}>
            {materiales.map((mat, idx) => (
              <div key={idx} className="material-card">
                <div className="mat-icon-wrapper">
                  {getMaterialIcon(mat.Item)}
                </div>
                <div className="mat-info">
                  <span className="mat-qty">{mat.Cantidad}</span>
                  <span className="mat-name">{mat.Item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDashboard = ({ data }) => {
  if (!data) return null;

  const rankings = [];
  let totalCompletados = 0;
  let totalAsignados = 0;

  let ptzCompletadas = 0;
  let multiCompletadas = 0;
  let altavocesCompletados = 0;

  Object.keys(data).forEach(cuadrilla => {
    let completados = 0;
    let asignados = 0;
    Object.keys(data[cuadrilla]).forEach(sector => {
       const inst = data[cuadrilla][sector].Instalaciones || [];
       asignados += inst.length;
       inst.forEach(i => {
         if (i.completado) {
           completados++;
           if (i['CAMARA PTZ'] && i['CAMARA PTZ'] !== '0') ptzCompletadas++;
           if (i['CAMARA MULTISENSOR'] && i['CAMARA MULTISENSOR'] !== '0') multiCompletadas++;
           if (i['ALTAVOZ IP'] && i['ALTAVOZ IP'] !== '0') altavocesCompletados++;
         }
       });
    });
    totalCompletados += completados;
    totalAsignados += asignados;
    rankings.push({ 
      cuadrilla: cuadrilla.replace('CUADRILLA-', 'C-'), 
      completados, 
      asignados,
      progreso: asignados > 0 ? ((completados / asignados) * 100).toFixed(1) : 0
    });
  });

  rankings.sort((a,b) => b.completados - a.completados);

  return (
    <div className="main-scroll-area">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <BarChart2 size={24} color="var(--primary)" /> Panel de Métricas
        </h2>
        <p style={{ color: 'var(--text-muted)' }}>Vista global de avances por cuadrilla y estado del proyecto.</p>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '1rem' }}>
        <div className="kpi-card" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1))', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
          <div className="kpi-icon" style={{color: 'var(--primary)'}}><Award size={32}/></div>
          <div className="kpi-info">
            <span className="kpi-val" style={{ fontSize: '2rem' }}>{totalCompletados}</span>
            <span className="kpi-lbl">Puntos Completados Global</span>
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
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '2rem' }}>
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
      </div>

      <h3 style={{ marginBottom: '1rem', color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.9rem' }}>Ranking de Cuadrillas</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {rankings.map((r, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--text-muted)' }}>
              #{i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{r.cuadrilla}</span>
                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.completados} / {r.asignados} pts</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--overlay-w-10)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.progreso}%`, background: 'var(--primary)', transition: 'width 1s ease-out' }}></div>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>
              {r.progreso}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const App = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [viewMode, setViewMode] = useState('operative'); // operative, metrics

  const [activeCuadrilla, setActiveCuadrilla] = useState('');
  const [expandedSector, setExpandedSector] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const [filterSector, setFilterSector] = useState('ALL');
  const [filterEquipo, setFilterEquipo] = useState('ALL');
  const [filterFecha, setFilterFecha] = useState('ALL');
  const [filterPunto, setFilterPunto] = useState('ALL');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setHasEntered(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) setHasEntered(true);
    });

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: puntos, error: pErr } = await supabase.from('puntos_instalacion').select('*').order('id', { ascending: true });
      const { data: materiales, error: mErr } = await supabase.from('materiales_punto').select('*');
      
      if (pErr || mErr) {
        console.error("Error fetching data:", pErr, mErr);
        setLoading(false);
        return;
      }

      const newData = {};
      puntos.forEach(p => {
        if (!newData[p.cuadrilla]) newData[p.cuadrilla] = {};
        if (!newData[p.cuadrilla][p.sector]) newData[p.cuadrilla][p.sector] = { Instalaciones: [], Materiales: [] };
        
        const mats = materiales.filter(m => m.punto_id === p.id).map(m => ({ Item: m.item, Cantidad: m.cantidad }));
        
        newData[p.cuadrilla][p.sector].Instalaciones.push({
          id: p.id,
          sector: p.sector,
          'DESTINO ESP.': p.destino_esp,
          'FRENTE': p.frente,
          'CAMARA PTZ': p.camara_ptz,
          'CAMARA MULTISENSOR': p.camara_multisensor,
          'ALTAVOZ IP': p.altavoz_ip,
          'BOTON DE PANICO': p.boton_panico,
          'MATERIAL BASE': p.material_base,
          'METODO DE ANCLAJE': p.metodo_anclaje,
          'MEDIO DE COMUNICACION': p.medio_comunicacion,
          'ESTADO OPERATIVO': p.estado_operativo,
          Latitud: p.latitud,
          Longitud: p.longitud,
          'FECHAS DE INSTALACION CAMARAS PTZ Y MULTISENSOR , MEGAFONOS IP , BOTON DE PANICO': p.dia_programado,
          completado: p.completado,
          MaterialesPunto: mats
        });
      });
      
      setData(newData);
      const cuadrillas = Object.keys(newData).sort();
      if (cuadrillas.length > 0) setActiveCuadrilla(cuadrillas[0]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleToggleCompletado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('puntos_instalacion').update({ completado: nuevoEstado }).eq('id', id);
    if (!error) {
      fetchData();
    } else {
      alert("Error al actualizar: " + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setHasEntered(false);
    setViewMode('operative');
  };

  const currentData = data && activeCuadrilla ? data[activeCuadrilla] : {};
  const allSectors = currentData ? Object.keys(currentData).sort() : [];
  const cuadrillas = data ? Object.keys(data).sort() : [];

  const dateToDayIndex = useMemo(() => {
    if (!data) return {};
    const dates = new Set();
    Object.values(data).forEach(cuadrillaData => {
      Object.values(cuadrillaData).forEach(sectorData => {
        (sectorData.Instalaciones || []).forEach(loc => {
          const d = loc['FECHAS DE INSTALACION CAMARAS PTZ Y MULTISENSOR , MEGAFONOS IP , BOTON DE PANICO']?.split(' ')[0];
          if (d && d !== '-' && d !== '') dates.add(d);
        });
      });
    });
    const sortedDates = Array.from(dates).sort();
    return Object.fromEntries(sortedDates.map((d, i) => [d, `Día ${i + 1}`]));
  }, [data]);

  const { 
    filteredSectors, 
    stats, 
    availableSectors, 
    availablePuntos, 
    availableEquipos, 
    availableFechas 
  } = useMemo(() => {
    if (!data || !currentData) return { filteredSectors: {}, stats: {}, availableSectors: [], availablePuntos: [], availableEquipos: [], availableFechas: [] };

    let statLocs = 0;
    let statPtz = 0;
    let statMulti = 0;
    let statAltavoz = 0;
    let statBoton = 0;

    const filtered = {};
    const aSectors = new Set();
    const aPuntos = new Set();
    const aEquipos = new Set();
    const aFechas = new Set();

    const isGuest = !session;

    allSectors.forEach(sector => {
      const sectorData = currentData[sector];
      const instalaciones = sectorData.Instalaciones || [];
      const materiales = sectorData.Materiales || [];

      const sectorPasses = filterSector === 'ALL' || filterSector === sector;

      const filteredInst = instalaciones.filter(loc => {
        // FILTRO PRINCIPAL: Si es invitado y el punto está completado, ocultarlo.
        if (isGuest && loc.completado) return false;

        const ptz = loc['CAMARA PTZ'] && loc['CAMARA PTZ'] !== '0';
        const multi = loc['CAMARA MULTISENSOR'] && loc['CAMARA MULTISENSOR'] !== '0';
        const altavoz = loc['ALTAVOZ IP'] && loc['ALTAVOZ IP'] !== '0';
        const btn = loc['BOTON DE PANICO'] && loc['BOTON DE PANICO'] !== '0';
        const punto = getPuntoName(loc);
        const dateEqRaw = loc['FECHAS DE INSTALACION CAMARAS PTZ Y MULTISENSOR , MEGAFONOS IP , BOTON DE PANICO']?.split(' ')[0];
        const dateEq = dateEqRaw && dateEqRaw !== '-' ? dateToDayIndex[dateEqRaw] : null;

        const hasValidDate = dateEq !== null && dateEq !== undefined;
        const fechaPasses = hasValidDate && (filterFecha === 'ALL' || dateEq === filterFecha);

        const equipoPasses = filterEquipo === 'ALL' || 
          (filterEquipo === 'PTZ' && ptz) || 
          (filterEquipo === 'MULTI' && multi) || 
          (filterEquipo === 'ALTAVOZ' && altavoz);
          
        const puntoPasses = filterPunto === 'ALL' || punto === filterPunto;

        if (equipoPasses && fechaPasses && puntoPasses) aSectors.add(sector);
        if (sectorPasses && fechaPasses && equipoPasses) aPuntos.add(punto);
        if (sectorPasses && puntoPasses && fechaPasses) {
            if (ptz) aEquipos.add('PTZ');
            if (multi) aEquipos.add('MULTI');
            if (altavoz) aEquipos.add('ALTAVOZ');
        }
        if (sectorPasses && equipoPasses && puntoPasses) {
            if (dateEq) aFechas.add(dateEq);
        }

        if (!sectorPasses || !equipoPasses || !fechaPasses || !puntoPasses) return false;
        return true;
      });

      filteredInst.forEach(loc => {
        statLocs++;
        if (loc['CAMARA PTZ'] && loc['CAMARA PTZ'] !== '0') statPtz++;
        if (loc['CAMARA MULTISENSOR'] && loc['CAMARA MULTISENSOR'] !== '0') statMulti++;
        if (loc['ALTAVOZ IP'] && loc['ALTAVOZ IP'] !== '0') statAltavoz++;
        if (loc['BOTON DE PANICO'] && loc['BOTON DE PANICO'] !== '0') statBoton++;
      });

      const hideMats = (filterEquipo !== 'ALL' || filterFecha !== 'ALL' || filterPunto !== 'ALL');
      const hasInst = filteredInst.length > 0;
      const hasMats = !hideMats && sectorPasses && materiales.length > 0;

      if (hasInst || hasMats) {
        filtered[sector] = {
          Instalaciones: filteredInst,
          Materiales: hasMats ? materiales : []
        };
      }
    });

    return { 
      filteredSectors: filtered, 
      stats: { statLocs, statPtz, statMulti, statAltavoz, statBoton },
      availableSectors: Array.from(aSectors).sort(),
      availablePuntos: Array.from(aPuntos).sort(),
      availableEquipos: Array.from(aEquipos).sort(),
      availableFechas: Array.from(aFechas).sort((a, b) => {
        const numA = parseInt(a.replace('Día ', ''));
        const numB = parseInt(b.replace('Día ', ''));
        return numA - numB;
      })
    };
  }, [data, activeCuadrilla, filterSector, filterEquipo, filterFecha, filterPunto, currentData, allSectors, dateToDayIndex, session]);

  const displaySectors = Object.keys(filteredSectors).sort();

  useEffect(() => { if (filterSector !== 'ALL' && !availableSectors.includes(filterSector)) setFilterSector('ALL'); }, [availableSectors, filterSector]);
  useEffect(() => { if (filterPunto !== 'ALL' && !availablePuntos.includes(filterPunto)) setFilterPunto('ALL'); }, [availablePuntos, filterPunto]);
  useEffect(() => { if (filterEquipo !== 'ALL' && !availableEquipos.includes(filterEquipo)) setFilterEquipo('ALL'); }, [availableEquipos, filterEquipo]);
  useEffect(() => { if (filterFecha !== 'ALL' && !availableFechas.includes(filterFecha)) setFilterFecha('ALL'); }, [availableFechas, filterFecha]);

  useEffect(() => {
    setFilterSector('ALL');
    setFilterEquipo('ALL');
    setFilterFecha('ALL');
    setFilterPunto('ALL');
    setExpandedSector(displaySectors.length > 0 ? displaySectors[0] : null);
  }, [activeCuadrilla]); // eslint-disable-line

  const toggleSector = (sector) => {
    setExpandedSector(expandedSector === sector ? null : sector);
  };

  if (loading && !data) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando datos desde Supabase...</div>;
  }

  return (
    <>
      {!hasEntered && (
        <SplashScreen 
          onLogin={() => setHasEntered(true)} 
          onGuest={() => setHasEntered(true)} 
          session={session} 
        />
      )}

      <div className="app-layout">
        {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

        <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <div className="header-brand">
              <Activity size={28} color="var(--primary)" />
              <div>
                <h2>Dashboard</h2>
                <p className="subtitle">{session ? 'Supervisor' : 'Operativo'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button 
                onClick={toggleTheme} 
                style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex' }}
                title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="sidebar-scroll">
            {session && (
              <div className="sidebar-section" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
                <h3 className="sidebar-title"><BarChart2 size={16} /> Vistas Administrativas</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button 
                    onClick={() => { setViewMode('operative'); setIsSidebarOpen(false); }}
                    className={`cuadrilla-nav-btn ${viewMode === 'operative' ? 'active' : ''}`}
                  >
                    <Map size={16} /> Mapa Operativo
                  </button>
                  <button 
                    onClick={() => { setViewMode('metrics'); setIsSidebarOpen(false); }}
                    className={`cuadrilla-nav-btn ${viewMode === 'metrics' ? 'active' : ''}`}
                  >
                    <BarChart2 size={16} /> Métricas / Avances
                  </button>
                </div>
              </div>
            )}

            {viewMode === 'operative' && (
              <>
                <div className="sidebar-section">
                  <h3 className="sidebar-title"><HardHat size={16} /> Cuadrilla Activa</h3>
                  <div className="cuadrilla-nav">
                    {cuadrillas.map(c => (
                      <button 
                        key={c}
                        className={`cuadrilla-nav-btn ${activeCuadrilla === c ? 'active' : ''}`}
                        onClick={() => { setActiveCuadrilla(c); setIsSidebarOpen(false); }}
                      >
                        <span className="c-name">{c.replace('CUADRILLA-', 'C-')}</span>
                        {activeCuadrilla === c && <div className="active-dot"></div>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sidebar-section">
                  <h3 className="sidebar-title"><Filter size={16} /> Filtros de Búsqueda</h3>
                  <div className="filter-controls-vertical">
                    <div className="filter-group">
                      <label>Sector</label>
                      <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)}>
                        <option value="ALL">Todos los Sectores</option>
                        {availableSectors.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Punto Específico</label>
                      <select value={filterPunto} onChange={(e) => setFilterPunto(e.target.value)}>
                        <option value="ALL">Todos los Puntos</option>
                        {availablePuntos.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Equipo Principal</label>
                      <select value={filterEquipo} onChange={(e) => setFilterEquipo(e.target.value)}>
                        <option value="ALL">Cualquier Equipo</option>
                        {availableEquipos.includes('PTZ') && <option value="PTZ">Cámara PTZ</option>}
                        {availableEquipos.includes('MULTI') && <option value="MULTI">Cámara Multisensor</option>}
                        {availableEquipos.includes('ALTAVOZ') && <option value="ALTAVOZ">Altavoz IP</option>}
                      </select>
                    </div>
                    <div className="filter-group">
                      <label>Día de Instalación</label>
                      <select value={filterFecha} onChange={(e) => setFilterFecha(e.target.value)}>
                        <option value="ALL">Cualquier Día</option>
                        {availableFechas.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <button className="reset-btn-full" onClick={() => {
                      setFilterSector('ALL');
                      setFilterEquipo('ALL');
                      setFilterFecha('ALL');
                      setFilterPunto('ALL');
                    }}>Limpiar Filtros</button>
                  </div>
                </div>
              </>
            )}
            
            {session && (
              <div className="sidebar-section" style={{ borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Sesión: {session.user.email}</span>
                  <button onClick={handleLogout} className="reset-btn-full" style={{ background: 'var(--error)', borderColor: 'var(--error)' }}>
                    <LogOut size={16} /> Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="main-content">
          <header className="mobile-header">
            <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="mobile-header-title">
              <Activity size={20} color="var(--primary)" />
              <h2>Dashboard {session && viewMode === 'metrics' ? 'Métricas' : ''}</h2>
            </div>
            {session && (
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--error)', padding: '0.5rem' }}>
                <LogOut size={20} />
              </button>
            )}
            <button 
              onClick={toggleTheme} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                padding: '0.25rem',
                cursor: 'pointer',
                display: 'flex',
                marginLeft: 'auto',
                marginRight: '1rem'
              }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            {viewMode === 'operative' && (
              <div className="mobile-cuadrilla-badge">
                {activeCuadrilla.replace('CUADRILLA-', 'C-')}
              </div>
            )}
          </header>

          {viewMode === 'metrics' ? (
            <AdminDashboard data={data} />
          ) : (
            <div className="main-scroll-area">
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon" style={{color: 'var(--primary)'}}><MapPin size={24}/></div>
                  <div className="kpi-info">
                    <span className="kpi-val">{stats.statLocs}</span>
                    <span className="kpi-lbl">Ubicaciones</span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon" style={{color: 'var(--c-ptz)'}}><Camera size={24}/></div>
                  <div className="kpi-info">
                    <span className="kpi-val">{stats.statPtz}</span>
                    <span className="kpi-lbl">Total PTZ</span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon" style={{color: 'var(--c-multi)'}}><Video size={24}/></div>
                  <div className="kpi-info">
                    <span className="kpi-val">{stats.statMulti}</span>
                    <span className="kpi-lbl">Multisensor</span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon" style={{color: 'var(--c-altavoz)'}}><Volume2 size={24}/></div>
                  <div className="kpi-info">
                    <span className="kpi-val">{stats.statAltavoz}</span>
                    <span className="kpi-lbl">Altavoces</span>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon" style={{color: 'var(--c-boton)'}}><ShieldAlert size={24}/></div>
                  <div className="kpi-info">
                    <span className="kpi-val">{stats.statBoton}</span>
                    <span className="kpi-lbl">Botones</span>
                  </div>
                </div>
              </div>

              <div className="sectors-container">
                {displaySectors.map(sector => {
                  const sectorData = filteredSectors[sector];
                  const instalaciones = sectorData.Instalaciones || [];
                  const materiales = sectorData.Materiales || [];
                  const isExpanded = expandedSector === sector;
                  
                  return (
                    <div key={sector} className={`sector-accordion ${isExpanded ? 'expanded' : ''}`}>
                      <div className="sector-header" onClick={() => toggleSector(sector)}>
                        <div className="sector-title">
                          <Target className="sector-icon" size={20} />
                          <h2>{sector}</h2>
                          {instalaciones.length > 0 && <span className="count-badge">{instalaciones.length} Loc.</span>}
                        </div>
                        <div className="chevron-icon">
                          <ChevronDown size={24} />
                        </div>
                      </div>
                      
                      <div className="sector-body">
                        <SectorGlobalLogistics materiales={materiales} sectorName={sector} />

                        {instalaciones.length > 0 && (
                          <div className="section-block">
                            <h3 className="section-title"><MapPin size={18} /> Frentes Filtrados</h3>
                            <div className="locations-grid">
                              {instalaciones.map((loc, idx) => {
                                const dRaw = loc['FECHAS DE INSTALACION CAMARAS PTZ Y MULTISENSOR , MEGAFONOS IP , BOTON DE PANICO']?.split(' ')[0];
                                const dayLabel = dRaw && dRaw !== '-' ? dateToDayIndex[dRaw] : null;
                                return <LocationCard key={idx} loc={loc} dayLabel={dayLabel} session={session} onToggleCompletado={handleToggleCompletado} />;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {displaySectors.length === 0 && (
                  <div className="empty-state">
                    <Filter size={48} opacity={0.2} />
                    <p>{!session ? 'Todos los puntos han sido completados o no hay resultados para estos filtros.' : 'No se encontraron resultados para los filtros seleccionados.'}</p>
                    <button className="reset-btn" onClick={() => {
                      setFilterSector('ALL');
                      setFilterEquipo('ALL');
                      setFilterFecha('ALL');
                      setFilterPunto('ALL');
                    }}>Limpiar Filtros</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default App;
