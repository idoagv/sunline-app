# Apricity — Design Spec

**Date:** 2026-06-10
**Status:** Approved for Phase 0 + 1 implementation planning
**Working name:** Apricity (from the project formerly called "SunLine")

---

## 1. One-line product

**See the sunlight on any apartment — even one that hasn't been built yet.**

Apricity computes and visualises, per individual unit, how much direct sun an apartment gets across the day and seasons — accounting for the floor it sits on, its position on the floor plate, and the shadows cast by surrounding (and future) buildings.

---

## 2. Why this is worth building (market rationale)

- **Sunlight has a quantified price.** Peer-reviewed studies: each extra daily hour of direct sun ≈ +2.4–3.2% apartment price; south-facing units carry a 5–15% premium over north-facing in the same building; in dense cities shadowed low units sell for up to ~20% less.
- **Regulatory/forced demand exists** (BRE guidelines, "right to light", EN 17037). Outsourced daylight/shadow studies cost €500–€2,000 each.
- **Gap in the market.** Incumbents (Shadowmap, ShadeMap, SunCalc) answer building/terrain-level questions in 3D and make the user eyeball a facade. None cleanly answer **"which specific unit gets sun, when, for how long?"** — the exact place the dollar premium lives.
- **Hero use case — off-plan pre-sales.** Developers sell apartments years before completion with nothing concrete to show about light. Apricity drops a *future* building into its *real* surroundings and shows per-unit sun before construction. No incumbent does "imaginary building, real context, per-unit."

## 3. Target customer & business model

- **Primary (cash register): developers, agents, listing portals.** They buy a per-unit sun visual to sell apartments faster and justify premiums.
- **Secondary (shop window): consumers (buyers/renters).** The same per-unit page is the public, SEO-driven surface that draws buyers and makes the B2B pitch credible.
- These are not two products — one artifact (the **Sun-Page**) serves both. Monetise B2B first.
- **SEO note:** organic traffic comes from programmatic per-project pages ("sun hours in <project>", "north vs south facing apartment <city>"), not from the brand name. The brand is optimised for ownable + trustworthy + instantly understood.

## 4. Name & hosting

- **Brand:** Apricity ("the warmth of the sun in winter"). Distinctive, memorable, on-theme.
- **Domain:** bare `apricity.com`/`.app`/`.xyz` are taken. Budget-friendly available options (verified via registry RDAP on 2026-06-10): `apricityhq.com`, `useapricity.com`, `tryapricity.com` (~$11/yr); `apricity.co` (~$25/yr), `apricity.io` (~$35/yr). **Recommendation:** a `.com` variant (~$11/yr). Exact domain to be finalised before launch; code uses `apricity` as a placeholder.
- **Caveat accepted:** bare `apricity.com` belongs to another party; minor brand-dilution risk.
- **App hosting:** Vercel (already configured). Free Hobby tier to start; Pro ($20/mo) only when needed.
- **Data/auth (when needed):** Supabase free tier (Postgres + auth + storage). Start with JSON; add at first paying developer.
- **Domain registrar:** Porkbun or Cloudflare (cheap, free WHOIS privacy).
- **Launch cost:** ~$0 + ~$10/yr domain. Scales to ~$20–45/mo with customers.

## 5. Architecture

**Keep Next.js (App Router) on Vercel. Add TypeScript. Separate the engine from the UI.**

Rationale for keeping Next.js: it serves both audiences from one codebase — SSR + SEO for public Sun-Pages (consumer shop window), an authenticated dashboard, and API routes for map-data ingestion and exports. A SPA + separate API buys nothing here and discards the migration already done.

### Modules (framework-agnostic core)

