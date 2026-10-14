/**
 * Drawn stand-in for the 3D hero, shown while the scene loads and on browsers without WebGL:
 * a rim-lit planet, a floating rock with a seated silhouette, and holographic windows.
 */
export function SceneFallback() {
  const panels = [
    { x: 60, y: 70, w: 150, h: 96, r: 8 },
    { x: 220, y: 30, w: 170, h: 108, r: 3 },
    { x: 400, y: 60, w: 120, h: 130, r: -6 },
  ];

  return (
    <svg viewBox="0 0 560 480" className="absolute inset-0 size-full" role="img" aria-label="An astronaut on a floating rock among holographic code windows">
      <defs>
        <radialGradient id="fb-planet" cx="0.35" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#4c1d95" />
          <stop offset="1" stopColor="#0b1240" />
        </radialGradient>
        <linearGradient id="fb-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#323a60" />
          <stop offset="1" stopColor="#0b1022" />
        </linearGradient>
        <radialGradient id="fb-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="470" cy="70" r="70" fill="url(#fb-planet)" stroke="#67e8f9" strokeOpacity="0.6" strokeWidth="2" />
      {panels.map((panel, i) => (
        <g key={i} transform={`translate(${panel.x} ${panel.y}) skewY(${panel.r})`}>
          <rect width={panel.w} height={panel.h} rx="8" fill="#0e7490" fillOpacity="0.14" stroke="#67e8f9" strokeOpacity="0.8" />
          {[0, 1, 2, 3, 4].map((row) => (
            <rect key={row} x={12 + (row % 2) * 10} y={22 + row * 14} width={panel.w * (0.35 + ((row * 37 + i * 13) % 40) / 100)} height="5" rx="2.5" fill={row % 2 ? "#a78bfa" : "#67e8f9"} fillOpacity="0.85" />
          ))}
        </g>
      ))}
      <ellipse cx="290" cy="400" rx="190" ry="60" fill="url(#fb-glow)" />
      <path d="M130 320 L450 320 L420 360 L330 430 L290 470 L250 430 L170 365 Z" fill="url(#fb-rock)" />
      <ellipse cx="290" cy="320" rx="160" ry="16" fill="#1c2240" stroke="#22d3ee" strokeOpacity="0.9" strokeWidth="2" />
      <g transform="translate(270 248)">
        <ellipse cx="22" cy="74" rx="30" ry="8" fill="#0b1022" />
        <rect x="6" y="28" width="34" height="44" rx="14" fill="#dfe5f1" />
        <circle cx="23" cy="18" r="17" fill="#dfe5f1" />
        <rect x="40" y="50" width="34" height="20" rx="3" fill="#22d3ee" />
      </g>
    </svg>
  );
}
