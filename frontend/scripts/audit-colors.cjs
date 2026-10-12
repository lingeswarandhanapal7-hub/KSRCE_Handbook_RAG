const fs = require('fs');
const path = require('path');

const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const rgbRegex = /rgba?\([^)]+\)/g;
const bannedTailwind = /\b(?:bg-|text-|border-|from-|via-|to-|shadow-|ring-|fill-|stroke-)?(?:indigo|violet|purple|fuchsia|pink|cyan|sky)(?:-[0-9]{2,3}(?:\/[0-9]+)?)?\b/g;
const gradientRegex = /\b(?:bg-gradient|from-|via-|to-|bg-clip-text|text-transparent)\b/g;
const glowBlurRegex = /\b(?:blur|backdrop-blur|shadow-\[|drop-shadow)\b/g;

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') walk(full, fileList);
    } else {
      fileList.push(full);
    }
  }
  return fileList;
}

const files = walk('src').concat(['index.html', 'tailwind.config.js', 'public/manifest.json']);
const audit = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const hex = content.match(hexRegex) || [];
  const rgb = content.match(rgbRegex) || [];
  const banned = content.match(bannedTailwind) || [];
  const gradients = content.match(gradientRegex) || [];
  const glow = content.match(glowBlurRegex) || [];

  if (hex.length || rgb.length || banned.length || gradients.length || glow.length) {
    audit.push({
      file,
      hexCount: hex.length,
      rgbCount: rgb.length,
      bannedTailwindCount: banned.length,
      gradientCount: gradients.length,
      glowBlurCount: glow.length,
      sampleBanned: [...new Set(banned)].slice(0, 5),
      sampleHex: [...new Set(hex)].slice(0, 5),
    });
  }
}

console.log(JSON.stringify(audit, null, 2));
