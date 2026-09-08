# Production balance runner

`bun run test:balance` runs three seeded smoke games and replays the first seed. It mounts the same `useGrimwaldAI` hook as the board, advances only its presentation timers, and uses actual store actions, turn transitions, death rules, prices, goals and AI personalities. No toy economy, copied action chooser or reward mocks.

```sh
BALANCE_GAMES=1000 BALANCE_OUT=docs/qa/playability/balance bun run test:balance
```

Inputs: `BALANCE_SEED` (20260908), `BALANCE_OFFSET` (0), `BALANCE_GAMES` (3), `BALANCE_MAX_WEEKS` (500), `BALANCE_PRESETS` (quick,standard,adventure,epic), `BALANCE_OUT`. Offsets permit disjoint reproducible batches. Four AI personalities rotate seats; difficulty cycles easy/medium/hard; presets match GameSetup. Use the same source revision for every batch.

Outputs: `games.jsonl` checkpoints every completed attempt; `checkpoint.json` progress; `report.json` detailed metrics; `report.md` concise results. `victory`, `all-dead`, `stalled`, and `week-limit` are distinct. The first game is replayed and must match all metrics. Errors and stalled turns fail the run. Timeouts remain in the report and do not count as completed games.

Only audio, visual travel and random trash talk are omitted. React’s one-time async scheduler is initialized before the gameplay RNG; otherwise React consumes one random value only in the first simulation. The seed uses Mulberry32. All global mocks and clocks are restored after the run. Game options use the shipped defaults; options are recorded in the report. Human-specific adaptive play is not exercised by an all-AI baseline.

Snapshots record actual goal trajectories every week; distress is sampled at weekly boundaries and can miss temporary midweek hunger. `unusedHours` is the time at explicit turn end before the game automatically uses it. Public rivals and NPC reactions do not change AI choices. The new optional city activities and NPC favors currently have no AI action generator, an explicit content-coverage gap for future balancing.

Combine disjoint finished batches (the script rejects overlapping seeds, different source revisions and recorded runtime errors):

```sh
BALANCE_SOURCE_REMOTE=<matching-github-commit> node scripts/balance/summarize.mjs docs/qa/playability/balance /path/to/batch-0 /path/to/batch-250 /path/to/batch-500 /path/to/batch-750
```

The combined artifact keeps aggregates as readable JSON and the full game trajectories in lossless `games.json.gz`. Decompress with `gzip -dc games.json.gz` or Node’s `gunzipSync` to inspect any seed. The source tree hash and the local-to-GitHub commit mapping make the frozen baseline auditable even when later commits contain UI corrections.