| Module | Responsibility | Isolation rationale |
|---|---|---|
| `solar` (TS, pure) | Sun position (azimuth/elevation, sunrise/sunset) + **2.5D per-facade and self-shadowing** + sun-hours integration + Sun Score. Evolves the existing `src/utils/solarMath.js`. | Unit-tested against reference data. Correctness is the product's credibility. No DOM, no React. |
| `scene` (TS, pure) | The data model (see §6): project → buildings (each `source: auto \| manual \| authored`) → subject building → floors → unit grid → derived facades. Validation + JSON serialization. | One model serves all three onboarding paths and both 2D abstraction + future real-footprint mapping. |
| `ingest` (TS) | Fetch building footprints + heights from OpenStreetMap (Overpass API); normalise into `scene` context buildings. | Swappable data source; failures degrade gracefully to manual fill. |
| UI (React + Tailwind) | SVG views (floor-plate grid, top-down site, per-floor strip), MapLibre GL for authoring/context. | Skin over the engine. A 3D view can be added later without touching the math. |

### Deliberate foundation choices

1. **TypeScript** for `solar` and `scene` (incremental — Next runs JS+TS together).
2. **Vitest golden tests** on `solar`: assert sun-hours/positions match a known reference (SunCalc/NOAA) for known dates/locations.
3. **MapLibre GL + OSM/Overpass** for map + building data (free, no API keys).
4. **Rendering = SVG** for diagrammatic views (lightweight, crisp, already in use). No WebGL/3D in v1.

### Deferred on purpose (YAGNI for now)

Real auth + multi-tenant DB (start with versioned JSON), 3D rendering, terrain, trees, reflections. Nothing in the data model blocks adding these later.

## 6. Data model (`scene`)

```
Project
  id, name, location { lat, lon, label }, branding { logo, contact, listingUrl }
  displayUnits: 'metric' | 'imperial'   // default 'metric'; viewer can override
  buildings: Building[]
  subjectBuildingId            // the one being sold/analysed

Building
  id, source: 'auto' | 'manual' | 'authored'
  footprint: Polygon           // ground outline (lng/lat or local meters)
  baseElevation: number        // ground height (m), default 0
  height: number               // total height (m); or floors * floorHeight
  // subject buildings only:
  floors?: number
  floorHeight?: number         // m per floor
  unitGrid?: { rows, cols }    // configurable matrix (2x2 ... 10x10)
  unitLabels?: Record<cellKey, string>   // e.g. "1-1" -> "5S"

Unit (derived, not stored)
  floor, row, col
  facades: ('N'|'E'|'S'|'W')[]  // derived from grid position: corner=2, edge=1, interior=0
  position: 'corner' | 'edge' | 'interior'

SavedUnit (per salesperson/project)
  label, floor, row, col
```

Notes:
- v1 unit model = **configurable rectangular grid** over the floor; facades derived from cell position.
- Interior cells (no exterior wall) get zero direct sun ("core").
- Later layer: map the grid onto the **real articulated footprint** so labels sit where units truly are, and support **self-shadowing** between wings of the same building.

## 7. Solar engine (`solar`)

