import React from 'react';

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
      className="h-12 w-12 rounded-full border border-neutral-700 object-cover"
      onError={(e) => { e.currentTarget.src = fallback; }}
    />
  );
}

function DriverH2HCard({ title, row = {} }) {
  const code = row.code || '--';
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
      <div className="mb-3 flex items-center gap-3">
        <DriverAvatar code={code} />
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">{title}</p>
          <p className="text-sm font-bold text-white">{code} <span className="text-neutral-400 font-normal">{DRIVER_NAME_MAP[code] || ''}</span></p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
        <div>Quali Pos: <span className="font-mono">{row.quali_position ?? '—'}</span></div>
        <div>Quali Lap: <span className="font-mono">{row.quali_lap_time || '—'}</span></div>
        <div>Race Pos: <span className="font-mono">{row.race_position ?? '—'}</span></div>
        <div>Points: <span className="font-mono">{row.race_points ?? '—'}</span></div>
      </div>
    </div>
  );
}

export default function ResultsTable({ results, headToHead, request }) {
  if (!results || results.length === 0) return <p className="p-4 text-neutral-500">No result data available.</p>;

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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DriverH2HCard title="Driver 1" row={merged1} />
        <DriverH2HCard title="Driver 2" row={merged2} />
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">Grand Prix Results</h3>
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-3">Pos</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {results.map((row, idx) => (
                <tr key={idx} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-red-500">{row.Position}</td>
                  <td className="px-4 py-3 font-bold">{row.Abbreviation}</td>
                  <td className="px-4 py-3 text-neutral-400">{row.Status || 'Finished'}</td>
                  <td className="px-4 py-3 font-mono">{formatPoints(row.Points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">Highlights Video</h3>
        <div className="aspect-video overflow-hidden rounded-lg border border-neutral-800">
          <iframe
            className="h-full w-full"
            src={ytEmbedUrl}
            title="Race highlights"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {curatedVideoId
            ? <>Using curated highlight video for <span className="font-mono">{raceLabel} {year}</span>.</>
            : <>Video is selected from YouTube search using: <span className="font-mono">{raceLabel} {year} highlights</span></>}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          If video says unavailable, channel embedding is restricted.{' '}
          <a href={ytSearchUrl} target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300 underline">
            Open first results on YouTube
          </a>
          .
        </p>
      </div>
    </div>
  );
}
