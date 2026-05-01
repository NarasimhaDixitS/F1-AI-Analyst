import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Award,
  CarFront,
  CloudSun,
  Flag,
  Gauge,
  Info,
  Loader2,
  Map,
  Medal,
  Search,
  Swords,
  Timer,
  Trophy,
} from 'lucide-react';

import TelemetryChart from './components/TelemetryChart';
import DeltaChart from './components/DeltaChart';
import TrackMap from './components/TrackMap';
import ResultsTable from './components/ResultsTable';
import InsightsLab from './components/InsightsLab';
import { getCompoundColor, getModeAccent, getTeamAccentStyle } from './utils/raceTheme';

const DRIVER_OPTIONS = [
  'VER', 'HAM', 'NOR', 'PIA', 'LEC', 'SAI', 'RUS', 'PER', 'ALO', 'STR',
  'GAS', 'OCO', 'ALB', 'TSU', 'HUL', 'MAG', 'BOT', 'ZHO', 'RIC',
];

const RACE_OPTIONS = [
  { label: 'Bahrain', value: 'Bahrain Grand Prix' },
  { label: 'Saudi Arabian', value: 'Saudi Arabian Grand Prix' },
  { label: 'Australian', value: 'Australian Grand Prix' },
  { label: 'Japanese', value: 'Japanese Grand Prix' },
  { label: 'Chinese', value: 'Chinese Grand Prix' },
  { label: 'Miami', value: 'Miami Grand Prix' },
  { label: 'Emilia Romagna', value: 'Emilia Romagna Grand Prix' },
  { label: 'Monaco', value: 'Monaco Grand Prix' },
  { label: 'Canadian', value: 'Canadian Grand Prix' },
  { label: 'Spanish', value: 'Spanish Grand Prix' },
  { label: 'Austrian', value: 'Austrian Grand Prix' },
  { label: 'British', value: 'British Grand Prix' },
  { label: 'Hungarian', value: 'Hungarian Grand Prix' },
  { label: 'Belgian', value: 'Belgian Grand Prix' },
  { label: 'Dutch', value: 'Dutch Grand Prix' },
  { label: 'Italian', value: 'Italian Grand Prix' },
  { label: 'Azerbaijan', value: 'Azerbaijan Grand Prix' },
  { label: 'Singapore', value: 'Singapore Grand Prix' },
  { label: 'United States', value: 'United States Grand Prix' },
  { label: 'Mexico City', value: 'Mexico City Grand Prix' },
  { label: 'Sao Paulo', value: 'São Paulo Grand Prix' },
  { label: 'Las Vegas', value: 'Las Vegas Grand Prix' },
  { label: 'Qatar', value: 'Qatar Grand Prix' },
  { label: 'Abu Dhabi', value: 'Abu Dhabi Grand Prix' },
];

const ANALYSIS_MODES = [
  { label: 'Race Overview', value: 'race_overview' },
  { label: 'Head to Head', value: 'head_to_head' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Telemetry', value: 'telemetry' },
  { label: 'Results', value: 'results' },
];

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Chart render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rc-card rc-accent-rail rounded-lg p-4 text-sm text-[var(--rc-text-secondary)]" style={{ '--accent-color': 'var(--rc-red)' }}>
          Unable to render chart for this response.
        </div>
      );
    }
    return this.props.children;
  }
}

function downsampleSeries(values = [], maxPoints = 2500) {
  if (!Array.isArray(values) || values.length <= maxPoints) return values;
  const step = Math.ceil(values.length / maxPoints);
  return values.filter((_, idx) => idx % step === 0);
}

function normalizeResultPayload(payload) {
  if (!payload?.data?.driver1?.telemetry || !payload?.data?.driver2?.telemetry) return payload;

  const t1 = payload.data.driver1.telemetry;
  const t2 = payload.data.driver2.telemetry;

  return {
    ...payload,
    data: {
      ...payload.data,
      driver1: {
        ...payload.data.driver1,
        telemetry: {
          ...t1,
          distance: downsampleSeries(t1.distance),
          speed: downsampleSeries(t1.speed),
          throttle: downsampleSeries(t1.throttle),
          brake: downsampleSeries(t1.brake),
          x: downsampleSeries(t1.x),
          y: downsampleSeries(t1.y),
        },
      },
      driver2: {
        ...payload.data.driver2,
        telemetry: {
          ...t2,
          distance: downsampleSeries(t2.distance),
          speed: downsampleSeries(t2.speed),
          throttle: downsampleSeries(t2.throttle),
          brake: downsampleSeries(t2.brake),
          x: downsampleSeries(t2.x),
          y: downsampleSeries(t2.y),
        },
      },
    },
  };
}

