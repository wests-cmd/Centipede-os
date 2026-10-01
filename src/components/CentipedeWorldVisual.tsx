import React, { useEffect, useRef } from 'react';

export type VisualQuality = 'HIGH' | 'BALANCED' | 'LOW_POWER';
export type MotionPreference = 'FULL' | 'REDUCED' | 'OFF';
export type HomeVisual = 'centipede-world' | 'neon-dragon' | 'space-nebula' | 'abstract-orb';

export const HOME_VISUALS: { id: HomeVisual; name: string; description: string }[] = [
  { id: 'centipede-world', name: 'Centipede + World', description: 'The Centipede OS signature scene' },
  { id: 'neon-dragon', name: 'Neon Dragon', description: 'A luminous creature crossing a star field' },
  { id: 'space-nebula', name: 'Space Nebula', description: 'A quiet cloud of color and distant stars' },
  { id: 'abstract-orb', name: 'Abstract Orb', description: 'Layered glass-like spheres and orbital rings' },
];

interface CentipedeWorldVisualProps {
  visual?: HomeVisual;
  quality?: VisualQuality;
  motion?: MotionPreference;
  className?: string;
}

const seeded = (n: number) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

export const CentipedeWorldVisual: React.FC<CentipedeWorldVisualProps> = ({
  visual = 'centipede-world',
  quality = 'BALANCED',
  motion = 'FULL',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    const reducedBySystem = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionMode = reducedBySystem && motion === 'FULL' ? 'REDUCED' : motion;
    const dprLimit = quality === 'HIGH' ? 1.5 : 1.15;
    const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
    const starCount = quality === 'HIGH' ? 100 : quality === 'BALANCED' ? 64 : 34;
    const segments = quality === 'HIGH' ? 42 : quality === 'BALANCED' ? 32 : 22;
    const stars = Array.from({ length: starCount }, (_, i) => ({
      x: seeded(i + 1),
      y: seeded(i + 301),
      r: 0.35 + seeded(i + 911) * 1.05,
      a: 0.18 + seeded(i + 1201) * 0.48,
    }));
    let frame = 0;
    let angle = -0.3;
    let width = 1;
    let height = 1;
    let visible = true;
    let disposed = false;
    let lastTime = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawStars = (time: number) => {
      for (const star of stars) {
        const twinkle = motionMode === 'FULL' ? 0.82 + Math.sin(time * 0.0007 + star.x * 17) * 0.18 : 1;
        ctx.globalAlpha = star.a * twinkle;
        ctx.fillStyle = '#dbeafe';
        ctx.beginPath();
        ctx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const drawNebula = (cx: number, cy: number, radius: number, time: number) => {
      const glow = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.25, radius * 0.04, cx, cy, radius * 1.45);
      glow.addColorStop(0, 'rgba(34, 211, 238, .18)');
      glow.addColorStop(0.45, 'rgba(79, 70, 229, .12)');
      glow.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - radius * 1.5, cy - radius * 1.5, radius * 3, radius * 3);

      for (let i = 0; i < 7; i++) {
        const orbit = (i / 7) * Math.PI * 2 + (motionMode === 'FULL' ? time * 0.00003 : 0);
        const x = cx + Math.cos(orbit) * radius * 0.68;
        const y = cy + Math.sin(orbit) * radius * 0.32;
        const blob = ctx.createRadialGradient(x, y, 1, x, y, radius * 0.34);
        blob.addColorStop(0, i % 2 ? 'rgba(56, 189, 248, .14)' : 'rgba(168, 85, 247, .12)');
        blob.addColorStop(1, 'rgba(2, 6, 23, 0)');
        ctx.fillStyle = blob;
        ctx.beginPath();
        ctx.ellipse(x, y, radius * 0.35, radius * 0.17, orbit, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawOrb = (cx: number, cy: number, radius: number, time: number) => {
      const orbGlow = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.05, cx, cy, radius * 1.25);
      orbGlow.addColorStop(0, 'rgba(125, 211, 252, .92)');
      orbGlow.addColorStop(0.28, 'rgba(59, 130, 246, .66)');
      orbGlow.addColorStop(0.72, 'rgba(99, 102, 241, .22)');
      orbGlow.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = orbGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(103, 232, 249, .48)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius * (0.85 + i * 0.22), radius * (0.24 + i * 0.055), -0.32 + i * 0.28 + (motionMode === 'OFF' ? 0 : time * 0.000025), 0, Math.PI * 2);
        ctx.stroke();
      }
      const orbitTime = motionMode === 'FULL' ? time * 0.00018 : 0;
      const satelliteX = cx + Math.cos(orbitTime) * radius * 1.02;
      const satelliteY = cy + Math.sin(orbitTime) * radius * 0.28;
      ctx.fillStyle = '#a5f3fc';
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(satelliteX, satelliteY, Math.max(3, radius * 0.055), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const drawEarth = (cx: number, cy: number, radius: number, time: number) => {
      ctx.save();
      ctx.shadowColor = 'rgba(14, 165, 233, .55)';
      ctx.shadowBlur = 26;
      const ocean = ctx.createRadialGradient(cx - radius * 0.32, cy - radius * 0.38, radius * 0.06, cx, cy, radius * 1.08);
      ocean.addColorStop(0, '#3c91b4');
      ocean.addColorStop(0.45, '#15547a');
      ocean.addColorStop(0.82, '#0a304f');
      ocean.addColorStop(1, '#020817');
      ctx.fillStyle = ocean;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.clip();

      // Simplified, original continent silhouettes give the planet land detail without external assets.
      const mapShift = Math.sin(time * 0.000035) * radius * 0.14;
      const continents = [
        [[-0.72,-0.34],[-0.52,-0.52],[-0.33,-0.48],[-0.24,-0.30],[-0.36,-0.12],[-0.43,0.05],[-0.34,0.23],[-0.47,0.48],[-0.60,0.34],[-0.67,0.08]],
        [[-0.10,-0.54],[0.13,-0.58],[0.28,-0.40],[0.18,-0.25],[0.31,-0.08],[0.18,0.18],[0.11,0.46],[-0.06,0.32],[-0.16,0.02],[-0.26,-0.23]],
        [[0.30,-0.42],[0.55,-0.48],[0.70,-0.28],[0.62,-0.08],[0.74,0.10],[0.54,0.29],[0.36,0.17],[0.26,-0.08]],
      ];
      ctx.fillStyle = 'rgba(126, 169, 112, .94)';
      for (const points of continents) {
        const pointAt = (point: number[]) => [cx + point[0] * radius + mapShift, cy + point[1] * radius];
        const first = pointAt(points[0]);
        const last = pointAt(points[points.length - 1]);
        ctx.beginPath();
        ctx.moveTo((first[0] + last[0]) / 2, (first[1] + last[1]) / 2);
        points.forEach((point, index) => {
          const current = pointAt(point);
          const next = pointAt(points[(index + 1) % points.length]);
          ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
        });
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(191, 219, 254, .17)';
      for (const [x, y, size] of [[0.33, -0.5, 0.07], [-0.6, -0.25, 0.035], [0.56, 0.36, 0.05]]) {
        ctx.beginPath();
        ctx.ellipse(cx + x * radius + mapShift, cy + y * radius, size * radius, size * radius * 0.55, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(191, 219, 254, .12)';
      ctx.beginPath();
      ctx.ellipse(cx - radius * 0.45, cy - radius * 0.76, radius * 0.48, radius * 0.14, -0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(125, 211, 252, .20)';
      ctx.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = cy + Math.sin((lat * Math.PI) / 180) * radius;
        const rx = Math.cos((lat * Math.PI) / 180) * radius;
        ctx.beginPath();
        ctx.ellipse(cx, y, rx, Math.max(3, radius * 0.09), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      const atmosphere = ctx.createRadialGradient(cx - radius * 0.65, cy - radius * 0.7, radius * 0.1, cx, cy, radius * 1.15);
      atmosphere.addColorStop(0.72, 'rgba(56, 189, 248, 0)');
      atmosphere.addColorStop(0.92, 'rgba(56, 189, 248, .10)');
      atmosphere.addColorStop(1, 'rgba(125, 211, 252, .62)');
      ctx.fillStyle = atmosphere;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.05, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawCentipede = (cx: number, cy: number, radius: number, time: number, dragon = false) => {
      const rx = radius * (dragon ? 1.32 : 1.2);
      const ry = radius * (dragon ? 0.7 : 0.78);
      const points = Array.from({ length: segments }, (_, i) => {
        const progress = i / segments;
        const theta = angle + progress * Math.PI * 2;
        const wobble = dragon ? Math.sin(progress * 14 + time * 0.001) * 7 : 0;
        return {
          theta,
          x: cx + Math.cos(theta) * (rx + wobble),
          y: cy + Math.sin(theta) * (ry + wobble * 0.35),
          scale: 0.68 + (Math.sin(theta) + 1) * 0.16,
          index: i,
        };
      });

      // Back arc is drawn beneath the planet to make the body read as a full orbit.
      const back = points.filter((point) => point.y < cy);
      const front = points.filter((point) => point.y >= cy);
      const drawPart = (part: typeof points) => {
        if (part.length > 1) {
          ctx.beginPath();
          let previous: (typeof points)[number] | null = null;
          for (const current of part) {
            if (previous && current.index - previous.index === 1) {
              ctx.quadraticCurveTo(previous.x, previous.y, (previous.x + current.x) / 2, (previous.y + current.y) / 2);
            } else {
              ctx.moveTo(current.x, current.y);
            }
            previous = current;
          }
          ctx.strokeStyle = dragon ? 'rgba(131, 24, 67, .86)' : 'rgba(124, 45, 18, .9)';
          ctx.lineWidth = Math.max(4, radius * 0.073);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.shadowColor = dragon ? 'rgba(236, 72, 153, .36)' : 'rgba(249, 115, 22, .42)';
          ctx.shadowBlur = radius * 0.06;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        for (const point of part) {
          const p = (point.index / segments) * Math.PI * 2;
          const headScale = point.index === 0 ? 1.3 : 1;
          const size = Math.max(3.5, radius * (dragon ? 0.085 : 0.072) * point.scale * headScale);
          const legWave = motionMode === 'FULL' ? Math.sin(time * 0.009 + point.index * 0.72) * 3 : 0;
          const normalX = Math.cos(point.theta) * (dragon ? 1.15 : 0.95);
          const normalY = Math.sin(point.theta) * 0.9;
          const legCount = quality === 'LOW_POWER' ? 1 : 2;
          ctx.strokeStyle = dragon ? 'rgba(244, 114, 182, .83)' : 'rgba(251, 146, 60, .86)';
          ctx.lineWidth = Math.max(1.1, radius * 0.013);
          ctx.lineCap = 'round';
          for (let side = -1; side <= 1; side += 2) {
            for (let limb = 0; limb < legCount; limb++) {
              const direction = side * (0.8 + limb * 0.13);
              const bend = legWave * direction;
              ctx.beginPath();
              ctx.moveTo(point.x + normalX * size * 0.4, point.y + normalY * size * 0.4);
              ctx.quadraticCurveTo(
                point.x + normalX * (size + radius * 0.035) + bend,
                point.y + normalY * (size + radius * 0.04),
                point.x + normalX * (size + radius * (0.11 + limb * 0.035)) + bend,
                point.y + normalY * (size + radius * (0.11 + limb * 0.035)) + direction * radius * 0.035
              );
              ctx.stroke();
            }
          }

          const shell = ctx.createRadialGradient(point.x - size * 0.3, point.y - size * 0.45, size * 0.04, point.x, point.y, size * 1.1);
          shell.addColorStop(0, dragon ? '#fbcfe8' : '#fed7aa');
          shell.addColorStop(0.28, dragon ? '#ec4899' : '#f97316');
          shell.addColorStop(0.72, dragon ? '#86198f' : '#7c2d12');
          shell.addColorStop(1, '#101827');
          ctx.shadowColor = dragon ? 'rgba(236, 72, 153, .66)' : 'rgba(249, 115, 22, .65)';
          ctx.shadowBlur = size * 1.7;
          ctx.fillStyle = shell;
          ctx.beginPath();
          ctx.ellipse(point.x, point.y, size * 1.1, size * 0.78, p, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = dragon ? 'rgba(251, 207, 232, .45)' : 'rgba(253, 186, 116, .55)';
          ctx.lineWidth = 1;
          ctx.stroke();

          if (point.index === 0) {
            ctx.fillStyle = '#111827';
            ctx.beginPath();
            ctx.arc(point.x - size * 0.25, point.y - size * 0.06, Math.max(1.7, size * 0.12), 0, Math.PI * 2);
            ctx.arc(point.x + size * 0.25, point.y - size * 0.06, Math.max(1.7, size * 0.12), 0, Math.PI * 2);
            ctx.fill();
          }

          if (dragon) {
            ctx.fillStyle = 'rgba(251, 207, 232, .82)';
            ctx.beginPath();
            ctx.moveTo(point.x, point.y - size * 0.72);
            ctx.lineTo(point.x - size * 0.38, point.y - size * 1.48);
            ctx.lineTo(point.x + size * 0.3, point.y - size * 0.68);
            ctx.fill();
          }
        }
      };

      drawPart(back);
      if (visual === 'centipede-world') drawEarth(cx, cy, radius, time);
      drawPart(front);
      const head = points[0];
      ctx.strokeStyle = dragon ? '#f9a8d4' : '#fdba74';
      ctx.lineWidth = 1.6;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        ctx.quadraticCurveTo(head.x + side * 4, head.y - radius * 0.09, head.x + side * radius * 0.12, head.y - radius * 0.16);
        ctx.stroke();
      }
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(head.x, head.y, Math.max(1.6, radius * 0.018), 0, Math.PI * 2);
      ctx.fill();
    };

    const render = (time: number) => {
      if (disposed) return;
      if (!visible || document.hidden) {
        frame = 0;
        return;
      }
      if (lastTime && time - lastTime < (quality === 'LOW_POWER' ? 1000 / 24 : 1000 / 30)) {
        frame = requestAnimationFrame(render);
        return;
      }
      lastTime = time;
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);
      drawStars(time);

      const cx = width * (width < 640 ? 0.72 : 0.67);
      const cy = height * 0.51;
      const radius = Math.min(height * 0.38, width * 0.22, 164);
      drawNebula(cx, cy, radius * 2.7, time);

      if (visual === 'centipede-world') {
        drawCentipede(cx, cy, radius, time);
      } else if (visual === 'neon-dragon') {
        drawOrb(cx, cy, radius * 0.83, time);
        drawCentipede(cx, cy, radius, time, true);
      } else if (visual === 'space-nebula') {
        drawNebula(cx, cy, radius * 2.2, time);
      } else {
        drawOrb(cx, cy, radius * 1.1, time);
      }

      if (motionMode === 'FULL') {
        angle += quality === 'HIGH' ? 0.0031 : quality === 'BALANCED' ? 0.0022 : 0.0014;
        frame = requestAnimationFrame(render);
      }
    };

    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) {
        if (motionMode === 'FULL') frame = requestAnimationFrame(render);
        else if (!document.hidden) render(performance.now());
      }
      if (!visible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    }, { threshold: 0.01 });
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (motionMode === 'OFF') render(performance.now());
      else if (visible && !frame && !document.hidden && motionMode === 'FULL') frame = requestAnimationFrame(render);
    });
    resize();
    intersection.observe(canvas);
    resizeObserver.observe(canvas);
    const handleVisibility = () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (!document.hidden && visible && !frame) {
        if (motionMode === 'FULL') frame = requestAnimationFrame(render);
        else render(performance.now());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    if (motionMode === 'FULL') frame = requestAnimationFrame(render);
    else render(performance.now());

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [visual, quality, motion]);

  const profileName = HOME_VISUALS.find((profile) => profile.id === visual)?.name ?? HOME_VISUALS[0].name;

  return (
    <div
      role="img"
      aria-label={`${profileName} animated home scene`}
      className={`absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-slate-950 ${className}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/10 to-slate-950/5" />
    </div>
  );
};
