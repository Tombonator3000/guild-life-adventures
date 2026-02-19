
# Hex Curse Visual Glow + Curse of the Toad (med froskikon)

## Hva som skal implementeres

1. **AI-tokens lyser lilla** med 🔮 badge og partikler (fix `TokenCurseEffect` til å støtte alle spillere)
2. **Hexed lokasjon** viser purpur overlay + 🔮 ikon + partikler på brettet
3. **Ny hex: "Curse of the Toad"** — 1 uke, mister 40 timer, og spillerikonet/tokenet viser 🐸 i stedet for portrettet mens cursed

---

## Del 1: Frosk-portrett i CharacterPortrait

Den mest interessante delen: Når en spiller har `toad-transformation`-cursed, skal portrettet erstattes av et frosk-SVG-ikon i stedet for det vanlige portrettet.

### Endring i `CharacterPortrait.tsx`

Legg til en ny optional prop `activeCurses` (eller sjekk via `hasCurse` og en ny `isToad` prop). Enklest: legg til `isToad?: boolean` prop.

Når `isToad === true`:
- Vis en stor 🐸-emoji (eller en grønn SVG-frosk) i stedet for portrettet
- Behold den purpur `CurseOverlay` rundt rammen
- Bakgrunnen gjøres grønn

```tsx
// Nytt render-tilfelle inni CharacterPortrait, FØR vanlig portrait-rendering:
if (isToad) {
  return (
    <div
      className={`${roundedClass} border-2 border-purple-500/80 flex items-center justify-center relative ${className}`}
      style={{
        width: size, height: actualHeight,
        backgroundColor: '#166534',  // mørk grønn
        minWidth: size, minHeight: actualHeight,
      }}
    >
      <span style={{ fontSize: size * 0.65, lineHeight: 1 }} role="img" aria-label="frog">🐸</span>
      <CurseOverlay size={size} height={actualHeight} shape={shape} />
    </div>
  );
}
```

### Prop-flyt for `isToad`

`CharacterPortrait` får ny prop `isToad?: boolean`.

`PlayerToken.tsx` og `AnimatedPlayerToken.tsx` beregner:
```tsx
const isToad = player.activeCurses?.some(c => c.effectType === 'toad-transformation') ?? false;
```
og sender `isToad={isToad}` til `CharacterPortrait`.

### TokenCurseEffect oppdateres

`TokenCurseEffect` tar en `isToad: boolean` prop og viser 🐸 badge i stedet for 🔮:
```tsx
function TokenCurseEffect({ isToad }: { isToad: boolean }) {
  const badge = isToad ? '🐸' : '🔮';
  ...
}
```

---

## Del 2: Ny Hex — "Curse of the Toad" 🐸

### I `src/data/hexes.ts`

1. Legg til `'toad-transformation'` i `HexEffectType`-union
2. Legg til ny definisjon i `PERSONAL_CURSES`:

```ts
{
  id: 'curse-of-the-toad',
  name: 'Curse of the Toad',
  category: 'personal',
  description: 'Target turns into a frog for 1 week, losing 40 hours of time.',
  flavorText: 'Ribbit. Your fingers are green. Your legs are shorter. Oh no.',
  basePrice: 450,
  castTime: 2,
  duration: 1,
  effect: { type: 'toad-transformation', magnitude: 40 },
  sources: [
    { location: 'shadow-market' },
    { location: 'enchanter', requiresFloorCleared: 3 },
  ],
},
```

### I `src/store/helpers/startTurnHelpers.ts`

Etter Phase 6b (Lethargy), legg til Phase 6c:
```ts
// --- Phase 6c: Curse of the Toad (40h time loss) ---
const toadCurse = hasCurseEffect(currentPlayer, 'toad-transformation');
if (toadCurse) {
  updatePlayerById(set, playerId, (p) => ({
    timeRemaining: Math.max(0, p.timeRemaining - toadCurse.magnitude),
  }));
  if (!currentPlayer.isAI) {
    eventMessages.push(`${currentPlayer.name} is still a frog! Ribbiting around wastes 40 hours.`);
  }
  currentPlayer = getPlayer(get, playerId);
}
```

---

## Del 3: Lokasjon Hex Visuell Effekt

