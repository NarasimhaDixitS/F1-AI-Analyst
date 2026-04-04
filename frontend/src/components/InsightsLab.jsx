import React, { useState } from 'react';

function parseLapTimeToSeconds(value = '') {
  const match = String(value).match(/(\d+):(\d{2})\.(\d+)/);
  if (match) {
    const m = Number(match[1]);
    const s = Number(match[2]);
    const ms = Number(`0.${match[3]}`);
    return m * 60 + s + ms;
  }
  const full = String(value).match(/(\d+) days\s+(\d+):(\d{2}):(\d{2})\.(\d+)/);
  if (!full) return null;
  const h = Number(full[2]);
  const m = Number(full[3]);
  const s = Number(full[4]);
  const frac = Number(`0.${full[5]}`);
  return h * 3600 + m * 60 + s + frac;
}

function formatTimeForUi(value = '') {
  if (!value) return '—';
  const raw = String(value).trim();

  // Handle legacy payload style: "0 days 00:01:25.990000"
  const legacy = raw.match(/(?:\d+\s+days\s+)?(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (legacy) {
    const h = Number(legacy[1]);
    const m = Number(legacy[2]);
    const s = Number(legacy[3]);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
    return `${m}:${s.toFixed(3).padStart(6, '0')}`;
  }

  // Already normalized backend format: "1:25.990" or "0:27.990"
  if (/^\d+:\d{2}(?:\.\d+)?$/.test(raw) || /^\d+:\d{2}:\d{2}(?:\.\d+)?$/.test(raw)) {
    return raw;
  }

  return raw;
}

function SectorBattle({ headToHead }) {
  const d1 = headToHead?.qualifying?.driver1;
  const d2 = headToHead?.qualifying?.driver2;
  if (!d1 || !d2) return null;

  const sectors = [
    { name: 'S1', a: d1.sector1, b: d2.sector1 },
    { name: 'S2', a: d1.sector2, b: d2.sector2 },
    { name: 'S3', a: d1.sector3, b: d2.sector3 },
  ];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">Sector Battle</h3>
      <div className="grid grid-cols-3 gap-3">
        {sectors.map((s) => {
          const aSec = parseLapTimeToSeconds(s.a);
          const bSec = parseLapTimeToSeconds(s.b);
          const winner = aSec !== null && bSec !== null ? (aSec < bSec ? d1.code : d2.code) : '—';
          return (
            <div key={s.name} className="rounded-lg border border-neutral-700 bg-neutral-950/60 p-3 text-center">
              <p className="text-xs text-neutral-400">{s.name}</p>
              <p className="mt-1 text-sm font-mono text-neutral-200">{formatTimeForUi(s.a)} vs {formatTimeForUi(s.b)}</p>
              <p className="mt-2 text-xs font-bold text-red-400">Winner: {winner}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RaceTimeline({ raceTimeline = [] }) {
  const legend = [
    { label: 'Track Clear', impact: 'Neutral' },
    { label: 'Yellow / VSC', impact: 'Caution' },
    { label: 'SC / Red Flag', impact: 'Major Disruption' },
  ];

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-neutral-400">Race Event Timeline</h3>
      <p className="mb-3 text-xs text-neutral-500">Session Time = race clock timestamp when event/status was logged.</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {legend.map((item) => (
          <span key={item.label} className="rounded border border-neutral-700 px-2 py-1 text-[10px] text-neutral-400">
            {item.label} · {item.impact}
          </span>
        ))}
      </div>

      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {!raceTimeline.length && (
          <div className="rounded border border-neutral-800 px-3 py-2 text-xs text-neutral-500">
            No detailed timeline events available for this race data.
          </div>
        )}

        {raceTimeline.slice(0, 18).map((e, idx) => (
          <div key={`${e.time}-${idx}`} className="rounded border border-neutral-800 px-3 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-200 font-semibold">{e.event || e.status || 'Event'}</span>
              <span className="font-mono text-neutral-500">{e.session_time || e.time || '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-neutral-400">{e.meaning || 'Race status update'}</span>
              <span className="text-red-300">{e.impact || 'Info'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RaceContextCard({ raceContext = {} }) {
  const winner = raceContext?.winner;
  const podium = raceContext?.podium || [];
  const pole = raceContext?.pole_sitter;
  const fastest = raceContext?.fastest_lap;
  const weather = raceContext?.weather;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">Race Context</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="rounded border border-neutral-800 p-3">
          <p className="text-neutral-500 uppercase">Winner</p>
          <p className="mt-1 text-neutral-200 font-semibold">{winner?.code || '—'} {winner?.team ? `· ${winner.team}` : ''}</p>
        </div>

        <div className="rounded border border-neutral-800 p-3">
          <p className="text-neutral-500 uppercase">Pole Sitter</p>
          <p className="mt-1 text-neutral-200 font-semibold">{pole?.code || '—'} {pole?.team ? `· ${pole.team}` : ''}</p>
        </div>

        <div className="rounded border border-neutral-800 p-3 md:col-span-2">
          <p className="text-neutral-500 uppercase">Podium</p>
          <p className="mt-1 text-neutral-200 font-semibold">
            {podium.length ? podium.map((p) => `${p.position}. ${p.code}`).join(' · ') : '—'}
          </p>
        </div>

        <div className="rounded border border-neutral-800 p-3">
          <p className="text-neutral-500 uppercase">Fastest Lap</p>
          <p className="mt-1 text-neutral-200 font-semibold">
            {fastest?.driver || '—'} {fastest?.lap_time ? `· ${fastest.lap_time}` : ''}
          </p>
        </div>

        <div className="rounded border border-neutral-800 p-3">
          <p className="text-neutral-500 uppercase">Weather Avg</p>
          <p className="mt-1 text-neutral-200 font-semibold">
            {weather ? `${weather.air_temp_avg ?? '—'}°C air · ${weather.track_temp_avg ?? '—'}°C track` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamBattles({ teamBattles = [] }) {
  if (!teamBattles.length) return null;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">Team Mate Battles</h3>
      <div className="grid md:grid-cols-2 gap-3">
        {teamBattles.map((b) => (
          <div key={b.team} className="rounded-lg border border-neutral-700 p-3 text-xs">
            <p className="mb-2 font-bold text-neutral-200">{b.team}</p>
            <p className="text-neutral-400">{b.driver1.code} (P{b.driver1.position || '—'}) vs {b.driver2.code} (P{b.driver2.position || '—'})</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatIfSimulator({ data }) {
  const [boost, setBoost] = useState(0);
  const d1 = data?.driver1;
  const d2 = data?.driver2;
  const l1 = parseLapTimeToSeconds(d1?.lap_time || '');
  const l2 = parseLapTimeToSeconds(d2?.lap_time || '');
  if (l1 === null || l2 === null) return null;

  const adjusted = l1 * (1 - boost / 100);
  const delta = adjusted - l2;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">What-If Mode</h3>
      <p className="text-xs text-neutral-400 mb-2">Adjust Driver 1 performance gain (%) and see theoretical lap delta.</p>
      <input type="range" min="0" max="5" step="0.1" value={boost} onChange={(e) => setBoost(Number(e.target.value))} className="w-full" />
      <p className="mt-2 text-sm text-neutral-200">Boost: <span className="font-mono text-red-400">{boost.toFixed(1)}%</span></p>
      <p className="text-sm text-neutral-200">Projected Delta vs Driver 2: <span className="font-mono">{delta.toFixed(3)}s</span></p>
    </div>
  );
}

function Hotspots({ data }) {
  const d = data?.driver1?.telemetry?.distance || [];
  const s1 = data?.driver1?.telemetry?.speed || [];
  const s2 = data?.driver2?.telemetry?.speed || [];
  const samples = Math.min(d.length, s1.length, s2.length);
  if (samples < 30) return null;

  const bins = 8;
  const size = Math.floor(samples / bins);
  const chunks = [];
  for (let i = 0; i < bins; i++) {
    const start = i * size;
    const end = i === bins - 1 ? samples : (i + 1) * size;
    let sum = 0;
    for (let j = start; j < end; j++) sum += (s1[j] - s2[j]);
    const avg = sum / Math.max(1, end - start);
    chunks.push({
      section: `Sector Zone ${i + 1}`,
      avgDelta: avg,
      distance: `${Math.round(d[start] || 0)}m - ${Math.round(d[end - 1] || 0)}m`,
    });
  }

  const top = [...chunks].sort((a, b) => Math.abs(b.avgDelta) - Math.abs(a.avgDelta)).slice(0, 3);
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">Corner Hotspots</h3>
      <div className="space-y-2 text-xs">
        {top.map((h) => (
          <div key={h.section} className="rounded border border-neutral-800 p-2">
            <p className="text-neutral-200 font-semibold">{h.section}</p>
            <p className="text-neutral-400">{h.distance}</p>
            <p className="font-mono text-red-400">Avg speed delta: {h.avgDelta.toFixed(2)} km/h</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsLab({ data, headToHead, raceTimeline, teamBattles, raceContext }) {
  return (
    <div className="space-y-6">
      <RaceContextCard raceContext={raceContext} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectorBattle headToHead={headToHead} />
        <WhatIfSimulator data={data} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Hotspots data={data} />
        <RaceTimeline raceTimeline={raceTimeline} />
      </div>

      <TeamBattles teamBattles={teamBattles} />
    </div>
  );
}
