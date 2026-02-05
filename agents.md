# Guild Life Adventures - Agents & AI System

## Oversikt

Dette dokumentet beskriver AI-systemet og agentlogikken i Guild Life Adventures.

## AI-motstanderen: Grimwald

Grimwald er den datastyrte spilleren som bruker strategisk beslutningstaking for a konkurrere mot menneskelige spillere.

### Prioriteringsliste (useAI Hook)

AI-en folger denne prioriteringslisten:

1. **Mat** - Hvis `foodLevel < 25`, dra til General Store
2. **Husleie** - Hvis `weeksSinceRent >= 3` og har rad, betal husleie
3. **Jobb** - Hvis ingen jobb, sok ved Guild Hall
4. **Arbeid** - Hvis har jobb, jobb et skift
5. **Quest** - Hvis har aktiv quest, fullforer den
6. **Utdanning** - Hvis har rad og tid, studer
7. **Hvile** - Hvis helse < 50, besok Healer

### Beslutningslogikk

```typescript
// Pseudokode for AI-beslutninger
if (player.foodLevel < 25) {
  return goTo('general-store', buyFood);
}
if (needsRent && canAffordRent) {
  return goTo('landlord', payRent);
}
if (!hasJob) {
  return goTo('guild-hall', applyForJob);
}
// ... osv
```

## Filplasseringer

- **AI Hook**: `src/hooks/useAI.ts`
- **Game Store**: `src/store/gameStore.ts`
- **Player Types**: `src/types/game.types.ts`

## Spillerattributter AI bruker

| Attributt | Beskrivelse |
|-----------|-------------|
| `gold` | Tilgjengelig gull |
| `health` | Navaerende helse (0-100) |
| `happiness` | Lykkeniova (0-100) |
| `foodLevel` | Matniva (0-100) |
| `dependability` | Palitelighet for jobb (0-100) |
| `currentJob` | Aktiv jobb-ID |
| `activeQuest` | Aktiv quest-ID |

## Konfigurasjon

AI-motstanderen aktiveres ved spillstart:
- Velg "Include AI Opponent" i Game Setup
- AI har fargen "Pearl" (#E5E5E5)
- Navn: "Grimwald"

## Fremtidige forbedringer

- [ ] Mer avansert beslutningstrre
- [ ] Vanskelighetsgrader
- [ ] Laere fra spillerens strategier
- [ ] Multiplayer AI-support
