"use client";

import { useEffect, useRef } from "react";

type Node3 = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

/** Soft premium 3D mesh — slower motion, smoother parallax */
export function LandingHeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const nodes: Node3[] = [];
    const NODE_COUNT = 42;
    const LINK_DIST = 150;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seed = () => {
      nodes.length = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push({
          x: (Math.random() - 0.5) * w * 1.15,
          y: (Math.random() - 0.5) * h * 1.05,
          z: Math.random() * 520 - 160,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          vz: (Math.random() - 0.5) * 0.22,
        });
      }
    };

    const project = (n: Node3) => {
      const perspective = 560;
      const z = n.z + 420;
      const scale = perspective / (perspective + z);
      const px = w / 2 + (n.x + mouse.x * 36) * scale;
      const py = h / 2 + (n.y + mouse.y * 22) * scale;
      return { px, py, scale };
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    };

    const onLeave = () => {
      mouse.tx = 0;
      mouse.ty = 0;
    };

    const tick = () => {
      // butter-smooth follow
      mouse.x += (mouse.tx - mouse.x) * 0.035;
      mouse.y += (mouse.ty - mouse.y) * 0.035;

      ctx.clearRect(0, 0, w, h);

      const fog = ctx.createRadialGradient(
        w * 0.5 + mouse.x * 40,
        h * 0.38 + mouse.y * 24,
        20,
        w * 0.5,
        h * 0.42,
        Math.max(w, h) * 0.72
      );
      fog.addColorStop(0, "rgba(31, 107, 85, 0.09)");
      fog.addColorStop(0.45, "rgba(184, 134, 11, 0.03)");
      fog.addColorStop(1, "rgba(245, 249, 247, 0)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.z += n.vz;
        if (n.x < -w * 0.7 || n.x > w * 0.7) n.vx *= -1;
        if (n.y < -h * 0.62 || n.y > h * 0.62) n.vy *= -1;
        if (n.z < -260 || n.z > 400) n.vz *= -1;
      }

      const projected = nodes.map((n) => ({ n, ...project(n) }));

      ctx.lineCap = "round";
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const a = projected[i];
          const b = projected[j];
          const dist = Math.hypot(a.px - b.px, a.py - b.py);
          if (dist > LINK_DIST) continue;
          const alpha = (1 - dist / LINK_DIST) * 0.22 * Math.min(a.scale, b.scale);
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.strokeStyle = `rgba(31, 107, 85, ${alpha})`;
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }

      for (const p of projected) {
        const r = 1.4 + p.scale * 3.4;
        const glow = ctx.createRadialGradient(p.px, p.py, 0, p.px, p.py, r * 3.2);
        glow.addColorStop(0, `rgba(42, 138, 109, ${0.2 + p.scale * 0.25})`);
        glow.addColorStop(1, "rgba(42, 138, 109, 0)");
        ctx.beginPath();
        ctx.arc(p.px, p.py, r * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(20, 35, 31, ${0.16 + p.scale * 0.4})`;
        ctx.fill();
      }

      const t = performance.now() * 0.00022;
      const drawRing = (cx: number, cy: number, radius: number, skew: number, rot: number, color: string) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.scale(1, skew);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.35;
        ctx.stroke();
        ctx.restore();
      };

      drawRing(w * 0.74, h * 0.3, Math.min(w, h) * 0.2, 0.4, t, "rgba(184, 134, 11, 0.22)");
      drawRing(w * 0.74, h * 0.3, Math.min(w, h) * 0.135, 0.4, -t * 1.1, "rgba(31, 107, 85, 0.18)");
      drawRing(w * 0.2, h * 0.7, Math.min(w, h) * 0.15, 0.36, -t * 0.9, "rgba(31, 107, 85, 0.14)");

      raf = requestAnimationFrame(tick);
    };

    resize();
    seed();
    tick();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="lp-hero-canvas" aria-hidden />;
}
