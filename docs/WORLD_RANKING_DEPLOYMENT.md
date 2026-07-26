# Community World Ranking – deployment

World ranking is optional. The local Hall of Fame works without any backend.

## What the service stores

The PartyKit room named `leaderboard` stores the best 100 community scores. Each public row contains:

- Chosen Hall of Fame display name.
- Character name.
- Performance score.
- Week number.
- Solo, local multiplayer or online mode.
- Goal preset name.
- Victory-race and Overall-MVP flags.
- Submission and server timestamps/IDs.

The game does not upload a score automatically. The player must first save it locally and then press **Submit to World Ranking**.

## Important trust limitation

Guild Life is client-authoritative. PartyKit validates field types and ranges, rejects impossible scores above 10,000, limits repeated submissions and prevents duplicate submission IDs. It cannot prove that a browser has not modified its own game state.

The UI therefore labels this board **Community World Ranking – unverified**. A truly cheat-proof competitive ladder would require the complete game simulation to run on an authoritative server.

## Deploy PartyKit

From the repository root:

```bash
npx partykit login
npx partykit deploy
```

PartyKit returns a hostname similar to:

```text
guild-life-adventures.example.partykit.dev
```

Do not include `https://` in the Vite environment variable.

## Configure the frontend

Set the following variable in the environment that builds the production frontend:

```text
VITE_PARTYKIT_HOST=guild-life-adventures.example.partykit.dev
```

Then rebuild and redeploy the frontend. Vite environment variables are compiled into the application, so changing the variable without rebuilding is not enough.

For local development:

```bash
npx partykit dev
```

and in `.env.local`:

```text
VITE_PARTYKIT_HOST=localhost:1999
```

## Graceful fallback

When `VITE_PARTYKIT_HOST` is missing, empty or still contains the example text `your-username`, the world-ranking client stays disabled. The victory screen explains that the service is unavailable, while local high scores continue to work normally.

Room-code multiplayer and the current MQTT public-room browser do not depend on this leaderboard service.

## Current server limits

- Top 100 scores retained.
- Top 25 for the current goal profile shown in the victory screen.
- Score range: 0–10,000.
- Week range: 1–1,000.
- Five new submissions per connection per hour.
- Repeated submission IDs are idempotent and do not create duplicate rows.