- **Sun position:** declination, azimuth, elevation, sunrise/sunset for a given lat/lon, date/season. Location-independent (no hardcoded latitude).
- **Per-unit sun (2.5D):** for each exterior facade of a unit, sample point(s) at the unit's real height (floor × floorHeight + base). A facade is lit at time *t* when:
  1. sun elevation > 0, and
  2. the sun is in front of the facade (azimuth within the facade's hemisphere), and
  3. the sun ray is **not blocked** by any context building (extruded footprint), and
  4. the sun ray is **not blocked by the subject building's own mass** (self-shadowing).
- **Sun-hours:** integrate lit time across the day (fine time step). Split morning/afternoon.
- **Sun Score (0–100):** normalised headline metric for marketing (e.g. lit hours ÷ achievable daylight). Simple, shareable. Kept as a core concept.
- **Seasons:** at minimum winter solstice / equinox / summer solstice; ideally any date.
- **Units:** the engine computes internally in SI (meters; all footprint/height geometry in meters). Lengths are converted for display to **metric (m)** or **American/imperial (ft)** per `Project.displayUnits`, with an optional viewer-side override (toggle on the Sun-Page). Sun-hours are time (hours) and unit-system-independent. Conversion lives in the UI layer, never in the engine.

**Testing:** golden tests vs SunCalc/NOAA for several lat/lon + dates (position + sunrise/sunset). Geometry unit tests for ray/extrusion occlusion. Parity test: the 3 existing towers produce results consistent with the current working app.

## 8. Product surfaces

### ① Sun-Page (public deliverable + shop window) — Phase 1

Mobile-first, one shareable URL per project. Components:
- **Floor-plate unit picker:** configurable grid (2×2 … 10×10); tap a unit by position; units **light up / go dark live** as the day plays; interior/core units hatched.
- **Day animation:** play/scrub time-of-day; **season** toggle; **floor** slider.
- **Per-unit readout:** exterior facades, sun-hours today (morning · afternoon), Sun Score, "in sun / in shadow now".
- **Per-floor "sun strip":** sun-hours by floor for the selected unit position — the "why floor 18 costs more" visual.
- **Saved units:** salesperson pre-saves units (e.g. `5S`, `5W`) as quick-pick chips to demo in two taps.
- Developer branding (logo, contact, listing link).

### ② Studio (authoring / onboarding) — Phase 2

Layered fallback onboarding:
1. Find location on map (MapLibre) → **auto-pull** surrounding buildings (Overpass) → context buildings.
2. **Manual fill** for missing data (heights especially).
3. Define subject building: match an existing one, or **author a future building** (draw footprint → set floors + floor height → configure unit grid + labels).
4. Preview → **Publish** → share link.

### ③ Dashboard (B2B SaaS) — Phase 3

Auth, multi-project management, branding, view analytics, **PDF/widget export**, paid plans (Supabase).

## 9. Build phasing

| Phase | Scope | Outcome |
|---|---|---|
| **0 — Foundations** | TS `solar` engine (position + per-facade + self-shadowing + sun-hours + score), `scene` model, golden tests, refactor the 3 towers onto it. No new UI. | A correct, tested core proven on trusted buildings. |
| **1 — MVP Sun-Page** | Public floor-plate Sun-Page (grid picker, day play, season, floor, readout, per-floor strip, saved units), mobile-first. Towers as the live showcase + shareable URL. | First demo / first revenue conversation. |
| **2 — Studio + off-plan** | Map ingest (OSM/Overpass) + manual fill + author future building → publish/share. | Any project + the off-plan hero use case. |
| **3 — Dashboard + money** | Auth, multi-project dashboard, branding, analytics, exports, paid plans. | Real multi-tenant SaaS. |

**This spec covers Phases 0 + 1.** Phases 2–3 are roadmap context for the implementation plan.

## 10. Decisions log

- Buyer: developers/agents first, consumers as shop window.
- Onboarding: layered (auto → manual → authored), unified `scene` model.
- Fidelity: 2.5D per-floor, visualised simply (SVG). No 3D in v1.
- Deliverable: shareable project Sun-Page + (later) dashboard.
- Unit model: configurable grid (position-based), not direction-only. Self-shadowing required. Real-footprint mapping is a later layer.
- Framework: keep Next.js + Vercel; add TypeScript; engine/UI separation.
- Name: Apricity (placeholder; may be reconsidered — code references `apricity` so a rename is a find-replace). Domain = a `.com` variant (~$11/yr), finalise pre-launch.
- Units: engine in SI internally; UI converts to metric (m) or American (ft) per `Project.displayUnits` with viewer override.

## 11. Open questions (non-blocking)

- Exact domain choice (`apricityhq.com` vs `useapricity.com` vs `tryapricity.com` vs `.co`).
- Sun Score formula details (normalisation basis, qualitative bands).
- How literally the v1 grid should approximate the real articulated footprints before Phase-2 real-footprint mapping.
- Units of footprint geometry (lng/lat vs local meters) — to be fixed in Phase 0 model.
