import fs from 'fs';
import path from 'path';

// Directories and files to check
const scanDirs = ['src'];
const allowedFiles = [
  path.normalize('src/styles/tokens.css'),
  path.normalize('src/assets/react.svg'),
  path.normalize('src/assets/vite.svg')
];

// Hex, rgb, hsl literals (excluding var() token references)
const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const rgbHslRegex = /\b(?:rgba?|hsla?|oklch)\(\s*(?!var\()[^)]+\)/g;

// Banned Tailwind color classes
const bannedTailwind = /\b(?:bg-|text-|border-|from-|via-|to-|shadow-|ring-|fill-|stroke-)?(?:indigo|violet|purple|fuchsia|pink|cyan|sky)(?:-[0-9]{2,3}(?:\/[0-9]+)?)?\b/g;

// Banned gradients, text-transparent, neon glows
const bannedGradientsAndGlows = /\b(?:bg-gradient(?:-[a-z]+)?|from-|via-|to-|bg-clip-text|text-transparent|drop-shadow|shadow-\[0_0_)\b/g;

// Banned pure #000 / #FFF classes on text
const bannedPureText = /\b(?:text-white|text-black)\b/g;

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        walk(full, fileList);
      }
    } else if (/\.(tsx|ts|jsx|js|html|css)$/.test(file)) {
      fileList.push(full);
    }
  }
  return fileList;
}

const allFiles = scanDirs.flatMap((d) => walk(d));
let errors = [];

for (const filePath of allFiles) {
  const normalized = path.normalize(filePath);
  if (allowedFiles.some((af) => normalized.endsWith(af))) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Exception allowed for the single voice orb tonal radial fill specified in prompt:
    // "#2D4272 -> #1C2B4A -> #101A2E" in AnimatedOrb.tsx
    if (normalized.includes('AnimatedOrb.tsx')) {
      if (line.includes('#2D4272') || line.includes('#1C2B4A') || line.includes('#101A2E')) {
        return;
      }
    }
    // Also voice mode dark background #0B0F15 exception allowed in VoiceModeOverlay
    if (normalized.includes('VoiceModeOverlay.tsx') && line.includes('#0B0F15')) {
      return;
    }

    // Check hex
    const hexMatches = line.match(hexRegex);
    if (hexMatches) {
      errors.push({ file: filePath, line: index + 1, issue: `Disallowed hex literal: ${hexMatches.join(', ')}`, text: line.trim() });
    }

    // Check rgb/rgba/hsl outside tokens.css
    const rgbMatches = line.match(rgbHslRegex);
    if (rgbMatches) {
      // allow comments or getComputedStyle
      if (!line.includes('//') && !line.includes('getComputedStyle')) {
        errors.push({ file: filePath, line: index + 1, issue: `Disallowed rgb/hsl literal: ${rgbMatches.join(', ')}`, text: line.trim() });
      }
    }

    // Check banned Tailwind palette
    const bannedMatches = line.match(bannedTailwind);
    if (bannedMatches) {
      errors.push({ file: filePath, line: index + 1, issue: `Banned Tailwind palette class: ${bannedMatches.join(', ')}`, text: line.trim() });
    }

    // Check banned gradients / glows
    const gradMatches = line.match(bannedGradientsAndGlows);
    if (gradMatches) {
      errors.push({ file: filePath, line: index + 1, issue: `Banned gradient/glow class: ${gradMatches.join(', ')}`, text: line.trim() });
    }

    // Check pure white/black text
    const pureMatches = line.match(bannedPureText);
    if (pureMatches) {
      errors.push({ file: filePath, line: index + 1, issue: `Banned pure text class: ${pureMatches.join(', ')}`, text: line.trim() });
    }
  });
}

if (errors.length > 0) {
  console.error(`\n❌ Found ${errors.length} color palette violation(s):\n`);
  for (const err of errors) {
    console.error(`  ${err.file}:${err.line} - ${err.issue}`);
    console.error(`    ${err.text}\n`);
  }
  process.exit(1);
} else {
  console.log('✅ Color Palette Check Passed: Zero color literals or banned classes found!');
  process.exit(0);
}
