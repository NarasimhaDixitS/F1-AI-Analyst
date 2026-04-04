import React from 'react';

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

export default function DeltaChart({ data }) {
  const d1Distance = data?.driver1?.telemetry?.distance || [];
  const d1Speed = data?.driver1?.telemetry?.speed || [];
  const d2Speed = data?.driver2?.telemetry?.speed || [];

  const samples = Math.min(d1Distance.length, d1Speed.length, d2Speed.length);

  if (samples < 2) {
    return (
      <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 text-sm text-neutral-400">
        Not enough telemetry points available to calculate delta.
      </div>
    );
  }

  const delta = d1Speed.slice(0, samples).map((s, i) => s - d2Speed[i]);
  const distance = d1Distance.slice(0, samples);

  const width = 1000;
  const height = 280;
  const pad = { l: 50, r: 20, t: 20, b: 40 };
  const xPx = scaleSeries(distance, pad.l, width - pad.r);
  const yPx = scaleSeries(delta, pad.t, height - pad.b, true);
  const path = buildLinePath(xPx, yPx);
  const baselineY = scaleSeries([0], pad.t, height - pad.b, true)[0];

  return (
    <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800">
      <div className="mb-3 text-xs uppercase tracking-widest text-neutral-400">Speed Delta (D1 - D2)</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full">
        <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="#404040" strokeWidth="1" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke="#404040" strokeWidth="1" />
        <line x1={pad.l} y1={baselineY} x2={width - pad.r} y2={baselineY} stroke="#7f1d1d" strokeDasharray="4 4" strokeWidth="1" />
        <path d={path} stroke="#ef4444" strokeWidth="2.2" fill="none" />
        <text x={width / 2} y={height - 8} fill="#a3a3a3" textAnchor="middle" fontSize="12">Distance (m)</text>
      </svg>
    </div>
  );
}
