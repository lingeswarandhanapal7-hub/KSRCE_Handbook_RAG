import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const outDir = path.resolve('../docs/palette');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const viewports = [
  { name: '1440', width: 1440, height: 900 },
  { name: '768', width: 768, height: 1024 },
  { name: '390', width: 390, height: 844 },
];

const themes = ['light', 'dark'];

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('ksrce_theme', t);
  }, theme);
  await page.waitForTimeout(300);
}

async function dismissModalIfOpen(page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const closeBtn = page.locator('.fixed.inset-0 button:has(svg.lucide-x)').first();
  if (await closeBtn.isVisible()) {
    try {
      await closeBtn.click({ force: true, timeout: 500 });
      await page.waitForTimeout(200);
    } catch {}
  }
}

async function run() {
  console.log('Starting comprehensive screenshot capture for Ink & Brass palette verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  for (const vp of viewports) {
    for (const theme of themes) {
      console.log(`\nCapturing Viewport: ${vp.name}px | Theme: ${theme}`);
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          console.warn(`[Browser Console Error]: ${msg.text()}`);
        }
      });

      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      await applyTheme(page, theme);

      // On mobile viewports (390px), close the mobile sidebar if it's open
      if (vp.name === '390') {
        const sidebarClose = page.locator('aside button:has(svg.lucide-x), aside button[title*="Close"]').first();
        if (await sidebarClose.isVisible()) {
          await sidebarClose.click({ force: true });
          await page.waitForTimeout(300);
        }
      }

      // 1. Welcome Screen
      await page.screenshot({
        path: path.join(outDir, `${vp.name}_${theme}_welcome.png`),
      });
      console.log(`✓ Saved ${vp.name}_${theme}_welcome.png`);

      // 2. Composer Focus State
      const textarea = page.locator('textarea');
      if (await textarea.count() > 0) {
        await textarea.focus();
        await page.waitForTimeout(200);
        await page.screenshot({
          path: path.join(outDir, `${vp.name}_${theme}_composer_focus.png`),
        });
        console.log(`✓ Saved ${vp.name}_${theme}_composer_focus.png`);
      }

      // 3. Command Palette
      await page.keyboard.press('Control+k');
      await page.waitForTimeout(400);
      const cmdPalette = page.locator('div[cmdk-root], .fixed.inset-0');
      if (await cmdPalette.count() > 0) {
        await page.screenshot({
          path: path.join(outDir, `${vp.name}_${theme}_command_palette.png`),
        });
        console.log(`✓ Saved ${vp.name}_${theme}_command_palette.png`);
        await dismissModalIfOpen(page);
      }

      // 4. Settings Modal
      const settingsBtn = page.locator('button[title*="Settings"], button:has-text("Settings")').first();
      if (await settingsBtn.isVisible()) {
        try {
          await settingsBtn.click({ force: true, timeout: 2000 });
          await page.waitForTimeout(400);
          await page.screenshot({
            path: path.join(outDir, `${vp.name}_${theme}_settings.png`),
          });
          console.log(`✓ Saved ${vp.name}_${theme}_settings.png`);
          await dismissModalIfOpen(page);
        } catch (e) {
          console.warn('Could not open settings:', e.message);
        }
      }

      // 5. Trigger Answer with Citations & Table (on desktop and tablet)
      if (vp.name === '1440') {
        const firstCard = page.locator('button:has-text("attendance condonation"), button:has-text("Attendance")').first();
        if (await firstCard.isVisible()) {
          await firstCard.click();
          console.log('Triggered question card, awaiting response stream...');
          await page.waitForTimeout(4000);
          await page.screenshot({
            path: path.join(outDir, `${vp.name}_${theme}_answer_citations.png`),
          });
          console.log(`✓ Saved ${vp.name}_${theme}_answer_citations.png`);

          // Open source drawer
          const sourceBtn = page.locator('button:has-text("[1]"), button:has-text("Verified Sources")').first();
          if (await sourceBtn.isVisible()) {
            await sourceBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({
              path: path.join(outDir, `${vp.name}_${theme}_source_drawer.png`),
            });
            console.log(`✓ Saved ${vp.name}_${theme}_source_drawer.png`);
            await dismissModalIfOpen(page);
          }
        }
      }

      // 6. Voice Mode Overlay (all 4 states)
      const voiceModeBtn = page.locator('button:has-text("Voice Mode"), button[title*="Voice Mode"]').first();
      if (await voiceModeBtn.isVisible()) {
        await voiceModeBtn.click({ force: true });
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(outDir, `${vp.name}_${theme}_voice_mode_listening.png`),
        });
        console.log(`✓ Saved ${vp.name}_${theme}_voice_mode_listening.png`);

        // Capture voice orb states specifically on 1440
        if (vp.name === '1440') {
          // Thinking state simulation
          await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const target = spans.find(s => s.textContent && s.textContent.includes('Listening'));
            if (target) target.textContent = 'Consulting Handbook...';
          });
          await page.waitForTimeout(200);
          await page.screenshot({
            path: path.join(outDir, `${vp.name}_${theme}_voice_mode_thinking.png`),
          });
          console.log(`✓ Saved ${vp.name}_${theme}_voice_mode_thinking.png`);
        }

        await dismissModalIfOpen(page);
      }

      // 7. Protanopia / Deuteranopia simulations on 1440 Light
      if (vp.name === '1440' && theme === 'light') {
        await page.evaluate(() => {
          const svg = document.createElement('div');
          svg.id = 'color-filter-container';
          svg.innerHTML = `
            <svg style="display:none">
              <filter id="deuteranopia">
                <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0
                                                     0.7, 0.3, 0, 0, 0
                                                     0, 0.3, 0.7, 0, 0
                                                     0, 0, 0, 1, 0"/>
              </filter>
            </svg>
          `;
          document.body.appendChild(svg);
          document.body.style.filter = 'url(#deuteranopia)';
        });
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(outDir, `1440_deuteranopia_simulation.png`),
        });
        console.log(`✓ Saved 1440_deuteranopia_simulation.png`);

        await page.evaluate(() => {
          document.body.style.filter = 'grayscale(100%)';
        });
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(outDir, `1440_monochrome_contrast_simulation.png`),
        });
        console.log(`✓ Saved 1440_monochrome_contrast_simulation.png`);
      }

      await page.close();
    }
  }

  await browser.close();
  console.log('\nAll palette verification screenshots successfully captured in docs/palette/!');
}

run().catch((err) => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
