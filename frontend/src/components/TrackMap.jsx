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

export default function TrackMap({ data }) {
  const d1x = data?.driver1?.telemetry?.x || [];
  const d1y = data?.driver1?.telemetry?.y || [];
  const d2x = data?.driver2?.telemetry?.x || [];
  const d2y = data?.driver2?.telemetry?.y || [];

  const hasTrackData = d1x.length > 10 && d1y.length > 10;

  if (!hasTrackData) {
    return (
      <div className="rc-card flex h-full min-h-[320px] items-center justify-center rounded-xl text-sm text-[var(--rc-text-secondary)]">
        Track map is unavailable for this session.
      </div>
    );
  }

  const samples = Math.min(d1x.length, d1y.length, d2x.length, d2y.length);
  const width = 900;
  const height = 520;
  const pad = 30;
  const x1 = scaleSeries(d1x.slice(0, samples), pad, width - pad);
  const y1 = scaleSeries(d1y.slice(0, samples), pad, height - pad, true);
  const x2 = scaleSeries(d2x.slice(0, samples), pad, width - pad);
  const y2 = scaleSeries(d2y.slice(0, samples), pad, height - pad, true);

  const path1 = buildLinePath(x1, y1);
  const path2 = buildLinePath(x2, y2);
  const d1Color = getTeamColor(data?.driver1?.team || data?.driver1?.name);
  const d2Color = getTeamColor(data?.driver2?.team || data?.driver2?.name);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="mb-3 flex gap-4 text-xs uppercase tracking-widest text-[var(--rc-text-secondary)]">
        <span style={{ color: d1Color }}>{data.driver1.name}</span>
        <span style={{ color: d2Color }}>{data.driver2.name}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[500px] w-full rounded-xl border border-[var(--rc-border)] bg-[rgba(13,17,26,0.55)]">
        <path d={path1} stroke={d1Color} strokeWidth="3" fill="none" />
        <path d={path2} stroke={d2Color} strokeWidth="2.6" fill="none" />
      </svg>
      <p className="mt-2 text-xs uppercase tracking-widest text-[var(--rc-text-muted)]">
        GPS Coordinates Rendered from FastF1 Telemetry
      </p>
    </div>
  );
}
