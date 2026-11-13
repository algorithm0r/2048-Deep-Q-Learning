# 2048 DQN — DEVPLAN
*Living document, not frozen. Update as the design evolves.*

## Built
- DQN agent with replay buffer and target network, learning in the browser (2026-11-12).
- Headless measurement script (`tools/headless-run.js`).

## Stages
### Stage 1 — Baselines and a trustworthy measurement  [ ACTIVE ]
- [ ] Baselines over many games: random legal moves, and a fixed corner heuristic
      (prefer down/left), so "learning" has something to beat besides random.
- [ ] Several headless runs of the current agent, long enough to see a plateau.
- [ ] Record the learning curve per run (block averages) in DEVLOG.
**Done when:** the current agent's plateau is known with a spread across runs, next to both
baselines.

### Stage 2 — Make it a better player  [ PLANNED ]
Candidates, one at a time, each measured against Stage 1:
- [ ] One-hot tile encoding (16 cells x 16 exponents) instead of log2/16.
- [ ] Larger network; the conv option.
- [ ] Reward shaping (empty cells, monotonic rows) vs raw merge points.
- [ ] Double DQN target; n-step returns; slower exploration decay.
**Done when:** a change beats the Stage 1 plateau across several runs.

### Stage 3 — {{decide with Chris: teaching demo or paper}}  [ PLANNED ]

## Backlog
*One line each, led by `fix:` / `feat:` / `idea:`.*
- feat: a small learning-curve chart on the page (Claude Basic), instead of only the status line.
- idea: save and load trained weights (`model.save('localstorage://…')`) so a visitor sees a trained agent.
