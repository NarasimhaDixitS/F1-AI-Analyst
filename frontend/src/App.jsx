import React, { useState } from 'react';
import axios from 'axios';
import { Search, Activity, Map, Timer, Info, AlertCircle, Loader2, Gauge, CarFront } from 'lucide-react';

// Import our custom components
import TelemetryChart from './components/TelemetryChart';
import DeltaChart from './components/DeltaChart';
import TrackMap from './components/TrackMap';
import ResultsTable from './components/ResultsTable';
import InsightsLab from './components/InsightsLab';

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
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
          Unable to render chart for this response. Try a more specific query (driver1 vs driver2, race, year, session).
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
  if (!payload?.data?.driver1?.telemetry || !payload?.data?.driver2?.telemetry) {
    return payload;
  }

  const t1 = payload.data.driver1.telemetry;
  const t2 = payload.data.driver2.telemetry;

  const normalized = {
    ...payload,
    data: {
      ...payload.data,
      driver1: { ...payload.data.driver1 },
      driver2: { ...payload.data.driver2 },
    },
  };

  normalized.data.driver1.telemetry = {
    ...t1,
    distance: downsampleSeries(t1.distance),
    speed: downsampleSeries(t1.speed),
    throttle: downsampleSeries(t1.throttle),
    brake: downsampleSeries(t1.brake),
    x: downsampleSeries(t1.x),
    y: downsampleSeries(t1.y),
  };

  normalized.data.driver2.telemetry = {
    ...t2,
    distance: downsampleSeries(t2.distance),
    speed: downsampleSeries(t2.speed),
    throttle: downsampleSeries(t2.throttle),
    brake: downsampleSeries(t2.brake),
    x: downsampleSeries(t2.x),
    y: downsampleSeries(t2.y),
  };

  return normalized;
}

function getBriefingText(result) {
  const explanation = typeof result?.explanation === 'string' ? result.explanation : '';
  if (!explanation) return 'Telemetry comparison loaded.';

  // Clean older technical fallback/provider error messages if they appear
  return explanation
    .replace(/AI narrative is in fallback mode because.*$/i, 'AI analysis is currently unavailable, so this briefing uses deterministic session data.')
    .replace(/Extraction fallback reason:.*$/i, '')
    .trim();
}

function SpeedTrapPanel({ speedTrap }) {
  if (!speedTrap) return null;
  const d1 = speedTrap.driver1 || {};
  const d2 = speedTrap.driver2 || {};
  const winner = speedTrap.faster_driver;
  const delta = speedTrap.speed_delta_kph;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-2 flex items-center gap-2 text-neutral-300">
        <Gauge size={16} className="text-red-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider">Speed Trap</h3>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between rounded border border-neutral-800 px-3 py-2">
          <span>{d1.code || 'Driver 1'}</span>
          <span className="font-mono">{d1.max_speed_kph ?? '—'} km/h</span>
        </div>
        <div className="flex items-center justify-between rounded border border-neutral-800 px-3 py-2">
          <span>{d2.code || 'Driver 2'}</span>
          <span className="font-mono">{d2.max_speed_kph ?? '—'} km/h</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        <CarFront size={12} className="inline mr-1 text-red-400" />
        Fastest at trap: <span className="text-neutral-200 font-semibold">{winner || '—'}</span>
        {delta !== null && delta !== undefined ? ` · Δ ${delta} km/h` : ''}
      </p>
    </div>
  );
}

function compoundClass(compound = '') {
  const c = String(compound).toUpperCase();
  if (c.includes('SOFT')) return 'bg-red-500';
  if (c.includes('MEDIUM')) return 'bg-yellow-400';
  if (c.includes('HARD')) return 'bg-white';
  if (c.includes('INTER')) return 'bg-green-500';
  if (c.includes('WET')) return 'bg-blue-500';
  return 'bg-neutral-500';
}

