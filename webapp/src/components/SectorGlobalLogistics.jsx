import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Package, ChevronDown, Download } from 'lucide-react';
import { getMaterialIcon } from '../utils/helpers';

export const SectorGlobalLogistics = ({ materiales, sectorName }) => {
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
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, cellPadding: 3 },
      styles: { fontSize: 8, cellPadding: 3, minCellHeight: 4 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { top: 10, bottom: 10, left: 14, right: 14 }
    });
    
    doc.save(`Logistica_Sector_${sectorName.replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }}>
      <div 
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Package size={20} color="var(--primary)" /> 
          Consolidado Global: {sectorName}
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{materiales.length} Ítems</span>
          <ChevronDown size={20} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={exportSectorPDF} className="splash-btn primary" style={{ padding: '0.5rem 1rem' }}>
              <Download size={16} /> Exportar Consolidado
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {materiales.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
                <div style={{ color: 'var(--primary)', padding: '0.5rem', background: 'var(--overlay-w-05)', borderRadius: '6px' }}>
                  {getMaterialIcon(m.Item)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.Item}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cant: {m.Cantidad}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
