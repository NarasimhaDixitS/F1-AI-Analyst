import React, { useState } from 'react';
import {
  Activity,
  Award,
  CloudSun,
  Flag,
  Gauge,
  Medal,
  Sparkles,
  Swords,
  Timer,
  Trophy,
} from 'lucide-react';
import { getTeamAccentStyle } from '../utils/raceTheme';

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
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-purple)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-purple)]">
        <Activity size={14} className="text-[var(--rc-purple)]" />
        Sector Battle
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {sectors.map((s) => {
          const aSec = parseLapTimeToSeconds(s.a);
          const bSec = parseLapTimeToSeconds(s.b);
          const winner = aSec !== null && bSec !== null ? (aSec < bSec ? d1.code : d2.code) : '—';
          return (
            <div key={s.name} className="rounded-lg border border-[var(--rc-border)] bg-[rgba(13,17,26,0.62)] p-3 text-center">
              <p className="text-xs text-[var(--rc-text-secondary)]">{s.name}</p>
              <p className="rc-tabular mt-1 text-sm font-mono text-[var(--rc-text-primary)]">{formatTimeForUi(s.a)} vs {formatTimeForUi(s.b)}</p>
              <p className="mt-2 text-xs font-bold text-[var(--rc-green)]">Winner: {winner}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RaceTimeline({ raceTimeline = [] }) {
  const compact = raceTimeline.length > 0 && raceTimeline.length <= 4;
  const legend = [
    { label: 'Track Clear', impact: 'Neutral' },
    { label: 'Yellow / VSC', impact: 'Caution' },
    { label: 'SC / Red Flag', impact: 'Major Disruption' },
  ];

  const getImpactChipClass = (impact = '') => {
    const value = String(impact || 'Info').toLowerCase();
    if (value.includes('red') || value.includes('incident') || value.includes('penalty')) return 'rc-chip rc-chip-danger';
    if (value.includes('yellow') || value.includes('caution') || value.includes('vsc')) return 'rc-chip rc-chip-warning';
    if (value.includes('clear') || value.includes('improv') || value.includes('gain')) return 'rc-chip rc-chip-success';
    return 'rc-chip rc-chip-info';
  };

  return (
    <div className={`rc-card rc-accent-rail rounded-xl ${compact ? 'p-3' : 'p-4'}`} style={{ '--accent-color': 'var(--rc-cyan)' }}>
      <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-cyan)]">
        <Timer size={14} className="text-[var(--rc-cyan)]" />
        Race Event Timeline
      </h3>
      <p className="mb-3 text-xs text-[var(--rc-text-muted)]">Session Time = race clock timestamp when event/status was logged.</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {legend.map((item) => (
          <span key={item.label} className="rounded border border-[var(--rc-border)] bg-[rgba(13,17,26,0.5)] px-2 py-1 text-[10px] text-[var(--rc-text-secondary)]">
            {item.label} · {item.impact}
          </span>
        ))}
      </div>

      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {!raceTimeline.length && (
          <div className="rounded border border-[var(--rc-border)] px-3 py-2 text-xs text-[var(--rc-text-muted)]">
            No detailed timeline events available for this race data.
          </div>
        )}

        {raceTimeline.slice(0, 18).map((e, idx) => (
          <div key={`${e.time}-${idx}`} className={`rounded border border-[var(--rc-border)] bg-[rgba(13,17,26,0.55)] text-xs ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--rc-text-primary)]">{e.event || e.status || 'Event'}</span>
              <span className="rc-tabular font-mono text-[var(--rc-text-muted)]">{e.session_time || e.time || '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[var(--rc-text-secondary)]">{e.meaning || 'Race status update'}</span>
              <span className={getImpactChipClass(e.impact)}>{e.impact || 'Info'}</span>
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

  const hasWeather = Boolean(weather && (weather.air_temp_avg || weather.track_temp_avg));
  const itemClass = 'rounded-lg border border-[var(--rc-border)] bg-[rgba(13,17,26,0.55)] p-3';
  const labelClass = 'flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--rc-text-muted)]';

  return (
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-gold)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-gold)]">
        <Trophy size={14} className="text-[var(--rc-gold)]" />
        Race Context
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className={itemClass}>
          <p className={labelClass}><Trophy size={12} className="text-amber-300" />Winner</p>
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">{winner?.code || '—'} {winner?.team ? `· ${winner.team}` : ''}</p>
        </div>

        <div className={itemClass}>
          <p className={labelClass}><Flag size={12} className="text-red-300" />Pole Sitter</p>
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">{pole?.code || '—'} {pole?.team ? `· ${pole.team}` : ''}</p>
        </div>

        <div className={`${itemClass} md:col-span-2`}>
          <p className={labelClass}><Medal size={12} className="text-slate-300" />Podium</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {podium.length ? podium.map((p) => (
              <span key={`${p.position}-${p.code}`} className="inline-flex items-center gap-1 rounded-full border border-[var(--rc-border)] bg-[rgba(13,17,26,0.82)] px-2 py-0.5 text-[11px] text-[var(--rc-text-primary)]">
                {String(p.position) === '1' && <Trophy size={11} className="text-amber-300" />}
                {String(p.position) === '2' && <Medal size={11} className="text-slate-300" />}
                {String(p.position) === '3' && <Award size={11} className="text-orange-300" />}
                P{p.position} {p.code}
              </span>
            )) : <span className="text-[var(--rc-text-secondary)]">—</span>}
          </div>
        </div>

        <div className={itemClass}>
          <p className={labelClass}><Timer size={12} className="text-violet-300" />Fastest Lap</p>
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">
            {fastest?.driver || '—'} {fastest?.lap_time ? `· ${fastest.lap_time}` : ''}
          </p>
        </div>

        <div className={`${itemClass} ${hasWeather ? 'md:col-span-1' : ''}`}>
          <p className={labelClass}><CloudSun size={12} className="text-sky-300" />Weather Avg</p>
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">
            {weather ? `${weather.air_temp_avg ?? '—'}°C air · ${weather.track_temp_avg ?? '—'}°C track` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function TeamBattles({ teamBattles = [] }) {
  if (!teamBattles.length) return null;
  const compact = teamBattles.length <= 2;
  return (
    <div className={`rc-card rc-accent-rail rounded-xl ${compact ? 'p-3' : 'p-4'}`} style={{ '--accent-color': 'var(--rc-purple)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-purple)]">
        <Swords size={14} className="text-[var(--rc-purple)]" />
        Team Mate Battles
      </h3>
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {teamBattles.map((b) => (
          <div key={b.team} className={`rounded-lg border bg-[rgba(13,17,26,0.58)] text-xs ${compact ? 'p-2.5' : 'p-3'}`} style={getTeamAccentStyle(b.team)}>
            <p className="mb-2 font-bold text-[var(--rc-text-primary)]">{b.team}</p>
            <p className="text-[var(--rc-text-secondary)]">{b.driver1.code} (P{b.driver1.position || '—'}) vs {b.driver2.code} (P{b.driver2.position || '—'})</p>
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
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-cyan)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-cyan)]">
        <Sparkles size={14} className="text-[var(--rc-cyan)]" />
        What-If Mode
      </h3>
      <p className="mb-2 text-xs text-[var(--rc-text-secondary)]">Adjust Driver 1 performance gain (%) and see theoretical lap delta.</p>
      <input
        type="range"
        min="0"
        max="5"
        step="0.1"
        value={boost}
        onChange={(e) => setBoost(Number(e.target.value))}
        className="rc-focus w-full accent-[var(--rc-cyan)]"
        aria-label="What-if performance boost percentage"
      />
      <p className="mt-2 text-sm text-[var(--rc-text-primary)]">Boost: <span className="rc-tabular font-mono text-[var(--rc-purple)]">{boost.toFixed(1)}%</span></p>
      <p className="text-sm text-[var(--rc-text-primary)]">Projected Delta vs Driver 2: <span className="rc-tabular font-mono">{delta.toFixed(3)}s</span></p>
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
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-purple)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-purple)]">
        <Gauge size={14} className="text-[var(--rc-purple)]" />
        Corner Hotspots
      </h3>
      <div className="space-y-2 text-xs">
        {top.map((h) => (
          <div key={h.section} className="rounded border border-[var(--rc-border)] bg-[rgba(13,17,26,0.55)] p-2">
            <p className="font-semibold text-[var(--rc-text-primary)]">{h.section}</p>
            <p className="text-[var(--rc-text-secondary)]">{h.distance}</p>
            <p className={`rc-tabular font-mono ${h.avgDelta >= 0 ? 'text-[var(--rc-green)]' : 'text-[var(--rc-red)]'}`}>Avg speed delta: {h.avgDelta.toFixed(2)} km/h</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsLab({ data, headToHead, raceTimeline, teamBattles, raceContext, comparisonOnly = false }) {
  return (
    <div className="space-y-6">
      {!comparisonOnly && <RaceContextCard raceContext={raceContext} />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectorBattle headToHead={headToHead} />
        <WhatIfSimulator data={data} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Hotspots data={data} />
        {!comparisonOnly && <RaceTimeline raceTimeline={raceTimeline} />}
      </div>

      {!comparisonOnly && <TeamBattles teamBattles={teamBattles} />}

      {comparisonOnly && (
        <div className="rc-card rounded-lg px-3 py-2 text-xs text-[var(--rc-text-secondary)]">
          For full race context, timeline, and team battles, switch to <span className="text-[var(--rc-text-primary)]">Race Overview</span>. For complete charts, use <span className="text-[var(--rc-text-primary)]">Telemetry</span> mode.
        </div>
      )}
    </div>
  );
}
