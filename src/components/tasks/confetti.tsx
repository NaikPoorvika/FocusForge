import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rot: number;
  vr: number;
  life: number;
}

// Pastel lavender / lilac / pink / mint palette for a dreamy floral celebration.
const COLORS = ["#B388EB", "#C8A2E8", "#D8B4F8", "#F3EEFF", "#FADADD", "#C6E7C6", "#FFFFFF"];


export function Confetti({ show, onDone }: { show: boolean; onDone?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!show) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const w = window.innerWidth;
    for (let i = 0; i < 160; i++) {
      particles.push({
        x: w / 2 + (Math.random() - 0.5) * 120,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 14 - 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 6 + 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
      });
    }

    const gravity = 0.35;
    const maxLife = 180;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        p.life++;
        if (p.life > maxLife) continue;
        alive++;
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.life / maxLife);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [show, onDone]);

  if (!show) return null;
  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-[100]"
      aria-hidden
    />
  );
}
