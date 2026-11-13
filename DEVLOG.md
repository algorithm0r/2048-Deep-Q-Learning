# 2048 DQN — DEVLOG
Newest entry on top. **Append only — never edit past entries.**

<!-- append new entries above this line -->

## 2026-11-13 — project created
**Done:** made this a project at Chris's request (PA session, GitHub fixup audit): container
`Research/2048 DQN`, this clone as `sim/`, these docs, `tools/headless-run.js`, hub
`projects/r-2048-dqn.md`. Page title set to the project name.
**State:** as below.
**Next:** DEVPLAN Stage 1.

## 2026-11-12 — agent fixed (commit 9460a43)
**Found** (headless runs, PA session): the agent leaked ~200 tensors/s (24k after two minutes),
fed raw tile values to the network, bootstrapped terminal states, linked the last state of one
game to the first of the next (with a large negative score delta), cleared replay memory after
every game, and computed targets with the untrained network at play time. `resetData` was
never called, and the agent waited for an arrow key before starting.
**Changed:** standard DQN: persistent replay buffer (50k), target network synced every 5
games, targets computed at training time, terminal transitions don't bootstrap. State is
log2(tile)/16, reward is log-scaled points with -1 for losing. `tf.tidy` around predicts.
Greedy choice can't return an illegal or NaN action. Exploration floors at 0.05. Autostart,
status line, tfjs pinned to 4.22.0. Conv option repaired but off.
**Result (one 6-minute run, 145 games):** 20-game average ~1000 for games 1–100 (exploration
falling from 1), then 1646, 1418 and 1852 for the blocks after it reached 0.05; best 3100.
Tensor count flat at 28. A modest gain from one run; not yet a strong player.
