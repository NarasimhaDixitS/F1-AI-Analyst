import React from 'react';
import { Award, Medal, PlayCircle, Trophy } from 'lucide-react';
import { getPositionAccent, getTeamAccentStyle } from '../utils/raceTheme';

const DRIVER_NAME_MAP = {
  VER: 'Max Verstappen', HAM: 'Lewis Hamilton', NOR: 'Lando Norris', PIA: 'Oscar Piastri',
  LEC: 'Charles Leclerc', SAI: 'Carlos Sainz', RUS: 'George Russell', PER: 'Sergio Perez',
  ALO: 'Fernando Alonso', STR: 'Lance Stroll', GAS: 'Pierre Gasly', OCO: 'Esteban Ocon',
  ALB: 'Alex Albon', TSU: 'Yuki Tsunoda', HUL: 'Nico Hulkenberg', MAG: 'Kevin Magnussen',
  BOT: 'Valtteri Bottas', ZHO: 'Zhou Guanyu', RIC: 'Daniel Ricciardo'
};

const DRIVER_IMAGE_SLUG = {
  VER: 'verstappen', HAM: 'hamilton', NOR: 'norris', PIA: 'piastri', LEC: 'leclerc', SAI: 'sainz',
  RUS: 'russell', PER: 'perez', ALO: 'alonso', STR: 'stroll', GAS: 'gasly', OCO: 'ocon', ALB: 'albon',
  TSU: 'tsunoda', HUL: 'hulkenberg', MAG: 'magnussen', BOT: 'bottas', ZHO: 'zhou', RIC: 'ricciardo'
};

const CURATED_HIGHLIGHTS = {
  'British Grand Prix_2024': 'dxvKf2Q6Q3Q',
  'Monaco Grand Prix_2024': '2xw6Qh8h4A8',
  'Italian Grand Prix_2024': 'dQw4w9WgXcQ',
};

function DriverAvatar({ code }) {
  const slug = DRIVER_IMAGE_SLUG[code];
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(code)}&background=111827&color=ffffff&size=96`;
  const src = slug
    ? `https://media.formula1.com/content/dam/fom-website/drivers/2024Drivers/${slug}.png.img.512.medium.png`
    : fallback;

  return (
    <img
      src={src}
      alt={code}
      className="h-12 w-12 rounded-full border border-[var(--rc-border)] object-cover"
      onError={(e) => { e.currentTarget.src = fallback; }}
    />
  );
}

function DriverH2HCard({ title, row = {} }) {
  const code = row.code || '--';
  const hasLimitedData = [row.quali_position, row.quali_lap_time, row.race_position, row.race_points].filter((v) => v !== undefined && v !== null && v !== '').length <= 2;

  const statClass = hasLimitedData
    ? 'rounded border border-[var(--rc-border)] bg-[rgba(13,17,26,0.7)] px-2 py-1 text-[11px]'
    : 'rounded border border-[var(--rc-border)] bg-[rgba(13,17,26,0.62)] px-2 py-1.5 text-xs';

  return (
    <div className={`rc-card rc-accent-rail rounded-lg ${hasLimitedData ? 'p-3' : 'p-4'}`} style={getTeamAccentStyle(row.team)}>
      <div className={`${hasLimitedData ? 'mb-2' : 'mb-3'} flex items-center gap-3`}>
        <DriverAvatar code={code} />
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--rc-text-muted)]">{title} Brief</p>
          <p className="text-sm font-bold text-[var(--rc-text-primary)]">{code} <span className="font-normal text-[var(--rc-text-secondary)]">{DRIVER_NAME_MAP[code] || ''}</span></p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[var(--rc-text-secondary)]">
        <div className={statClass}>Quali Pos: <span className="font-mono">{row.quali_position ?? '—'}</span></div>
        <div className={statClass}>Quali Lap: <span className="font-mono">{row.quali_lap_time || '—'}</span></div>
        <div className={statClass}>Race Pos: <span className="font-mono">{row.race_position ?? '—'}</span></div>
        <div className={statClass}>Points: <span className="font-mono">{row.race_points ?? '—'}</span></div>
      </div>
    </div>
  );
}

function getPodiumStyle(position) {
  if (position === 1 || String(position) === '1') {
    return {
      rowClass: 'bg-[rgba(245,197,66,0.08)] hover:bg-[rgba(245,197,66,0.14)]',
      posClass: 'text-[var(--rc-gold)]',
      badge: (
        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(245,197,66,0.35)] bg-[rgba(245,197,66,0.12)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--rc-gold)]">
          <Trophy size={12} /> Winner
        </span>
      ),
    };
  }
  if (position === 2 || String(position) === '2') {
    return {
      rowClass: 'bg-[rgba(192,199,210,0.08)] hover:bg-[rgba(192,199,210,0.14)]',
      posClass: 'text-[var(--rc-silver)]',
      badge: (
        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(192,199,210,0.35)] bg-[rgba(192,199,210,0.13)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--rc-silver)]">
          <Medal size={12} /> P2
        </span>
      ),
    };
  }
  if (position === 3 || String(position) === '3') {
    return {
      rowClass: 'bg-[rgba(205,127,50,0.08)] hover:bg-[rgba(205,127,50,0.14)]',
      posClass: 'text-[var(--rc-bronze)]',
      badge: (
        <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(205,127,50,0.35)] bg-[rgba(205,127,50,0.14)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--rc-bronze)]">
          <Award size={12} /> P3
        </span>
      ),
    };
  }
  return {
    rowClass: 'hover:bg-[rgba(34,211,238,0.06)]',
    posClass: 'text-[var(--rc-text-secondary)]',
    badge: null,
  };
}

