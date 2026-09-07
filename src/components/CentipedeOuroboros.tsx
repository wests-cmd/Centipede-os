import React from 'react';

export const CentipedeOuroboros: React.FC<{ size?: number; className?: string }> = ({ size = 280, className = '' }) => {
  // Generate 24 segmented centipede legs/body arcs around a circular Ouroboros path
  const numSegments = 24;
  const radius = 90;
  const center = 140;

  const segments = Array.from({ length: numSegments }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / numSegments;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    // Leg extends outwards perpendicular to circle
    const legLength = 16;
    const legX = center + (radius + legLength) * Math.cos(angle + 0.15);
    const legY = center + (radius + legLength) * Math.sin(angle + 0.15);

    return { i, angle, x, y, legX, legY };
  });

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 280 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-700"
      >
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="segmentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Ambient Core Glow */}
        <circle cx={center} cy={center} r={120} fill="url(#coreGlow)" />

        {/* Ouroboros Circular Backbone */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#segmentGrad)"
          strokeWidth="3"
          strokeDasharray="6 4"
          className="animate-[spin_40s_linear_infinite]"
        />

        <circle
          cx={center}
          cy={center}
          r={radius - 12}
          stroke="#0284c7"
          strokeWidth="1"
          strokeOpacity="0.3"
        />

        {/* Segmented Centipede Body Nodes & Legs */}
        {segments.map((s) => (
          <g key={s.i}>
            {/* Centipede Leg Pair */}
            <line
              x1={s.x}
              y1={s.y}
              x2={s.legX}
              y2={s.legY}
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.7"
            />
            {/* Segment Node */}
            <circle
              cx={s.x}
              cy={s.y}
              r={s.i === 0 ? 5 : 3.5}
              fill={s.i === 0 ? '#38bdf8' : '#22d3ee'}
              className={s.i % 2 === 0 ? 'animate-pulse' : ''}
            />
          </g>
        ))}

        {/* Centipede Ouroboros Head biting Tail Indicator */}
        <path
          d={`M ${center + radius} ${center} Q ${center + radius + 10} ${center - 10} ${center + radius - 5} ${center - 15}`}
          stroke="#38bdf8"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Inner Tech Crosshair Rings */}
        <circle cx={center} cy={center} r={45} stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.4" />
        <circle cx={center} cy={center} r={20} fill="#0369a1" fillOpacity="0.2" stroke="#0284c7" strokeWidth="1" />
      </svg>

      {/* OS Identity Overlay */}
      <div className="mt-4 text-center space-y-1">
        <h1 className="text-2xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]">
          CENTIPEDE OS
        </h1>
        <p className="text-xs font-semibold text-cyan-300/80 tracking-wider uppercase font-mono">
          AI + TOOLS + MEMORY + SKILLS
        </p>
        <p className="text-[10px] text-slate-400 font-mono tracking-tight">
          One System. Infinite Possibilities.
        </p>
      </div>
    </div>
  );
};
