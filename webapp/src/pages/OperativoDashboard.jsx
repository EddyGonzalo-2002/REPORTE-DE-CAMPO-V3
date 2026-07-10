import React, { useState, useMemo } from 'react';
import { Search, Filter, HardHat, Target, MapPin, Camera, Video, Volume2, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { LocationCard } from '../components/LocationCard';
import { SectorGlobalLogistics } from '../components/SectorGlobalLogistics';

export const OperativoDashboard = ({ data, session, onUpdatePunto, cuadrillasMap, filters }) => {
  const {
    activeCuadrilla, filterSector, filterEquipo, filterFecha, filterPunto, globalSearchQuery, setActiveCuadrilla
  } = filters;

  const [expandedSector, setExpandedSector] = useState(null);

  const puntosList = Object.values(data);
  const cuadrillas = Array.from(new Set(puntosList.map(p => p.cuadrilla).filter(Boolean)));
  
  React.useEffect(() => {
    if (!activeCuadrilla && cuadrillas.length > 0 && setActiveCuadrilla) {
      setActiveCuadrilla(cuadrillas[0]);
    }
  }, [activeCuadrilla, cuadrillas, setActiveCuadrilla]);

  // 1. Buscador Global
  const isGlobalSearchActive = globalSearchQuery.length > 2;
  const globalSearchResults = useMemo(() => {
    if (!isGlobalSearchActive) return [];
    const q = globalSearchQuery.toLowerCase();
    return puntosList.filter(loc => {
      const ptz = (loc.camara_ptz || '').toLowerCase();
      const multi = (loc.camara_multisensor || '').toLowerCase();
      const alta = (loc.altavoz_ip || '').toLowerCase();
      const dest = (loc.destino_esp || '').toLowerCase();
      const sec = (loc.sector || '').toLowerCase();
      return ptz.includes(q) || multi.includes(q) || alta.includes(q) || dest.includes(q) || sec.includes(q);
    });
  }, [globalSearchQuery, puntosList, isGlobalSearchActive]);

  // 2. Filtros de Cuadrilla Activa
  const puntosDeCuadrilla = useMemo(() => {
    return puntosList.filter(loc => loc.cuadrilla === activeCuadrilla);
  }, [puntosList, activeCuadrilla]);

  // Extraer opciones de filtros
  const availableSectors = Array.from(new Set(puntosDeCuadrilla.map(p => p.sector).filter(Boolean)));
  const availableFechas = Array.from(new Set(puntosDeCuadrilla.map(p => p.dia_programado).filter(Boolean)));
  const availablePuntos = Array.from(new Set(puntosDeCuadrilla.map(p => {
    if (p.camara_ptz && p.camara_ptz !== '0') return 'PTZ';
    if (p.camara_multisensor && p.camara_multisensor !== '0') return 'MULTI';
    if (p.altavoz_ip && p.altavoz_ip !== '0') return 'ALTAVOZ';
    return null;
  }).filter(Boolean)));

  // 3. Aplicar Filtros Secundarios
  const filteredPoints = useMemo(() => {
    return puntosDeCuadrilla.filter(loc => {
      if (filterSector !== 'ALL' && loc.sector !== filterSector) return false;
      if (filterFecha !== 'ALL' && loc.dia_programado !== filterFecha) return false;
      if (filterPunto !== 'ALL') {
        if (filterPunto === 'PTZ' && (!loc.camara_ptz || loc.camara_ptz === '0')) return false;
        if (filterPunto === 'MULTI' && (!loc.camara_multisensor || loc.camara_multisensor === '0')) return false;
        if (filterPunto === 'ALTAVOZ' && (!loc.altavoz_ip || loc.altavoz_ip === '0')) return false;
      }
      
      // Guest restriction: only show pending points
      if (!session && (loc.completado || loc.observado)) {
        return false;
      }

      // Admin filter
      if (session && filterEquipo !== 'ALL') {
        if (filterEquipo === 'COMPLETADOS' && !loc.completado) return false;
        if (filterEquipo === 'OBSERVADOS' && !loc.observado) return false;
        if (filterEquipo === 'PENDIENTES' && (loc.completado || loc.observado)) return false;
      }
      return true;
    });
  }, [puntosDeCuadrilla, filterSector, filterFecha, filterPunto, filterEquipo]);

  // Agrupar por sector
  const sectorsData = useMemo(() => {
    const grouped = {};
    filteredPoints.forEach(loc => {
      const s = loc.sector || 'Sin Sector';
      if (!grouped[s]) grouped[s] = { Instalaciones: [], Materiales: [] };
      grouped[s].Instalaciones.push(loc);
      
      if (loc.MaterialesPunto) {
        loc.MaterialesPunto.forEach(m => {
          const ex = grouped[s].Materiales.find(x => x.Item === m.Item);
          if (ex) ex.Cantidad += Number(m.Cantidad) || 0;
          else grouped[s].Materiales.push({ Item: m.Item, Cantidad: Number(m.Cantidad) || 0 });
        });
      }
    });
    return grouped;
  }, [filteredPoints]);

  const toggleSector = (sector) => {
    setExpandedSector(prev => prev === sector ? null : sector);
  };

  // KPIs
  const stats = useMemo(() => {
    return {
      statLocs: filteredPoints.length,
      statPtz: filteredPoints.filter(p => p.camara_ptz && p.camara_ptz !== '0').length,
      statMulti: filteredPoints.filter(p => p.camara_multisensor && p.camara_multisensor !== '0').length,
      statAltavoz: filteredPoints.filter(p => p.altavoz_ip && p.altavoz_ip !== '0').length,
      statBoton: filteredPoints.filter(p => p.boton_panico && p.boton_panico !== '0').length
    };
  }, [filteredPoints]);

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Main Content */}
      <div className="main-content" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        {isGlobalSearchActive ? (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Search size={24} color="var(--primary)" /> Resultados de Búsqueda Global
            </h2>
            <div className="locations-grid">
              {globalSearchResults.map(loc => (
                <LocationCard key={loc.id} loc={loc} session={session} onUpdatePunto={onUpdatePunto} cuadrillaGlobal={cuadrillasMap[loc.cuadrilla]?.display_name} />
              ))}
            </div>
            {globalSearchResults.length === 0 && <p>No se encontraron resultados.</p>}
          </div>
        ) : (
          <div>
            {/* KPIs */}
            <div className="kpi-grid" style={{ marginBottom: '2rem' }}>
              <div className="kpi-card">
                <div className="kpi-icon" style={{color: 'var(--primary)'}}><MapPin size={24}/></div>
                <div className="kpi-info"><span className="kpi-val">{stats.statLocs}</span><span className="kpi-lbl">Ubicaciones</span></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{color: 'var(--c-ptz)'}}><Camera size={24}/></div>
                <div className="kpi-info"><span className="kpi-val">{stats.statPtz}</span><span className="kpi-lbl">Total PTZ</span></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{color: 'var(--c-multi)'}}><Video size={24}/></div>
                <div className="kpi-info"><span className="kpi-val">{stats.statMulti}</span><span className="kpi-lbl">Multisensor</span></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{color: 'var(--c-altavoz)'}}><Volume2 size={24}/></div>
                <div className="kpi-info"><span className="kpi-val">{stats.statAltavoz}</span><span className="kpi-lbl">Altavoces</span></div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon" style={{color: 'var(--c-boton)'}}><ShieldAlert size={24}/></div>
                <div className="kpi-info"><span className="kpi-val">{stats.statBoton}</span><span className="kpi-lbl">Botones</span></div>
              </div>
            </div>

            {/* Accordions */}
            <div className="sectors-container">
              {Object.keys(sectorsData).map(sector => {
                const isExpanded = expandedSector === sector;
                const instalaciones = sectorsData[sector].Instalaciones;
                const materiales = sectorsData[sector].Materiales;
                
                return (
                  <div key={sector} className={`sector-accordion ${isExpanded ? 'expanded' : ''}`}>
                    <div className="sector-header" onClick={() => toggleSector(sector)}>
                      <div className="sector-title">
                        <Target className="sector-icon" size={20} />
                        <h2>{sector}</h2>
                        {instalaciones.length > 0 && <span className="count-badge">{instalaciones.length} Loc.</span>}
                      </div>
                      <div className="chevron-icon">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="sector-body">
                        <SectorGlobalLogistics materiales={materiales} sectorName={sector} />
                        <div className="locations-grid">
                          {instalaciones.map(loc => (
                            <LocationCard key={loc.id} loc={loc} session={session} onUpdatePunto={onUpdatePunto} cuadrillaGlobal={cuadrillasMap[loc.cuadrilla]?.display_name} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
