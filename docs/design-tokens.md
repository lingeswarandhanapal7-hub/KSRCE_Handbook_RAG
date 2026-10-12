# Ink & Brass Design Tokens Specification

The "Ink & Brass" design system replaces the generic, AI-generated aesthetic (indigo/cyan gradients, neon glows, aurora backdrops, and heavy glassmorphism) with a restrained, premium, institutional visual language tailored for academic heritage and quiet luxury.

---

## 1. Core Principles

- **60% Neutrals**: Warm ivory surfaces in light mode (`#FAF8F4`), deep slate obsidian in dark mode (`#0F131A`).
- **30% Ink Navy**: Grounded authority for typography, user message bubbles, and primary interactive buttons (`#1C2B4A` in light, ivory `#F1EDE4` in dark).
- **$\le$10% Muted Brass**: Reserved strictly for high-information-density accents (citation chips, active left indicator bars, focus rings, and streaming caret).
- **Zero Decorative Gradients**: At most one tonal radial fill in the entire product (the voice orb: `#2D4272` $\rightarrow$ `#1C2B4A` $\rightarrow$ `#101A2E`). No text gradients, no gradient borders.
- **Hairline Borders & Neutral Shadows**: Clean 1px borders replace neon glows and blurred drop-shadows.

---

## 2. Token Dictionary

All tokens are defined in [tokens.css](file:///c:/Users/Lingeswaran/OneDrive/画像/Desktop/RAG/frontend/src/styles/tokens.css) as space-separated RGB channel triples (`R G B`) to support Tailwind CSS opacity modifiers (e.g., `bg-primary/20`).

| Token Name | Light Value | Dark Value | Purpose / Component Mapping |
| :--- | :--- | :--- | :--- |
| `background` | `#FAF8F4` | `#0F131A` | Main application background (flat, no blobs) |
| `background-subtle` | `#F3F0EA` | `#0B0E14` | Sidebar background, recessed areas, code blocks |
| `surface` | `#FFFFFF` | `#151A23` | Chat cards, composer box, suggested questions |
| `surface-raised` | `#FFFFFF` (+shadow) | `#1B212C` | Modals, popovers, dropdowns, command palette |
| `border` | `#E6E1D8` | `#232A37` | Hairline 1px structural dividing lines |
| `border-strong` | `#D3CCBF` | `#303949` | Interactive borders on hover/focus |
| `foreground` | `#17202F` | `#E9ECF2` | Primary headings, body copy, message text |
| `foreground-secondary` | `#455063` | `#B3BAC8` | Supporting metadata, timestamps, subtitles |
| `foreground-muted` | `#5C6578` | `#8B93A5` | Ghost icon buttons, helper notes, status labels |
| `primary` | `#1C2B4A` | `#F1EDE4` | Primary send button, active category chip fill |
| `primary-hover` | `#26385E` | `#E4DECF` | Hover state for primary buttons |
| `primary-foreground` | `#FAF8F4` | `#0F131A` | Inverted text/glyphs on primary buttons |
| `accent` | `#B38B3A` | `#D1A955` | Brass citations, streaming caret, focus ring |
| `accent-strong` | `#7A5C1E` | `#E3C57D` | High-contrast brass text on soft brass surfaces |
| `accent-soft` | `#F4EAD3` | `rgba(209,169,85,.12)` | Citation pill background |
| `accent-border` | `#E3CE9E` | `rgba(209,169,85,.30)` | Citation pill hairline border |
| `user-bubble` | `#1C2B4A` | `#1F2B45` | User query message bubble |
| `user-bubble-foreground`| `#FAF8F4` | `#E9ECF2` | Text within user message bubble |
| `ring` | `#96702F` | `#D1A955` | Accessible 3px keyboard focus ring |
| `highlight` | `rgba(179,139,58,.25)` | `rgba(209,169,85,.28)` | Matched citation excerpt highlight, text selection |
| `overlay` | `rgba(15,22,38,.45)` | `rgba(5,8,14,.60)` | Modal scrim (blur permitted only here) |
| `success` | `#2F7A57` | `#5BB38A` | Feedback confirmed, verified status |
| `warning` | `#A8661A` | `#E0A04A` | Information not found banner, low mic alert |
| `danger` | `#B23B34` | `#E8786C` | Active recording dot, destructive clear history |
| `info` | `#2F5F9E` | `#7AA5E6` | Institutional announcements, tips |

---

## 3. WCAG Contrast Compliance (100% Passed)

Verified via automated test runner (`npm run test:contrast`):

- **Light Theme**:
  - `foreground` on `background`: **15.42:1** (Threshold: $\ge 4.5:1$)
  - `foreground-secondary` on `background`: **7.67:1**
  - `foreground-muted` on `background`: **5.52:1**
  - `primary-foreground` on `primary`: **13.25:1**
  - `accent-strong` on `accent-soft`: **5.20:1**
  - `user-bubble-foreground` on `user-bubble`: **13.25:1**
  - `ring` on `background`: **4.25:1** (Threshold: $\ge 3:1$)
- **Dark Theme**:
  - `foreground` on `background`: **15.73:1**
  - `foreground-secondary` on `background`: **9.55:1**
  - `foreground-muted` on `background`: **6.04:1**
  - `primary-foreground` on `primary`: **15.93:1**
  - `accent-strong` on `accent-soft`: **8.45:1**
  - `user-bubble-foreground` on `user-bubble`: **11.91:1**
  - `ring` on `background`: **8.43:1**

---

## 4. Usage Rules: Do's and Don'ts

### DO:
- Use semantic token names directly: `bg-background`, `text-foreground`, `border-border`.
- Use `accent-soft` + `accent-strong` + `accent-border` exclusively for citations and key indicators.
- Maintain monochrome icon treatments in `foreground-secondary` or `foreground-muted`.
- Build depth through layering (`background` $\rightarrow$ `surface` $\rightarrow$ `surface-raised`) and 1px hairline borders.
- Preserve 100% of existing animation timing and cubic-bezier easing.

### DON'T:
- **NO Tailwind color primitives**: Never use `indigo-*`, `violet-*`, `cyan-*`, `sky-*`, `purple-*`, `fuchsia-*`, or `pink-*`.
- **NO Pure Black or Pure White Text**: Do not use `text-white` or `text-black` (enforced by `check-colors.mjs`).
- **NO Text Gradients**: Banned: `bg-clip-text text-transparent bg-gradient-to-*`.
- **NO Colored Neon Shadows or Glows**: Banned: `shadow-[0_0_...]`, `drop-shadow`.
- **NO Glassmorphism on Persistent Panels**: Sidebar, topbar, composer, and message bubbles must have solid backgrounds (`bg-background-subtle`, `bg-surface`).

---

## 5. Regional Language & Voice Architecture

- **Automatic Script Detection**: Voice synthesis inspects the Unicode range of the message text to identify regional Indic languages (Tamil `\u0B80-\u0BFF`, Hindi `\u0900-\u097F`, Telugu `\u0C00-\u0C7F`, Kannada `\u0C80-\u0CFF`, Malayalam `\u0D00-\u0D7F`, Bengali `\u0980-\u09FF`).
- **Resilient Fallback**: If the client browser lacks an installed native TTS voice for a regional script, the player automatically streams audio from the backend Google Text-to-Speech service (`/api/tts`), ensuring consistent, natural regional pronunciation across all platforms.
