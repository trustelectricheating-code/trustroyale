# Graph Report - casinogame  (2026-09-25)

## Corpus Check
- 11 files · ~9,364 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 97 nodes · 96 edges · 12 communities (9 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c1fea82f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Research: Trust Royale Slot Machine
- asset-manifest.md
- Implementation Plan: Trust Royale — Branded Slot Machine Promo Game
- Data Model: Trust Royale Slot Machine
- Validation per phase
- Contract: Lead capture and CRM sync
- Feature Specification: Trust Royale — Branded Slot Machine Promo Game
- Contract: Game API — `GET /api/session`, `POST /api/spin`
- User Scenarios & Testing *(mandatory)*
- AGENTS.md
- CLAUDE.md
- README.md

## God Nodes (most connected - your core abstractions)
1. `Research: Trust Royale Slot Machine` - 16 edges
2. `Implementation Plan: Trust Royale — Branded Slot Machine Promo Game` - 9 edges
3. `Data Model: Trust Royale Slot Machine` - 7 edges
4. `Validation per phase` - 7 edges
5. `User Scenarios & Testing *(mandatory)*` - 7 edges
6. `Contract: Lead capture and CRM sync` - 6 edges
7. `Feature Specification: Trust Royale — Branded Slot Machine Promo Game` - 6 edges
8. `Contract: Asset manifest (`public/assets/manifest.json`)` - 4 edges
9. ``POST /api/lead` — claim form` - 4 edges
10. `Contract: Game API — `GET /api/session`, `POST /api/spin`` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (12 total, 3 thin omitted)

### Community 0 - "Research: Trust Royale Slot Machine"
Cohesion: 0.12
Nodes (16): Decisions confirmed by owner (2026-09-25), Open items, R10. Performance budget, R11. Testing, R12. Legal note, R13. Lead storage and CRM, R1. Rendering engine — is 3D overkill?, R2. App shell and build (+8 more)

### Community 1 - "asset-manifest.md"
Cohesion: 0.21
Nodes (4): Contract: Asset manifest (`public/assets/manifest.json`), Required asset list (the order the board displays), Shape, Validation

### Community 2 - "Implementation Plan: Trust Royale — Branded Slot Machine Promo Game"
Cohesion: 0.18
Nodes (11): Complexity Tracking, Constitution Check, Deferred owner inputs (asked only at the stage that needs them), Delivery Phases (owner-gated), Documentation (this feature), Implementation Plan: Trust Royale — Branded Slot Machine Promo Game, Owner decisions (confirmed 2026-09-25), Project Structure (+3 more)

### Community 3 - "Data Model: Trust Royale Slot Machine"
Cohesion: 0.20
Nodes (10): AssetEntry, Data Model: Trust Royale Slot Machine, Database (Neon Postgres), `leads`, PaytableRule, Reel RNG, `sessions`, SpinResult (+2 more)

### Community 4 - "Validation per phase"
Cohesion: 0.20
Nodes (10): Phase A — Mood board (`/moodboard.html`), Phase B — Look & feel mock (`/`, static, no logic), Phase C — Asset board (`/assets.html`), Phase D — Playable game, Phase E — Atmosphere polish, Phase F — Launch readiness, Prerequisites, Quickstart & Validation: Trust Royale (+2 more)

### Community 5 - "Contract: Lead capture and CRM sync"
Cohesion: 0.22
Nodes (9): Contract: Lead capture and CRM sync, Environment variables, `GET /api/admin/win/{winRef}` — phone-claim lookup, `GET /api/cron/crm-sync` — retry job, `POST /api/lead` — claim form, Processing order (must not change), Request, Responses (+1 more)

### Community 6 - "Feature Specification: Trust Royale — Branded Slot Machine Promo Game"
Cohesion: 0.22
Nodes (9): Assumptions, Clarifications, Feature Specification: Trust Royale — Branded Slot Machine Promo Game, Functional Requirements, Key Entities, Measurable Outcomes, Requirements *(mandatory)*, Session 2026-09-25 (owner answers and reference review) (+1 more)

### Community 7 - "Contract: Game API — `GET /api/session`, `POST /api/spin`"
Cohesion: 0.29
Nodes (7): 200 — spin played, Contract: Game API — `GET /api/session`, `POST /api/spin`, Environment variables, Errors, `GET /api/session`, Guarantees, `POST /api/spin`

### Community 8 - "User Scenarios & Testing *(mandatory)*"
Cohesion: 0.29
Nodes (7): Edge Cases, User Scenarios & Testing *(mandatory)*, User Story 1 — Spin and win a discount (Priority: P1), User Story 2 — Arrival spectacle (Priority: P2), User Story 3 — Understand the prizes (Priority: P2), User Story 4 — Phased design sign-off (Priority: P1, process), User Story 5 — Claim the discount (Priority: P1)

## Knowledge Gaps
- **69 isolated node(s):** `graphify`, `graphify`, `trustroyale`, `Shape`, `Required asset list (the order the board displays)` (+64 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Research: Trust Royale Slot Machine` connect `Research: Trust Royale Slot Machine` to `asset-manifest.md`?**
  _High betweenness centrality (0.270) - this node is a cross-community bridge._
- **Why does `Feature Specification: Trust Royale — Branded Slot Machine Promo Game` connect `Feature Specification: Trust Royale — Branded Slot Machine Promo Game` to `User Scenarios & Testing *(mandatory)*`, `asset-manifest.md`?**
  _High betweenness centrality (0.264) - this node is a cross-community bridge._
- **Why does `Implementation Plan: Trust Royale — Branded Slot Machine Promo Game` connect `Implementation Plan: Trust Royale — Branded Slot Machine Promo Game` to `asset-manifest.md`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **What connects `graphify`, `graphify`, `trustroyale` to the rest of the system?**
  _69 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Research: Trust Royale Slot Machine` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._