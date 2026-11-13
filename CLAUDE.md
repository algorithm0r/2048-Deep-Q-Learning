# 2048 DQN — Claude instructions

## Read first, every session
1. `STATUS.md` — where the project is right now
2. `DEVLOG.md` — the top entry (what changed last)
3. `DEVPLAN.md` — the current `[ ACTIVE ]` stage

## What this is
A deep Q-learning agent (TensorFlow.js) that learns to play 2048 in the browser. It started as
a 2023 TCSS 435 demo; the 2026-11-12 fix made it learn (see DEVLOG). Live at
algorithm0r.github.io/2048-Deep-Q-Learning.

## Where the work is
- **The agent:** `js/agent.js` (network, replay buffer, target network, training),
  `js/agentManager.js` (game-over handling, stats, the status line), `js/agentbrain.js` (a copy
  of the board for testing which moves are legal), `js/application.js` (wires the agent in and
  starts it on load).
- **The environment:** everything else in `js/`, `style/` and `index.html` is the 2048 game
  the agent plays. Work on the agent and its instrumentation; leave the game's mechanics and
  look as they are. (The Claude app's instructions bar building recreations of existing games,
  so changes to the game itself are out for us. Agents that play it are fine.)

## Stack
- Vanilla JS, no build step. TensorFlow.js pinned in `index.html` (4.22.0). Pin any upgrade.
- Wrap every `predict` in `tf.tidy` (or dispose by hand). A leak shows as a growing
  `tf.memory().numTensors`, which `tools/headless-run.js` prints every 30 s.

## Run
- Browser: open `index.html`. The agent starts playing immediately; the line under the board
  shows games played, the 20-game average, the best score and the exploration rate.
- Headless measurement: `cd tools && npm i --no-save playwright-core`, then
  `node headless-run.js 360`. Prints average score per block of 20 games. One run is one run:
  compare blocks after exploration has bottomed out (0.05, about game 95), and use several
  runs before claiming a difference.

## Conventions
Follow `~/.claude/conventions.md`. STATUS is overwritten every close; DEVLOG is append-only,
newest on top; DEVPLAN stages carry `[ DONE ] / [ ACTIVE ] / [ PLANNED ]` and a
`**Done when:**` criterion. The page `<title>` is the project name (Pulse attribution).
