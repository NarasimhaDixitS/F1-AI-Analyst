const RACE_METADATA = [
  { keywords: ['bahrain', 'sakhir'], race: 'Bahrain Grand Prix', country: 'Bahrain', countryCode: 'BH', circuit: 'Bahrain International Circuit' },
  { keywords: ['saudi arabia', 'saudi arabian', 'jeddah'], race: 'Saudi Arabian Grand Prix', country: 'Saudi Arabia', countryCode: 'SA', circuit: 'Jeddah Corniche Circuit' },
  { keywords: ['australia', 'australian', 'melbourne', 'albert park'], race: 'Australian Grand Prix', country: 'Australia', countryCode: 'AU', circuit: 'Albert Park Circuit' },
  { keywords: ['japan', 'japanese', 'suzuka'], race: 'Japanese Grand Prix', country: 'Japan', countryCode: 'JP', circuit: 'Suzuka Circuit' },
  { keywords: ['china', 'chinese', 'shanghai'], race: 'Chinese Grand Prix', country: 'China', countryCode: 'CN', circuit: 'Shanghai International Circuit' },
  { keywords: ['miami'], race: 'Miami Grand Prix', country: 'United States', countryCode: 'US', circuit: 'Miami International Autodrome' },
  { keywords: ['united states', 'usa', 'austin', 'cota'], race: 'United States Grand Prix', country: 'United States', countryCode: 'US', circuit: 'Circuit of the Americas' },
  { keywords: ['las vegas', 'vegas'], race: 'Las Vegas Grand Prix', country: 'United States', countryCode: 'US', circuit: 'Las Vegas Strip Circuit' },
  { keywords: ['emilia romagna', 'imola'], race: 'Emilia Romagna Grand Prix', country: 'Italy', countryCode: 'IT', circuit: 'Imola Circuit' },
  { keywords: ['italian', 'italy', 'monza'], race: 'Italian Grand Prix', country: 'Italy', countryCode: 'IT', circuit: 'Autodromo Nazionale Monza' },
  { keywords: ['monaco'], race: 'Monaco Grand Prix', country: 'Monaco', countryCode: 'MC', circuit: 'Circuit de Monaco' },
  { keywords: ['canada', 'canadian', 'montreal', 'gilles villeneuve'], race: 'Canadian Grand Prix', country: 'Canada', countryCode: 'CA', circuit: 'Circuit Gilles Villeneuve' },
  { keywords: ['spain', 'spanish', 'barcelona', 'catalunya'], race: 'Spanish Grand Prix', country: 'Spain', countryCode: 'ES', circuit: 'Circuit de Barcelona-Catalunya' },
  { keywords: ['austria', 'austrian', 'red bull ring'], race: 'Austrian Grand Prix', country: 'Austria', countryCode: 'AT', circuit: 'Red Bull Ring' },
  { keywords: ['great britain', 'britain', 'british', 'silverstone', 'uk'], race: 'British Grand Prix', country: 'Great Britain', countryCode: 'GB', circuit: 'Silverstone Circuit' },
  { keywords: ['hungary', 'hungarian', 'hungaroring'], race: 'Hungarian Grand Prix', country: 'Hungary', countryCode: 'HU', circuit: 'Hungaroring' },
  { keywords: ['belgium', 'belgian', 'spa'], race: 'Belgian Grand Prix', country: 'Belgium', countryCode: 'BE', circuit: 'Circuit de Spa-Francorchamps' },
  { keywords: ['netherlands', 'dutch', 'zandvoort'], race: 'Dutch Grand Prix', country: 'Netherlands', countryCode: 'NL', circuit: 'Circuit Zandvoort' },
  { keywords: ['azerbaijan', 'baku'], race: 'Azerbaijan Grand Prix', country: 'Azerbaijan', countryCode: 'AZ', circuit: 'Baku City Circuit' },
  { keywords: ['singapore', 'marina bay'], race: 'Singapore Grand Prix', country: 'Singapore', countryCode: 'SG', circuit: 'Marina Bay Street Circuit' },
  { keywords: ['mexico city', 'mexico'], race: 'Mexico City Grand Prix', country: 'Mexico', countryCode: 'MX', circuit: 'Autódromo Hermanos Rodríguez' },
  { keywords: ['sao paulo', 'são paulo', 'brazil', 'brazilian', 'interlagos'], race: 'São Paulo Grand Prix', country: 'Brazil', countryCode: 'BR', circuit: 'Interlagos' },
  { keywords: ['qatar', 'lusail'], race: 'Qatar Grand Prix', country: 'Qatar', countryCode: 'QA', circuit: 'Lusail International Circuit' },
  { keywords: ['abu dhabi', 'yas marina'], race: 'Abu Dhabi Grand Prix', country: 'United Arab Emirates', countryCode: 'AE', circuit: 'Yas Marina Circuit' },
];

