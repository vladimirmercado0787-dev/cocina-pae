// IntroCentroMando.jsx — Andamio / Cocina PAE
// Intro cinematografico que se reproduce al entrar al Centro de Mando,
// justo despues de verificar la clave de poder. Aro de luz sobre negro
// que revela "CENTRO DE MANDO · ACCESO RESTRINGIDO".
//
// Props:
//   onComplete  : funcion que se llama cuando termina el intro (enganchala
//                 para mostrar el panel). Tambien se llama al tocar/saltar.
//   autoEntrar  : (default true) true = al terminar entra solo al panel.
//                 false = se queda en "CENTRO DE MANDO" hasta que toques.
//   duracion    : (default 7600) duracion total en milisegundos.
//
// Uso tipico (tras verificar la clave con bcrypt):
//   {claveOk && !introListo
//     ? <IntroCentroMando onComplete={() => setIntroListo(true)} />
//     : <PanelCentroMando ... />}

import { useRef, useEffect, useState } from 'react';

export default function IntroCentroMando({ onComplete, autoEntrar = true, duracion = 7600 }) {
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const skipAtRef = useRef(null);
  const doneRef = useRef(false);
  const [mostrarHint, setMostrarHint] = useState(false);

  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // tocar la pantalla = saltar el intro
  const handleSkip = () => {
    if (!doneRef.current && skipAtRef.current === null) {
      skipAtRef.current = performance.now();
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setMostrarHint(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf = 0;
    let start = null;
    let W = 0, H = 0;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
    };
    resize();
    window.addEventListener('resize', resize);

    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // sprites de brillo (se generan una sola vez)
    const makeGlow = (stops) => {
      const s = 128, c = document.createElement('canvas');
      c.width = c.height = s;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      stops.forEach(([o, col]) => grd.addColorStop(o, col));
      g.fillStyle = grd; g.fillRect(0, 0, s, s);
      return c;
    };
    const gWhite = makeGlow([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
    const gGold = makeGlow([[0, 'rgba(255,206,130,0.95)'], [0.4, 'rgba(212,165,70,0.4)'], [1, 'rgba(150,110,40,0)']]);
    const gCool = makeGlow([[0, 'rgba(196,222,190,0.6)'], [0.4, 'rgba(130,180,150,0.22)'], [1, 'rgba(90,150,120,0)']]);

    const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const stamp = (sp, x, y, size, alpha) => {
      if (alpha <= 0.003) return;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sp, x - size / 2, y - size / 2, size, size);
    };

    const drawReveal = (cx, cy, r, alpha) => {
      const fam = (getComputedStyle(document.body).fontFamily) || 'sans-serif';
      const main = Math.max(20, Math.min(W * 0.05, 56));
      const topS = Math.max(11, main * 0.34);
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '500 ' + topS + 'px ' + fam; try { ctx.letterSpacing = (topS * 0.45) + 'px'; } catch (e) {}
      ctx.globalAlpha = alpha * 0.85; ctx.fillStyle = 'rgba(212,178,108,0.95)';
      ctx.fillText('ANDAMIO', cx - (topS * 0.225), cy - main * 0.95); ctx.restore();
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 ' + main + 'px ' + fam; try { ctx.letterSpacing = (main * 0.14) + 'px'; } catch (e) {}
      const grd = ctx.createLinearGradient(0, cy - main * 0.7, 0, cy + main * 0.7);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.5, '#e6e8ef'); grd.addColorStop(0.5, '#c2c8d2'); grd.addColorStop(1, '#9aa1ad');
      ctx.globalAlpha = alpha; ctx.fillStyle = grd; ctx.fillText('CENTRO DE MANDO', cx - (main * 0.07), cy); ctx.restore();
      if (r > 0.5) {
        const s2 = Math.max(10, main * 0.26);
        ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '400 ' + s2 + 'px ' + fam; try { ctx.letterSpacing = (s2 * 0.32) + 'px'; } catch (e) {}
        ctx.globalAlpha = alpha * clamp((r - 0.5) / 0.45, 0, 1) * 0.9; ctx.fillStyle = 'rgba(190,165,110,0.92)';
        ctx.fillText('ACCESO RESTRINGIDO', cx - (s2 * 0.16), cy + main * 0.98); ctx.restore();
      }
    };

    const endT = duracion / 1000;
    const fullEnd = reduce ? 1.6 : endT;
    const fadeStart = fullEnd - 0.6;
    const holdT = endT - 0.8;

    const finalizar = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      if (onCompleteRef.current) onCompleteRef.current();
    };

    const frame = (now) => {
      if (start === null) start = now;
      const T = (now - start) / 1000;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

      // tiempo de escena: si no auto-entra, se congela en el hold; con reduce, va directo al final
      const Tscene = reduce ? holdT : (autoEntrar ? T : Math.min(T, holdT));

      const cx = W / 2, cy = H * 0.46;
      const baseR = Math.min(W * 0.27, H * 0.46), rx = baseR, ry = baseR * 0.42;
      const appear = clamp(Tscene / 0.6, 0, 1);
      const headA = -Math.PI / 2 + easeOut(clamp(Tscene / 3.2, 0, 1)) * Math.PI * 2 * 1.7 + Math.max(0, Tscene - 3.2) * 0.9;
      const flash = Math.max(0, 1 - Math.abs(Tscene - 3.25) / 0.45);
      const reveal = clamp((Tscene - 3.5) / 1.0, 0, 1);
      const ringBright = appear * (1 - 0.45 * clamp((Tscene - 3.6) / 1.2, 0, 1));

      ctx.globalCompositeOperation = 'lighter';
      stamp(gWhite, cx, cy, baseR * 1.6, 0.05 * appear + 0.95 * flash);
      const SEG = 170, tail = 2.6;
      for (let h = 0; h < 2; h++) {
        const headAngle = headA + h * Math.PI;
        for (let i = 0; i < SEG; i++) {
          const a = (i / SEG) * Math.PI * 2;
          const d = ((headAngle - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          const b = Math.exp(-d * tail) + 0.15 * Math.exp(-(Math.PI * 2 - d) * 6);
          if (b < 0.01) continue;
          const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
          const nx = Math.cos(a), ny = Math.sin(a) * (ry / rx), bb = b * ringBright;
          stamp(gGold, x + nx * 6, y + ny * 6, 46 * (0.6 + bb), 0.55 * bb);
          stamp(gCool, x - nx * 5, y - ny * 5, 34 * (0.6 + bb), 0.4 * bb);
          stamp(gWhite, x, y, 26 * (0.5 + bb), 0.9 * bb);
        }
        const hx = cx + Math.cos(headAngle) * rx, hy = cy + Math.sin(headAngle) * ry;
        stamp(gWhite, hx, hy, 72 * ringBright, 0.9 * ringBright);
        stamp(gGold, hx, hy, 112 * ringBright, 0.5 * ringBright);
      }
      if (reveal > 0) {
        ctx.globalCompositeOperation = 'lighter';
        stamp(gWhite, cx, cy, baseR * 1.25, 0.16 * reveal);
        ctx.globalCompositeOperation = 'source-over';
        drawReveal(cx, cy, reveal, reveal);
      }

      // fundido de salida (auto-entrar) o por salto
      let bo = autoEntrar ? clamp((T - fadeStart) / 0.6, 0, 1) : 0;
      if (skipAtRef.current !== null) bo = Math.max(bo, clamp((now - skipAtRef.current) / 350, 0, 1));
      if (bo > 0) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = bo; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      }

      const skipDone = skipAtRef.current !== null && (now - skipAtRef.current) >= 350;
      const autoDone = autoEntrar && T >= fullEnd;
      if (skipDone || autoDone) { finalizar(); return; }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [autoEntrar, duracion]);

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#000',
        cursor: 'pointer', overflow: 'hidden',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute', bottom: '26px', right: '30px',
          color: 'rgba(190,165,110,0.7)', fontSize: '12px', letterSpacing: '0.22em',
          pointerEvents: 'none', opacity: mostrarHint ? 1 : 0, transition: 'opacity 0.8s ease',
          userSelect: 'none',
        }}
      >
        SALTAR ›
      </div>
    </div>
  );
}