"use client";

import { useState, useEffect, useMemo } from 'react';
import { IconPlayerPlayFilled, IconPlayerPauseFilled } from '@tabler/icons-react';
import {
  PHI, DECL, cx, cy, sun, daylen, ring, shadow, ptsStr, compass, clock, getTotals, isLit
} from '../utils/solarMath';
import {
  poly1, poly2, poly3, c1, c2, c3, allApartments
} from '../utils/buildingData';

export default function SunLine() {
  const [season, setSeason] = useState('equinox');
  const [f, setF] = useState(0.5); // equivalent to time.value/1000
  const [playing, setPlaying] = useState(false);
  const [selectedApts, setSelectedApts] = useState([]);
  
  // Totals calculations
  const totals = useMemo(() => getTotals(season, DECL, allApartments), [season]);
  const { dl, res } = totals;
  
  // Current time calculations
  const t = dl.rise + f * (dl.set - dl.rise);
  const s = sun(t, DECL[season]);
  const r = s.az * Math.PI / 180;
  
  // Shadows
  const sp1 = shadow(poly1, s.az, s.elev);
  const sp2 = shadow(poly2, s.az, s.elev);
  const sp3 = shadow(poly3, s.az, s.elev);
  
  // Rays
  const ld = [-Math.sin(r), Math.cos(r)];
  const perp = [Math.cos(r), Math.sin(r)];
  const Rr = 222;
  const offs = [-150, -75, 0, 75, 150];
  const rays = offs.map(k => {
    if (Math.abs(k) < Rr) {
      const tt = Math.sqrt(Rr * Rr - k * k);
      const Q = [cx + perp[0] * k, cy + perp[1] * k];
      return {
        x1: Q[0] - ld[0] * tt, y1: Q[1] - ld[1] * tt,
        x2: Q[0] + ld[0] * tt, y2: Q[1] + ld[1] * tt
      };
    }
    return null;
  }).filter(Boolean);
  
  // Sun position
  const sp2_ring = ring(s.az, 205);
  const hot = Math.max(0, Math.min(1, s.elev / 60));
  const col = `rgb(${Math.round(245 + (255 - 245) * hot)},${Math.round(158 + (216 - 158) * hot)},${Math.round(11 + (77 - 11) * hot)})`;
  
  // Sun Path Line
  const sunPathD = useMemo(() => {
    const n = 64;
    let d = '';
    for (let i = 0; i <= n; i++) {
      let ti = dl.rise + (dl.set - dl.rise) * i / n;
      let si = sun(ti, DECL[season]);
      let pt = ring(si.az, 205);
      d += (i === 0 ? 'M' : 'L') + pt[0].toFixed(1) + ',' + pt[1].toFixed(1);
    }
    return d;
  }, [season, dl]);

  const sr = ring(sun(dl.rise + 0.001, DECL[season]).az, 205);
  const srl = ring(sun(dl.rise + 0.001, DECL[season]).az, 225);
  const su = ring(sun(dl.set - 0.001, DECL[season]).az, 205);
  const sul = ring(sun(dl.set - 0.001, DECL[season]).az, 225);

  // Lit status for all apartments
  const litStatus = useMemo(() => {
    const status = {};
    allApartments.forEach(u => {
      status[u.id] = isLit(u, s.az, s.elev);
    });
    return status;
  }, [s.az, s.elev]);

  const toggleApt = (id) => {
    setSelectedApts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };
  
  // Animation loop
  useEffect(() => {
    let interval;
    if (playing) {
      interval = setInterval(() => {
        setF(prev => {
          let next = prev + 0.005;
          if (next > 1) return 0;
          return next;
        });
      }, 40);
    }
    return () => clearInterval(interval);
  }, [playing]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-5 flex justify-center font-sans">
      <div className="max-w-[700px] w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex gap-1.5">
            {[
              { id: 'summer', label: 'Summer' },
              { id: 'equinox', label: 'Spring / autumn' },
              { id: 'winter', label: 'Winter' }
            ].map(seasonOpt => (
              <button
                key={seasonOpt.id}
                onClick={() => setSeason(seasonOpt.id)}
                className={`text-[13px] px-2.5 py-1.5 rounded-md border transition-colors ${
                  season === seasonOpt.id
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                {seasonOpt.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setPlaying(!playing)}
            className="text-[13px] px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 flex items-center gap-1.5"
          >
            {playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
            <span>{playing ? 'Pause' : 'Play day'}</span>
          </button>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={f}
            onChange={(e) => setF(parseFloat(e.target.value))}
            className="flex-1 min-w-[200px] cursor-pointer"
            aria-label="time of day"
          />
        </div>
        
        {/* Readout */}
        <div className="text-[13px] text-gray-500 mb-2 min-h-[18px]">
          {clock(t)} &middot; Sun in the {compass(s.az)} ({Math.round(s.az)}&deg;) &middot; {Math.round(s.elev)}&deg; above the horizon
        </div>
        
        {/* SVG */}
        <svg width="100%" viewBox="0 0 680 580" role="img" aria-hidden="true" className="max-w-[680px]">
          <circle cx="340" cy="290" r="230" fill="#F4F0E7" stroke="rgba(60,72,60,0.16)" strokeWidth="1"/>
          <circle cx="340" cy="290" r="205" fill="none" stroke="rgba(120,110,80,0.30)" strokeWidth="0.5" strokeDasharray="3 5"/>
          <line x1="340" y1="60" x2="340" y2="74" stroke="rgba(60,72,60,0.35)" strokeWidth="1"/>
          <line x1="340" y1="506" x2="340" y2="520" stroke="rgba(60,72,60,0.35)" strokeWidth="1"/>
          <line x1="556" y1="290" x2="570" y2="290" stroke="rgba(60,72,60,0.35)" strokeWidth="1"/>
          <line x1="110" y1="290" x2="124" y2="290" stroke="rgba(60,72,60,0.35)" strokeWidth="1"/>
          <text x="340" y="54" textAnchor="middle" style={{fontSize: 13, fontWeight: 500, fill: '#3a463d'}}>N</text>
          <text x="340" y="538" textAnchor="middle" style={{fontSize: 13, fontWeight: 500, fill: '#3a463d'}}>S</text>
          <text x="582" y="295" textAnchor="middle" style={{fontSize: 13, fontWeight: 500, fill: '#3a463d'}}>E</text>
          <text x="98" y="295" textAnchor="middle" style={{fontSize: 13, fontWeight: 500, fill: '#3a463d'}}>W</text>
          
          <g id="sunpath">
            <path d={sunPathD} fill="none" stroke="#E0922A" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
            <circle cx={sr[0].toFixed(1)} cy={sr[1].toFixed(1)} r="3" fill="#C0701A"/>
            <circle cx={su[0].toFixed(1)} cy={su[1].toFixed(1)} r="3" fill="#C0701A"/>
            <text x={srl[0].toFixed(1)} y={srl[1].toFixed(1)} textAnchor="middle" style={{fontSize: 11, fill: '#7a5616'}}>{clock(dl.rise)}</text>
            <text x={sul[0].toFixed(1)} y={sul[1].toFixed(1)} textAnchor="middle" style={{fontSize: 11, fill: '#7a5616'}}>{clock(dl.set)}</text>
          </g>

          <g id="rays">
            {rays.map((r, i) => (
              <line key={i} x1={r.x1.toFixed(1)} y1={r.y1.toFixed(1)} x2={r.x2.toFixed(1)} y2={r.y2.toFixed(1)} stroke="#F2A623" strokeWidth="2" opacity="0.16"/>
            ))}
          </g>

          <g id="shadows">
            {sp1 && <polygon points={ptsStr(sp1)} fill="rgba(43,59,68,0.18)"/>}
            {sp2 && <polygon points={ptsStr(sp2)} fill="rgba(43,59,68,0.18)"/>}
            {sp3 && <polygon points={ptsStr(sp3)} fill="rgba(43,59,68,0.18)"/>}
          </g>
          
          <g id="static">
            {/* Base Buildings Background */}
            {[
              [poly1, 'Tower 1', c1],
              [poly2, 'Tower 2', c2],
              [poly3, 'Tower 3', c3]
            ].map((t, i) => (
              <g key={i}>
                <polygon points={ptsStr(t[0])} fill="#23474f" stroke="#15323a" strokeWidth="1"/>
              </g>
            ))}

            {/* Subdivided Apartments */}
            {allApartments.map(u => {
              const isSelected = selectedApts.includes(u.id);
              const lit = litStatus[u.id];
              return (
                <g key={u.id} onClick={() => toggleApt(u.id)} className="cursor-pointer transition-colors hover:opacity-80">
                  <polygon 
                    points={ptsStr(u.renderPoly)} 
                    fill={isSelected ? (lit ? '#F2A623' : '#7d8e96') : 'rgba(255,255,255,0.04)'} 
                    stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.4)'} 
                    strokeWidth={isSelected ? "1.5" : "1"}
                  />
                  {isSelected && (
                    <circle cx={u.cc[0].toFixed(1)} cy={u.cc[1].toFixed(1)} r="3" fill="#fff" />
                  )}
                </g>
              );
            })}

            {/* Building Labels (above apartments) */}
            {[
              ['Tower 1', c1],
              ['Tower 2', c2],
              ['Tower 3', c3]
            ].map((t, i) => (
              <text key={i} x={t[1][0]} y={t[1][1] + 4} textAnchor="middle" style={{fontSize: 12, fontWeight: 500, fill: '#eef3ef', pointerEvents: 'none'}}>{t[0]}</text>
            ))}
          </g>

          <g id="sun">
            <line x1={cx} y1={cy} x2={sp2_ring[0].toFixed(1)} y2={sp2_ring[1].toFixed(1)} stroke="#E0922A" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5"/>
            <circle cx={sp2_ring[0].toFixed(1)} cy={sp2_ring[1].toFixed(1)} r="13" fill={col} stroke="#C0701A" strokeWidth="1"/>
          </g>
        </svg>

        {/* Selected Dynamic Cards */}
        {selectedApts.length === 0 ? (
          <div className="text-[13px] text-gray-500 mt-4 p-4 border border-dashed border-gray-300 rounded-xl text-center bg-gray-50">
            Click on individual apartments in the diagram to select them and view their sun data.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 mt-3.5">
            {selectedApts.map(id => {
              const u = allApartments.find(a => a.id === id);
              const data = res[id];
              const lit = litStatus[id];
              const percent = Math.min(100, (data.s / dl.set) * 100 * 2);
              
              return (
                <div key={id} className="bg-white border-[0.5px] border-gray-200 rounded-xl p-4 shadow-sm relative transition-all">
                  <button 
                    onClick={() => toggleApt(id)} 
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
                    aria-label="Remove"
                  >
                    &times;
                  </button>
                  <div>
                    <span className="text-[15px] font-medium">{u.name}</span><br/>
                    <span className="text-[12px] text-gray-500">
                      faces {u.faces.join(' + ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 my-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${lit ? 'bg-[#F2A623]' : 'bg-[#888780]'}`}></span>
                    <span className="text-[13px] font-medium">{lit ? 'In direct sun' : 'Shaded'}</span>
                  </div>
                  <div className="text-[13px] text-gray-500">Direct sun: <span className="text-gray-900 font-medium">{data.s.toFixed(1)} h</span></div>
                  <div className="h-2 rounded bg-gray-100 mt-2 overflow-hidden">
                    <div className="h-full bg-[#EF9F27] rounded transition-all duration-250" style={{width: percent + "%"}}></div>
                  </div>
                  <div className="text-[12px] text-gray-400 mt-1.5">Morning {data.am.toFixed(1)} h &middot; Afternoon {data.pm.toFixed(1)} h</div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3.5 mt-3 text-[12px] text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#F2A623] inline-block"></span>Selected (In sun)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#7d8e96] inline-block"></span>Selected (Shaded)</span>
          <span className="flex items-center gap-1.5"><span className="w-3.5 h-[9px] rounded-sm bg-[rgba(43,59,68,0.22)] inline-block"></span>Building shadow</span>
        </div>

      </div>
    </div>
  );
}
