import { S2, cx, cy, add, lin } from './solarMath';

export const d1 = [S2, S2];
export const d2 = [S2, -S2];
export const NW = [-S2, -S2];
export const SE = [S2, S2];
export const ss = 130;
export const a = 55;
export const b = 38;
export const cell = 15;

export const c1 = add([cx, cy], NW, ss);
export const c2 = [cx, cy];
export const c3 = add([cx, cy], SE, ss);

export function corners(c) {
  return {
    E: lin(c, d1, a, d2, b),
    S: lin(c, d1, a, d2, -b),
    W: lin(c, d1, -a, d2, -b),
    N: lin(c, d1, -a, d2, b)
  };
}

export const T1 = corners(c1);
export const T2 = corners(c2);
export const T3 = corners(c3);

export const poly1 = [T1.E, T1.S, T1.W, T1.N];
export const poly2 = [T2.E, T2.S, T2.W, T2.N];
export const poly3 = [T3.E, T3.S, T3.W, T3.N];

export const cc1 = lin(c1, d1, -(a - cell), d2, -(b - cell));
export const cc3 = lin(c3, d1, (a - cell), d2, -(b - cell));

export function cellPoly(cc) {
  return [
    lin(cc, d1, cell, d2, cell),
    lin(cc, d1, cell, d2, -cell),
    lin(cc, d1, -cell, d2, -cell),
    lin(cc, d1, -cell, d2, cell)
  ];
}

export const nSW = [-S2, S2];
export const nNW = [-S2, -S2];
export const nSE = [S2, S2];
export const nNE = [S2, -S2];

export function subdivideBuilding(center, idPrefix, otherPolys) {
  const apts = [];
  const cell_a = a / 3;
  const cell_b = b / 2;
  
  const cols = [-1, 0, 1];
  const rows = [-1, 1]; // -1 means -b/2, 1 means +b/2
  
  cols.forEach(col => {
    rows.forEach(row => {
      // center of this apartment
      const cc = lin(center, d1, col * (2 * a / 3), d2, row * (b / 2));
      
      // 4 corners
      const poly = [
        lin(cc, d1, cell_a, d2, cell_b),
        lin(cc, d1, cell_a, d2, -cell_b),
        lin(cc, d1, -cell_a, d2, -cell_b),
        lin(cc, d1, -cell_a, d2, cell_b)
      ];
      
      // shrink slightly for visual gap when rendering
      const gap = 1;
      const renderPoly = [
        lin(cc, d1, cell_a - gap, d2, cell_b - gap),
        lin(cc, d1, cell_a - gap, d2, -(cell_b - gap)),
        lin(cc, d1, -(cell_a - gap), d2, -(cell_b - gap)),
        lin(cc, d1, -(cell_a - gap), d2, cell_b - gap)
      ];
      
      // exposed normals
      const nm = [];
      const faces = [];
      if (col === -1) { nm.push(nNW); faces.push('NW'); }
      if (col === 1) { nm.push(nSE); faces.push('SE'); }
      if (row === -1) { nm.push(nSW); faces.push('SW'); }
      if (row === 1) { nm.push(nNE); faces.push('NE'); }
      
      let colName = col === -1 ? 'NW' : col === 0 ? 'Mid' : 'SE';
      let rowName = row === -1 ? 'SW' : 'NE';
      
      apts.push({
        id: `${idPrefix}-${colName}-${rowName}`,
        name: `${idPrefix} ${colName}-${rowName}`,
        building: idPrefix,
        poly,
        renderPoly,
        cc,
        nm,
        faces,
        others: otherPolys
      });
    });
  });
  
  return apts;
}

export const tower1Apts = subdivideBuilding(c1, 'Tower 1', [poly2, poly3]);
export const tower2Apts = subdivideBuilding(c2, 'Tower 2', [poly1, poly3]);
export const tower3Apts = subdivideBuilding(c3, 'Tower 3', [poly1, poly2]);

export const allApartments = [...tower1Apts, ...tower2Apts, ...tower3Apts];