function getBriefingText(result) {
  if (typeof result?.explanation === 'string' && result.explanation.trim()) return result.explanation;
  return 'Deterministic FastF1 analysis loaded.';
}

function getModeSummaryLabel(mode) {
  if (mode === 'race_overview') return 'Race Summary';
  if (mode === 'strategy') return 'Strategy Summary';
  if (mode === 'telemetry') return 'Telemetry Summary';
  if (mode === 'results') return 'Results Summary';
  return 'Comparison Summary';
}

function compoundClass(compound = '') {
  return getCompoundColor(compound);
}

function hasSpeedTrapData(speedTrap) {
  return Boolean(speedTrap && (speedTrap.driver1 || speedTrap.driver2));
}

function hasTyreRows(tyreStrategy) {
  if (!tyreStrategy) return false;
  const rows = [tyreStrategy.driver1, tyreStrategy.driver2].filter(Boolean);
  return rows.some((d) => (d.stints || []).length > 0) || Boolean(tyreStrategy.recommended_strategy);
}

function getImpactChipClass(impact = '') {
  const value = String(impact || 'Info').toLowerCase();
  if (value.includes('penalty') || value.includes('incident') || value.includes('red')) return 'rc-chip rc-chip-danger';
  if (value.includes('caution') || value.includes('yellow') || value.includes('vsc')) return 'rc-chip rc-chip-warning';
  if (value.includes('gain') || value.includes('positive') || value.includes('improv')) return 'rc-chip rc-chip-success';
  return 'rc-chip rc-chip-info';
}

function SpeedTrapPanel({ speedTrap, compact = false }) {
  if (!hasSpeedTrapData(speedTrap)) return null;

  return (
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-cyan)' }}>
      <div className="mb-2 flex items-center gap-2 text-[var(--rc-text-secondary)]">
        <Gauge size={16} className="text-[var(--rc-cyan)]" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Speed Trap</h3>
      </div>
      <div className="space-y-2 text-xs">
        {[speedTrap.driver1, speedTrap.driver2].filter(Boolean).map((d, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-lg border border-[var(--rc-border)] bg-[rgba(13,17,26,0.55)] px-3 py-2">
            <span>{d.code || `Driver ${idx + 1}`}</span>
            <span className="rc-tabular text-sm font-semibold text-[var(--rc-text-primary)]">{d.max_speed_kph ?? '—'} km/h</span>
          </div>
        ))}
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-[var(--rc-text-secondary)]">
          <CarFront size={12} className="mr-1 inline text-[var(--rc-green)]" />
          Fastest at trap: <span className="font-semibold text-[var(--rc-text-primary)]">{speedTrap.faster_driver || '—'}</span>
        </p>
      )}
    </div>
  );
}