const COUNTRY_CODE_ALIASES = {
  bahrain: 'BH',
  'saudi arabia': 'SA',
  australia: 'AU',
  japan: 'JP',
  china: 'CN',
  'united states': 'US',
  usa: 'US',
  italy: 'IT',
  monaco: 'MC',
  canada: 'CA',
  spain: 'ES',
  austria: 'AT',
  'great britain': 'GB',
  britain: 'GB',
  uk: 'GB',
  hungary: 'HU',
  belgium: 'BE',
  netherlands: 'NL',
  azerbaijan: 'AZ',
  singapore: 'SG',
  mexico: 'MX',
  brazil: 'BR',
  qatar: 'QA',
  'united arab emirates': 'AE',
  uae: 'AE',
};

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeModeLabel(mode = '') {
  if (mode === 'race_overview') return 'Race Overview';
  if (mode === 'head_to_head') return 'Head to Head';
  if (mode === 'strategy') return 'Strategy';
  if (mode === 'telemetry') return 'Telemetry';
  if (mode === 'results') return 'Results';
  return mode || 'Mode';
}

function findRaceMetadata(raceName = '') {
  const normalizedRace = normalizeText(raceName);
  if (!normalizedRace) return null;

  return (
    RACE_METADATA.find((entry) => entry.keywords.some((keyword) => normalizedRace.includes(normalizeText(keyword)))) ||
    null
  );
}

export function getCountryCode(countryName = '') {
  const normalized = normalizeText(countryName);
  if (!normalized) return null;
  return COUNTRY_CODE_ALIASES[normalized] || null;
}

export function getCountryFlagUrl(countryCode = '') {
  const normalized = String(countryCode || '').trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(normalized)) return null;
  return `https://flagcdn.com/w640/${normalized}.png`;
}

export function getCountryFlagEmoji(countryCode = '') {
  const normalized = String(countryCode || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '🏁';
  const points = [...normalized].map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...points);
}

export function getRaceIdentityFromSelection(selection = {}) {
  const request = selection.request || {};
  const raceName = selection.raceName || selection.race || request.race || '';
  const sessionName = selection.sessionName || selection.session || request.session || 'Race';
  const year = selection.year || request.year || null;
  const mode = selection.mode || request.mode || '';
  const drivers = selection.drivers || [request.driver1, request.driver2].filter(Boolean);

  const metadata = findRaceMetadata(raceName);
  const countryName = selection.countryName || metadata?.country || '';
  const countryCode = (selection.countryCode || metadata?.countryCode || getCountryCode(countryName) || '').toUpperCase();

  return {
    year,
    raceName: metadata?.race || raceName || 'Grand Prix',
    sessionName,
    mode,
    modeLabel: normalizeModeLabel(mode),
    countryName: countryName || 'Unknown Country',
    countryCode: countryCode || null,
    flagUrl: getCountryFlagUrl(countryCode),
    flagEmoji: getCountryFlagEmoji(countryCode),
    circuitName: selection.circuitName || metadata?.circuit || null,
    drivers,
  };
}
