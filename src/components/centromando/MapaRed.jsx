import { useMemo, useState, useEffect } from 'react';
import { PATHS_RD } from '../../data/pathsRD';
import { MUNICIPIOS_RD } from '../../data/municipiosRD';
import { RECETAS_RD } from '../../data/componentesRD';
import { supabase } from '../../supabaseClient';

const W = 900;
const H = 480;

const LAB = {
  bg: '#0a0f14', card: '#0e151b', borde: 'rgba(94,234,212,0.16)',
  bordeFuerte: 'rgba(94,234,212,0.32)', cian: '#5eead4',
  cianClaro: '#9fe7dd', texto: '#d7f5ef', muted: '#3f7a72',
};
const ACENTO = {
  mercado: { color: '#5eead4', borde: 'rgba(94,234,212,0.32)' },
  operacion: { color: '#5eead4', borde: 'rgba(94,234,212,0.32)' },
  aceptacion: { color: '#e0a44e', borde: 'rgba(224,164,78,0.35)' },
  rendimiento: { color: '#54a0ff', borde: 'rgba(84,160,255,0.35)' },
};
const C_VACIO = '#33495a';
const C_BAJA = '#2e9d8a';
const C_MEDIA = '#e0a44e';
const C_ALTA = '#e2503f';
const R_CERO = '#33495a';
const R_CLARO = '#7fc3ff';
const R_MEDIO = '#3d7fd6';
const R_OSCURO = '#1f4d8f';
const STROKE = 'rgba(94,234,212,0.40)';

