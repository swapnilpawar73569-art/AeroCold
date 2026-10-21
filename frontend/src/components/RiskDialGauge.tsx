import React from 'react';

interface RiskDialGaugeProps {
  probability: number; // 0.0 to 1.0
  riskLevel: string;   // 'Low' | 'Medium' | 'High'
  size?: number;
}

export const RiskDialGauge: React.FC<RiskDialGaugeProps> = ({
  probability,
  riskLevel,
  size = 200,
}) => {
  const clampedProb = Math.min(Math.max(probability, 0), 1);
  const percent = Math.round(clampedProb * 100);

  // Gauge geometry: semicircle from 180° to 360° (or -180 to 0)
  const radius = size * 0.42;
  const strokeWidth = size * 0.08;
  const cx = size / 2;
  const cy = size * 0.58;

  // Semicircle arc length = PI * radius
  const arcLength = Math.PI * radius;
  // Needle angle: 0% -> -90° (left), 100% -> 90° (right)
  const needleAngle = -90 + clampedProb * 180;

  const color =
    riskLevel === 'High'
      ? '#ef4444'
      : riskLevel === 'Medium'
      ? '#f59e0b'
      : '#10b981';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="30%" stopColor="#10b981" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="65%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background Track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Colored Track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={0}
          opacity={0.85}
        />

        {/* Dynamic Glowing Progress Arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * 1.15}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength * (1 - clampedProb)}
          filter="url(#glow)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease' }}
        />

        {/* Needle */}
        <g
          transform={`translate(${cx}, ${cy}) rotate(${needleAngle})`}
          style={{ transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={-radius * 0.88}
            stroke="#f8fafc"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={-radius * 0.88}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="0" cy="0" r="7" fill="#f8fafc" />
          <circle cx="0" cy="0" r="4" fill={color} />
        </g>
      </svg>

      {/* Center Digital Display */}
      <div style={{ marginTop: '-18px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: color, lineHeight: 1 }}>
          {percent}%
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>
          30-MIN EXCURSION RISK
        </div>
      </div>
    </div>
  );
};
