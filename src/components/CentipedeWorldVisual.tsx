import React, { useEffect, useRef } from 'react';

export type VisualQuality = 'HIGH' | 'BALANCED' | 'LOW_POWER';
export type MotionPreference = 'FULL' | 'REDUCED' | 'OFF';

interface CentipedeWorldVisualProps {
  quality?: VisualQuality;
  motion?: MotionPreference;
  activeProfileName?: string;
  className?: string;
}

export const CentipedeWorldVisual: React.FC<CentipedeWorldVisualProps> = ({
  quality = 'BALANCED',
  motion = 'FULL',
  activeProfileName = 'Centipede Around the World',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isVisible = true;
    let angle = 0;

    // Respect Motion Preference & Quality
    const isOff = motion === 'OFF';
    const isReduced = motion === 'REDUCED';
    const numLegs = quality === 'HIGH' ? 36 : quality === 'BALANCED' ? 24 : 16;
    const numSegments = quality === 'HIGH' ? 20 : quality === 'BALANCED' ? 14 : 10;

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const dpr = Math.min(window.devicePixelRatio || 1, quality === 'HIGH' ? 2 : 1.5);
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    const render = (timestamp: number) => {
      if (!isVisible) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const width = canvas.width / (Math.min(window.devicePixelRatio || 1, quality === 'HIGH' ? 2 : 1.5));
      const height = canvas.height / (Math.min(window.devicePixelRatio || 1, quality === 'HIGH' ? 2 : 1.5));

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const globeRadius = Math.min(width, height) * 0.28;

      // 1. Draw Rotating Earth Globe
      ctx.save();
      ctx.translate(centerX, centerY);

      // Globe Background
      const globeGradient = ctx.createRadialGradient(
        -globeRadius * 0.3,
        -globeRadius * 0.3,
        globeRadius * 0.1,
        0,
        0,
        globeRadius
      );
      globeGradient.addColorStop(0, '#1e293b'); // slate-800
      globeGradient.addColorStop(1, '#020617'); // slate-950
      ctx.fillStyle = globeGradient;
      ctx.beginPath();
      ctx.arc(0, 0, globeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2563eb'; // Blue system accent
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Globe Latitude Grid Lines
      if (!isOff) {
        angle += isReduced ? 0.001 : quality === 'HIGH' ? 0.005 : 0.003;
      }

      ctx.strokeStyle = '#1e3a8a'; // Deep blue grid
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        const rad = (lat * Math.PI) / 180;
        const r = globeRadius * Math.cos(rad);
        const y = globeRadius * Math.sin(rad);
        ctx.beginPath();
        ctx.ellipse(0, y, r, r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Globe Longitude Grid Lines (Rotated)
      for (let lon = 0; lon < 180; lon += 45) {
        ctx.beginPath();
        const currentLonAngle = angle + (lon * Math.PI) / 180;
        ctx.ellipse(0, 0, globeRadius * Math.abs(Math.sin(currentLonAngle)), globeRadius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // 2. Draw Giant Centipede Body Wrapped Around the Globe
      const orbitRadius = globeRadius * 1.25;
      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw Segments
      for (let i = 0; i < numSegments; i++) {
        const segProgress = i / numSegments;
        const segAngle = angle * 1.5 + segProgress * Math.PI * 1.8;
        const segX = Math.cos(segAngle) * orbitRadius;
        const segY = Math.sin(segAngle) * (orbitRadius * 0.7); // Elliptical orbit around world

        // Segment Legs (Procedural Sinusoidal Motion)
        if (!isOff && !isReduced) {
          const legPhase = timestamp * 0.005 + i * 0.4;
          const legSwing1 = Math.sin(legPhase) * 12;
          const legSwing2 = Math.cos(legPhase) * 12;

          ctx.strokeStyle = i === 0 ? '#dc2626' : '#2563eb'; // Head legs red, body legs blue
          ctx.lineWidth = 1.5;

          // Left Leg
          ctx.beginPath();
          ctx.moveTo(segX, segY);
          ctx.lineTo(segX + Math.cos(segAngle + Math.PI / 2) * (20 + legSwing1), segY + Math.sin(segAngle + Math.PI / 2) * (20 + legSwing1));
          ctx.stroke();

          // Right Leg
          ctx.beginPath();
          ctx.moveTo(segX, segY);
          ctx.lineTo(segX + Math.cos(segAngle - Math.PI / 2) * (20 + legSwing2), segY + Math.sin(segAngle - Math.PI / 2) * (20 + legSwing2));
          ctx.stroke();
        }

        // Segment Shell
        ctx.fillStyle = i === 0 ? '#dc2626' : i === numSegments - 1 ? '#0f172a' : '#1e293b';
        ctx.strokeStyle = i === 0 ? '#ef4444' : '#2563eb';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        const segRadius = i === 0 ? 12 : Math.max(6, 10 - i * 0.3);
        ctx.arc(segX, segY, segRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Mandibles on Head Segment
        if (i === 0) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(segX, segY, 16, segAngle - 0.5, segAngle + 0.5);
          ctx.stroke();
        }
      }

      ctx.restore();

      if (!isOff) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [quality, motion]);

  return (
    <div className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="absolute bottom-4 left-4 z-10 text-xs text-slate-500 font-mono flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        <span>Visual: {activeProfileName}</span>
        <span className="text-slate-600">|</span>
        <span>Quality: {quality}</span>
      </div>
    </div>
  );
};