### `src/components/game/LocationZone.tsx`

Legg til to nye optional props:
```tsx
isHexed?: boolean;
hexCasterName?: string;
```

Inni `<div className="location-zone ...">`, legg til conditionally:
```tsx
{isHexed && (
  <div className="absolute inset-0 pointer-events-none z-10 rounded overflow-hidden">
    {/* Purpur semi-transparent glød */}
    <div
      className="absolute inset-0 animate-curse-pulse"
      style={{
        background: 'rgba(88,28,135,0.15)',
        border: '2px solid rgba(147,51,234,0.55)',
        boxShadow: '0 0 10px 2px rgba(147,51,234,0.35)',
        borderRadius: 'inherit',
      }}
    />
    {/* 🔮 ikon øverst til høyre */}
    <div className="absolute top-0.5 right-0.5 text-xs select-none pointer-events-none">🔮</div>
    {/* 4 partikler langs bunnen */}
    {[0, 0.5, 1.0, 1.5].map((delay, i) => (
      <span
        key={i}
        className="absolute animate-curse-particle select-none pointer-events-none"
        style={{
          left: `${15 + i * 22}%`,
          bottom: '2px',
          fontSize: '8px',
          color: 'rgb(192, 132, 252)',
          animationDelay: `${delay}s`,
        }}
      >✦</span>
    ))}
  </div>
)}
```

Tooltip oppdateres med hex-info:
```tsx
{isHexed && hexCasterName && (
  <span className="ml-1 text-xs text-purple-400">🔮 by {hexCasterName}</span>
)}
```

### `src/components/game/GameBoard.tsx`

Hent `locationHexes` fra store (én linje):
```tsx
const locationHexes = useGameStore(s => s.locationHexes);
```

Send til `LocationZone` (linje ~270):
```tsx
const activeHex = locationHexes.find(h => h.targetLocation === location.id && h.weeksRemaining > 0);
<LocationZone
  ...
  isHexed={!!activeHex}
  hexCasterName={activeHex?.casterName}
>
```

---

## Berørte filer

| Fil | Endring |
|---|---|
| `src/data/hexes.ts` | Ny `HexEffectType` `'toad-transformation'`, ny hex i `PERSONAL_CURSES` |
| `src/components/game/CharacterPortrait.tsx` | Ny `isToad` prop — viser 🐸 SVG/emoji i stedet for portrett |
| `src/components/game/PlayerToken.tsx` | `isToad` beregning, send til `CharacterPortrait` + `TokenCurseEffect` |
| `src/components/game/AnimatedPlayerToken.tsx` | Samme — `isToad` til `CharacterPortrait` + badge-endring |
| `src/store/helpers/startTurnHelpers.ts` | Phase 6c: håndter `toad-transformation` tidstap |
| `src/components/game/LocationZone.tsx` | Ny `isHexed` + `hexCasterName` props, purpur overlay + partikler |
| `src/components/game/GameBoard.tsx` | Hent `locationHexes`, send `isHexed`/`hexCasterName` til `LocationZone` |
| `log2.md` | Timestamp + logg |

---

## Visuelt resultat

```text
Spiller med toad-curse:
  Token på brett:           PlayersTab-portrett:
    [🐸]  ← badge             [🐸 grønn sirkel]
   (grønn                      ← frosk emoji i stedet
    sirkel)                       for vanlig portrait
  ✦  ✦  ✦  ← partikler

Hexed lokasjon på brettet:
┌─[purpur glød, pulserer]─────┐
│  🔮               ✦ ✦ ✦ ✦  │
│  [location innhold]          │
│  purpur semi-transparent     │
└──────────────────────────────┘

Tooltip (hexed):
┌────────────────────────────────┐
│  Guild Hall  🔮 by Grimwald    │
└────────────────────────────────┘
```

---

## Risikovurdering

- **`isToad` prop**: Optional med default `false` — backward compatible overalt
- **Toad hex**: Bruker eksisterende `time-loss`-mønster fra Phase 6b, trivielt å legge til
- **LocationZone**: `isHexed` og `hexCasterName` er optional props — ingen breaking changes
- **`locationHexes` i GameBoard**: Allerede tilgjengelig via store, én linje å hente ut
