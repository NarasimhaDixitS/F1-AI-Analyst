const TEAM_COLOR_MAP = {
  redbull: '#3671C6',
  ferrari: '#E80020',
  mercedes: '#27F4D2',
  mclaren: '#FF8000',
  astonmartin: '#229971',
  alpine: '#0090FF',
  williams: '#64C4FF',
  haas: '#B6BABD',
  racingbulls: '#6692FF',
  rb: '#6692FF',
  visacashapprb: '#6692FF',
  sauber: '#52E252',
  kicksauber: '#52E252',
  stakesauber: '#52E252',
};

function normalizeName(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getTeamColor(teamName = '') {
  const normalized = normalizeName(teamName);
  if (!normalized) return '#5E6A7D';

  if (normalized.includes('redbull')) return TEAM_COLOR_MAP.redbull;
  if (normalized.includes('ferrari')) return TEAM_COLOR_MAP.ferrari;
  if (normalized.includes('mercedes')) return TEAM_COLOR_MAP.mercedes;
  if (normalized.includes('mclaren')) return TEAM_COLOR_MAP.mclaren;
  if (normalized.includes('astonmartin')) return TEAM_COLOR_MAP.astonmartin;
  if (normalized.includes('alpine')) return TEAM_COLOR_MAP.alpine;
  if (normalized.includes('williams')) return TEAM_COLOR_MAP.williams;
  if (normalized.includes('haas')) return TEAM_COLOR_MAP.haas;

  if (
    normalized.includes('racingbulls') ||
    normalized === 'rb' ||
    normalized.includes('visacashapprb') ||
    normalized.includes('cashapprb')
  ) {
    return TEAM_COLOR_MAP.racingbulls;
  }

  if (
    normalized.includes('sauber') ||
    normalized.includes('kicksauber') ||
    normalized.includes('stakesauber') ||
    normalized.includes('kickstake')
  ) {
    return TEAM_COLOR_MAP.sauber;
  }

  return TEAM_COLOR_MAP[normalized] || '#5E6A7D';
}

export function getTeamAccentStyle(teamName = '') {
  const color = getTeamColor(teamName);
  return {
    '--team-accent': color,
    borderColor: `${color}55`,
    boxShadow: `inset 3px 0 0 0 ${color}`,
  };
}

export function getCompoundColor(compound = '') {
  const c = normalizeName(compound);
  if (c.includes('soft')) return '#E10600';
  if (c.includes('medium')) return '#FFD166';
  if (c.includes('hard')) return '#E5EAF2';
  if (c.includes('inter')) return '#00D084';
  if (c.includes('wet')) return '#3B82F6';
  return '#8B95A7';
}

export function getPositionAccent(position) {
  const p = Number(position);
  if (p === 1) return { label: 'P1', color: '#F5C542' };
  if (p === 2) return { label: 'P2', color: '#C0C7D2' };
  if (p === 3) return { label: 'P3', color: '#CD7F32' };
  if (p > 0 && p <= 10) return { label: `P${String(p).padStart(2, '0')}`, color: '#00D084' };
  return { label: p > 0 ? `P${String(p).padStart(2, '0')}` : 'P--', color: '#8B95A7' };
}

export function getModeAccent(mode = '') {
  const m = String(mode).toLowerCase();
  if (m === 'race_overview') return { color: '#E10600', soft: 'rgba(225, 6, 0, 0.18)' };
  if (m === 'head_to_head') return { color: '#22D3EE', soft: 'rgba(34, 211, 238, 0.18)' };
  if (m === 'strategy') return { color: '#FFD166', soft: 'rgba(255, 209, 102, 0.2)' };
  if (m === 'telemetry') return { color: '#22D3EE', soft: 'rgba(34, 211, 238, 0.2)' };
  if (m === 'results') return { color: '#F5C542', soft: 'rgba(245, 197, 66, 0.2)' };
  return { color: '#E10600', soft: 'rgba(225, 6, 0, 0.16)' };
}