function getStatusChip(status = '') {
  const value = String(status || 'Finished');
  const upper = value.toUpperCase();
  if (upper.includes('DNF') || upper.includes('RETIRED') || upper.includes('DSQ')) {
    return 'rc-chip rc-chip-danger';
  }
  if (upper.includes('LAP') || upper.includes('PENALTY')) {
    return 'rc-chip rc-chip-warning';
  }
  return 'rc-chip rc-chip-success';
}

export default function ResultsTable({ results, headToHead, request, mode = 'head_to_head' }) {
  if (!results || results.length === 0) return <p className="rc-card rounded-lg p-4 text-[var(--rc-text-secondary)]">No result data available.</p>;

  const formatPoints = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    return value;
  };

  const d1 = headToHead?.qualifying?.driver1 || {};
  const d2 = headToHead?.qualifying?.driver2 || {};
  const r1 = headToHead?.race?.driver1 || {};
  const r2 = headToHead?.race?.driver2 || {};
  const merged1 = {
    code: d1.code,
    quali_position: d1.position,
    quali_lap_time: d1.lap_time,
    race_position: r1.position,
    race_points: r1.points,
  };
  const merged2 = {
    code: d2.code,
    quali_position: d2.position,
    quali_lap_time: d2.lap_time,
    race_position: r2.position,
    race_points: r2.points,
  };

  const hasHeadToHeadRows = Boolean(merged1.code || merged2.code);
  const showMedia = mode === 'head_to_head';

  const raceLabel = request?.race || 'Grand Prix';
  const year = request?.year || '2024';
  const curatedKey = `${raceLabel}_${year}`;
  const curatedVideoId = CURATED_HIGHLIGHTS[curatedKey];
  const ytQuery = encodeURIComponent(`${raceLabel} ${year} highlights`);
  const ytEmbedUrl = curatedVideoId
    ? `https://www.youtube.com/embed/${curatedVideoId}`
    : `https://www.youtube.com/embed?listType=search&list=${ytQuery}`;
  const ytSearchUrl = `https://www.youtube.com/results?search_query=${ytQuery}`;

  return (
    <div className="space-y-6">
      {hasHeadToHeadRows && mode === 'head_to_head' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr,auto,1fr] lg:items-center">
          <DriverH2HCard title="Driver 1" row={merged1} />
          <div className="hidden rounded-full border border-[var(--rc-border)] bg-[rgba(13,17,26,0.75)] px-3 py-1 text-xs font-bold tracking-[0.2em] text-[var(--rc-cyan)] lg:block">VS</div>
          <DriverH2HCard title="Driver 2" row={merged2} />
        </div>
      )}

      <div className="rc-card rc-card-elevated rc-accent-rail rounded-xl p-4" style={{ '--accent-color': 'var(--rc-gold)' }}>
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-text-secondary)]">
          <Trophy size={14} className="text-[var(--rc-gold)]" />
          Grand Prix Results
        </h3>
        <div className="overflow-x-auto rounded-lg border border-[var(--rc-border)]">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="bg-[rgba(13,17,26,0.85)] text-[var(--rc-text-secondary)] uppercase text-xs font-bold tracking-[0.08em]">
              <tr>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rc-border)]">
              {results.map((row, idx) => {
                const podium = getPodiumStyle(row.Position);
                const posMeta = getPositionAccent(row.Position);
                const teamName = row.TeamName || row.Team || row.team;
                const teamAccent = getTeamAccentStyle(teamName);
                return (
                <tr key={idx} className={`${podium.rowClass} transition-colors`} style={teamAccent}>
                  <td className={`px-4 py-3 font-mono font-bold ${podium.posClass}`}>
                    <span className="rc-tabular">{posMeta.label}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[var(--rc-text-primary)]">
                    <div className="flex items-center gap-2">
                      <span>{row.Abbreviation}</span>
                      {podium.badge}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex ${getStatusChip(row.Status)}`}>
                      {row.Status || 'Finished'}
                    </span>
                  </td>
                  <td className="rc-tabular px-4 py-3 text-right font-mono text-[var(--rc-text-primary)]">{formatPoints(row.Points)}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {showMedia && (
        <div className="rc-card rounded-xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--rc-text-secondary)]">
          <PlayCircle size={14} className="text-[var(--rc-red)]" />
          Highlights Video
        </h3>
        <div className="aspect-video overflow-hidden rounded-lg border border-[var(--rc-border)]">
          <iframe
            className="h-full w-full"
            src={ytEmbedUrl}
            title="Race highlights"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="mt-2 text-xs text-[var(--rc-text-muted)]">
          {curatedVideoId
            ? <>Using curated highlight video for <span className="font-mono">{raceLabel} {year}</span>.</>
            : <>Video is selected from YouTube search using: <span className="font-mono">{raceLabel} {year} highlights</span></>}
        </p>
        <p className="mt-1 text-xs text-[var(--rc-text-muted)]">
          If video says unavailable, channel embedding is restricted.{' '}
          <a href={ytSearchUrl} target="_blank" rel="noreferrer" className="text-[var(--rc-red)] hover:text-red-300 underline">
            Open first results on YouTube
          </a>
          .
        </p>
        </div>
      )}
    </div>
  );
}
