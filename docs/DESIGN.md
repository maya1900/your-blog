# Design System: 个人博客 · Aurora AI

> 配套:[REQUIREMENTS.md](REQUIREMENTS.md) · [UI_DESIGN.md](UI_DESIGN.md)  
> 状态:**已选定方向 A · 极光 AI 风**,本文档为 Stitch 生成屏幕的唯一真源

---

## 1. Visual Theme & Atmosphere

A bright, gallery-airy interface with confident asymmetric layouts and restrained spring motion. The atmosphere is **clinical-tech-warm** — like the lobby of a well-lit research lab: precise typography, hairline grids, generous whitespace, and a single confident accent that punches through the neutrals. Reads as Vercel / Linear / Cursor — modern technical software, not "AI startup landing page #437".

**Calibration:**
- **Creativity:** 9 — asymmetric layouts, inline-image hero typography, hairline grid backdrops
- **Variance:** 8 — every section breaks symmetry; no centered hero, no equal-3-column rows
- **Motion:** 5 — restrained, 150–250ms `ease-out`, no cinematic choreography, micro-loops only where they earn it
- **Density:** 6 on list views (cards packed tight), 3 on hero (gallery airy)

**The signature:** A near-white canvas overlaid with **1px indigo grid lines** (12-col, very faint `#E5E5E5` → fading to nothing) and a **single super-blurred indigo→cyan gradient blob** floating at low opacity behind the hero. Everything else is precise neutrals + one accent.

---

## 2. Color Palette & Roles

### Neutrals (the foundation)
- **Canvas Mist** `#FAFAFA` — Primary background surface, the near-white that everything lives on
- **Pure Surface** `#FFFFFF` — Card and container fill, modal backgrounds
- **Ink Charcoal** `#0A0A0A` — Primary text, headlines, off-black (never `#000000`)
- **Steel Quiet** `#525252` — Secondary text, metadata, timestamps, byline
- **Whisper Border** `#E5E5E5` — Card borders, 1px structural lines, grid backdrop lines
- **Hairline Border** `rgba(229, 229, 229, 0.6)` — For nested borders or grid overlays where #E5E5E5 is too loud

### Accent (the only one)
- **Indigo Pulse** `#6366F1` — Single accent. Used for: primary CTAs, focus rings, active nav state, link hover underline, the "publish" button, selected tag chip background, login submit. **This is the only saturated color in the system.**
- **Indigo Deep** `#4F46E5` — Pressed/active state of Indigo Pulse (-1px translate companion)

### Tertiary (extreme restraint)
- **Cyan Signal** `#06B6D4` — Reserved for: code-block syntax highlight tokens, data-viz second series, dashboard chart secondary line. **Never used for buttons, links, or chrome.**

### Decorative-only Gradient (used in ≤ 2 places site-wide)
- **Aurora Blur** `linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)` — Applied with `blur(120px)` + `opacity 0.18` as a backdrop blob behind the hero headline and behind the admin dashboard greeting. **Never used as a button fill, never sharp, never on text.**

### Functional
- **Success** `#10B981` (Emerald 500) — used sparingly for "published" status pill
- **Danger** `#DC2626` (Red 600) — destructive actions only, never decorative
- **Warning** `#F59E0B` (Amber 500) — draft status pill, "unsaved changes" indicator

### Banned (explicit)
- `#000000` pure black anywhere → use Ink Charcoal `#0A0A0A`
- Purple `#A855F7` or any violet between blue and magenta → reads "AI cliché"
- Outer-glow `box-shadow` with accent color → reads "AI cliché"
- Gradient-filled buttons → flat indigo only
- Multi-color category chips → all chips are neutral with one accent state

---

## 3. Typography Rules

### Stack

```
Display + Body (Latin):
  "Geist", "PingFang SC", "Noto Sans SC", system-ui, sans-serif

Display + Body (CJK):
  same stack — Geist falls through to PingFang SC for Chinese glyphs natively

Mono (code, metadata, timestamps):
  "Geist Mono", "JetBrains Mono", ui-monospace, monospace
```

**Geist** is the only display/body font. It's variable, has a confident geometric character, and is what Vercel/Linear actually ship with. Chinese glyphs render via PingFang SC / Noto Sans SC fallback — the resulting mixed-script feel is intentional and matches modern Chinese tech site practice (think Vercel's Chinese docs).

### Scale (rem-based, `clamp()` for headlines)

