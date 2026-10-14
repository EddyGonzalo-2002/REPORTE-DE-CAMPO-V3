import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { point, featureCollection, convex, clustersKmeans, buffer, lineString } from '@turf/turf';
import { Eye, EyeOff, Activity, BrainCircuit, Search, ChevronDown, Wrench } from 'lucide-react';
import { LocationCard } from '../components/LocationCard';
import { getPuntoName } from '../utils/helpers';
import { SectorGlobalLogistics } from '../components/SectorGlobalLogistics';
import { MapEventsHandler } from '../components/MapEventsHandler';

// Agrupamiento espacial por bisección recursiva para evitar traslapes (chaining) y forzar tamaño
function recursiveBisection(points, maxCapacity) {
  const features = [];
  let clusterIdCounter = 0;

  function split(pts) {
    if (pts.length <= maxCapacity) {
      pts.forEach(p => {
        features.push({
          type: 'Feature',
          properties: { cluster: clusterIdCounter },
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] }
        });
      });
      clusterIdCounter++;
      return;
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    pts.forEach(p => {
      if (p.lng < minX) minX = p.lng;
      if (p.lng > maxX) maxX = p.lng;
      if (p.lat < minY) minY = p.lat;
      if (p.lat > maxY) maxY = p.lat;
    });

    const dx = maxX - minX;
    const dy = maxY - minY;

    if (dx > dy) {
      pts.sort((a, b) => a.lng - b.lng);
    } else {
      pts.sort((a, b) => a.lat - b.lat);
    }

    const numClusters = Math.ceil(pts.length / maxCapacity);
    const leftClusters = Math.floor(numClusters / 2);
    let splitIdx = leftClusters * maxCapacity;
    
    if (splitIdx <= 0) splitIdx = 1;
    if (splitIdx >= pts.length) splitIdx = pts.length - 1;

    split(pts.slice(0, splitIdx));
    split(pts.slice(splitIdx));
  }

  split(points);
  return { features };
}

