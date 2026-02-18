
# Oppgave: Hex-Curse Appliance Notifikasjon med Bilde + AI Brettvandring

## Kontekst fra kodebasen

**Nåværende hex-notifikasjon**: Vises som en `toast.error(...)` i `GameBoard.tsx` — en liten melding i hjørnet. Ingen bilde, ingen sentral panel-visning.

**Nåværende AI-bevegelse**: `handleMove()` i `actionExecutor.ts` kaller `store.movePlayer()` direkte — ingen `startAnimation()`. AI-tokens teleporterer instant, uten visuelle steg rundt brettet.

**Animasjonssystemet**: `usePlayerAnimation.ts` har `startRemoteAnimation()` for nettspill og `startAnimation()` for menneskelige spillere. Begge bruker `AnimatedPlayerToken` som allerede støtter path-animasjon langs brettet.

---

## Del 1: Hex-Curse Appliance Notifikasjon med Bilde

### Tilnærming

I stedet for bare en toast, vil vi vise en **sentral panel-notifikasjon** (som `EventPanel`) med et AI-generert woodcut-bilde. Vi bruker Gemini til å generere et bilde (svart blekk på pergament, medieval whimsical stil) og legger det inn som en ny `CurseApplianceModal`.

### Tekniske steg

**1. Generer bilde med Gemini**
- Prompt: `"Medieval woodcut whimsical illustration of a dark sorcerer casting a hex curse, magical energy destroying a mechanical box appliance, black ink on aged parchment, detailed line work, fantasy RPG, 1:1 square"`
- Lagres i `public/events/` eller `src/assets/events/` som `hex-appliance-curse.jpg`

**2. Ny komponent: `CurseAppliancePanel.tsx`**
- Vises i center panel når `applianceBreakageEvent.fromCurse === true`
- Innhold:
  - Bilde øverst (woodcut, sepia filter som andre event-bilder)
  - Tittel: `🔮 Cursed by [CurserName]!`
  - Tekst: `[ApplianceName] has been destroyed by dark magic!`
  - Repair-info: `Repair cost: Xg at the Enchanter`
  - OK-knapp som kaller `dismissApplianceBreakageEvent()`

**3. Integrasjon i `GameBoard.tsx`**
- Endre betingelsen for center panel-visning: sjekk `applianceBreakageEvent?.fromCurse` i tillegg til `selectedLocation` og `phase === 'event'`
- Vanlig appliance-breakage beholder toast-notifikasjonen

**Berørte filer:**
- `src/components/game/CurseAppliancePanel.tsx` (ny)
- `src/components/game/GameBoard.tsx` (legg til ny visningsbetingelse)
- `src/assets/events/index.ts` (legg til nytt bilde-import, valgfritt)

---

## Del 2: AI Motstandere Følger Sti Rundt Brettet

### Nåværende problem

`handleMove()` i `actionExecutor.ts`:
```typescript
store.movePlayer(player.id, action.location, cost);  // teleporterer
```

Menneskelige spillere bruker `startAnimation(path)` → `AnimatedPlayerToken` → visuell vandring. AI hopper bare til destinasjon.

### Tilnærming

AI-bevegelse skal **ikke endre spillogikken** — `movePlayer()` kalles fortsatt. Men vi trenger at GameBoard ser AI-bevegelsen og viser animasjonen visuelt.

**Løsning: Expose `startAnimation` via en global callback/ref i GameBoard**

Siden AI (`actionExecutor.ts`) er utenfor React-komponenten, trenger vi en bro:

**Alternativ A (enklest og renest):** Registrer en global `animateAIMove` callback i `useGameStore` eller en separat singleton ref. `handleMove()` kaller callbacken hvis tilgjengelig, og GameBoard registrerer den ved mount.

**Valgt løsning: Singleton ref-basert AI-animasjonsbro**

```typescript
// src/hooks/useAIAnimationBridge.ts (ny fil)
// Singleton ref som holder animasjonskallback fra GameBoard
let aiAnimateCallback: ((playerId: string, path: LocationId[]) => void) | null = null;

export function registerAIAnimateCallback(cb: typeof aiAnimateCallback) {
  aiAnimateCallback = cb;
}
export function triggerAIAnimation(playerId: string, path: LocationId[]) {
  aiAnimateCallback?.(playerId, path);
}
```

### Tekniske steg

**1. Ny fil: `src/hooks/useAIAnimationBridge.ts`**
- Eksporterer `registerAIAnimateCallback` og `triggerAIAnimation`

**2. Endre `GameBoard.tsx`**
- Kall `registerAIAnimateCallback(startRemoteAnimation)` i en `useEffect` ved mount
- Rydd opp (null) ved unmount

**3. Endre `actionExecutor.ts` — `handleMove()`**
- Etter `store.movePlayer()` kalles: kall `triggerAIAnimation(player.id, path)`
- Hent `path` med den allerede-tilgjengelige `getPath()` funksjonen (allerede importert!)
- NB: `path` er allerede tilgjengelig siden vi bruker `getPath()` for weather-beregning

**4. Timing-hensyn**
- `movePlayer()` oppdaterer state umiddelbart
- `triggerAIAnimation()` starter visuell animasjon
- Tokenet som er i animasjon vises av `AnimatedPlayerToken`, mens det statiske tokenet skjules (dette er allerede håndtert — `playersHere` filtrerer `animatingPlayer`)

**Berørte filer:**
- `src/hooks/useAIAnimationBridge.ts` (ny)
- `src/components/game/GameBoard.tsx` (registrer callback)
- `src/hooks/ai/actionExecutor.ts` (trigger animasjon fra `handleMove`)

---

## Rekkefølge

1. Generer curse-bilde med Gemini
2. Lag `CurseAppliancePanel.tsx` med bildet
3. Integrer i `GameBoard.tsx` (center panel)
4. Lag `useAIAnimationBridge.ts`
5. Koble inn i `GameBoard.tsx` og `actionExecutor.ts`
6. Logg til `log2.md`

## Risikovurdering

- **AI-animasjon**: Lav risiko — spillogikk forblir uendret, kun visuell animasjon. `startRemoteAnimation` er allerede designet for nøyaktig dette (nettspill bruker den uten `movePlayer`-kall).
- **Curse panel**: Lav risiko — ny komponent, minimal endring i GameBoard conditional rendering.
- **Timing**: AI-animasjon kjører asynkront, men siden AI har `setTimeout`-basert stepping med `decisionDelay`, vil animasjonene naturlig vises mellom handlinger.