| Token | Size | Weight | Line-height | Tracking | Use |
|---|---|---|---|---|---|
| `display-xl` | `clamp(2.5rem, 5vw, 4rem)` | 600 | 1.05 | -0.03em | Hero headline only |
| `display-lg` | `clamp(2rem, 3.5vw, 3rem)` | 600 | 1.1 | -0.025em | Section H1 |
| `display-md` | `1.75rem` (28px) | 600 | 1.15 | -0.02em | Article title in detail page |
| `heading-lg` | `1.5rem` (24px) | 600 | 1.25 | -0.015em | Card title large, dashboard widget title |
| `heading-md` | `1.25rem` (20px) | 600 | 1.3 | -0.01em | Article card title |
| `heading-sm` | `1.125rem` (18px) | 600 | 1.35 | 0 | Subsection |
| `body-lg` | `1.0625rem` (17px) | 400 | 1.7 | 0 | Article reading body |
| `body-base` | `1rem` (16px) | 400 | 1.6 | 0 | Default body |
| `body-sm` | `0.875rem` (14px) | 400 | 1.5 | 0 | Card meta, comment body |
| `caption` | `0.75rem` (12px) | 500 | 1.4 | 0.02em | Tag chip, timestamp, table header |
| `mono-sm` | `0.8125rem` (13px) | 400 | 1.5 | 0 | Code inline, metadata numbers |

### Rules
- **Headlines drive hierarchy through weight + color, not size escalation.** No 96px screaming hero.
- **Body text max-width: 65ch** in article reading view. Always.
- **Numbers in dashboard stat cards:** monospace (`Geist Mono`), weight 600, never the body font
- **No ALL-CAPS** except `caption` token with `letter-spacing: 0.02em`
- **No italics in headlines.** Italics reserved for blockquote citations only.

### Banned
- `Inter` font — overused, reads as default-AI
- Generic system serifs (`Times New Roman`, `Georgia`, `Palatino`) — banned everywhere
- Any serif in admin dashboard — sans-only there
- Gradient text fill on body content (allowed only on the hero word "极光"-style decorative word, at most one per page)
- ALL-CAPS for headlines or buttons — only `caption` size

---

## 4. Hero Section (signature treatment)

The home page hero is the design's calling card. It does **not** look like a generic blog hero ("Welcome to my blog" + button).

### Composition
- **Left-aligned**, never centered (variance 8)
- Headline occupies left 60% of grid; right 40% holds a **floating featured-article preview card** offset down by ~80px (asymmetric stagger)
- Behind the headline: **Aurora Blur** gradient blob at ~600px diameter, `blur(120px)`, opacity 0.18, anchored slightly off-left
- Over the blob: **hairline grid backdrop** (1px `#E5E5E5` at 30% opacity, 12-col)
- **Inline image typography signature:** the headline embeds the site author's small circular avatar (24px, `rounded-full`, hairline ring) between two words — e.g., `写点 [avatar] 想说的`. This is the only place a circle appears in the design.

### Rules
- No "Scroll to explore" / chevron / bouncing arrow
- No secondary CTA — primary only ("开始阅读" → scrolls to article list)
- Headline max 2 lines on desktop, max 3 on mobile
- Below hero: a thin `#E5E5E5` separator + section label `最新文章 / LATEST` in caption mono style

### Mobile (< 768px)
- Featured-article card stacks below headline
- Aurora Blur halves in size
- Inline avatar drops below the word it followed

---

## 5. Component Stylings

### Buttons

**Primary** (CTAs, "发布", "登录", "保存")
- Fill: `Indigo Pulse #6366F1` flat
- Text: `#FFFFFF`, weight 500, `body-base`
- Padding: `10px 20px` (`py-2.5 px-5`)
- Radius: `8px` (`rounded-lg`)
- Border: none
- Shadow: none default; on hover `0 1px 2px rgba(99, 102, 241, 0.15)` — very subtle, never neon glow
- Active: `translate-y-[1px]` + fill → `Indigo Deep #4F46E5`
- Focus: 2px ring `rgba(99, 102, 241, 0.35)` offset 2px

**Secondary** (cancel, ghost actions)
- Fill: transparent
- Text: `Ink Charcoal #0A0A0A`
- Border: `1px solid Whisper Border #E5E5E5`
- Hover: border → `Indigo Pulse`, text → `Indigo Pulse`
- Same radius, padding, motion as primary

**Tertiary** (icon-only, table row actions)
- Fill: transparent
- Icon: `Steel Quiet #525252`, hover → `Ink Charcoal`
- Padding: `8px` (`p-2`)
- Radius: `6px` (`rounded-md`)

