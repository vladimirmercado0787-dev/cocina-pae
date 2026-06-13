import { useMemo, useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { RECETAS_RD } from '../../data/componentesRD';
import { PATHS_RD } from '../../data/pathsRD';
import { MUNICIPIOS_RD } from '../../data/municipiosRD';

const LAB = {
  bg: '#0a0f14', card: '#0e151b', borde: 'rgba(94,234,212,0.16)',
  bordeFuerte: 'rgba(94,234,212,0.32)', cian: '#5eead4',
  cianClaro: '#9fe7dd', texto: '#d7f5ef', muted: '#3f7a72',
};
const AMBAR = '#e0a44e';
const C_BAJA = '#2e9d8a';
const C_MEDIA = '#e0a44e';
const C_ALTA = '#e2503f';

const colorPct = (pct) => {
  if (pct >= 85) return C_BAJA;
  if (pct >= 65) return C_MEDIA;
  return C_ALTA;
};

const norm = (s) => (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const RECETAS_IDS = {
  'Cerdo Guisado con Arvejas': '02990878-3c6e-4611-bc6d-d748e1688c2b',
  'Habichuelas Rojas con Huevos': '11a184c4-fc7c-45bc-8244-7b3e5d08ba46',
  'Moro de Gandules con Sardina': '9ca4f8d0-2114-4ad8-acd0-df9e5d931385',
  'Pechuga con Puré de Papa': '59b22dbd-caf3-437a-9c24-fa3a306a6c9d',
  'Sancocho Criollo': '3e30d5da-8d9a-4005-97ee-46de6d19de74',
};

const COMPONENTES_LISTA = (() => {
  const vistos = [];
  const out = [];
  RECETAS_RD.forEach((rec) => rec.componentes.forEach((c) => {
    if (!vistos.includes(c.nombre)) { vistos.push(c.nombre); out.push({ id: c.id, nombre: c.nombre }); }
  }));
  return out;
})();

const PROVINCIAS_RD = PATHS_RD.map((p) => p.nombre).sort((a, b) => a.localeCompare(b, 'es'));

// Devuelve los municipios de una provincia (por su nombre)
const municipiosDe = (nombreProvincia) => {
  const clave = norm(nombreProvincia);
  const data = MUNICIPIOS_RD[clave];
  if (!data) return [];
  return data.municipios.map((m) => m.nombre).sort((a, b) => a.localeCompare(b, 'es'));
};

const MES_NOMBRE = { '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic' };
const formatMes = (m) => {
  if (!m) return '';
  const [a, mm] = m.split('-');
  return `${MES_NOMBRE[mm] || mm} ${a.slice(2)}`;
};

export default function ModuloAceptacion({ empresaIdAdmin, claveMando, onVolver }) {
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modo, setModo] = useState('componente');
  const [seleccion, setSeleccion] = useState(COMPONENTES_LISTA[0]?.id || '');

  const [nivel, setNivel] = useState('red'); // red | provincia | municipio
  const [provinciaSel, setProvinciaSel] = useState(PROVINCIAS_RD[0] || '');
  const [municipioSel, setMunicipioSel] = useState('');

  const [tendencia, setTendencia] = useState([]);
  const [cargandoTend, setCargandoTend] = useState(false);

  // municipios disponibles segun la provincia elegida
  const municipiosDisp = useMemo(() => municipiosDe(provinciaSel), [provinciaSel]);

  // cuando cambia la provincia, resetea el municipio al primero
  useEffect(() => {
    setMunicipioSel(municipiosDisp[0] || '');
  }, [municipiosDisp]);

  useEffect(() => {
    if (!claveMando) return;
    let activo = true;
    setCargando(true);
    supabase.rpc('inteligencia_ranking_aceptacion', { p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando })
      .then(({ data, error }) => {
        if (!activo) return;
        if (error) console.error('ranking:', error);
        setRanking(data || []);
        setCargando(false);
      });
    return () => { activo = false; };
  }, [empresaIdAdmin, claveMando]);

  useEffect(() => {
    if (modo === 'componente') setSeleccion(COMPONENTES_LISTA[0]?.id || '');
    else setSeleccion(RECETAS_IDS[Object.keys(RECETAS_IDS)[0]]);
  }, [modo]);

  useEffect(() => {
    if (!claveMando || !seleccion) return;
    let activo = true;
    setCargandoTend(true);
    let filtro = null;
    if (nivel === 'provincia') filtro = provinciaSel;
    else if (nivel === 'municipio') filtro = municipioSel;
    supabase.rpc('inteligencia_tendencia_aceptacion', {
      p_empresa_id_admin: empresaIdAdmin,
      p_clave: claveMando,
      p_modo: modo,
      p_id: seleccion,
      p_nivel: nivel,
      p_filtro: filtro,
    }).then(({ data, error }) => {
      if (!activo) return;
      if (error) console.error('tendencia:', error);
      setTendencia(data || []);
      setCargandoTend(false);
    });
    return () => { activo = false; };
  }, [modo, seleccion, nivel, provinciaSel, municipioSel, empresaIdAdmin, claveMando]);

  const lista = useMemo(() => {
    return ranking
      .filter((r) => r.tipo === modo && Number(r.despachos || 0) > 0)
      .sort((a, b) => Number(b.pct_aceptacion) - Number(a.pct_aceptacion));
  }, [ranking, modo]);

  const totales = useMemo(() => {
    const base = ranking.filter((r) => r.tipo === 'receta' && Number(r.despachos || 0) > 0);
    const cocido = base.reduce((a, r) => a + Number(r.total_cocido || 0), 0);
    const sobrante = base.reduce((a, r) => a + Number(r.total_sobrante || 0), 0);
    const pct = cocido > 0 ? ((cocido - sobrante) / cocido) * 100 : 0;
    return { cocido, sobrante, pct };
  }, [ranking]);

  const maxPct = 100;
  const opciones = modo === 'componente'
    ? COMPONENTES_LISTA.map((c) => ({ id: c.id, nombre: c.nombre }))
    : Object.entries(RECETAS_IDS).map(([nombre, id]) => ({ id, nombre }));

  const nombreSel = useMemo(() => {
    const o = opciones.find((x) => x.id === seleccion);
    return o ? o.nombre : '';
  }, [opciones, seleccion]);

  const tendenciaFmt = useMemo(
    () => tendencia.map((t) => ({ mes: formatMes(t.mes), valor: Number(t.aceptacion || 0) })),
    [tendencia]
  );

  const zonaTexto = nivel === 'red' ? 'Toda la red' : nivel === 'provincia' ? provinciaSel : `${municipioSel} (${provinciaSel})`;

  return (
    <div style={{ minHeight: '100vh', background: LAB.bg, color: LAB.texto, padding: '20px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '920px', margin: '0 auto' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(224,164,78,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🍽️</div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: LAB.muted }}>INTELIGENCIA DE LA RED</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: LAB.texto }}>Aceptacion por receta</div>
            </div>
          </div>
          {onVolver && (
            <button onClick={onVolver} style={{ background: LAB.card, border: `1px solid ${LAB.borde}`, borderRadius: '20px', padding: '8px 15px', color: LAB.cianClaro, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
          )}
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', color: LAB.muted, padding: '40px 0' }}>Cargando...</div>
        ) : (
          <>
            {/* NUMEROS GRANDES */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 18 }}>
              <NumeroGrande label="Aceptacion global" valor={`${totales.pct.toFixed(1)}%`} color={colorPct(totales.pct)} />
              <NumeroGrande label="Total cocido (lb)" valor={totales.cocido.toLocaleString('es-DO')} color={LAB.cian} />
              <NumeroGrande label="Total sobrante (lb)" valor={totales.sobrante.toLocaleString('es-DO')} color={C_ALTA} />
            </div>

            {/* TOGGLE componente / receta */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['componente', 'Por componente'], ['receta', 'Por receta completa']].map(([key, lbl]) => (
                <button key={key} onClick={() => setModo(key)}
                  style={{
                    background: modo === key ? AMBAR : LAB.card,
                    color: modo === key ? '#3a2a08' : LAB.cianClaro,
                    border: `1px solid ${modo === key ? AMBAR : LAB.borde}`,
                    borderRadius: 20, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {lbl}
                </button>
              ))}
            </div>

            {/* SELECTORES: que mides + de donde (cascada) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 11, color: AMBAR, marginBottom: 6, letterSpacing: '0.05em' }}>
                  {modo === 'componente' ? 'COMPONENTE' : 'RECETA'}:
                </div>
                <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)}
                  style={{ background: LAB.card, color: LAB.texto, border: `1px solid rgba(224,164,78,0.35)`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', minWidth: 220, cursor: 'pointer' }}>
                  {opciones.map((o) => (<option key={o.id} value={o.id}>{o.nombre}</option>))}
                </select>
              </div>

              <div>
                <div style={{ fontSize: 11, color: LAB.cian, marginBottom: 6, letterSpacing: '0.05em' }}>DE DONDE:</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select value={nivel} onChange={(e) => setNivel(e.target.value)}
                    style={{ background: LAB.card, color: LAB.texto, border: `1px solid ${LAB.bordeFuerte}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                    <option value="red">Toda la red</option>
                    <option value="provincia">Por provincia</option>
                    <option value="municipio">Por municipio</option>
                  </select>

                  {(nivel === 'provincia' || nivel === 'municipio') && (
                    <select value={provinciaSel} onChange={(e) => setProvinciaSel(e.target.value)}
                      style={{ background: LAB.card, color: LAB.texto, border: `1px solid ${LAB.bordeFuerte}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                      {PROVINCIAS_RD.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  )}

                  {nivel === 'municipio' && (
                    <select value={municipioSel} onChange={(e) => setMunicipioSel(e.target.value)}
                      style={{ background: LAB.card, color: LAB.texto, border: `1px solid ${LAB.bordeFuerte}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
                      {municipiosDisp.length === 0 ? <option>Sin municipios</option> : municipiosDisp.map((m) => (<option key={m} value={m}>{m}</option>))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* GRAFICA DE TENDENCIA (datos reales) */}
            <GraficaTendencia datos={tendenciaFmt} nombre={nombreSel} cargando={cargandoTend} zona={zonaTexto} />

            {/* GRAFICA DE BARRAS */}
            <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${LAB.borde}`, padding: '18px 20px', marginTop: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: LAB.texto, marginBottom: 4 }}>
                {modo === 'receta' ? 'Aceptacion de cada receta' : 'Aceptacion de cada componente'}
              </div>
              <div style={{ fontSize: 11, color: LAB.muted, marginBottom: 16 }}>ordenado de mayor a menor aceptacion · el elegido va resaltado</div>

              {lista.length === 0 ? (
                <div style={{ textAlign: 'center', color: LAB.muted, fontSize: 13, padding: '20px 0' }}>
                  Aun no hay datos de sobrante registrados.
                </div>
              ) : (
                lista.map((it, i) => {
                  const pct = Number(it.pct_aceptacion);
                  const sobra = 100 - pct;
                  const esElegido = it.nombre === nombreSel;
                  return (
                    <div key={i} style={{ marginBottom: 14, padding: esElegido ? '8px 10px' : 0, background: esElegido ? 'rgba(224,164,78,0.07)' : 'transparent', border: esElegido ? `1px solid rgba(224,164,78,0.3)` : 'none', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: LAB.texto, fontWeight: esElegido ? 700 : 400 }}>
                          {modo === 'componente' && it.receta ? (
                            <>{it.nombre} <span style={{ fontSize: 10, color: LAB.muted }}>· {it.receta}</span></>
                          ) : it.nombre}
                          {esElegido && <span style={{ fontSize: 10, color: AMBAR, marginLeft: 6 }}>(en grafica)</span>}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: colorPct(pct) }}>{pct.toFixed(0)}%</span>
                      </div>
                      <div style={{ height: 10, background: LAB.bg, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ width: `${(pct / maxPct) * 100}%`, height: '100%', background: colorPct(pct), borderRadius: 6, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: LAB.muted, marginTop: 3 }}>
                        se consume {pct.toFixed(0)}% · sobra {sobra.toFixed(0)}% · {Number(it.despachos)} despacho(s)
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ALERTA */}
            {lista.length > 0 && (() => {
              const peor = lista[lista.length - 1];
              const sobra = 100 - Number(peor.pct_aceptacion);
              if (sobra < 20) return null;
              return (
                <div style={{ marginTop: 16, background: 'rgba(226,80,63,0.08)', border: `1px solid rgba(226,80,63,0.3)`, borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C_ALTA, marginBottom: 4 }}>⚠ Atencion</div>
                  <div style={{ fontSize: 13, color: LAB.texto }}>
                    {modo === 'receta' ? 'La receta' : 'El componente'} <b>{peor.nombre}</b> es lo que mas se bota: sobra el <b>{sobra.toFixed(0)}%</b> de lo que se cocina. Considera ajustar la cantidad o revisar por que no gusta.
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );

  function GraficaTendencia({ datos, nombre, cargando, zona }) {
    const W = 600, H = 220, padL = 35, padR = 15, padT = 18, padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const maxY = 100, minY = 0;

    const hayDatos = datos.length > 0;
    const unSolo = datos.length === 1;

    const puntos = datos.map((d, i) => {
      const x = datos.length === 1 ? padL + plotW / 2 : padL + (i / (datos.length - 1)) * plotW;
      const y = padT + plotH - ((d.valor - minY) / (maxY - minY)) * plotH;
      return { x, y, v: d.valor, mes: d.mes };
    });

    const pathLine = puntos.length > 1 ? 'M ' + puntos.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') : '';
    const pathArea = puntos.length > 1 ? pathLine + ` L ${puntos[puntos.length - 1].x.toFixed(1)} ${(H - padB).toFixed(1)} L ${puntos[0].x.toFixed(1)} ${(H - padB).toFixed(1)} Z` : '';

    const lineas = [0, 25, 50, 75, 100];
    const subio = puntos.length > 1 ? puntos[puntos.length - 1].v >= puntos[0].v : true;
    const diff = puntos.length > 1 ? Math.abs(puntos[puntos.length - 1].v - puntos[0].v).toFixed(1) : 0;

    return (
      <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${LAB.borde}`, padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: LAB.texto }}>Tendencia de: <span style={{ color: AMBAR }}>{nombre}</span></div>
            <div style={{ fontSize: 11, color: LAB.muted, marginTop: 2 }}>en {zona} · aceptacion mes a mes</div>
          </div>
          {hayDatos && puntos.length > 1 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: LAB.muted }}>{datos.length} mes(es)</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: subio ? C_BAJA : C_ALTA }}>{subio ? '▲' : '▼'} {diff} pts</div>
            </div>
          )}
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', color: LAB.muted, fontSize: 13, padding: '40px 0' }}>Cargando tendencia...</div>
        ) : !hayDatos ? (
          <div style={{ textAlign: 'center', color: LAB.muted, fontSize: 13, padding: '40px 0' }}>
            No hay datos de despachos en {zona} para {nombre}.<br />
            <span style={{ fontSize: 11 }}>Se llenara sola cuando haya operacion en esta zona.</span>
          </div>
        ) : (
          <>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block', marginTop: 8 }}>
              {lineas.map((ly) => {
                const y = padT + plotH - (ly / 100) * plotH;
                return (
                  <g key={ly}>
                    <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1a2530" strokeWidth="1" />
                    <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill={LAB.muted}>{ly}</text>
                  </g>
                );
              })}
              {pathArea && <path d={pathArea} fill={AMBAR} opacity="0.10" />}
              {pathLine && <path d={pathLine} fill="none" stroke={AMBAR} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
              {puntos.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill={AMBAR} stroke={LAB.bg} strokeWidth="1.5" />
                  <text x={p.x} y={H - padB + 16} textAnchor="middle" fontSize="10" fill={LAB.muted}>{p.mes}</text>
                  {unSolo && <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill={AMBAR}>{p.v.toFixed(0)}%</text>}
                </g>
              ))}
            </svg>
            {unSolo && (
              <div style={{ fontSize: 11, color: LAB.muted, marginTop: 6, textAlign: 'center' }}>
                Solo hay 1 mes de datos. La linea se dibujara cuando haya mas meses.
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function NumeroGrande({ label, valor, color }) {
    return (
      <div style={{ background: LAB.card, borderRadius: 12, border: `1px solid ${LAB.borde}`, padding: '14px 16px' }}>
        <div style={{ fontSize: 11, color: LAB.muted, marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color }}>{valor}</div>
      </div>
    );
  }
}