function TyreStrategyPanel({ tyreStrategy }) {
  if (!hasTyreRows(tyreStrategy)) return null;
  const rows = [tyreStrategy.driver1, tyreStrategy.driver2].filter(Boolean);

  return (
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-yellow)' }}>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--rc-yellow)]">Tyre Strategy</h3>
      <div className="space-y-3">
        {rows.map((driver, i) => (
          <div key={i} className="space-y-1">
            <p className="text-[11px] uppercase tracking-wider text-[var(--rc-text-secondary)]">{driver.code || `Driver ${i + 1}`}</p>
            <div className="flex flex-wrap gap-2">
              {(driver.stints || []).length === 0 && <span className="text-xs text-[var(--rc-text-muted)]">No stint data</span>}
              {(driver.stints || []).map((s, idx) => (
                <div key={idx} className="rounded border border-[var(--rc-border)] bg-[rgba(13,17,26,0.5)] px-2 py-1 text-[11px]">
                  <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: compoundClass(s.compound) }} />
                  S{s.stint}: {s.start_lap ?? '—'}–{s.end_lap ?? '—'}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {tyreStrategy.recommended_strategy && (
        <p className="mt-3 text-xs text-[var(--rc-text-secondary)]">
          Baseline: <span className="text-[var(--rc-text-primary)]">{tyreStrategy.recommended_strategy.based_on_driver}</span>
        </p>
      )}
    </div>
  );
}

function RaceContextPanel({ raceContext = {} }) {
  const winner = raceContext?.winner;
  const podium = raceContext?.podium || [];
  const pole = raceContext?.pole_sitter;
  const fastest = raceContext?.fastest_lap;
  const weather = raceContext?.weather;
  const hasWeather = Boolean(weather && (weather.air_temp_avg || weather.track_temp_avg));

  const itemClass = 'rounded-lg border border-[var(--rc-border)] bg-[rgba(13,17,26,0.55)] p-3';
  const labelClass = 'mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--rc-text-muted)]';

  return (
    <div className="rc-card rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-gold)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-gold)]">
        <Trophy size={14} className="text-[var(--rc-gold)]" />
        Race Context
      </h3>
      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2 xl:grid-cols-3">
        <div className={itemClass}>
          <p className={labelClass}><Trophy size={12} className="text-amber-300" />Winner</p>
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">{winner?.code || '—'} {winner?.team ? `· ${winner.team}` : ''}</p>
        </div>

        <div className={itemClass}>
          <p className={labelClass}><Flag size={12} className="text-red-300" />Pole</p>
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">{pole?.code || '—'} {pole?.team ? `· ${pole.team}` : ''}</p>
        </div>

        <div className={`${itemClass} xl:col-span-1 sm:col-span-2`}>
          <p className={labelClass}><Medal size={12} className="text-slate-300" />Podium</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {podium.length ? podium.map((p) => (
              <span key={`${p.position}-${p.code}`} className="inline-flex items-center gap-1 rounded-full border border-[var(--rc-border)] bg-[rgba(13,17,26,0.85)] px-2 py-0.5 text-[11px] text-[var(--rc-text-primary)]">
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
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">{fastest?.driver || '—'} {fastest?.lap_time ? `· ${fastest.lap_time}` : ''}</p>
        </div>

        <div className={`${itemClass} ${hasWeather ? 'sm:col-span-2' : ''}`}>
          <p className={labelClass}><CloudSun size={12} className="text-sky-300" />Weather</p>
          <p className="mt-1 font-semibold text-[var(--rc-text-primary)]">
            {weather ? `${weather.air_temp_avg ?? '—'}°C air · ${weather.track_temp_avg ?? '—'}°C track` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function RaceTimelinePanel({ raceTimeline = [] }) {
  const compact = raceTimeline.length > 0 && raceTimeline.length <= 4;
  return (
    <div className={`rc-card rc-accent-rail rounded-xl ${compact ? 'p-3' : 'p-4'}`} style={{ '--accent-color': 'var(--rc-cyan)' }}>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-cyan)]">
        <Map size={14} className="text-[var(--rc-cyan)]" />
        Race Timeline
      </h3>
      <div className="grid gap-2">
        {!raceTimeline.length && (
          <div className="rounded border border-[var(--rc-border)] px-3 py-2 text-xs text-[var(--rc-text-muted)]">No detailed timeline events available.</div>
        )}
        {raceTimeline.slice(0, 14).map((e, idx) => (
          <div key={`${e.time}-${idx}`} className={`rounded border border-[var(--rc-border)] bg-[rgba(13,17,26,0.55)] text-xs ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-[var(--rc-text-primary)]">{e.event || e.status || 'Event'}</span>
              <span className="rc-tabular font-mono text-[var(--rc-text-muted)]">{e.session_time || e.time || '—'}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <span className="text-[var(--rc-text-secondary)]">{e.meaning || 'Race status update'}</span>
              <span className={getImpactChipClass(e.impact)}>{e.impact || 'Info'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamBattlesPanel({ teamBattles = [] }) {
  if (!teamBattles.length) return null;
  const compact = teamBattles.length <= 2;

  return (
    <div className={`rc-card rc-accent-rail rounded-xl ${compact ? 'p-3' : 'p-4'}`} style={{ '--accent-color': 'var(--rc-purple)' }}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-purple)]">
        <Swords size={14} className="text-[var(--rc-purple)]" />
        Team Battles
      </h3>
      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {teamBattles.map((b) => (
          <div key={b.team} className={`rounded-lg border bg-[rgba(13,17,26,0.58)] text-xs ${compact ? 'p-2.5' : 'p-3'}`} style={getTeamAccentStyle(b.team)}>
            <p className="mb-1.5 font-bold text-[var(--rc-text-primary)]">{b.team}</p>
            <p className="text-[var(--rc-text-secondary)]">{b.driver1?.code} (P{b.driver1?.position || '—'}) vs {b.driver2?.code} (P{b.driver2?.position || '—'})</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisSummary({ label, text, request, mode }) {
  const modeAccent = getModeAccent(mode);

  return (
    <aside className="rc-card rc-card-elevated rc-accent-rail space-y-4 rounded-xl p-4" style={{ '--accent-color': modeAccent.color }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[var(--rc-cyan)]">
          <Info size={16} />
          <h2 className="text-xs font-bold uppercase tracking-widest">{label}</h2>
        </div>
        <span className="rc-meta-chip">AI Briefing</span>
      </div>
      <p className="rounded-lg border border-[var(--rc-border)] bg-[rgba(13,17,26,0.72)] p-3 text-sm leading-relaxed text-[var(--rc-text-primary)]">"{text}"</p>
      {request && (
        <div className="flex flex-wrap gap-2">
          <span className="rc-meta-chip">{request.year || '--'}</span>
          <span className="rc-meta-chip">{request.race || '--'}</span>
          <span className="rc-meta-chip">{request.session || '--'}</span>
          <span className="rc-meta-chip">{mode || 'head_to_head'}</span>
        </div>
      )}
    </aside>
  );
}

function StructuredControls({ values, setValues, onAnalyze, loading, compact = false }) {
  const needsDrivers = values.mode === 'head_to_head' || values.mode === 'telemetry';
  const inputClass = `rc-input text-sm ${compact ? 'py-1.5' : 'py-2'}`;
  const labelClass = `mb-1 block text-[10px] uppercase tracking-widest text-[var(--rc-text-muted)] ${compact ? 'sr-only md:not-sr-only' : ''}`;

  return (
    <div className={`${compact ? 'rc-card rounded-lg p-3' : 'rc-card rc-card-elevated rounded-xl p-4'}`}>
      {!compact && <p className="mb-2 text-xs uppercase tracking-widest text-[var(--rc-text-secondary)]">Structured Analyzer</p>}

      <div className={`grid gap-2 ${needsDrivers ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-7' : 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5'}`}>
        <div>
          <label className={labelClass}>Year</label>
          <input
            className={inputClass}
            type="number"
            value={values.year}
            onChange={(e) => setValues((v) => ({ ...v, year: Number(e.target.value) || 2024 }))}
            min="2018"
            max="2030"
          />
        </div>

        <div>
          <label className={labelClass}>Race</label>
          <select className={inputClass} value={values.race} onChange={(e) => setValues((v) => ({ ...v, race: e.target.value }))}>
            {RACE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Session</label>
          <select className={inputClass} value={values.session} onChange={(e) => setValues((v) => ({ ...v, session: e.target.value }))}>
            {['Race', 'Qualifying', 'Sprint'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Mode</label>
          <select className={inputClass} value={values.mode} onChange={(e) => setValues((v) => ({ ...v, mode: e.target.value }))}>
            {ANALYSIS_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        {needsDrivers && (
          <>
            <div>
              <label className={labelClass}>Driver 1</label>
              <select className={inputClass} value={values.driver1} onChange={(e) => setValues((v) => ({ ...v, driver1: e.target.value }))}>
                {DRIVER_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Driver 2</label>
              <select className={inputClass} value={values.driver2} onChange={(e) => setValues((v) => ({ ...v, driver2: e.target.value }))}>
                {DRIVER_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </>
        )}

        <div className="flex items-end">
          <button
            onClick={onAnalyze}
            disabled={loading}
            className="rc-btn-primary w-full rounded-md px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompactNLP({ query, setQuery, loading, onSubmit, placeholder }) {
  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="rc-input w-full py-2 pl-3 pr-10 text-sm"
      />
      <button type="submit" disabled={loading} className="rc-btn-primary rc-focus absolute right-1.5 top-1.5 rounded p-1.5 disabled:opacity-50">
        {loading ? <Loader2 className="animate-spin" size={15} /> : <Search size={15} />}
      </button>
    </form>
  );
}

export default function App() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const [headToHeadTab, setHeadToHeadTab] = useState('insights');
  const [resultsView, setResultsView] = useState('race');
  const [showToolbarNlp, setShowToolbarNlp] = useState(false);

  const [structured, setStructured] = useState({
    year: 2024,
    race: 'British Grand Prix',
    session: 'Race',
    mode: 'race_overview',
    driver1: 'VER',
    driver2: 'HAM',
  });

  const promptChips = [
    'Why was VER faster than HAM in Silverstone 2024 qualifying?',
    'Compare NOR vs PIA in Brazil 2024 sprint',
    'Who had better braking consistency in Monaco 2024 race?',
  ];

  const currentMode = result?.mode || structured.mode || 'head_to_head';
  const modeAccent = getModeAccent(currentMode);
  const summaryLabel = getModeSummaryLabel(currentMode);
  const briefing = getBriefingText(result);

  const hasDualResults = useMemo(() => {
    const raceRows = Array.isArray(result?.race_results) ? result.race_results : [];
    const sessionRows = Array.isArray(result?.session_results) ? result.session_results : [];
    return raceRows.length > 0 && sessionRows.length > 0;
  }, [result]);

  const getDisplayResults = () => {
    if (!result) return [];
    if (hasDualResults) {
      return resultsView === 'session' ? (result.session_results || []) : (result.race_results || []);
    }
    return result.results || result.session_results || [];
  };

  const handleNaturalLanguageSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setHasSearched(true);
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/analyze`, { query });
      const normalized = normalizeResultPayload(res.data);
      setResult(normalized);
      setHeadToHeadTab('insights');
      setResultsView('race');
    } catch (err) {
      console.error('Analysis failed', err);
      setError('Failed to fetch F1 data. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleStructuredAnalyze = async () => {
    setHasSearched(true);
    setLoading(true);
    setError(null);
    try {
      const payload = {
        year: structured.year,
        race: structured.race,
        session: structured.session,
        mode: structured.mode,
      };

      if (structured.mode === 'head_to_head' || structured.mode === 'telemetry') {
        payload.driver1 = structured.driver1;
        payload.driver2 = structured.driver2;
      }

      const res = await axios.post(`${API_BASE}/api/structured-analyze`, payload);
      const normalized = normalizeResultPayload(res.data);

      if (normalized?.type === 'error') {
        const detail = (normalized.errors || []).join(', ');
        setError(`${normalized.message || 'Structured analyze failed'}${detail ? `: ${detail}` : ''}`);
      }

      setResult(normalized);
      setHeadToHeadTab('insights');
      setResultsView('race');
    } catch (err) {
      console.error('Structured analysis failed', err);
      setError('Structured analyze failed. Check backend logs and input selections.');
    } finally {
      setLoading(false);
    }
  };

  const renderRaceOverview = () => (
    <div className="space-y-4">
      <RaceContextPanel raceContext={result?.race_context || {}} />
      <div className="grid gap-4 xl:grid-cols-2">
        <RaceTimelinePanel raceTimeline={result?.race_timeline || []} />
        <TeamBattlesPanel teamBattles={result?.team_battles || []} />
      </div>
      <ResultsTable results={result?.results || []} mode="race_overview" request={result?.request} />
    </div>
  );

  const renderHeadToHead = () => (
    <div className="grid gap-4 xl:grid-cols-[320px,1fr]">
      <div className="space-y-4 xl:sticky xl:top-[118px] xl:z-20 xl:h-fit xl:self-start xl:rounded-lg xl:bg-[rgba(13,17,26,0.88)] xl:p-1 xl:backdrop-blur-sm">
        <AnalysisSummary label={summaryLabel} text={briefing} request={result?.request} mode={currentMode} />
        <SpeedTrapPanel speedTrap={result?.speed_trap} />
        <TyreStrategyPanel tyreStrategy={result?.tyre_strategy} />
      </div>

      <div className="space-y-4 xl:relative xl:z-10">
        <nav className="rc-card flex flex-nowrap items-center gap-2 overflow-x-auto rounded-lg p-2">
          {[
            { id: 'insights', label: 'Insights', icon: <Info size={14} /> },
            { id: 'track', label: 'Track Map', icon: <Map size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setHeadToHeadTab(tab.id)}
              className={`rc-focus flex shrink-0 items-center gap-1 rounded-md px-3 py-2 text-xs uppercase tracking-wider ${
                headToHeadTab === tab.id ? 'text-white' : 'text-[var(--rc-text-secondary)] hover:text-[var(--rc-text-primary)]'
              }`}
              style={headToHeadTab === tab.id ? { background: 'rgba(34, 211, 238, 0.18)', border: '1px solid rgba(34, 211, 238, 0.45)' } : undefined}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="rc-card rounded-lg px-3 py-2 text-[11px] text-[var(--rc-text-secondary)]">
          Head-to-Head now focuses on direct driver comparison only. Use dedicated modes for full <span className="text-[var(--rc-text-primary)]">Results</span>, <span className="text-[var(--rc-text-primary)]">Telemetry</span>, and <span className="text-[var(--rc-text-primary)]">Race Overview</span> details.
        </div>

        {headToHeadTab === 'insights' && (
          <InsightsLab
            data={result?.data}
            headToHead={result?.head_to_head}
            comparisonOnly
          />
        )}

        {headToHeadTab === 'track' && (
          <ChartErrorBoundary>
            <TrackMap data={result?.data} />
          </ChartErrorBoundary>
        )}
      </div>
    </div>
  );

  const renderStrategy = () => {
    const inferred = result?.strategy_meta?.scope === 'race_level_inferred_top_finishers';
    const hasData = hasTyreRows(result?.tyre_strategy);

    return (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[320px,1fr]">
          <AnalysisSummary label={summaryLabel} text={briefing} request={result?.request} mode={currentMode} />
          <div className="space-y-4">
            {hasData ? (
              <TyreStrategyPanel tyreStrategy={result?.tyre_strategy} />
            ) : (
              <div className="rc-card rounded-xl p-4 text-sm text-[var(--rc-text-secondary)]">
                Strategy data is limited for this session. Showing available race context and results.
              </div>
            )}
            {inferred && (
              <div className="rc-card rounded-lg p-3 text-xs text-[var(--rc-text-secondary)]">
                Drivers were inferred from top finishers for strategy comparison.
              </div>
            )}
          </div>
        </div>

        <RaceContextPanel raceContext={result?.race_context || {}} />
        <ResultsTable results={result?.results || []} mode="strategy" request={result?.request} />
      </div>
    );
  };

  const renderTelemetry = () => (
    <div className="space-y-4">
      <AnalysisSummary label={summaryLabel} text={briefing} request={result?.request} mode={currentMode} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartErrorBoundary>
          <TrackMap data={result?.data} />
        </ChartErrorBoundary>
        <SpeedTrapPanel speedTrap={result?.speed_trap} compact />
      </div>
      <ChartErrorBoundary>
        <TelemetryChart data={result?.data} />
      </ChartErrorBoundary>
      <ChartErrorBoundary>
        <DeltaChart data={result?.data} />
      </ChartErrorBoundary>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-4">
      <AnalysisSummary label={summaryLabel} text={briefing} request={result?.request} mode={currentMode} />
      {hasDualResults && (
        <div className="rc-card inline-flex rounded-md p-1 text-xs uppercase tracking-wider">
          <button
            onClick={() => setResultsView('race')}
            className={`rc-focus rounded px-3 py-1.5 ${resultsView === 'race' ? 'text-white' : 'text-[var(--rc-text-secondary)]'}`}
            style={resultsView === 'race' ? { background: 'rgba(245, 197, 66, 0.16)', border: '1px solid rgba(245, 197, 66, 0.45)' } : undefined}
          >
            Race Results
          </button>
          <button
            onClick={() => setResultsView('session')}
            className={`rc-focus rounded px-3 py-1.5 ${resultsView === 'session' ? 'text-white' : 'text-[var(--rc-text-secondary)]'}`}
            style={resultsView === 'session' ? { background: 'rgba(245, 197, 66, 0.16)', border: '1px solid rgba(245, 197, 66, 0.45)' } : undefined}
          >
            Session Results
          </button>
        </div>
      )}
      <ResultsTable results={getDisplayResults()} mode="results" request={result?.request} />
    </div>
  );

  const renderMainContent = () => {
    if (!result) return null;
    if (currentMode === 'race_overview') return renderRaceOverview();
    if (currentMode === 'strategy') return renderStrategy();
    if (currentMode === 'telemetry') return renderTelemetry();
    if (currentMode === 'results') return renderResults();
    return renderHeadToHead();
  };

  return (
    <div className="rc-app-shell min-h-screen font-sans text-[var(--rc-text-primary)] selection:bg-[rgba(225,6,0,0.35)]">
      {!hasSearched ? (
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-5 px-4 py-8">
          <div className="mb-2 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[var(--rc-red)] text-2xl font-black italic">F1</div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">F1 AI Race Analyst</h1>
            </div>
            <p className="max-w-2xl text-sm text-[var(--rc-text-secondary)]">Race Control Neon briefing console for natural-language and structured Formula 1 analysis.</p>
          </div>

          <StructuredControls values={structured} setValues={setStructured} onAnalyze={handleStructuredAnalyze} loading={loading} />

          <div className="rc-card rc-card-elevated w-full max-w-5xl rounded-lg p-3 md:p-4">
            <p className="mb-2 text-xs uppercase tracking-widest text-[var(--rc-cyan)]">AI Command Console</p>
            <CompactNLP
              query={query}
              setQuery={setQuery}
              loading={loading}
              onSubmit={handleNaturalLanguageSearch}
              placeholder="Why was VER faster than HAM in Silverstone 2024 qualifying?"
            />
          </div>

          <div className="mt-1 flex w-full max-w-5xl flex-wrap gap-2">
            {promptChips.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="rc-focus rounded-full border border-[var(--rc-border)] bg-[rgba(13,17,26,0.82)] px-2.5 py-1 text-[11px] text-[var(--rc-text-secondary)] transition hover:border-[var(--rc-cyan)]/50 hover:text-[var(--rc-text-primary)]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <header className="rc-toolbar sticky top-0 z-50 px-3 py-3">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-[var(--rc-red)] text-lg font-black italic">F1</div>
                  <p className="text-sm font-bold uppercase tracking-wider" style={{ color: modeAccent.color }}>Race Analyst</p>
                </div>
                <button
                  onClick={() => setShowToolbarNlp((v) => !v)}
                  className="rc-focus rounded border border-[var(--rc-border)] px-2.5 py-1.5 text-xs uppercase tracking-wider text-[var(--rc-text-secondary)] hover:text-white"
                >
                  {showToolbarNlp ? 'Hide query' : 'Ask'}
                </button>
              </div>

              <StructuredControls
                values={structured}
                setValues={setStructured}
                onAnalyze={handleStructuredAnalyze}
                loading={loading}
                compact
              />

              {showToolbarNlp && (
                <CompactNLP
                  query={query}
                  setQuery={setQuery}
                  loading={loading}
                  onSubmit={handleNaturalLanguageSearch}
                  placeholder="Ask a natural-language racing question..."
                />
              )}
            </div>
          </header>

          {error && (
            <div className="mx-auto my-4 flex w-full max-w-[1600px] items-center gap-2 rounded-lg border border-[rgba(225,6,0,0.55)] bg-[rgba(225,6,0,0.12)] p-3 text-sm text-[var(--rc-text-primary)]">
              <AlertCircle size={16} className="text-[var(--rc-red)]" /> {error}
            </div>
          )}

          {loading && !result ? (
            <div className="mx-auto w-full max-w-[1600px] space-y-3 p-4">
              <div className="rc-skeleton h-10 rounded-md" />
              <div className="rc-skeleton h-80 rounded-xl" />
            </div>
          ) : result ? (
            <main className="mx-auto w-full max-w-[1600px] p-4">{renderMainContent()}</main>
          ) : (
            <div className="mx-auto w-full max-w-7xl p-6 text-[var(--rc-text-secondary)]">Search to load analysis.</div>
          )}
        </>
      )}
    </div>
  );
}
