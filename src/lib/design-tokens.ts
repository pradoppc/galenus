export const BRAND = {
  name:        'Galenus',
  tagline:     'Porque saúde começa com acesso',
  domain:      'galenusmed.com.br',
  url:         'https://galenusmed.com.br',
  fullName:    'Galenus — Porque saúde começa com acesso',
  description: 'Consulte a disponibilidade de medicamentos gratuitos nas farmácias do governo perto de você. Galenus: porque saúde começa com acesso.',
  keywords: [
    'medicamentos gratuitos',
    'farmácia popular',
    'medicamentos governo',
    'RENAME medicamentos',
    'farmácia pública',
    'remédio gratuito SUS',
    'consultar estoque medicamento',
    'medicamento disponível perto de mim',
    'farmácia componente especializado',
    'Galenus',
  ],
  author:        'Galenus',
  locale:        'pt_BR',
  twitterHandle: '@galenusmed',
} as const

export const COLORS = {
  primary:       '#1A4D3A',
  primaryDark:   '#133B2C',
  secondary:     '#2B7A5A',
  accent:        '#7EC9A8',
  background:    '#FAFCFB',
  surface:       '#EAF3EE',
  surfaceBorder: '#D4E8DF',

  textPrimary:   '#1A4D3A',
  textBody:      '#2D4A3E',
  textMuted:     '#5B8C7A',
  textLight:     '#9CB8B0',

  stockAvailable:     '#2B7A5A',
  stockAvailableBg:   '#EAF3EE',
  stockLow:           '#C8893A',
  stockLowBg:         '#FEF3E2',
  stockUnavailable:   '#C04848',
  stockUnavailableBg: '#FEF0F0',

  warning:     '#C8893A',
  warningBg:   '#FEF3E2',
  warningText: '#8A5C10',

  onDark:       '#EAF3EE',
  onDarkMuted:  '#7EC9A8',
  onDarkSubtle: '#B8D4C8',
} as const

export const TYPOGRAPHY = {
  fontDisplay: "'Cormorant Garamond', Georgia, serif",
  fontBody:    "'DM Sans', system-ui, sans-serif",

  sizeH1:    '36px',
  sizeH2:    '28px',
  sizeH3:    '22px',
  sizeBody:  '18px',
  sizeSmall: '14px',
  sizeLabel: '11px',

  weightLight:   '300',
  weightRegular: '400',
  weightMedium:  '500',

  lineHeightHeading: '1.2',
  lineHeightBody:    '1.65',
} as const

export const SPACING = {
  touchTargetMin:     '48px',
  touchTargetPrimary: '60px',
  containerPadding:   '20px',
  cardPadding:        '16px 18px',
  cardGap:            '12px',
  sectionGap:         '28px',
} as const

export const BORDER_RADIUS = {
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  pill: '9999px',
} as const

export const SHADOWS = {
  card:   '0 1px 4px rgba(26,77,58,.08)',
  modal:  '0 8px 32px rgba(26,77,58,.14)',
  mapPin: '0 2px 8px rgba(0,0,0,.20)',
} as const

export const STOCK_THRESHOLDS = {
  LOW: 5,
} as const

export const SEARCH_DEFAULTS = {
  RADIUS_KM:     10,
  RADIUS_MIN_KM: 1,
  RADIUS_MAX_KM: 50,
  PAGE_SIZE:     20,
} as const

// 08:00, 12:00, 18:00 Brasília (UTC-3) = 11:00, 15:00, 21:00 UTC
export const ETL_CONFIG = {
  SYNC_INTERVAL_HOURS: 6,
  STALE_DATA_HOURS:    24,
  SCHEDULES_UTC: ['11:00', '15:00', '21:00'],
} as const

export const RATE_LIMIT = {
  REQUESTS_PER_MINUTE:  30,
  SCAN_THRESHOLD:       200,
  SCAN_WINDOW_MINUTES:  5,
  BLOCK_DURATION_HOURS: 24,
} as const

export const STORAGE_KEYS = {
  FONT_SIZE:    'galenus_font_size',
  HIGH_CONTRAST: 'galenus_high_contrast',
  LAST_SEARCH:  'galenus_last_search',
} as const
