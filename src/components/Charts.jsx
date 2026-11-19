import React from 'react';
import { formatDate } from '../lib/model.js';

// Responsive SVG charts. No chart library needed.

export function BarChart({ data, height = 190, ariaLabel = 'Bar chart' }) {
  const W = 600;
  const H = height;
  const pad = { top: 24, bottom: 26, left: 8, right: 8 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.min(40, slot * 0.6);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label={ariaLabel}>
        {[0.5, 1].map((f) => (
          <line
            key={f}
            className="grid-line"
            x1={pad.left}
            x2={W - pad.right}
            y1={pad.top + innerH * (1 - f)}
            y2={pad.top + innerH * (1 - f)}
          />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = pad.left + i * slot + (slot - barW) / 2;
          const y = pad.top + innerH - h;
          return (
            <g key={d.key ?? i}>
              <rect className="bar" x={x} y={y} width={barW} height={h} rx={5}>
                <title>{`${d.tip || d.label || d.key}: ${d.value}`}</title>
              </rect>
              {d.value > 0 && (
                <text className="bar-value" x={x + barW / 2} y={y - 6} textAnchor="middle">
                  {d.value}
                </text>
              )}
              <text className="axis-label" x={x + barW / 2} y={H - 7} textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Donut({ segments, size = 150, thickness = 16, ariaLabel = 'Donut chart' }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const center = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut" role="img" aria-label={ariaLabel}>
      <circle cx={center} cy={center} r={r} fill="none" strokeWidth={thickness} className="donut-track" />
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s) => {
            const len = (s.value / total) * circumference;
            const el = (
              <circle
                key={s.key}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                strokeWidth={thickness}
                strokeDasharray={`${len} ${circumference - len}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${center} ${center})`}
                className="donut-seg"
                style={{ stroke: s.color }}
              >
                <title>{`${s.label}: ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      <text x={center} y={center + 2} textAnchor="middle" className="donut-total">
        {total}
      </text>
      <text x={center} y={center + 20} textAnchor="middle" className="donut-sub">
        open
      </text>
    </svg>
  );
}

export function Sparkline({ values }) {
  const W = 100;
  const H = 36;
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const points = values.map((v, i) => [i * step, H - 3 - (v / max) * (H - 8)]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="sparkline" aria-hidden="true">
      <path className="spark-area" d={`${line} L${W} ${H} L0 ${H} Z`} />
      <path className="spark-line" d={line} />
    </svg>
  );
}

const level = (v) => (v === 0 ? 0 : v === 1 ? 1 : v <= 3 ? 2 : v <= 5 ? 3 : 4);

// days: [{ key, value }], oldest first. Columns are weeks starting on Monday.
export function Heatmap({ days }) {
  const first = days[0]?.key;
  const offset = first ? (new Date(`${first}T00:00:00`).getDay() + 6) % 7 : 0;
  const cells = [...Array.from({ length: offset }, () => null), ...days];
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" role="img" aria-label="Daily activity over the last 12 weeks">
        {cells.map((c, i) =>
          c ? (
            <span
              key={c.key}
              className={`heat-cell l${level(c.value)}`}
              title={`${formatDate(c.key)}: ${c.value} ${c.value === 1 ? 'activity' : 'activities'}`}
            />
          ) : (
            <span key={`pad-${i}`} className="heat-cell pad" />
          ),
        )}
      </div>
      <div className="heat-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heat-cell l${l}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
