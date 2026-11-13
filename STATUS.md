# 2048 DQN — STATUS
*One screen. The current pulse. Overwritten, never appended — for history read DEVLOG.*

**Updated:** 2026-11-13 (project created) — refreshed every session close; may carry unverified claims
**Verified:** none yet — no cold audit has run

## Stage
DEVPLAN Stage 1 — Baselines and a trustworthy measurement  `[ ACTIVE ]`

## State
The agent learns: in one 6-minute headless run the 20-game average rose from ~1000 to
~1400–1850 once exploration bottomed out (DEVLOG 2026-11-12). No baselines and only one run.

## Metrics
- One run, 145 games: blocks after epsilon = 0.05 averaged 1646 / 1418 / 1852; best 3100.

## Branches
- `main` (GitHub Pages serves it)

## Open
- Baselines (random, corner heuristic) and repeated runs.

## Next action
DEVPLAN Stage 1 — write the two baselines.

## Blockers
- none
