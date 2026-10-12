function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function sRGBtoLin(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  return 0.2126 * sRGBtoLin(rgb[0]) + 0.7152 * sRGBtoLin(rgb[1]) + 0.0722 * sRGBtoLin(rgb[2]);
}

export function contrast(c1, c2) {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

const light = {
  background: hexToRgb('#FAF8F4'),
  backgroundSubtle: hexToRgb('#F3F0EA'),
  surface: hexToRgb('#FFFFFF'),
  foreground: hexToRgb('#17202F'),
  foregroundSecondary: hexToRgb('#455063'),
  foregroundMuted: hexToRgb('#5C6578'),
  primary: hexToRgb('#1C2B4A'),
  primaryForeground: hexToRgb('#FAF8F4'),
  accent: hexToRgb('#B38B3A'),
  accentStrong: hexToRgb('#7A5C1E'),
  accentSoft: hexToRgb('#F4EAD3'),
  userBubble: hexToRgb('#1C2B4A'),
  userBubbleForeground: hexToRgb('#FAF8F4'),
  ring: hexToRgb('#96702F'),
  border: hexToRgb('#E6E1D8'),
};

const dark = {
  background: hexToRgb('#0F131A'),
  backgroundSubtle: hexToRgb('#0B0E14'),
  surface: hexToRgb('#151A23'),
  foreground: hexToRgb('#E9ECF2'),
  foregroundSecondary: hexToRgb('#B3BAC8'),
  foregroundMuted: hexToRgb('#8B93A5'),
  primary: hexToRgb('#F1EDE4'),
  primaryForeground: hexToRgb('#0F131A'),
  accent: hexToRgb('#D1A955'),
  accentStrong: hexToRgb('#E3C57D'),
  accentSoftOnSurface: [
    Math.round(209 * 0.12 + 21 * 0.88),
    Math.round(169 * 0.12 + 26 * 0.88),
    Math.round(85 * 0.12 + 35 * 0.88),
  ],
  userBubble: hexToRgb('#1F2B45'),
  userBubbleForeground: hexToRgb('#E9ECF2'),
  ring: hexToRgb('#D1A955'),
  border: hexToRgb('#232A37'),
};

export const checks = [
  // LIGHT
  { name: 'Light: foreground on background', ratio: contrast(light.foreground, light.background), min: 4.5 },
  { name: 'Light: foreground-secondary on background', ratio: contrast(light.foregroundSecondary, light.background), min: 4.5 },
  { name: 'Light: foreground-muted on background', ratio: contrast(light.foregroundMuted, light.background), min: 4.5 },
  { name: 'Light: foreground on background-subtle', ratio: contrast(light.foreground, light.backgroundSubtle), min: 4.5 },
  { name: 'Light: foreground-secondary on background-subtle', ratio: contrast(light.foregroundSecondary, light.backgroundSubtle), min: 4.5 },
  { name: 'Light: foreground-muted on background-subtle', ratio: contrast(light.foregroundMuted, light.backgroundSubtle), min: 4.5 },
  { name: 'Light: foreground on surface', ratio: contrast(light.foreground, light.surface), min: 4.5 },
  { name: 'Light: foreground-secondary on surface', ratio: contrast(light.foregroundSecondary, light.surface), min: 4.5 },
  { name: 'Light: foreground-muted on surface', ratio: contrast(light.foregroundMuted, light.surface), min: 4.5 },
  { name: 'Light: primary-foreground on primary', ratio: contrast(light.primaryForeground, light.primary), min: 4.5 },
  { name: 'Light: accent-strong on accent-soft', ratio: contrast(light.accentStrong, light.accentSoft), min: 4.5 },
  { name: 'Light: user-bubble-foreground on user-bubble', ratio: contrast(light.userBubbleForeground, light.userBubble), min: 4.5 },
  { name: 'Light: ring UI boundary on background', ratio: contrast(light.ring, light.background), min: 3.0 },

  // DARK
  { name: 'Dark: foreground on background', ratio: contrast(dark.foreground, dark.background), min: 4.5 },
  { name: 'Dark: foreground-secondary on background', ratio: contrast(dark.foregroundSecondary, dark.background), min: 4.5 },
  { name: 'Dark: foreground-muted on background', ratio: contrast(dark.foregroundMuted, dark.background), min: 4.5 },
  { name: 'Dark: foreground on background-subtle', ratio: contrast(dark.foreground, dark.backgroundSubtle), min: 4.5 },
  { name: 'Dark: foreground-secondary on background-subtle', ratio: contrast(dark.foregroundSecondary, dark.backgroundSubtle), min: 4.5 },
  { name: 'Dark: foreground-muted on background-subtle', ratio: contrast(dark.foregroundMuted, dark.backgroundSubtle), min: 4.5 },
  { name: 'Dark: foreground on surface', ratio: contrast(dark.foreground, dark.surface), min: 4.5 },
  { name: 'Dark: foreground-secondary on surface', ratio: contrast(dark.foregroundSecondary, dark.surface), min: 4.5 },
  { name: 'Dark: foreground-muted on surface', ratio: contrast(dark.foregroundMuted, dark.surface), min: 4.5 },
  { name: 'Dark: primary-foreground on primary', ratio: contrast(dark.primaryForeground, dark.primary), min: 4.5 },
  { name: 'Dark: accent-strong on accent-soft', ratio: contrast(dark.accentStrong, dark.accentSoftOnSurface), min: 4.5 },
  { name: 'Dark: user-bubble-foreground on user-bubble', ratio: contrast(dark.userBubbleForeground, dark.userBubble), min: 4.5 },
  { name: 'Dark: ring UI boundary on background', ratio: contrast(dark.ring, dark.background), min: 3.0 },
];

let failed = 0;
console.log('=== WCAG Contrast Verification ===');
for (const c of checks) {
  const pass = c.ratio >= c.min;
  console.log(`${pass ? '✓ PASS' : '✗ FAIL'} [${c.ratio.toFixed(2)}:1 >= ${c.min}:1] ${c.name}`);
  if (!pass) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} contrast check(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll WCAG contrast checks passed successfully!');
}
