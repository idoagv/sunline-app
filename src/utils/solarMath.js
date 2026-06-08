export const PHI = 32 * Math.PI / 180;
export const S2 = Math.SQRT1_2;
export const HT = 85;
export const DECL = { summer: 23.45, equinox: 0, winter: -23.45 };
export const cx = 340;
export const cy = 290;

export function add(p, v, s) { return [p[0] + v[0] * s, p[1] + v[1] * s]; }
export function lin(p, va, sa, vb, sb) { return [p[0] + va[0] * sa + vb[0] * sb, p[1] + va[1] * sa + vb[1] * sb]; }

export function sun(t, decl) {
  let dec = decl * Math.PI / 180, H = (t - 12) * 15 * Math.PI / 180;
  let sinE = Math.sin(PHI) * Math.sin(dec) + Math.cos(PHI) * Math.cos(dec) * Math.cos(H);
  sinE = Math.max(-1, Math.min(1, sinE));
  let E = Math.asin(sinE) * 180 / Math.PI;
  let xe = -Math.cos(dec) * Math.sin(H);
  let yn = Math.cos(PHI) * Math.sin(dec) - Math.sin(PHI) * Math.cos(dec) * Math.cos(H);
  let A = Math.atan2(xe, yn) * 180 / Math.PI; if (A < 0) A += 360;
  return { elev: E, az: A };
}

export function daylen(decl) {
  let dec = decl * Math.PI / 180, c = -Math.tan(PHI) * Math.tan(dec);
  c = Math.max(-1, Math.min(1, c));
  let H0 = Math.acos(c) * 180 / Math.PI / 15;
  return { rise: 12 - H0, set: 12 + H0 };
}

export function ring(az, R) {
  let r = az * Math.PI / 180;
  return [cx + R * Math.sin(r), cy - R * Math.cos(r)];
}

export function dirOf(az) {
  let r = az * Math.PI / 180;
  return [Math.sin(r), -Math.cos(r)];
}

export function rayPoly(P, dir, poly) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    let A = poly[i], B = poly[(i + 1) % poly.length];
    let ex = B[0] - A[0], ey = B[1] - A[1];
    let det = ex * dir[1] - dir[0] * ey;
    if (Math.abs(det) < 1e-9) continue;
    let px = A[0] - P[0], py = A[1] - P[1];
    let t = (-ey * px + ex * py) / det;
    let u = (dir[0] * py - dir[1] * px) / det;
    if (t > 1e-3 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
}

export function shaded(u, dir, elev) {
  if (elev <= 0.5) return true;
  let tanE = Math.tan(elev * Math.PI / 180);
  for (let i = 0; i < u.others.length; i++) {
    let d = rayPoly(u.cc, dir, u.others[i]);
    if (isFinite(d) && d > 2 && d * tanE < HT) return true;
  }
  return false;
}

export function oriented(u, dir) {
  let m = -1;
  for (let i = 0; i < u.nm.length; i++) {
    let dt = u.nm[i][0] * dir[0] + u.nm[i][1] * dir[1];
    if (dt > m) m = dt;
  }
  return m > 0.03;
}

export function isLit(u, az, elev) {
  if (elev <= 1) return false;
  let dir = dirOf(az);
  if (!oriented(u, dir)) return false;
  if (shaded(u, dir, elev)) return false;
  return true;
}

export function hull(pts) {
  pts = pts.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  function cr(o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); }
  let lo = [], up = [], i, p;
  for (i = 0; i < pts.length; i++) {
    p = pts[i];
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  for (i = pts.length - 1; i >= 0; i--) {
    p = pts[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  lo.pop(); up.pop(); return lo.concat(up);
}

export function shadow(poly, az, elev) {
  if (elev <= 0.5) return null;
  let tanE = Math.tan(elev * Math.PI / 180), L = Math.min(HT / tanE, 540);
  let r = az * Math.PI / 180, ax = -Math.sin(r) * L, ay = Math.cos(r) * L, pts = [], i;
  for (i = 0; i < poly.length; i++) {
    pts.push(poly[i]);
    pts.push([poly[i][0] + ax, poly[i][1] + ay]);
  }
  return hull(pts);
}

export function ptsStr(p) {
  if (!p) return "";
  return p.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
}

export function compass(az) {
  let d = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return d[Math.round(az / 22.5) % 16];
}

export function clock(t) {
  let h = Math.floor(t), m = Math.round((t - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  return h + ':' + (m < 10 ? '0' : '') + m;
}

export function getTotals(season, DECL, unitsArray) {
    let dl = daylen(DECL[season]), N = 240, dt = (dl.set - dl.rise) / N;
    let res = {};
    unitsArray.forEach(u => res[u.id] = { s: 0, am: 0, pm: 0 });
    for (let i = 0; i < N; i++) {
      let t = dl.rise + (i + 0.5) * dt, s = sun(t, DECL[season]);
      for (let u of unitsArray) {
        if (isLit(u, s.az, s.elev)) {
           res[u.id].s += dt;
           if (t < 12) res[u.id].am += dt; else res[u.id].pm += dt;
        }
      }
    }
    return { dl, res };
}