function TyreStrategyPanel({ tyreStrategy }) {
  if (!tyreStrategy) return null;
  const d1 = tyreStrategy.driver1 || { code: 'D1', stints: [] };
  const d2 = tyreStrategy.driver2 || { code: 'D2', stints: [] };
  const rec = tyreStrategy.recommended_strategy;

  const row = (driver) => (
    <div className="space-y-1">
      <p className="text-[11px] text-neutral-400 uppercase tracking-wider">{driver.code} Strategy</p>
      <div className="flex flex-wrap gap-2">
        {(driver.stints || []).length === 0 && <span className="text-xs text-neutral-500">No stint data</span>}
        {(driver.stints || []).map((s, i) => (
          <div key={`${driver.code}-${i}`} className="rounded border border-neutral-800 px-2 py-1 text-[11px]">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${compoundClass(s.compound)} mr-1 align-middle`} />
            S{s.stint}: {s.start_lap ?? '—'}–{s.end_lap ?? '—'}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-300">Tyre Strategy</h3>
      <div className="space-y-3">
        {row(d1)}
        {row(d2)}
      </div>
      {rec && (
        <p className="mt-3 text-xs text-neutral-400">
          Baseline recommendation: <span className="text-neutral-200">{rec.based_on_driver}</span> → {(rec.compound_sequence || []).join(' → ')}
        </p>
      )}
    </div>
  );
}

export default function App() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("insights");
  const [error, setError] = useState(null);

  const promptChips = [
    "Why was VER faster than HAM in Silverstone 2024 qualifying?",
    "Compare NOR vs PIA in Brazil 2024 sprint",
    "Who had better braking consistency in Monaco 2024 race?"
  ];

  const safeLapTime = (value = '') => {
    if (!value) return '--';
    return value.split('0 days ')[1]?.substring(0, 8) || value;
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setHasSearched(true);
    setLoading(true);
    setError(null);
    try {
      // Points to our FastAPI backend
      const res = await axios.post(`${API_BASE}/api/analyze`, { query });
      setResult(normalizeResultPayload(res.data));
      setActiveTab('insights');
    } catch (err) {
      console.error("Analysis failed", err);
      setError("Failed to fetch F1 data. Ensure the backend is running and your API key is valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b10] text-white font-sans selection:bg-red-500/30">
      {!hasSearched ? (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
          <div className="w-14 h-14 bg-red-600 flex items-center justify-center rounded-sm italic font-black text-3xl mb-5">F1</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">F1 AI Race Analyst</h1>
          <p className="mt-3 mb-8 text-neutral-400 max-w-2xl">
            Ask a race question and get telemetry overlays, driver head-to-head and grand prix insights.
          </p>

          <form onSubmit={handleSearch} className="w-full max-w-3xl relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., Why was VER faster than HAM in Silverstone 2024 qualifying?"
              className="w-full bg-neutral-900/70 border border-neutral-700 rounded-xl py-4 pl-5 pr-14 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-sm"
            />
            <button type="submit" disabled={loading} className="absolute right-2 top-2.5 p-2 bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors">
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {promptChips.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                className="px-3 py-1 bg-neutral-900 border border-neutral-800 rounded text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <header className="p-6 border-b border-neutral-800 bg-[#15151e] sticky top-0 z-50 backdrop-blur">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded-sm italic font-black text-2xl">F1</div>
                <h1 className="text-xl font-bold uppercase tracking-tighter">AI Race Analyst <span className="text-red-600 text-xs ml-1">BETA</span></h1>
              </div>

              <form onSubmit={handleSearch} className="w-full max-w-3xl relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Why was VER faster than HAM in Silverstone 2024?"
                  className="w-full bg-neutral-900/50 border border-neutral-700 rounded-md py-3 pl-5 pr-12 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all text-sm"
                />
                <button type="submit" disabled={loading} className="absolute right-2 top-1.5 p-1.5 bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                </button>
              </form>
            </div>
          </header>

          {error && (
            <div className="max-w-7xl mx-auto m-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg flex items-center gap-3 text-red-200">
              <AlertCircle size={20} /> {error}
            </div>
          )}

          {loading && !result ? (
            <div className="max-w-7xl mx-auto p-6 animate-pulse space-y-4">
              <div className="h-10 bg-neutral-900 rounded-md" />
              <div className="h-80 bg-neutral-900 rounded-xl" />
              <div className="h-80 bg-neutral-900 rounded-xl" />
            </div>
          ) : result ? (
        <main className="max-w-[1600px] mx-auto flex flex-col lg:flex-row h-[calc(100vh-100px)]">
          
          {/* LEFT PANEL: FASTF1 SUMMARY */}
          <aside className="w-full lg:w-1/3 p-6 border-r border-neutral-800 overflow-y-auto bg-[#15151e]/30">
            <div className="flex items-center gap-2 text-red-500 mb-6">
              <Info size={18} />
              <h2 className="text-sm font-bold uppercase tracking-widest">FastF1 Session Note</h2>
            </div>
            
            <div className="bg-neutral-900/80 rounded-xl p-5 border border-neutral-800 mb-6 shadow-xl">
              <p className="text-neutral-200 leading-relaxed text-sm italic">
                "{getBriefingText(result)}"
              </p>
            </div>

            {result.request && (
              <div className="mb-6 p-4 rounded-lg border border-neutral-800 bg-neutral-900/40 text-xs text-neutral-400 uppercase tracking-wider grid grid-cols-3 gap-2">
                <span>{result.request.year || '--'}</span>
                <span>{result.request.race || '--'}</span>
                <span>{result.request.session || '--'}</span>
              </div>
            )}

            {/* QUICK STATS CARD */}
            {result.data && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-900/10 border-l-4 border-blue-500 rounded-r-lg">
                  <span className="text-[10px] text-blue-400 uppercase font-bold">{result.data.driver1.name}</span>
                  <p className="text-lg font-mono font-bold mt-1">{safeLapTime(result.data.driver1.lap_time)}</p>
                </div>
                <div className="p-4 bg-yellow-900/10 border-l-4 border-yellow-500 rounded-r-lg">
                  <span className="text-[10px] text-yellow-400 uppercase font-bold">{result.data.driver2.name}</span>
                  <p className="text-lg font-mono font-bold mt-1">{safeLapTime(result.data.driver2.lap_time)}</p>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <SpeedTrapPanel speedTrap={result.speed_trap} />
              <TyreStrategyPanel tyreStrategy={result.tyre_strategy} />
            </div>
          </aside>

          {/* RIGHT PANEL: VISUALIZATIONS */}
          <section className="w-full lg:w-2/3 flex flex-col bg-[#0b0b10]">
            {/* TAB NAVIGATION */}
            <nav className="flex bg-[#15151e] border-b border-neutral-800 px-4">
              {[
                { id: 'insights', label: 'Insights Lab', icon: <Info size={16}/> },
                { id: 'results', label: 'Results', icon: <Timer size={16}/> },
                { id: 'track', label: 'Track Map', icon: <Map size={16}/> },
                { id: 'telemetry', label: 'Telemetry', icon: <Activity size={16}/> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                    activeTab === tab.id ? 'border-red-600 text-white bg-red-600/5' : 'border-transparent text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>

            {/* TAB CONTENT */}
            <div className="flex-1 p-8 overflow-y-auto">
              {activeTab === 'telemetry' && result.data && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <ChartErrorBoundary>
                    <TelemetryChart data={result.data} />
                  </ChartErrorBoundary>
                  <ChartErrorBoundary>
                    <DeltaChart data={result.data} />
                  </ChartErrorBoundary>
                </div>
              )}

              {activeTab === 'telemetry' && !result.data && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
                  Telemetry is unavailable for this response. {result.explanation || 'Try a more specific query with two drivers, race, year, and session.'}
                </div>
              )}

              {activeTab === 'track' && result.data && (
                <div className="h-full min-h-[500px] animate-in zoom-in-95 duration-500">
                  <ChartErrorBoundary>
                    <TrackMap data={result.data} />
                  </ChartErrorBoundary>
                </div>
              )}

              {activeTab === 'track' && !result.data && (
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
                  Track map is unavailable for this response. {result.explanation || 'Try a more specific query with two drivers, race, year, and session.'}
                </div>
              )}

              {activeTab === 'results' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <ResultsTable
                    results={result.results || []}
                    headToHead={result.head_to_head}
                    request={result.request}
                  />
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                  <InsightsLab
                    data={result.data}
                    headToHead={result.head_to_head}
                    raceTimeline={result.race_timeline}
                    teamBattles={result.team_battles}
                    raceContext={result.race_context}
                  />
                </div>
              )}
            </div>
          </section>
        </main>
      ) : (
            <div className="max-w-7xl mx-auto p-6 text-neutral-400">Search to load analysis.</div>
          )}
        </>
      )}
    </div>
  );
}