**Banned:**
- Gradient-filled buttons
- Outer glow shadows
- ALL-CAPS button text
- Custom cursors
- 100% rounded "pill" buttons (we are sharp/boxy)

### Cards (article cards, dashboard widgets)

- Fill: `Pure Surface #FFFFFF`
- Border: `1px solid Whisper Border #E5E5E5`
- Radius: `12px` (`rounded-xl`)
- Shadow: none default
- Hover: border → `Indigo Pulse`, `translate-y-[-2px]`, transition 200ms ease-out
- Padding: `24px` (`p-6`) for article cards, `20px` (`p-5`) for dashboard widgets
- Internal hierarchy via `Steel Quiet` for metadata, `Ink Charcoal` for title

**Article card composition (home list):**
- Cover image: 16:9, `rounded-lg`, `object-cover`
- Title: `heading-md`, max 2 lines, `line-clamp-2`
- Summary: `body-sm` `Steel Quiet`, max 2 lines
- Footer row: category chip + tag chips + read-time + date (all `caption`)
- All metadata uses `mono-sm` for numbers (read time, date)

### Tags / Chips

- Shape: **small box badge**, `4px` radius (`rounded`), height 22px, padding `2px 8px`
- Default: bg `#F5F5F5` (a touch darker than canvas), text `Steel Quiet`, no border
- Active/selected (filter state): bg `Indigo Pulse`, text white
- Status pills (published/draft): bg `Emerald-50` text `Emerald-700` for published; bg `Amber-50` text `Amber-700` for draft

### Inputs / Forms

- Label: above input, `caption` weight 500, `Ink Charcoal`
- Input: full-width, `Pure Surface` fill, `1px Whisper Border`, `rounded-lg`, padding `10px 14px`, `body-base`
- Focus: border → `Indigo Pulse`, ring `rgba(99, 102, 241, 0.2)` 3px offset 0
- Error: border → `#DC2626`, error text below in `body-sm` red, `mt-1.5`
- Helper text: below input, `body-sm` `Steel Quiet`
- Placeholder: `Steel Quiet` at 70% opacity
- Banned: floating labels, inline icons inside the input border, rounded-full input pills

### Top Navigation

- Sticky, `backdrop-blur-md` + `bg-white/70`, 1px bottom border `Whisper Border`
- Height: 64px
- Left: logo (text-only, `display-md`, no emoji)
- Center: nav links `body-base`, hover → underline accent
- Right: search icon + write button + avatar dropdown
- Search expands to inline input on click, no modal

### Markdown Reader (article detail)

- Container max-width `720px`, centered
- `body-lg` for paragraphs, 1.7 line-height
- Headings: `display-md` / `heading-lg` / `heading-md`, all weight 600, top margin proportional
- Blockquote: left `4px` border `Indigo Pulse`, italic, `Steel Quiet` text, no fill
- Code inline: `mono-sm`, `bg-#F5F5F5`, `px-1.5 py-0.5`, `rounded`
- Code block: `bg-#0A0A0A` (off-black surface), `text-#FAFAFA`, `mono-sm`, padding `20px`, `rounded-lg`, syntax tokens use cyan/emerald/amber (NOT indigo — preserve accent uniqueness)
- Tables: 1px `Whisper Border` cells, header row weight 500 `caption`
- Images: full-width within container, `rounded-lg`, optional figcaption `body-sm Steel Quiet`

### Markdown Editor (write page)

- Two-pane: left write / right preview, draggable divider
- Toolbar: thin bar on top of editor, icon-only buttons (heading, bold, italic, link, image, code, list), no labels, hover tooltip
- Editor textarea: `mono-sm`, `Pure Surface` background, no border (the surrounding card has the border)
- Preview pane: identical typography to article reader

### Skeletons / Loaders

- Shape-matching skeletal rectangles, `bg-#F5F5F5`, 1.5s shimmer (`linear-gradient` left-right pulse at 8% opacity over base)
- **Never** circular spinners, never spinner inside buttons (use disabled state with text "保存中…")

### Empty States

- Centered vertically in container, min 240px tall
- Small monochrome SVG illustration (line-art style, 1.5px stroke `Steel Quiet`)
- Title: `heading-sm`, `Ink Charcoal`
- Body: `body-sm`, `Steel Quiet`
- Optional CTA below: primary button
- Examples:
  - 文章列表空:"还没有文章" / "成为第一个发布者"
  - 评论空:"还没有评论" / "来说点什么"
  - 我的收藏空:"收藏夹是空的" / "去逛逛文章"

