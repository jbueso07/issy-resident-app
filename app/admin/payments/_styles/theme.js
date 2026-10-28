import { neu } from '../../../../src/theme/tokens';
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
  background: neu.bg,
  surface: neu.bg,
  surfaceContainer: neu.raised,
  surfaceContainerHigh: neu.sunken,
  surfaceContainerHighest: neu.sunken,
  surfaceContainerLow: neu.bg,

  // Primary (lime)
  primary: neu.teal,
  primaryContainer: neu.teal,
  onPrimaryContainer: neu.onAccent,
  primaryFixed: neu.teal,
  onPrimaryFixed: neu.onAccent,

  // Text
  onSurface: neu.text,
  onSurfaceVariant: neu.textLabel,
  outline: neu.border,
  outlineVariant: neu.border,

  // Status colors
  error: neu.coral,
  errorContainer: neu.coral + '26',
  onErrorContainer: neu.text,
  secondaryContainer: neu.teal,
  onSecondaryContainer: neu.onAccent,
  tertiaryFixedDim: neu.amber,
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