export const AdminMapDashboard = ({ data, onUpdatePunto, fetchData, cuadrillasMap, sectoresList, sectoresMap, appMode = 'INSTALACION', cuadrillasList = [] }) => {
  const [showPolygons, setShowPolygons] = useState(true);
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('ALL');
  const [showSectorDropdown, setShowSectorDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clusteringMode, setClusteringMode] = useState(false);
  const [clusterConfigType, setClusterConfigType] = useState('pts_per_cluster');
  const [numClusters, setNumClusters] = useState(5);
  const [ptsPerCluster, setPtsPerCluster] = useState(10);
  
  // Filtros de Mantenimiento
  const [maintenanceFilter, setMaintenanceFilter] = useState('ALL'); // 'ALL' | 'CON_MANTENIMIENTO' | 'SIN_MANTENIMIENTO'
  const [selectedCuadrillaMantFilter, setSelectedCuadrillaMantFilter] = useState('ALL');
  const [showMantDropdown, setShowMantDropdown] = useState(false);
  let debugPolygonsGenerated = 0;

  const puntosList = useMemo(() => {
    return Object.entries(data).map(([id, loc]) => {
      let lat = loc.latitud ? parseFloat(loc.latitud.toString().replace(',', '.')) : null;
      let lng = loc.longitud ? parseFloat(loc.longitud.toString().replace(',', '.')) : null;
      if (lat > 0) lat = -lat;
      if (lng > 0) lng = -lng;
      return { ...loc, id, lat, lng, isGeolocated: !!(lat && lng && !isNaN(lat) && !isNaN(lng)) };
    }).filter(p => p.isGeolocated);
  }, [data]);

  const cuadrillasConMantenimiento = useMemo(() => {
    const counts = {};
    puntosList.forEach(p => {
      if (p.cuadrilla_mantenimiento) {
        counts[p.cuadrilla_mantenimiento] = (counts[p.cuadrilla_mantenimiento] || 0) + 1;
      }
    });
    return counts;
  }, [puntosList]);

  const totalConMantenimiento = useMemo(() => {
    return puntosList.filter(p => !!p.cuadrilla_mantenimiento).length;
  }, [puntosList]);

  const totalSinMantenimiento = puntosList.length - totalConMantenimiento;

  const filteredPuntos = useMemo(() => {
    return puntosList.filter(loc => {
      if (selectedSectorFilter !== 'ALL' && loc.sector !== selectedSectorFilter) return false;
      
      // Filtro de Mantenimiento
      if (maintenanceFilter === 'CON_MANTENIMIENTO') {
        if (!loc.cuadrilla_mantenimiento) return false;
        if (selectedCuadrillaMantFilter !== 'ALL' && loc.cuadrilla_mantenimiento !== selectedCuadrillaMantFilter) return false;
      } else if (maintenanceFilter === 'SIN_MANTENIMIENTO') {
        if (loc.cuadrilla_mantenimiento) return false;
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const puntoName = getPuntoName(loc).toLowerCase();
        const destino = (loc.destino_esp || '').toLowerCase();
        const mant = (loc.cuadrilla_mantenimiento || '').toLowerCase();
        if (!puntoName.includes(q) && !destino.includes(q) && !mant.includes(q)) return false;
      }
      return true;
    });
  }, [puntosList, selectedSectorFilter, maintenanceFilter, selectedCuadrillaMantFilter, searchQuery]);

  const renderPolygons = () => {
    debugPolygonsGenerated = 0;
    if (!showPolygons || filteredPuntos.length === 0) return null;

    if (clusteringMode) {
      const ptsToCluster = filteredPuntos;

      let maxCap = ptsPerCluster;
      if (clusterConfigType === 'num_clusters') {
        maxCap = Math.ceil(ptsToCluster.length / numClusters);
      }

      if (ptsToCluster.length === 0) return null;

      try {
        const clustered = recursiveBisection(ptsToCluster, maxCap);
        
        const clusterGroups = {};
        clustered.features.forEach(f => {
          const cId = f.properties.cluster;
          if (cId === undefined) return;
          if (!clusterGroups[cId]) clusterGroups[cId] = [];
          clusterGroups[cId].push({ lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] });
        });

        const aiColors = ['#f43f5e', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#eab308'];

        return Object.entries(clusterGroups).map(([cId, pts]) => {
          if (pts.length === 0) return null;
          const uniquePts = Array.from(new Set(pts.map(p => `${p.lng},${p.lat}`))).map(str => {
            const [lng, lat] = str.split(',').map(Number);
            return [lng, lat];
          });

          let polyCoords = null;
          
          if (uniquePts.length === 1) {
            const buffered = buffer(point(uniquePts[0]), 0.05, { units: 'kilometers' });
            polyCoords = buffered.geometry.coordinates[0];
          } else if (uniquePts.length === 2) {
            const buffered = buffer(lineString(uniquePts), 0.05, { units: 'kilometers' });
            polyCoords = buffered.geometry.coordinates[0];
          } else if (uniquePts.length >= 3) {
            const coll = featureCollection(uniquePts.map(p => point(p)));
            const hull = convex(coll);
            if (hull) polyCoords = hull.geometry.coordinates[0];
          }

          if (polyCoords) {
            debugPolygonsGenerated++;
            const leafletPositions = polyCoords.map(coord => [coord[1], coord[0]]);
            const color = aiColors[Number(cId) % aiColors.length];
            return (
              <Polygon 
                key={`poly-ai-${cId}`}
                positions={leafletPositions} 
                pathOptions={{ color: color, fillColor: color, fillOpacity: 0.35, weight: 3, dashArray: '6, 6' }}
              />
            );
          }
        });
      } catch (e) {
        console.error("AI Clustering error:", e);
      }
      return null;
    }

    // Modo Normal (Sectores existentes)
    const groups = {};
    puntosList.forEach(p => {
      const sName = p.sector || 'N/A';
      if (selectedSectorFilter !== 'ALL' && sName !== selectedSectorFilter) return; // Filtrado individual
      if (!groups[sName]) groups[sName] = [];
      groups[sName].push({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) });
    });

    return Object.entries(groups).map(([sName, pts]) => {
      if (pts.length === 0) return null;
      try {
        const uniquePts = Array.from(new Set(pts.map(p => `${p.lng},${p.lat}`))).map(str => {
          const [lng, lat] = str.split(',').map(Number);
          return [lng, lat];
        });

        let polyCoords = null;
          
        if (uniquePts.length === 1) {
          const buffered = buffer(point(uniquePts[0]), 0.05, { units: 'kilometers' });
          polyCoords = buffered.geometry.coordinates[0];
        } else if (uniquePts.length === 2) {
          const buffered = buffer(lineString(uniquePts), 0.05, { units: 'kilometers' });
          polyCoords = buffered.geometry.coordinates[0];
        } else if (uniquePts.length >= 3) {
          const coll = featureCollection(uniquePts.map(p => point(p)));
          const hull = convex(coll);
          if (hull) polyCoords = hull.geometry.coordinates[0];
        }

        if (polyCoords) {
          debugPolygonsGenerated++;
          const leafletPositions = polyCoords.map(coord => [coord[1], coord[0]]);
          const sectorColor = sectoresMap[sName]?.color || '#3b82f6';
          
          return (
            <Polygon 
              key={`poly-${sName}`}
              positions={leafletPositions} 
              pathOptions={{ color: sectorColor, fillColor: sectorColor, fillOpacity: 0.35, weight: 3, dashArray: '6, 6' }}
            />
          );
        }
      } catch (e) {
        console.error("Polygon error:", e);
      }
      return null;
    });
  };

  const polyElements = renderPolygons();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 15, left: 50, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-light)', padding: '0.4rem 0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }} />
          <input 
            type="text" 
            placeholder="Buscar punto, destino..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', outline: 'none', fontSize: '0.9rem', width: '180px' }}
          />
        </div>

        <div style={{ 
          background: 'var(--bg-main)', 
          borderRadius: '12px', 
          border: '1px solid var(--border-light)', 
          padding: '0.48rem 0.8rem', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
          fontSize: '0.8rem', 
          fontWeight: 600, 
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem'
        }}>
          <span>{filteredPuntos.length} pts</span>
          {maintenanceFilter === 'CON_MANTENIMIENTO' && (
            <span style={{ color: 'var(--secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
              • <Wrench size={12} /> Mantenimiento
            </span>
          )}
        </div>
      </div>

      <div style={{ position: 'absolute', top: 15, right: 15, zIndex: 1000, display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 'calc(100% - 350px)' }}>
        
        {/* Dropdown de Subcategoría de Mantenimiento */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowMantDropdown(!showMantDropdown); setShowSectorDropdown(false); }}
            style={{
              padding: '0.6rem 1rem', 
              background: maintenanceFilter === 'CON_MANTENIMIENTO' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-main)', 
              color: maintenanceFilter === 'CON_MANTENIMIENTO' ? 'var(--secondary)' : 'var(--text-main)',
              border: `1px solid ${maintenanceFilter === 'CON_MANTENIMIENTO' ? 'var(--secondary)' : 'var(--border-light)'}`, 
              borderRadius: '12px', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
              fontWeight: 600, 
              fontSize: '0.9rem',
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              minWidth: '175px', 
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={16} color={maintenanceFilter === 'CON_MANTENIMIENTO' ? 'var(--secondary)' : 'var(--text-muted)'} />
              <span>
                {maintenanceFilter === 'ALL' && `Mantenimiento: Todos`}
                {maintenanceFilter === 'SIN_MANTENIMIENTO' && `Sin Mant. (${totalSinMantenimiento})`}
                {maintenanceFilter === 'CON_MANTENIMIENTO' && (
                  selectedCuadrillaMantFilter === 'ALL' 
                    ? `En Mant. (${totalConMantenimiento})`
                    : `Mant: ${cuadrillasMap[selectedCuadrillaMantFilter]?.display_name || selectedCuadrillaMantFilter}`
                )}
              </span>
            </div>
            <ChevronDown size={16} />
          </button>
          
          {showMantDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 5px)', right: 0, minWidth: '250px',
              background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 1001, display: 'flex', flexDirection: 'column'
            }}>
              <div 
                onClick={() => { setMaintenanceFilter('ALL'); setSelectedCuadrillaMantFilter('ALL'); setShowMantDropdown(false); }}
                style={{ 
                  padding: '0.65rem 1rem', cursor: 'pointer', color: 'var(--text-main)', 
                  fontWeight: maintenanceFilter === 'ALL' ? 700 : 500, 
                  background: maintenanceFilter === 'ALL' ? 'var(--bg-card)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
              >
                <span>🌐 Todos los Puntos</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{puntosList.length}</span>
              </div>

              <div 
                onClick={() => { setMaintenanceFilter('CON_MANTENIMIENTO'); setSelectedCuadrillaMantFilter('ALL'); setShowMantDropdown(false); }}
                style={{ 
                  padding: '0.65rem 1rem', cursor: 'pointer', color: 'var(--secondary)', 
                  fontWeight: (maintenanceFilter === 'CON_MANTENIMIENTO' && selectedCuadrillaMantFilter === 'ALL') ? 700 : 500, 
                  background: (maintenanceFilter === 'CON_MANTENIMIENTO' && selectedCuadrillaMantFilter === 'ALL') ? 'var(--bg-card)' : 'transparent',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Wrench size={14} /> Solo en Mantenimiento
                </span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.2)', padding: '1px 6px', borderRadius: '8px', color: 'var(--secondary)', fontWeight: 700 }}>
                  {totalConMantenimiento}
                </span>
              </div>

              {/* Subcategorías por cada Cuadrilla de Mantenimiento activa */}
              {Object.entries(cuadrillasConMantenimiento).map(([cuadName, count]) => (
                <div 
                  key={cuadName}
                  onClick={() => { setMaintenanceFilter('CON_MANTENIMIENTO'); setSelectedCuadrillaMantFilter(cuadName); setShowMantDropdown(false); }}
                  style={{ 
                    padding: '0.55rem 1rem 0.55rem 1.8rem', cursor: 'pointer',
                    color: (maintenanceFilter === 'CON_MANTENIMIENTO' && selectedCuadrillaMantFilter === cuadName) ? 'var(--secondary)' : 'var(--text-main)',
                    fontWeight: (maintenanceFilter === 'CON_MANTENIMIENTO' && selectedCuadrillaMantFilter === cuadName) ? 700 : 400,
                    fontSize: '0.82rem',
                    background: (maintenanceFilter === 'CON_MANTENIMIENTO' && selectedCuadrillaMantFilter === cuadName) ? 'var(--bg-card)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderTop: '1px dashed var(--border-light)'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    ↳ <strong>{cuadrillasMap[cuadName]?.display_name || cuadName}</strong>
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{count} pts</span>
                </div>
              ))}

              <div 
                onClick={() => { setMaintenanceFilter('SIN_MANTENIMIENTO'); setSelectedCuadrillaMantFilter('ALL'); setShowMantDropdown(false); }}
                style={{ 
                  padding: '0.65rem 1rem', cursor: 'pointer', color: 'var(--primary)', 
                  fontWeight: maintenanceFilter === 'SIN_MANTENIMIENTO' ? 700 : 500, 
                  background: maintenanceFilter === 'SIN_MANTENIMIENTO' ? 'var(--bg-card)' : 'transparent',
                  borderTop: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}
              >
                <span>🛠️ Sin Mantenimiento Asignado</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{totalSinMantenimiento}</span>
              </div>
            </div>
          )}
        </div>

        {/* Custom Sector Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowSectorDropdown(!showSectorDropdown); setShowMantDropdown(false); }}
            style={{
              padding: '0.6rem 1rem', background: 'var(--bg-main)', color: 'var(--text-main)',
              border: '1px solid var(--border-light)', borderRadius: '12px', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontWeight: 600, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px', justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedSectorFilter !== 'ALL' && (
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: sectoresMap[selectedSectorFilter]?.color || '#3b82f6' }} />
              )}
              {selectedSectorFilter === 'ALL' ? 'Todos los Sectores' : sectoresMap[selectedSectorFilter]?.display_name || selectedSectorFilter}
            </div>
            <ChevronDown size={16} />
          </button>
          
          {showSectorDropdown && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 5px)', left: 0, width: '100%',
              background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 1001, display: 'flex', flexDirection: 'column'
            }}>
              <div 
                onClick={() => { setSelectedSectorFilter('ALL'); setShowSectorDropdown(false); }}
                style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: 'var(--text-main)', fontWeight: selectedSectorFilter === 'ALL' ? 700 : 500, background: selectedSectorFilter === 'ALL' ? 'var(--bg-card)' : 'transparent' }}
              >
                Todos los Sectores
              </div>
              {sectoresList.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => { setSelectedSectorFilter(s.internal_name); setShowSectorDropdown(false); }}
                  style={{ 
                    padding: '0.6rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    color: 'var(--text-main)', fontWeight: selectedSectorFilter === s.internal_name ? 700 : 500,
                    background: selectedSectorFilter === s.internal_name ? 'var(--bg-card)' : 'transparent',
                    borderTop: '1px solid var(--border-light)'
                  }}
                >
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: s.color || '#3b82f6' }} />
                  {s.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowPolygons(!showPolygons)} 
          style={{
            padding: '0.6rem 1rem', background: showPolygons ? 'var(--bg-card)' : 'var(--bg-main)',
            color: showPolygons ? 'var(--text-main)' : 'var(--text-muted)', border: '1px solid var(--border-light)',
            borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem'
          }}
        >
          {showPolygons ? <EyeOff size={18} /> : <Eye size={18} />} 
          {showPolygons ? `Ocultar Zonas` : 'Mostrar Zonas'}
        </button>
        <button 
          onClick={() => setClusteringMode(!clusteringMode)} 
          style={{
            padding: '0.6rem 1rem', background: clusteringMode ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-main)',
            color: clusteringMode ? 'var(--primary)' : 'var(--text-muted)', border: `1px solid ${clusteringMode ? 'var(--primary)' : 'var(--border-light)'}`,
            borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem'
          }}
        >
          <BrainCircuit size={18} /> 
          Sugerencia IA
        </button>
        {clusteringMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-main)', padding: '0 1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
            <select
              value={clusterConfigType}
              onChange={e => setClusterConfigType(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="pts_per_cluster">Puntos/Clúster</option>
              <option value="num_clusters">N° Clústeres</option>
            </select>
            
            {clusterConfigType === 'num_clusters' ? (
              <input 
                type="number" 
                min="2" max="50" 
                value={numClusters} 
                onChange={e => setNumClusters(Math.max(2, Math.min(50, parseInt(e.target.value) || 2)))}
                style={{ width: '50px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontWeight: 'bold' }}
              />
            ) : (
              <input 
                type="number" 
                min="3" max="100" 
                value={ptsPerCluster} 
                onChange={e => setPtsPerCluster(Math.max(3, Math.min(100, parseInt(e.target.value) || 3)))}
                style={{ width: '50px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontWeight: 'bold' }}
              />
            )}
          </div>
        )}
      </div>

      <MapContainer center={[-13.525, -71.968]} zoom={15} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=cb1_4gd6_1_e6330e749037f892b8269074" />
        {polyElements}
        {filteredPuntos.map(loc => {
          let mColor = '#3b82f6';
          if (clusteringMode) {
             // In clustering mode, markers keep a default or maybe we just leave them blue or we color them by cluster.
             // Actually, mapping point to cluster ID is hard here, so we stick to sector color or default.
             // Let's just use sector color always.
          }
          const isMant = !!loc.cuadrilla_mantenimiento;
          const sColor = isMant ? '#8b5cf6' : (sectoresMap[loc.sector]?.color || '#3b82f6');
          
          const markerIcon = L.divIcon({
            className: 'custom-marker',
            html: `<svg width="26" height="38" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 36 12 36C12 36 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="${sColor}" ${isMant ? 'stroke="#ffffff" stroke-width="1.5"' : ''}/>
              <circle cx="12" cy="12" r="${isMant ? '6' : '5'}" fill="white"/>
              ${isMant ? '<circle cx="12" cy="12" r="3.2" fill="#8b5cf6"/>' : ''}
            </svg>`,
            iconSize: [26, 38],
            iconAnchor: [13, 38],
            popupAnchor: [0, -38],
          });

          return (
            <Marker 
              key={loc.id} 
              position={[loc.lat, loc.lng]} 
              icon={markerIcon}
              draggable={false}
            >
              <Popup maxWidth={300} minWidth={220} className="custom-popup">
                <LocationCard 
                  loc={loc} 
                  session={true} 
                  onUpdatePunto={onUpdatePunto} 
                  cuadrillaGlobal={cuadrillasMap[appMode === 'MANTENIMIENTO' ? loc.cuadrilla_mantenimiento : loc.cuadrilla]?.display_name} 
                  isCompact={true}
                  appMode={appMode}
                  cuadrillasList={cuadrillasList}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
