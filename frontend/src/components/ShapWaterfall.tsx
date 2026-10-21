import React from 'react';
import { TopFactor } from '../types';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface ShapWaterfallProps {
  factors: TopFactor[];
  modelProb?: number;
}

export const ShapWaterfall: React.FC<ShapWaterfallProps> = ({ factors, modelProb }) => {
  if (!factors || factors.length === 0) {
    return (
      <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
        No SHAP attribution factors recorded for this point.
      </div>
    );
  }

  // Find max absolute impact to normalize bar width
  const maxImpact = Math.max(...factors.map((f) => Math.abs(f.shap_impact)), 0.1);

  return (
    <div style={{ marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Explainable AI • TreeSHAP Force Contribution Breakdown
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          Base Model Prob: <strong>{modelProb ? (modelProb * 100).toFixed(1) + '%' : '--'}</strong>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {factors.map((factor, idx) => {
          const impact = factor.shap_impact;
          const isRiskIncrease = impact >= 0;
          const widthPct = Math.min(Math.round((Math.abs(impact) / maxImpact) * 100), 100);

          return (
            <div
              key={idx}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--border-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {isRiskIncrease ? (
                    <TrendingUp size={14} color="#ef4444" />
                  ) : (
                    <TrendingDown size={14} color="#10b981" />
                  )}
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {factor.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ({factor.description})
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {factor.value !== null && (
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                      val: {factor.value}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: isRiskIncrease ? '#ef4444' : '#10b981',
                    }}
                  >
                    {isRiskIncrease ? `+${impact.toFixed(3)}` : impact.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Impact Bar */}
              <div
                style={{
                  height: '4px',
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${widthPct}%`,
                    background: isRiskIncrease
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : 'linear-gradient(90deg, #0284c7, #10b981)',
                    borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
