import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronDown, MapPin, Package, CalendarDays, Camera, 
  Video, Volume2, ShieldAlert, Wifi, Link2, Layers, 
  HardHat, Box, Cable, Zap, Server, Filter, Activity,
  Target, Menu, X, Navigation, Sun, Moon
} from 'lucide-react';
import data from './data.json';

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

const LocationCard = ({ loc, dayLabel }) => {
  const [showLogistica, setShowLogistica] = useState(false);
  
  const ptz = loc['CAMARA PTZ'];
  const multi = loc['CAMARA MULTISENSOR'];
  const altavoz = loc['ALTAVOZ IP'];
  const boton = loc['BOTON DE PANICO'];
  const estado = loc['ESTADO OPERATIVO']?.toUpperCase();

  const visibleMaterials = loc.MaterialesPunto || [];

  return (
    <div className="location-card">
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

      {loc.Latitud && loc.Longitud && (
        <div style={{ padding: '0 1rem 1rem 1rem' }}>
          <a 
            href={`https://maps.google.com/maps?daddr=${loc.Latitud},${loc.Longitud}+(${encodeURIComponent('Punto ' + getPuntoName(loc) + ' - ' + (loc['DESTINO ESP.'] || ''))})`}
            target="_blank"
            rel="noopener noreferrer"
            className="map-nav-btn"
          >
            <Navigation size={16} />
            Cómo llegar
          </a>
        </div>
      )}

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

const SectorGlobalLogistics = ({ materiales }) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!materiales || materiales.length === 0) return null;

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

const App = () => {
  const [activeCuadrilla, setActiveCuadrilla] = useState('CUADRILLA-03-L');
  const [expandedSector, setExpandedSector] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  // Filters state
  const [filterSector, setFilterSector] = useState('ALL');
  const [filterEquipo, setFilterEquipo] = useState('ALL');
  const [filterFecha, setFilterFecha] = useState('ALL');
  const [filterPunto, setFilterPunto] = useState('ALL');

  const cuadrillas = Object.keys(data);
  const currentData = data[activeCuadrilla];
  const allSectors = Object.keys(currentData).sort();

  // Compute global dates mapping to "Día 1, Día 2..."
  const dateToDayIndex = useMemo(() => {
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
  }, []);

  // Compute filtered data, KPI stats, and dynamic available options for faceted search
  const { 
    filteredSectors, 
    stats, 
    availableSectors, 
    availablePuntos, 
    availableEquipos, 
    availableFechas 
  } = useMemo(() => {
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

    allSectors.forEach(sector => {
      const sectorData = currentData[sector];
      const instalaciones = sectorData.Instalaciones || [];
      const materiales = sectorData.Materiales || [];

      const sectorPasses = filterSector === 'ALL' || filterSector === sector;

      const filteredInst = instalaciones.filter(loc => {
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

        // Populate available options based on OTHER active filters (Faceted Search Logic)
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
      // Sort days by their numeric value instead of alphabetically
      availableFechas: Array.from(aFechas).sort((a, b) => {
        const numA = parseInt(a.replace('Día ', ''));
        const numB = parseInt(b.replace('Día ', ''));
        return numA - numB;
      })
    };
  }, [activeCuadrilla, filterSector, filterEquipo, filterFecha, filterPunto, currentData, allSectors, dateToDayIndex]);

  const displaySectors = Object.keys(filteredSectors).sort();

  // Reset filter selections if they are no longer valid options
  useEffect(() => { if (filterSector !== 'ALL' && !availableSectors.includes(filterSector)) setFilterSector('ALL'); }, [availableSectors, filterSector]);
  useEffect(() => { if (filterPunto !== 'ALL' && !availablePuntos.includes(filterPunto)) setFilterPunto('ALL'); }, [availablePuntos, filterPunto]);
  useEffect(() => { if (filterEquipo !== 'ALL' && !availableEquipos.includes(filterEquipo)) setFilterEquipo('ALL'); }, [availableEquipos, filterEquipo]);
  useEffect(() => { if (filterFecha !== 'ALL' && !availableFechas.includes(filterFecha)) setFilterFecha('ALL'); }, [availableFechas, filterFecha]);

  // Reset all filters when changing Cuadrilla
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

  return (
    <div className="app-layout">
      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="header-brand">
            <Activity size={28} color="var(--primary)" />
            <div>
              <h2>Dashboard</h2>
              <p className="subtitle">Operativo</p>
            </div>
          </div>
          <button className="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="sidebar-section" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>Apariencia</span>
              <button 
                onClick={toggleTheme} 
                style={{
                  background: 'var(--overlay-w-05)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-main)',
                  padding: '0.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                </span>
              </button>
            </div>
          </div>

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
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="mobile-header">
          <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <div className="mobile-header-title">
            <Activity size={20} color="var(--primary)" />
            <h2>Dashboard</h2>
          </div>
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
          <div className="mobile-cuadrilla-badge">
            {activeCuadrilla.replace('CUADRILLA-', 'C-')}
          </div>
        </header>

        <div className="main-scroll-area">
          {/* KPI Stats Grid */}
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

          {/* Sectors List */}
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
                    <SectorGlobalLogistics materiales={materiales} />

                    {instalaciones.length > 0 && (
                      <div className="section-block">
                        <h3 className="section-title"><MapPin size={18} /> Frentes Filtrados</h3>
                        <div className="locations-grid">
                          {instalaciones.map((loc, idx) => {
                            const dRaw = loc['FECHAS DE INSTALACION CAMARAS PTZ Y MULTISENSOR , MEGAFONOS IP , BOTON DE PANICO']?.split(' ')[0];
                            const dayLabel = dRaw && dRaw !== '-' ? dateToDayIndex[dRaw] : null;
                            return <LocationCard key={idx} loc={loc} dayLabel={dayLabel} />;
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
                <p>No se encontraron resultados para los filtros seleccionados.</p>
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
      </main>
    </div>
  );
};

export default App;