const norm = (s) =>
  (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const NOMBRE_OFICIAL = {
  'la estrelleta': 'Elias Pina',
  'el seybo': 'El Seibo',
  'hermanas': 'Hermanas Mirabal',
  'bahoruco': 'Bahoruco',
  'mosenor nouel': 'Monsenor Nouel',
};
const nombreBonito = (n) => NOMBRE_OFICIAL[norm(n)] || n;

const CLAVE_DATOS = {
  'la estrelleta': 'elias pina',
  'el seybo': 'el seibo',
  'hermanas': 'hermanas mirabal',
  'bahoruco': 'baoruco',
  'mosenor nouel': 'monsenor nouel',
};
const claveDatos = (n) => CLAVE_DATOS[norm(n)] || norm(n);

const CLAVE_MUNI = {
  'villa rivas': 'villa riva',
  'pepillo salcedo (manzanillo)': 'pepillo salcedo',
};
const claveMuni = (n) => CLAVE_MUNI[norm(n)] || norm(n);

const RECETAS_IDS = {
  'Cerdo Guisado con Arvejas': '02990878-3c6e-4611-bc6d-d748e1688c2b',
  'Habichuelas Rojas con Huevos': '11a184c4-fc7c-45bc-8244-7b3e5d08ba46',
  'Moro de Gandules con Sardina': '9ca4f8d0-2114-4ad8-acd0-df9e5d931385',
  'Pechuga con Puré de Papa': '59b22dbd-caf3-437a-9c24-fa3a306a6c9d',
  'Sancocho Criollo': '3e30d5da-8d9a-4005-97ee-46de6d19de74',
};

const LENTES = {
  mercado: { label: 'Captacion de mercado', sub: 'cuanto del mercado nacional tienes captado', metricaTooltip: 'Captacion del mercado' },
  operacion: { label: 'Mi operacion', sub: 'como se reparte tu red actual', metricaTooltip: 'Parte de tu operacion' },
  aceptacion: { label: 'Aceptacion recetas', sub: 'que tanto gusta cada componente', metricaTooltip: 'Aceptacion' },
  rendimiento: { label: 'Rendimiento', sub: 'libras cocidas por cada 100 raciones', metricaTooltip: 'Lb por 100 raciones' },
};

export default function MapaRed({ empresaIdAdmin, claveMando, onVolver }) {
  const [filas, setFilas] = useState([]);
  const [oper, setOper] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [hover, setHover] = useState(null);
  const [provSel, setProvSel] = useState(null);
  const [lente, setLente] = useState('mercado');
  const [muniSel, setMuniSel] = useState(null);

  const [muniFilas, setMuniFilas] = useState([]);
  const [muniOper, setMuniOper] = useState([]);
  const [cargandoMuni, setCargandoMuni] = useState(false);

  const [componenteSel, setComponenteSel] = useState(RECETAS_RD[0].componentes[0].id);
  const [acepProv, setAcepProv] = useState([]);
  const [acepMuni, setAcepMuni] = useState([]);

  const [ranking, setRanking] = useState([]);
  const [rankTipo, setRankTipo] = useState('componente');

  const [rendProv, setRendProv] = useState([]);
  const [rendMuni, setRendMuni] = useState([]);
  const [rendModo, setRendModo] = useState('componente');
  const [recetaSel, setRecetaSel] = useState(RECETAS_IDS['Cerdo Guisado con Arvejas']);

  useEffect(() => {
    if (!claveMando) return;
    let activo = true;
    setCargando(true);
    Promise.all([
      supabase.rpc('inteligencia_captacion', { p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando }),
      supabase.rpc('inteligencia_por_provincia', { p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando }),
    ]).then(([capt, op]) => {
      if (!activo) return;
      if (capt.error) console.error('captacion:', capt.error);
      if (op.error) console.error('operacion:', op.error);
      setFilas(capt.data || []);
      setOper(op.data || []);
      setCargando(false);
    });
    return () => { activo = false; };
  }, [empresaIdAdmin, claveMando]);

  useEffect(() => {
    if (lente !== 'aceptacion' || !claveMando || !componenteSel) return;
    let activo = true;
    supabase.rpc('inteligencia_aceptacion_provincia', {
      p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_componente_id: componenteSel,
    }).then(({ data, error }) => {
      if (!activo) return;
      if (error) console.error('acep prov:', error);
      setAcepProv(data || []);
    });
    return () => { activo = false; };
  }, [lente, componenteSel, empresaIdAdmin, claveMando]);

  useEffect(() => {
    if (lente !== 'aceptacion' || !claveMando) return;
    let activo = true;
    supabase.rpc('inteligencia_ranking_aceptacion', {
      p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando,
    }).then(({ data, error }) => {
      if (!activo) return;
      if (error) console.error('ranking:', error);
      setRanking(data || []);
    });
    return () => { activo = false; };
  }, [lente, empresaIdAdmin, claveMando]);

  useEffect(() => {
    if (lente !== 'rendimiento' || !claveMando) return;
    let activo = true;
    if (rendModo === 'componente' && componenteSel) {
      supabase.rpc('inteligencia_rendimiento_provincia', {
        p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_componente_id: componenteSel,
      }).then(({ data, error }) => {
        if (!activo) return;
        if (error) console.error('rend prov:', error);
        setRendProv(data || []);
      });
    } else if (rendModo === 'receta' && recetaSel) {
      supabase.rpc('inteligencia_rendimiento_receta_prov', {
        p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_receta_id: recetaSel,
      }).then(({ data, error }) => {
        if (!activo) return;
        if (error) console.error('rend receta prov:', error);
        setRendProv(data || []);
      });
    }
    return () => { activo = false; };
  }, [lente, rendModo, componenteSel, recetaSel, empresaIdAdmin, claveMando]);

  const porProv = useMemo(() => {
    const idx = {}; filas.forEach((r) => { idx[norm(r.provincia)] = r; }); return idx;
  }, [filas]);
  const porOper = useMemo(() => {
    const idx = {}; oper.forEach((r) => { idx[norm(r.provincia)] = r; }); return idx;
  }, [oper]);
  const porAcep = useMemo(() => {
    const idx = {}; acepProv.forEach((r) => { idx[norm(r.provincia)] = r; }); return idx;
  }, [acepProv]);
  const porRend = useMemo(() => {
    const idx = {}; rendProv.forEach((r) => { idx[norm(r.provincia)] = r; }); return idx;
  }, [rendProv]);

  const totalCaptadoRed = useMemo(
    () => filas.reduce((acc, r) => acc + Number(r.matricula_captada || 0), 0), [filas]
  );
  const provinciasActivas = useMemo(
    () => filas.filter((r) => Number(r.matricula_captada || 0) > 0).length, [filas]
  );
  const totalRaciones = useMemo(
    () => oper.reduce((acc, r) => acc + Number(r.total_raciones || 0), 0), [oper]
  );

  const rendMinMax = useMemo(() => {
    const vals = rendProv.map((r) => Number(r.lbs_por_100 || 0)).filter((v) => v > 0);
    if (vals.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [rendProv]);

  const muniData = provSel ? MUNICIPIOS_RD[provSel] : null;
  const enMunicipios = !!muniData;
  const provinciaParaRPC = muniData ? nombreBonito(muniData.provincia) : null;

  useEffect(() => {
    if (!provSel || !muniData || !claveMando) return;
    let activo = true;
    setCargandoMuni(true);
    setMuniFilas([]); setMuniOper([]); setMuniSel(null);
    Promise.all([
      supabase.rpc('inteligencia_captacion_municipio', { p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_provincia: provinciaParaRPC }),
      supabase.rpc('inteligencia_operacion_municipio', { p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_provincia: provinciaParaRPC }),
    ]).then(([capt, op]) => {
      if (!activo) return;
      if (capt.error) console.error('capt muni:', capt.error);
      if (op.error) console.error('oper muni:', op.error);
      setMuniFilas(capt.data || []);
      setMuniOper(op.data || []);
      setCargandoMuni(false);
    });
    return () => { activo = false; };
  }, [provSel, muniData, provinciaParaRPC, empresaIdAdmin, claveMando]);

  useEffect(() => {
    if (lente !== 'aceptacion' || !provSel || !muniData || !claveMando || !componenteSel) return;
    let activo = true;
    supabase.rpc('inteligencia_aceptacion_municipio', {
      p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_componente_id: componenteSel, p_provincia: provinciaParaRPC,
    }).then(({ data, error }) => {
      if (!activo) return;
      if (error) console.error('acep muni:', error);
      setAcepMuni(data || []);
    });
    return () => { activo = false; };
  }, [lente, componenteSel, provSel, muniData, provinciaParaRPC, empresaIdAdmin, claveMando]);

  // Rendimiento municipios: componente O receta
  useEffect(() => {
    if (lente !== 'rendimiento' || !provSel || !muniData || !claveMando) return;
    let activo = true;
    setRendMuni([]);
    if (rendModo === 'componente' && componenteSel) {
      supabase.rpc('inteligencia_rendimiento_municipio', {
        p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_componente_id: componenteSel, p_provincia: provinciaParaRPC,
      }).then(({ data, error }) => {
        if (!activo) return;
        if (error) console.error('rend muni:', error);
        setRendMuni(data || []);
      });
    } else if (rendModo === 'receta' && recetaSel) {
      supabase.rpc('inteligencia_rendimiento_receta_muni', {
        p_empresa_id_admin: empresaIdAdmin, p_clave: claveMando, p_receta_id: recetaSel, p_provincia: provinciaParaRPC,
      }).then(({ data, error }) => {
        if (!activo) return;
        if (error) console.error('rend receta muni:', error);
        setRendMuni(data || []);
      });
    }
    return () => { activo = false; };
  }, [lente, rendModo, componenteSel, recetaSel, provSel, muniData, provinciaParaRPC, empresaIdAdmin, claveMando]);

  const porMuni = useMemo(() => {
    const idx = {}; muniFilas.forEach((r) => { idx[norm(r.municipio)] = r; }); return idx;
  }, [muniFilas]);
  const porMuniOper = useMemo(() => {
    const idx = {}; muniOper.forEach((r) => { idx[norm(r.municipio)] = r; }); return idx;
  }, [muniOper]);
  const porAcepMuni = useMemo(() => {
    const idx = {}; acepMuni.forEach((r) => { idx[norm(r.municipio)] = r; }); return idx;
  }, [acepMuni]);
  const porRendMuni = useMemo(() => {
    const idx = {}; rendMuni.forEach((r) => { idx[norm(r.municipio)] = r; }); return idx;
  }, [rendMuni]);

  const rendMuniMinMax = useMemo(() => {
    const vals = rendMuni.map((r) => Number(r.lbs_por_100 || 0)).filter((v) => v > 0);
    if (vals.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [rendMuni]);

  const datosProv = (n) => porProv[claveDatos(n)];
  const datosOper = (n) => porOper[claveDatos(n)];
  const datosAcep = (n) => porAcep[claveDatos(n)];
  const datosRend = (n) => porRend[claveDatos(n)];
  const datosMuni = (n) => porMuni[claveMuni(n)];
  const datosMuniOper = (n) => porMuniOper[claveMuni(n)];
  const datosAcepMuni = (n) => porAcepMuni[claveMuni(n)];
  const datosRendMuni = (n) => porRendMuni[claveMuni(n)];

  const pctProv = (n) => {
    const r = datosProv(n);
    if (!r) return 0;
    if (lente === 'mercado') return Number(r.pct_captacion || 0);
    if (totalCaptadoRed === 0) return 0;
    return (Number(r.matricula_captada || 0) / totalCaptadoRed) * 100;
  };

  const colorAcept = (pct, tieneDato) => {
    if (!tieneDato) return C_VACIO;
    if (pct >= 85) return C_BAJA;
    if (pct >= 65) return C_MEDIA;
    return C_ALTA;
  };

  const colorRend = (lbs, minmax) => {
    const v = Number(lbs || 0);
    if (v === 0) return R_CERO;
    const { min, max } = minmax;
    if (max === min) return R_MEDIO;
    const pos = (v - min) / (max - min);
    if (pos <= 0.33) return R_CLARO;
    if (pos <= 0.66) return R_MEDIO;
    return R_OSCURO;
  };

  const colorProv = (n) => {
    if (lente === 'aceptacion') {
      const r = datosAcep(n);
      return colorAcept(Number(r?.pct_aceptacion || 0), !!r);
    }
    if (lente === 'rendimiento') {
      const r = datosRend(n);
      return colorRend(r?.lbs_por_100, rendMinMax);
    }
    const r = datosProv(n);
    const captada = r ? Number(r.matricula_captada || 0) : 0;
    if (captada === 0) return C_VACIO;
    const pct = pctProv(n);
    if (lente === 'mercado') {
      if (pct < 25) return C_BAJA;
      if (pct < 60) return C_MEDIA;
      return C_ALTA;
    } else {
      if (pct < 34) return C_BAJA;
      if (pct < 67) return C_MEDIA;
      return C_ALTA;
    }
  };

  const colorMuni = (n) => {
    if (lente === 'aceptacion') {
      const r = datosAcepMuni(n);
      return colorAcept(Number(r?.pct_aceptacion || 0), !!r);
    }
    if (lente === 'rendimiento') {
      const r = datosRendMuni(n);
      return colorRend(r?.lbs_por_100, rendMuniMinMax);
    }
    const r = datosMuni(n);
    const captada = r ? Number(r.matricula_captada || 0) : 0;
    if (captada === 0) return C_VACIO;
    const pct = Number(r.pct_captacion || 0);
    if (pct < 25) return C_BAJA;
    if (pct < 60) return C_MEDIA;
    return C_ALTA;
  };

  const entrarProvincia = (n) => {
    const clave = norm(n);
    if (MUNICIPIOS_RD[clave]) { setHover(null); setProvSel(clave); }
  };
  const volverNacional = () => { setHover(null); setProvSel(null); setMuniFilas([]); setMuniOper([]); setMuniSel(null); setAcepMuni([]); setRendMuni([]); };

  const lenteCfg = LENTES[lente];
  const acento = ACENTO[lente];
  const muniPanel = enMunicipios ? (hover || muniSel) : null;
  const esAcep = lente === 'aceptacion';
  const esRend = lente === 'rendimiento';

  const rankFiltrado = useMemo(() => {
    const lista = ranking.filter((r) => r.tipo === rankTipo && r.despachos > 0);
    return [...lista].sort((a, b) => Number(b.pct_aceptacion) - Number(a.pct_aceptacion));
  }, [ranking, rankTipo]);
  const topConsume = rankFiltrado.slice(0, 5);
  const topSobra = [...rankFiltrado].reverse().slice(0, 5);

  const rendOrdenado = useMemo(() => {
    return [...rendProv]
      .filter((r) => Number(r.lbs_por_100 || 0) > 0)
      .sort((a, b) => Number(a.lbs_por_100) - Number(b.lbs_por_100));
  }, [rendProv]);
  const topRindeMas = rendOrdenado.slice(0, 5);
  const topRindeMenos = [...rendOrdenado].reverse().slice(0, 5);

  const nombreComponente = useMemo(() => {
    for (const rec of RECETAS_RD) {
      const c = rec.componentes.find((x) => x.id === componenteSel);
      if (c) return c.nombre;
    }
    return '';
  }, [componenteSel]);

  const nombreReceta = useMemo(() => {
    const e = Object.entries(RECETAS_IDS).find(([, id]) => id === recetaSel);
    return e ? e[0] : '';
  }, [recetaSel]);

  const etiquetaRend = esRend ? (rendModo === 'receta' ? nombreReceta : nombreComponente) : '';

  return (
    <div style={{ minHeight: '100vh', background: LAB.bg, color: LAB.texto, padding: '20px', fontFamily: 'inherit' }}>
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(94,234,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📍</div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: LAB.muted }}>INTELIGENCIA DE LA RED</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: LAB.texto }}>
                {enMunicipios ? `${nombreBonito(muniData.provincia)} - ${muniData.municipios.length} municipios` : 'Mapa de la Red - 32 provincias'}
              </div>
            </div>
          </div>
          {onVolver && (
            <button onClick={onVolver} style={{ background: LAB.card, border: `1px solid ${LAB.borde}`, borderRadius: '20px', padding: '8px 15px', color: LAB.cianClaro, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Salir</button>
          )}
        </div>

        {!enMunicipios && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {Object.entries(LENTES).map(([key, cfg]) => {
              const activa = lente === key;
              const ac = ACENTO[key];
              return (
                <button key={key} onClick={() => setLente(key)}
                  style={{
                    background: activa ? ac.color : LAB.card,
                    color: activa ? '#04201b' : LAB.cianClaro,
                    border: `1px solid ${activa ? ac.color : LAB.borde}`,
                    borderRadius: '20px', padding: '8px 14px', fontSize: '12px',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}

        {esAcep && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: 11, color: acento.color, marginBottom: 6, letterSpacing: '0.05em' }}>ELIGE EL COMPONENTE A ANALIZAR:</div>
            <select value={componenteSel} onChange={(e) => setComponenteSel(e.target.value)}
              style={{ background: LAB.card, color: LAB.texto, border: `1px solid ${acento.borde}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', minWidth: 280, cursor: 'pointer' }}>
              {RECETAS_RD.map((rec) => (
                <optgroup key={rec.receta} label={rec.receta}>
                  {rec.componentes.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {esRend && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[['componente', 'Por componente'], ['receta', 'Por receta completa']].map(([key, lbl]) => (
                <button key={key} onClick={() => { setRendModo(key); if (provSel) volverNacional(); }}
                  style={{
                    background: rendModo === key ? acento.color : LAB.card,
                    color: rendModo === key ? '#04243f' : LAB.cianClaro,
                    border: `1px solid ${rendModo === key ? acento.color : LAB.borde}`,
                    borderRadius: 16, padding: '6px 13px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  {lbl}
                </button>
              ))}
            </div>
            {rendModo === 'componente' ? (
              <select value={componenteSel} onChange={(e) => setComponenteSel(e.target.value)}
                style={{ background: LAB.card, color: LAB.texto, border: `1px solid ${acento.borde}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', minWidth: 280, cursor: 'pointer' }}>
                {RECETAS_RD.map((rec) => (
                  <optgroup key={rec.receta} label={rec.receta}>
                    {rec.componentes.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
                  </optgroup>
                ))}
              </select>
            ) : (
              <select value={recetaSel} onChange={(e) => setRecetaSel(e.target.value)}
                style={{ background: LAB.card, color: LAB.texto, border: `1px solid ${acento.borde}`, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', minWidth: 280, cursor: 'pointer' }}>
                {Object.entries(RECETAS_IDS).map(([nombre, id]) => (<option key={id} value={id}>{nombre}</option>))}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '11px', color: LAB.muted }}>
          {enMunicipios ? (
            <button onClick={volverNacional} style={{ background: 'rgba(94,234,212,0.10)', border: `1px solid ${LAB.bordeFuerte}`, borderRadius: '20px', padding: '7px 14px', color: LAB.cian, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Volver al mapa nacional
            </button>
          ) : (
            <span>{cargando ? 'Cargando...' : `${provinciasActivas} provincia(s) con actividad`} - {lenteCfg.sub}</span>
          )}
          {esAcep ? (
            <>
              <ChipLeyenda color={C_VACIO} txt="Sin dato" />
              <ChipLeyenda color={C_ALTA} txt="Sobro (<65%)" />
              <ChipLeyenda color={C_MEDIA} txt="Medio" />
              <ChipLeyenda color={C_BAJA} txt="Gusto (>85%)" />
            </>
          ) : esRend ? (
            <>
              <ChipLeyenda color={R_CERO} txt="Sin dato" />
              <ChipLeyenda color={R_CLARO} txt="Rinde mas" />
              <ChipLeyenda color={R_MEDIO} txt="Medio" />
              <ChipLeyenda color={R_OSCURO} txt="Rinde menos" />
            </>
          ) : (
            <>
              <ChipLeyenda color={C_VACIO} txt="Sin captar" />
              <ChipLeyenda color={C_BAJA} txt="Baja" />
              <ChipLeyenda color={C_MEDIA} txt="Media" />
              <ChipLeyenda color={C_ALTA} txt="Alta" />
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
          <div style={{ position: 'relative', width: '100%', background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block', maxWidth: 'none' }}>
              <g key={(provSel || 'nacional') + lente + componenteSel + recetaSel + rendModo} style={{ transformOrigin: 'center', animation: 'mapaZoom 0.45s ease-out' }}>
                {!enMunicipios && PATHS_RD.map((p, i) => (
                  <path key={i} d={p.d} fill={colorProv(p.nombre)}
                    stroke={hover === p.nombre ? '#ffffff' : STROKE}
                    strokeWidth={hover === p.nombre ? 1.8 : 0.7}
                    style={{ cursor: 'pointer', transition: 'fill 0.3s' }}
                    onMouseEnter={() => setHover(p.nombre)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => entrarProvincia(p.nombre)} />
                ))}
                {enMunicipios && muniData.municipios.map((m, i) => (
                  <path key={i} d={m.d} fill={colorMuni(m.nombre)}
                    stroke={hover === m.nombre || muniSel === m.nombre ? '#ffffff' : 'rgba(94,234,212,0.5)'}
                    strokeWidth={hover === m.nombre || muniSel === m.nombre ? 2 : 1}
                    style={{ cursor: 'pointer', transition: 'fill 0.3s' }}
                    onMouseEnter={() => setHover(m.nombre)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setMuniSel(m.nombre)} />
                ))}
              </g>
            </svg>

            {!enMunicipios && hover && (() => {
              if (esRend) {
                const r = datosRend(hover);
                const v = Number(r?.lbs_por_100 || 0);
                return (
                  <div style={{ position: 'absolute', top: 14, right: 14, minWidth: 210, background: LAB.bg, border: `1px solid ${acento.borde}`, borderRadius: 12, padding: '10px 12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: LAB.texto }}>{nombreBonito(hover)}</div>
                    <div style={{ fontSize: 11, color: LAB.muted }}>{etiquetaRend} - lb por 100 raciones</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: acento.color, marginTop: 2 }}>{r ? v.toFixed(2) : 'sin dato'}</div>
                    <div style={{ fontSize: 10, color: acento.color, marginTop: 4 }}>clic para ver municipios</div>
                  </div>
                );
              }
              const pct = esAcep ? Number(datosAcep(hover)?.pct_aceptacion || 0) : pctProv(hover);
              const tiene = esAcep ? !!datosAcep(hover) : true;
              return (
                <div style={{ position: 'absolute', top: 14, right: 14, minWidth: 200, background: LAB.bg, border: `1px solid ${acento.borde}`, borderRadius: 12, padding: '10px 12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: LAB.texto }}>{nombreBonito(hover)}</div>
                  <div style={{ fontSize: 11, color: LAB.muted }}>{lenteCfg.metricaTooltip}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: acento.color, marginTop: 2 }}>{esAcep && !tiene ? 'sin dato' : `${pct.toFixed(1)}%`}</div>
                  <div style={{ fontSize: 10, color: acento.color, marginTop: 4 }}>{esAcep ? 'clic para ver municipios' : 'clic para ver detalle y municipios'}</div>
                </div>
              );
            })()}
          </div>

          <PanelDetalle />

          {esAcep && !enMunicipios && <PanelRanking />}
          {esRend && !enMunicipios && <PanelRankingRend />}
        </div>

        <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '11px', color: LAB.muted }}>
          Andamio - {enMunicipios ? 'pasa el mouse o haz clic en un municipio' : 'elige una lente arriba - haz clic en una provincia'}
        </div>
      </div>

      <style>{`
        @keyframes mapaZoom {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );

  function PanelRankingRend() {
    return (
      <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: LAB.texto }}>Donde investigar - {etiquetaRend}</div>
          <div style={{ fontSize: 11, color: LAB.muted }}>Total raciones en sistema: <b style={{ color: acento.color }}>{totalRaciones.toLocaleString('es-DO')}</b></div>
        </div>
        <div style={{ fontSize: 11, color: LAB.muted, marginBottom: 14 }}>
          {rendModo === 'receta' ? 'peso total del plato por 100 raciones' : 'libras cocidas por cada 100 raciones'} - menos = rinde mas
        </div>
        {rendOrdenado.length === 0 ? (
          <div style={{ textAlign: 'center', color: LAB.muted, fontSize: 13, padding: '12px 0' }}>
            Aun no hay datos de cocido para esto.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <ListaRend titulo="Donde mas rinde (preguntar como)" items={topRindeMas} />
            <ListaRend titulo="Donde menos rinde (investigar)" items={topRindeMenos} />
          </div>
        )}
      </div>
    );
  }

  function ListaRend({ titulo, items }) {
    return (
      <div style={{ background: LAB.bg, borderRadius: 12, border: `1px solid ${LAB.borde}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: ACENTO.rendimiento.color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: LAB.texto }}>{titulo}</span>
        </div>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: i === 0 ? 'none' : `1px solid ${LAB.borde}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ fontSize: 11, color: LAB.muted, minWidth: 16 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: LAB.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombreBonito(it.provincia)}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: ACENTO.rendimiento.color, marginLeft: 8, whiteSpace: 'nowrap' }}>{Number(it.lbs_por_100).toFixed(2)} lb</span>
          </div>
        ))}
      </div>
    );
  }

  function PanelRanking() {
    return (
      <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: LAB.texto }}>Puntos clave - lo importante</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['componente', 'Por componente'], ['receta', 'Por receta']].map(([key, lbl]) => (
              <button key={key} onClick={() => setRankTipo(key)}
                style={{
                  background: rankTipo === key ? acento.color : LAB.bg,
                  color: rankTipo === key ? '#3a2a08' : LAB.muted,
                  border: `1px solid ${rankTipo === key ? acento.color : LAB.borde}`,
                  borderRadius: 16, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        {rankFiltrado.length === 0 ? (
          <div style={{ textAlign: 'center', color: LAB.muted, fontSize: 13, padding: '12px 0' }}>
            Aun no hay datos de sobrante registrados para hacer el ranking.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            <ListaRank titulo="Lo que mas se consume" items={topConsume} color={C_BAJA} modo="consume" />
            <ListaRank titulo="Lo que mas sobra" items={topSobra} color={C_ALTA} modo="sobra" />
          </div>
        )}
      </div>
    );
  }

  function ListaRank({ titulo, items, color, modo }) {
    return (
      <div style={{ background: LAB.bg, borderRadius: 12, border: `1px solid ${LAB.borde}`, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: LAB.texto }}>{titulo}</span>
        </div>
        {items.map((it, i) => {
          const acept = Number(it.pct_aceptacion);
          const mostrar = modo === 'sobra' ? (100 - acept) : acept;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderTop: i === 0 ? 'none' : `1px solid ${LAB.borde}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 11, color: LAB.muted, minWidth: 16 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: LAB.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.nombre}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color, marginLeft: 8, whiteSpace: 'nowrap' }}>{mostrar.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    );
  }

  function PanelDetalle() {
    if (!enMunicipios) {
      return (
        <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: LAB.muted, fontSize: 13 }}>
            {esAcep ? 'Elige un componente arriba y haz clic en una provincia para ver el detalle.'
              : esRend ? 'Elige componente o receta y haz clic en una provincia para ver sus municipios.'
              : 'Haz clic en una provincia para ver su detalle completo y entrar a sus municipios.'}
          </div>
        </div>
      );
    }

    if (muniPanel) {
      if (esAcep) {
        const r = datosAcepMuni(muniPanel);
        const pct = Number(r?.pct_aceptacion || 0);
        return (
          <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', color: LAB.muted }}>{nombreBonito(muniData.provincia).toUpperCase()} - MUNICIPIO</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: LAB.texto, marginTop: 2 }}>{muniPanel}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: LAB.muted }}>Aceptacion</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: acento.color }}>{r ? `${pct.toFixed(1)}%` : 'sin dato'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
              <Tarjeta label="Cocido (lb)" valor={Number(r?.total_cocido || 0).toLocaleString('es-DO')} />
              <Tarjeta label="Sobrante (lb)" valor={Number(r?.total_sobrante || 0).toLocaleString('es-DO')} />
              <Tarjeta label="Despachos" valor={Number(r?.despachos || 0)} />
            </div>
          </div>
        );
      }
      if (esRend) {
        const r = datosRendMuni(muniPanel);
        const v = Number(r?.lbs_por_100 || 0);
        return (
          <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', color: LAB.muted }}>{nombreBonito(muniData.provincia).toUpperCase()} - MUNICIPIO</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: LAB.texto, marginTop: 2 }}>{muniPanel}</div>
                <div style={{ fontSize: 11, color: LAB.muted, marginTop: 2 }}>{etiquetaRend}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: LAB.muted }}>Lb / 100 rac</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: acento.color }}>{r ? v.toFixed(2) : 'sin dato'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
              <Tarjeta label="Cocido (lb)" valor={Number(r?.libras_cocidas || 0).toLocaleString('es-DO')} />
              <Tarjeta label="Raciones" valor={Number(r?.raciones || 0).toLocaleString('es-DO')} />
              <Tarjeta label="Despachos" valor={Number(r?.despachos || 0)} />
            </div>
          </div>
        );
      }
      const m = muniData.municipios.find((x) => x.nombre === muniPanel);
      const r = datosMuni(muniPanel);
      const o = datosMuniOper(muniPanel);
      const pct = Number(r?.pct_captacion || 0);
      return (
        <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', color: LAB.muted }}>{nombreBonito(muniData.provincia).toUpperCase()} - MUNICIPIO</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: LAB.texto, marginTop: 2 }}>{muniPanel}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: LAB.muted }}>Captacion</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: LAB.cian }}>{cargandoMuni ? '...' : `${pct.toFixed(1)}%`}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
            <Tarjeta label="Cocinas" valor={Number(o?.total_cocinas || 0)} />
            <Tarjeta label="Escuelas" valor={`${Number(r?.escuelas_captadas || 0)} / ${Number(r?.escuelas_zona || 0)}`} />
            <Tarjeta label="Raciones" valor={Number(o?.total_raciones || 0).toLocaleString('es-DO')} />
            <Tarjeta label="Poblacion" valor={(m?.pob || 0).toLocaleString('es-DO')} />
            <Tarjeta label="Matricula zona" valor={Number(r?.matricula_total || 0).toLocaleString('es-DO')} />
            <Tarjeta label="Tu matricula" valor={Number(r?.matricula_captada || 0).toLocaleString('es-DO')} />
          </div>
        </div>
      );
    }

    if (esAcep) {
      const r = datosAcep(muniData.provincia);
      const pct = Number(r?.pct_aceptacion || 0);
      return (
        <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', color: LAB.muted }}>PROVINCIA</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: LAB.texto, marginTop: 2 }}>{nombreBonito(muniData.provincia)}</div>
              <div style={{ fontSize: 11, color: LAB.muted, marginTop: 2 }}>pasa el mouse por un municipio para ver su detalle</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: LAB.muted }}>Aceptacion</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: acento.color }}>{r ? `${pct.toFixed(1)}%` : 'sin dato'}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
            <Tarjeta label="Cocido (lb)" valor={Number(r?.total_cocido || 0).toLocaleString('es-DO')} />
            <Tarjeta label="Sobrante (lb)" valor={Number(r?.total_sobrante || 0).toLocaleString('es-DO')} />
            <Tarjeta label="Despachos" valor={Number(r?.despachos || 0)} />
          </div>
        </div>
      );
    }

    if (esRend) {
      const r = datosRend(muniData.provincia);
      const v = Number(r?.lbs_por_100 || 0);
      return (
        <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', color: LAB.muted }}>PROVINCIA</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: LAB.texto, marginTop: 2 }}>{nombreBonito(muniData.provincia)}</div>
              <div style={{ fontSize: 11, color: LAB.muted, marginTop: 2 }}>{etiquetaRend} - pasa el mouse por un municipio</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: LAB.muted }}>Lb / 100 rac</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: acento.color }}>{r ? v.toFixed(2) : 'sin dato'}</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
            <Tarjeta label="Cocido (lb)" valor={Number(r?.libras_cocidas || 0).toLocaleString('es-DO')} />
            <Tarjeta label="Raciones" valor={Number(r?.raciones || 0).toLocaleString('es-DO')} />
            <Tarjeta label="Despachos" valor={Number(r?.despachos || 0)} />
          </div>
        </div>
      );
    }

    const r = datosProv(muniData.provincia);
    const o = datosOper(muniData.provincia);
    const pct = pctProv(muniData.provincia);
    return (
      <div style={{ background: LAB.card, borderRadius: 14, border: `1px solid ${acento.borde}`, padding: '16px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', color: LAB.muted }}>PROVINCIA</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: LAB.texto, marginTop: 2 }}>{nombreBonito(muniData.provincia)}</div>
            <div style={{ fontSize: 11, color: LAB.muted, marginTop: 2 }}>pasa el mouse por un municipio para ver su detalle</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: LAB.muted }}>{lenteCfg.metricaTooltip}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: LAB.cian }}>{pct.toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginTop: 14 }}>
          <Tarjeta label="Cocinas" valor={Number(o?.total_cocinas || 0)} />
          <Tarjeta label="Escuelas" valor={`${Number(r?.escuelas_captadas || 0)} / ${Number(r?.escuelas_zona || 0)}`} />
          <Tarjeta label="Raciones" valor={Number(o?.total_raciones || 0).toLocaleString('es-DO')} />
          <Tarjeta label="Matricula zona" valor={Number(r?.matricula_total || 0).toLocaleString('es-DO')} />
          <Tarjeta label="Tu matricula" valor={Number(r?.matricula_captada || 0).toLocaleString('es-DO')} />
        </div>
      </div>
    );
  }

  function ChipLeyenda({ color, txt }) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: color, border: `1px solid ${LAB.borde}` }} />
        {txt}
      </span>
    );
  }
  function Tarjeta({ label, valor }) {
    return (
      <div style={{ background: LAB.bg, borderRadius: 10, border: `1px solid ${LAB.borde}`, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, color: LAB.muted, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: LAB.texto }}>{valor}</div>
      </div>
    );
  }
}