---

## 6. Layout Principles

### Container & Grid
- Site max-width: `1280px`, centered, with `px-6` mobile / `px-10` desktop gutters
- Reading max-width: `720px` for article body
- 12-column CSS Grid for marketing/home/dashboard layouts
- Card lists: CSS Grid, `repeat(auto-fill, minmax(320px, 1fr))` for home; `repeat(auto-fill, minmax(280px, 1fr))` for admin

### Asymmetry rules (variance 8)
- **Banned:** centered hero, equal-3-column feature rows, fully symmetric two-column splits
- **Required patterns:**
  - Home hero: 60/40 left-headline / right-floating-card with vertical offset
  - Article detail: 720px reading column + a 240px right rail (TOC + author card), the rail is shorter and sticky
  - Admin dashboard: top row uses **Bento grid** — one large hero stat card spanning 2 cols + 2 single-col stat cards on the right, second row uses 3 equal but with one tinted card breaking the pattern

### Hairline Grid Backdrop (signature)
- Available as a utility: an SVG/CSS background with 1px vertical `#E5E5E5` lines at 30% opacity at 12-col intervals
- Used on: home hero section, login/register page background, admin dashboard above-the-fold
- **Not** used on: article detail (focused reading), forms (distracting)

### Spacing scale
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128px. Vertical section gaps `clamp(3rem, 8vw, 6rem)`.

### Banned
- `h-screen` anywhere → use `min-h-[100dvh]`
- `flex` with `calc()` percentage math → CSS Grid
- Absolute-positioned overlapping text/image stacks → every element owns its zone
- Equal 3-column "feature card row" → break with Bento or 2-col zigzag

---

## 7. Responsive Rules

### Breakpoints
`sm:640 / md:768 / lg:1024 / xl:1280`

### Behaviors
- **< 768:** all multi-column layouts collapse to single column. Article detail right rail moves to bottom. Hero featured-card stacks below headline.
- **No horizontal scroll on mobile.** Admin tables on mobile show a card list instead of horizontal scroll.
- Headlines scale via `clamp()` — see typography scale
- Body text minimum 16px on mobile
- Touch targets minimum 44px (button height, tap zones on tag chips)
- Top nav collapses to hamburger at `<768`, slide-down panel (not full overlay)
- Inline-image avatar in hero stacks below the word at `<768`
- **Admin console** only guarantees usability at `≥1024` — at smaller sizes, show a "请使用桌面端访问" prompt for editing actions (view-only data tables can still render via card mode)

---

## 8. Motion & Interaction

### Defaults
- Transition base: `150ms ease-out` for color/border changes
- Transform base: `200ms ease-out` for hover lift
- Page mount cascade: list items stagger `40ms` each, max 8 items animated (after that, mount instantly to avoid scroll-jank)

### Spring physics
- Cards on hover: `translate-y(-2px)` via `transform`, 200ms ease-out
- Buttons on press: `translate-y(1px)`, 100ms ease-out
- Modal open: `scale(0.96) → scale(1)` + opacity, 200ms ease-out
- Tag chip select: ` scale(1) → scale(1.04) → scale(1)` micro pulse

### Perpetual micro-loops (restrained — only where they earn it)
- **Aurora Blur** behind hero: slow drift, 30s linear infinite, `translate(8px, 6px) → translate(-6px, 4px) → loop`
- **"published" status pill:** subtle 2s opacity pulse (1 → 0.85 → 1) — communicates "live"
- **Cursor in markdown editor:** blink (default browser)
- **Nothing else loops.** No floating dots, no shimmer on idle cards, no bouncing nav items.

### Banned
- Animating `top`, `left`, `width`, `height` — `transform` and `opacity` only
- Linear easing on user-initiated interactions
- Choreographed reveal cascades on every section (only on hero list mount)
- Confetti, parallax scroll backgrounds, mouse-tracking blobs

---

## 9. Page-Level Treatments (Quick Spec)

### `/` Home
- Hero (asymmetric, see §4)
- Filter bar: search input (left, ~360px) + category dropdown + tag multi-select + sort toggle (all `caption`-level)
- Article grid: `minmax(320px, 1fr)`, 3 cols at xl, 2 cols at md, 1 col at sm
- Pagination at bottom: `← 上一页 · 1 / 12 · 下一页 →`, mono numbers

### `/articles/:slug` Article Detail
- Cover image full-bleed at top (max-h 480px), below it title section
- 720 reading column + 240 right rail (TOC + author card sticky)
- Bottom: like/favorite floating right of reading column, comment section spans full reading column
- Comment composer fixed below comments, ghost-bordered

