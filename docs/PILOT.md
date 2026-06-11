# Apricity — Pilot (Phase 1.6)

**Date:** 2026-06-11
**Status:** Active — this is the current focus.
**Parent spec:** [Apricity — Design Spec](superpowers/specs/2026-06-10-apricity-design.md)

The pilot is **demand validation, not product expansion.** Both product surfaces are built (public **Unit Page** + internal **Explorer**). We have **zero customers**. Before building any Studio/authoring UI (Phase 2), we must learn whether an agent or developer will actually *use and pay for* a published Unit Page. The pilot is the cheapest possible test of that — no new product code, a scene authored by hand.

---

## Goal

Produce **one real, currently-listed, genuinely sunny building** as a hand-authored scene, publish **2–3 branded Unit Pages**, and use them as the **demo asset for cold outreach** to **10 real-estate agents + 2–3 developer-marketing leads**. Scene authored **manually as JSON** — no Studio UI.

## Success bar

At least one of these, from a real prospect:

- **Puts a Unit Page on a real listing** (uses it in the wild), **or**
- **Asks for another** (wants a second unit / building done), **or**
- **Names a budget** (says where the money would come from and roughly how much).

Any one = signal worth continuing. Two or three across the outreach = strong signal; begin Phase 2 (Light authoring).

## Kill criterion

**10 pitches, zero engagement → stop.** "Zero engagement" = after 10 genuine conversations, no one publishes, asks for more, or names a budget. If we hit this, the sales-enablement positioning is wrong or the buyer doesn't exist — **do not start Phase 2**; rethink the wedge (or the product).

---

## Choosing the pilot building — checklist

Pick a building that makes the demo land *and* keeps the manual authoring honest and cheap:

- [ ] **Real and currently listed** — at least one unit actively on the market, so the pitch is concrete and there's a real agent attached.
- [ ] **Genuinely sunny** — a unit with an obviously good sun story (south/west exposure, unobstructed). We showcase the *best* case: honest math, flatteringly-chosen subject.
- [ ] **Simple massing** — a clean rectangular/convex tower or slab. Avoid articulated L/U/podium shapes (the v1 grid abstraction visibly mismatches them and self-shadowing gets hairy).
- [ ] **Verifiable neighbours** — the buildings that could cast shadows on it are few, already built, and their heights are checkable (visible floor counts, OSM, or site photos). No guessing at phantom future towers.
- [ ] **Known geometry** — footprint, true-north orientation, floor count, and floor height establishable with reasonable confidence (listing floor plans, municipal data, street view, satellite).
- [ ] **A clear sun contrast on the floor plate** — ideally the building also has obviously *worse* units, so the Explorer triage story ("we'd feature these, not those") is real.

## Manual scene data needed (authored as JSON, no UI)

Author a `scene` JSON by hand (per the spec's §6 data model). Inputs:

**Project**
- `location { lat, lon, label }` — real coordinates.
- `branding { logo, contact, listingUrl }` — the agent's/developer's branding for the published page.
- `displayUnits` — `'metric'` (Israel).

**Subject building**
- `footprint` — traced by hand from satellite/plan, with correct **true-north orientation**.
- `baseElevation` — ground height (usually 0).
- `floors`, `floorHeight` (m) → total `height`.
- `unitGrid { rows, cols }` — the floor-plate matrix approximating the real unit layout.
- `unitLabels` — real unit identifiers for the units we'll publish (e.g. the listed unit's number).

**Immediate neighbours (context buildings)**
- For each shadow-relevant neighbour: `footprint` (traced) + `height` (floors × ~3 m, or verified). Only the ones that actually matter for this building's sun.

**Units to publish**
- The 2–3 specific units (floor + grid cell), chosen via the Explorer as the best sun stories.

> Keep it minimal: model only neighbours that can realistically block this building's sun. **Document every assumption** (heights, floor height, orientation source) inline so the demo's honesty is auditable.

## Outreach assets

- **2–3 published Unit Pages** (branded, mobile-first, shareable URLs) — the core artifact.
- **A 20–30s screen-recording** of one Unit Page animating through the day (for messages where a link won't be opened).
- **One-line pitch** tailored per audience — agents: *"turn the sunny unit into the reason they buy"*; developers: *"show per-apartment sun for off-plan before a brick is laid."*
- **A short Explorer walkthrough** (optional, for the more engaged developer leads) showing the triage view.
- **Target list:** 10 named agents (ideally listing the pilot building or similar sunny stock) + 2–3 developer-marketing contacts.

## The mandatory call question

Every pilot conversation must end with this asked out loud:

> **"Where in your budget would this come from?"**

This is the single most important data point. It separates "nice demo" from "real product": it surfaces whether a budget line exists, who owns it, and the order of magnitude. If no one can answer it, we don't have a business yet — regardless of how much they liked the visual.

---

## Out of scope for the pilot

- No Studio / authoring UI (manual JSON only).
- No new engine or accuracy work (frozen at current quality — see spec §10).
- No billing, auth, or dashboard.
- No consumer marketing, SEO, or portal integration.
