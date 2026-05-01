import React from 'react';
import { getTeamColor } from '../utils/raceTheme';

function scaleSeries(values = [], minPx, maxPx, invert = false) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => {
    const ratio = (v - min) / span;
    const px = minPx + ratio * (maxPx - minPx);
    return invert ? maxPx - (px - minPx) : px;
  });
}

function buildLinePath(xVals = [], yVals = []) {
  if (!xVals.length || !yVals.length || xVals.length !== yVals.length) return '';
  return xVals.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${yVals[i].toFixed(2)}`).join(' ');
}

export default function TelemetryChart({ data }) {
  const d1Distance = data?.driver1?.telemetry?.distance || [];
  const d1Speed = data?.driver1?.telemetry?.speed || [];
  const d2Distance = data?.driver2?.telemetry?.distance || [];
  const d2Speed = data?.driver2?.telemetry?.speed || [];

  if (d1Distance.length < 2 || d2Distance.length < 2) {
    return (
      <div className="rc-card rounded-xl p-4 text-sm text-[var(--rc-text-secondary)]">
        Not enough telemetry points available to render speed profile.
      </div>
    );
  }

  const width = 1000;
  const height = 360;
  const pad = { l: 50, r: 20, t: 20, b: 40 };

  const samples = Math.min(d1Distance.length, d1Speed.length, d2Distance.length, d2Speed.length);
  const xPx = scaleSeries(d1Distance.slice(0, samples), pad.l, width - pad.r);
  const y1Px = scaleSeries(d1Speed.slice(0, samples), pad.t, height - pad.b, true);
  const y2Px = scaleSeries(d2Speed.slice(0, samples), pad.t, height - pad.b, true);

  const line1 = buildLinePath(xPx, y1Px);
  const line2 = buildLinePath(xPx, y2Px);
  const d1Color = getTeamColor(data?.driver1?.team || data?.driver1?.name);
  const d2Color = getTeamColor(data?.driver2?.team || data?.driver2?.name);

  return (
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-cyan)' }}>
      <div className="mb-3 flex items-center justify-between text-xs uppercase tracking-widest text-[var(--rc-text-secondary)]">
        <span>Speed Profile</span>
        <div className="flex gap-4">
          <span style={{ color: d1Color }}>{data.driver1.name}</span>
          <span style={{ color: d2Color }}>{data.driver2.name}</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[360px] w-full">
        <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="#334155" strokeWidth="1" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke="#334155" strokeWidth="1" />
        <path d={line1} stroke={d1Color} strokeWidth="2.4" fill="none" />
        <path d={line2} stroke={d2Color} strokeWidth="2.4" fill="none" />
        <text x={width / 2} y={height - 8} fill="#8B95A7" textAnchor="middle" fontSize="12">Distance (m)</text>
        <text x={16} y={height / 2} fill="#8B95A7" textAnchor="middle" fontSize="12" transform={`rotate(-90 16 ${height / 2})`}>
          Speed (km/h)
        </text>
      </svg>
    </div>
  );
}