### `/write` and `/write/:id`
- Top: title input (large, `display-md`), summary input (multi-line, `body-base`)
- Below: settings row inline — category dropdown, tag input, cover image dropzone (compact), status select
- Main: Markdown editor (two-pane, see §5), takes remaining viewport height
- Sticky footer bar: 保存草稿 (secondary) · 发布 (primary)
- All cards in this page have no border; only the editor container has the hairline

### `/login` & `/register`
- Asymmetric two-column: left 50% form column, right 50% atmospheric (hairline grid + Aurora Blur + a single rotating quote/tagline)
- Form column max-width 400px, vertically centered, left-aligned
- Logo at top, headline `display-lg`, fields, primary CTA, secondary "去注册"/"去登录" link

### `/me` Personal Center
- Top: avatar + name + bio + stats row (文章数 · 草稿数 · 收藏数, mono numbers, `Steel Quiet` labels)
- Tabs: 我的文章 · 草稿 · 我的收藏 · 资料 (sticky)
- Below tabs: same article grid as home, or table for drafts

### `/admin/*` Admin Console
- Layout: 220px left sidebar (`Pure Surface`, hairline border right) + main content
- Sidebar: logo top, nav items below (icon + label, active state = indigo left bar 2px + indigo text)
- Main top bar: page title `heading-lg` + breadcrumb + user dropdown
- Dashboard: Bento grid (see §6 Asymmetry)
- List pages (articles, users, comments): data table with `Whisper Border` row dividers, header row `caption` weight 500, action column right-aligned with tertiary icon buttons
- No hero/Aurora Blur on inner admin pages (data-dense focus)

---

## 10. Anti-Patterns (NEVER DO)

- ❌ No emojis anywhere in the UI (icons via `lucide-react`)
- ❌ No `Inter` font — use Geist
- ❌ No generic serifs (`Times New Roman`, `Georgia`, `Garamond`)
- ❌ No `#000000` pure black — use `Ink Charcoal #0A0A0A`
- ❌ No purple (`#A855F7` / violet between blue and magenta) — reads as AI cliché
- ❌ No neon/outer-glow shadows on buttons or cards
- ❌ No gradient-filled buttons — flat indigo only
- ❌ No gradient text on body content
- ❌ No oversaturated category chips (each chip its own color) — keep chips neutral, one accent state
- ❌ No custom mouse cursors
- ❌ No overlapping elements — every element owns its spatial zone
- ❌ No centered hero (variance > 4)
- ❌ No equal-3-column feature row — use Bento or zigzag
- ❌ No fake metrics in dashboard ("99.98% UPTIME", "124ms response") — use real counts only, or `[--]` placeholder
- ❌ No `LABEL // YEAR` faux-typography ("SYSTEM // 2026")
- ❌ No AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen", "赋能", "革新")
- ❌ No filler UI text ("Scroll to explore", "Swipe down", bouncing chevrons)
- ❌ No broken Unsplash links — use `picsum.photos/seed/<slug>/<w>/<h>` for placeholders
- ❌ No `h-screen` — use `min-h-[100dvh]`
- ❌ No floating labels on inputs
- ❌ No pill-shaped (`rounded-full`) buttons or inputs — we are sharp/boxy
- ❌ No infinite shimmer on idle cards — loops only on Aurora Blur and "published" pill
- ❌ No generic placeholder names ("John Doe", "Acme Corp") — use Chinese realistic samples ("林知微", "陈墨")
- ❌ No fabricated statistics in marketing/hero copy
- ❌ No `box-shadow` with indigo color outside the very specific hover state listed in §5

---

## 11. Stitch Generation Notes

When using `stitch-design:generate-design`, every prompt MUST reference:

1. The specific color values from §2 (paste hex codes inline)
2. The component specs from §5 (don't let Stitch invent button styles)
3. The asymmetry rules from §6 (explicitly forbid centered hero, forbid 3-col equal grid)
4. The font stack from §3 (force `Geist`, ban `Inter`)
5. The anti-pattern list from §10 (paste as "STRICTLY AVOID" section in every prompt)

Generated screens to produce in order:
1. **Home** (article list + hero)
2. **Article detail** (Markdown reader)
3. **Write article** (Markdown editor + form)
4. **Login** (asymmetric two-column)
5. **Personal center** (`/me`)
6. **Admin dashboard** (Bento)
7. **Admin articles list** (data table)
