
# Hex Curse Visual Glow — Center Panel + Player Token

## Mål
Når den aktive spilleren er under en aktiv curse (`activeCurses.length > 0`), skal:
1. **Center panel** vise en pulserende purpur ring-kant + flytende ✨-partikler
2. **Player tokens** (statiske og animerte) vise et 🔮-badge i hjørnet + partikkel-aura

---

## Nåværende tilstand

- `CharacterPortrait.tsx` har allerede `CurseOverlay` med `animate-curse-pulse` inni selve portrett-sirkelen
- `tailwind.config.ts` har `curse-pulse` keyframe (box-shadow pulsering, 2s infinite)
- `PlayerToken.tsx` og `AnimatedPlayerToken.tsx` sender `hasCurse` til portrettet — men har ingen effekt på wrapper-divven selv
- Center panel-wrapper (linje 328–354 i `GameBoard.tsx`) er en nøytral `div` uten curse-bevissthet
- Ingen CSS-partikler finnes ennå

---

## Del 1: Ny CSS-animasjon — `curse-particle`

### `tailwind.config.ts`
Legg til ny keyframe og animation:
```ts
"curse-particle": {
  "0%":   { transform: "translateY(0px) scale(1)",   opacity: "0.9" },
  "100%": { transform: "translateY(-28px) scale(0)", opacity: "0" },
},
// animation:
"curse-particle": "curse-particle 2s ease-out infinite",
```

---

## Del 2: Ny komponent `CursePanelOverlay.tsx`

En absolutt-posisjonert overlay som legges **inni** center panel-wrapper-divven (over innholdet via `pointer-events-none`).

Inneholder:
- **Purpur glød-kant**: `inset-0 rounded-t-lg` div med `border-2 border-purple-500/60` og pulserende `box-shadow` via inline style + `animate-curse-pulse` — men `box-shadow` settes direkte via inline for å unngå konflikt med portrait-varianten
- **8 partikler**: `span`-elementer absolutt-posisjonert langs kantene (4 øverst, 2 på hver side), hvert med `✦` eller `✨`-tegn, `animation-delay` mellom 0s og 1.8s, `curse-particle`-animasjonen

Komponentens kode (ca. 50 linjer):
```tsx
// src/components/game/CursePanelOverlay.tsx
export function CursePanelOverlay() {
  const particles = [
    { left: '10%', delay: 0 },
    { left: '25%', delay: 0.4 },
    { left: '45%', delay: 0.8 },
    { left: '65%', delay: 0.2 },
    { left: '80%', delay: 1.1 },
    { left: '92%', delay: 0.6 },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none z-20 rounded-t-lg overflow-hidden">
      {/* Purpur pulserende kant */}
      <div
        className="absolute inset-0 rounded-t-lg animate-curse-pulse"
        style={{
          border: '2px solid rgba(147, 51, 234, 0.6)',
          boxShadow: '0 0 12px 3px rgba(147,51,234,0.3), inset 0 0 8px 2px rgba(147,51,234,0.15)',
        }}
      />
      {/* Partikler langs topp-kanten */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute text-purple-400 text-xs animate-curse-particle select-none"
          style={{
            left: p.left,
            bottom: '92%',
            animationDelay: `${p.delay}s`,
          }}
        >✦</span>
      ))}
    </div>
  );
}
```

---

## Del 3: Integrasjon i `GameBoard.tsx`

Center panel-wrapper (linje 337) endres til `relative` og `CursePanelOverlay` legges inn:

```tsx
const isCursed = (currentPlayer?.activeCurses?.length ?? 0) > 0;

// i JSX, inni den innerste div (linje 337):
<div className={`w-full h-full overflow-hidden flex flex-col bg-card/95 relative ${isMobile ? 'rounded-xl' : 'rounded-t-lg'}`}>
  {isCursed && !applianceBreakageEvent?.fromCurse && <CursePanelOverlay isMobile={isMobile} />}
  {/* ...eksisterende innhold... */}
</div>
```

**Merk**: Vises ikke på toppen av `CurseAppliancePanel` (når `fromCurse` er true) — den har sin egen stemning.

---

## Del 4: `TokenCurseEffect` i `PlayerToken.tsx` og `AnimatedPlayerToken.tsx`

En inline hjelpefunksjon (eller liten lokal komponent) som rendres **over portrettet** i wrapper-divven:

```tsx
function TokenCurseEffect() {
  return (
    <>
      {/* 🔮 badge, øvre høyre hjørne */}
      <div
        className="absolute -top-1 -right-1 z-10 text-xs rounded-full
                   bg-purple-900/80 border border-purple-400/60 w-5 h-5
                   flex items-center justify-center leading-none
                   animate-curse-pulse select-none pointer-events-none"
        style={{ fontSize: '10px' }}
      >
        🔮
      </div>
      {/* 3 partikler rundt tokenet */}
      {[
        { left: '20%', delay: 0 },
        { left: '50%', delay: 0.6 },
        { left: '75%', delay: 1.2 },
      ].map((p, i) => (
        <span
          key={i}
          className="absolute text-purple-400 animate-curse-particle pointer-events-none select-none"
          style={{ left: p.left, bottom: '100%', fontSize: '8px', animationDelay: `${p.delay}s` }}
        >✦</span>
      ))}
    </>
  );
}
```

**`PlayerToken.tsx`**: Legg `relative` på wrapper-div og render `{hasCurse && <TokenCurseEffect />}`.

**`AnimatedPlayerToken.tsx`**: Samme — allerede `absolute`-posisjonert, legg `relative` + `<TokenCurseEffect />`.

---

## Berørte filer

| Fil | Type endring |
|---|---|
| `src/components/game/CursePanelOverlay.tsx` | Ny fil |
| `src/components/game/GameBoard.tsx` | Legg til `isCursed` + `<CursePanelOverlay>` (5 linjer) |
| `src/components/game/PlayerToken.tsx` | Legg til `hasCurse` check + `<TokenCurseEffect>` |
| `src/components/game/AnimatedPlayerToken.tsx` | Legg til `hasCurse` check + `<TokenCurseEffect>` |
| `tailwind.config.ts` | Ny keyframe `curse-particle` + animation-entry |
| `log2.md` | Timestamp + logg |

---

## Visuelt resultat

```text
┌──[purpur glød-kant, pulserende]──────────────┐
│  ✦      ✦    ✦      ✦    ✦      ✦           │  ← partikler flyter oppover langs topp
│                                              │
│   [ResourcePanel / LocationPanel / Event]    │
│                                              │
└──────────────────────────────────────────────┘

Brett-token:
     [🔮]      ← badge, -top-1 -right-1
  ✦  [Portrait]  ✦   ← partikler flyter opp
     eksisterende purpur aura inni portrettet
```

---

## Risikovurdering

- **Ytelse**: Kun CSS-animasjoner — ingen JS-loops. Aktiv kun når `activeCurses.length > 0`.
- **pointer-events-none** på alle overlays — ingen klikk-konflikter.
- **overflow-hidden** på center panel-wrapper håndteres ved at overlayets kant er `inset-0` (ingen overflow fra kant-elementet).
- Partiklene starter ved `bottom: 92%` (rett over topp-kanten av panelet) og flyter opp — dvs. de er synlige fordi de er plassert **inni** wrapper som har `overflow-hidden` fjernet (eller de stoppes der). Vi bruker `overflow: visible` på selve overlay-divven og `z-20` for å ligge over innholdet.
