// app/admin/payments/_styles/theme.js
// ISSY Admin Payments — Theme nuevo (Material-3 inspired) para el rediseño
// Sprint 3 D3+.
//
// El módulo de pagos pre-rediseño usa `COLORS` de `_constants.js` (paleta
// más simple). Este theme es paralelo, especifico para los componentes del
// rediseño (ChargeCard, Lista-Cobros, etc.). Los tabs legacy (ProofsTab,
// SettingsTab) siguen usando COLORS hasta que se migren en sprints futuros.

export const colors = {
  // Surfaces (dark)
  background: '#111316',
  surface: '#111316',
  surfaceContainer: '#1e2023',
  surfaceContainerHigh: '#282a2d',
  surfaceContainerHighest: '#333538',
  surfaceContainerLow: '#1a1c1f',

  // Primary (lime)
  primary: '#c8f328',
  primaryContainer: '#c8f328',
  onPrimaryContainer: '#576c00',
  primaryFixed: '#c8f328',
  onPrimaryFixed: '#171e00',

  // Text
  onSurface: '#e2e2e6',
  onSurfaceVariant: '#c5c9ae',
  outline: '#8f937a',
  outlineVariant: '#444934',

  // Status colors
  error: '#ffb4ab',
  errorContainer: '#93000a',
  onErrorContainer: '#ffdad6',
  secondaryContainer: '#00c19f',
  onSecondaryContainer: '#00493a',
  tertiaryFixedDim: '#ffba20',
};

export const spacing = {
  unit: 4,
  gutter: 16,
  cardGap: 12,
  sectionMargin: 32,
  containerPadding: 20,
};

export const typography = {
  bodyMd: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  labelSm: { fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.5 },
  labelMd: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.12 },
  monoData: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.7 },
  headlineSm: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  headlineMd: { fontSize: 24, lineHeight: 32, fontWeight: '600' },
  displayLg: { fontSize: 32, lineHeight: 40, fontWeight: '700' },
};

export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
};
