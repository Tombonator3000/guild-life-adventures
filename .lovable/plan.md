

## AI-generert steinmur-border rundt sidepanelene

Bruker Googles Gemini bildegenerering (via Lovable AI Gateway) til a lage dekorative steinmur-bilder med mose, slyngplanter og blomster i middelalderstil. Disse brukes som bakgrunnsbilder/borders rundt venstre og hoyre sidepanel.

### Tilnaerming

Genererer **to bilder** med AI:
1. **Venstre border** - Vertikal steinmur-ramme med mose og vines, apen pa hoyre side (der panelinnholdet vises)
2. **Hoyre border** - Speilvendt versjon, apen pa venstre side

Bildene lagres i `public/ui/` og brukes som bakgrunn i en wrapper-komponent.

### Plan

#### Steg 1: Generer AI-bilder
Bruke Gemini image generation til a lage to vertikale steinmur-border-bilder:
- Prompt: Medieval stone wall border frame with moss, vines, and small flowers. Dark gray/brown stone texture. Transparent or dark center. Vertical orientation, game UI frame style.
- Format: PNG med gjennomsiktig senter
- Storrelse: Tilpasset sidepanelenes proporsjoner (smal og hoy)

#### Steg 2: Ny komponent `StoneBorderFrame.tsx`
- Enkel wrapper som legger AI-generert bilde som bakgrunn
- Bruker `background-image` med `background-size: 100% 100%` for a strekke rammen
- Padding inni for at panelinnholdet ikke overlapper steinmuren
- Props: `side: 'left' | 'right'` for a velge riktig bilde

#### Steg 3: Oppdater `GameBoard.tsx`
- Wrap venstre sidepanel (linje 195-207) med `StoneBorderFrame side="left"`
- Wrap hoyre sidepanel (linje 334-352) med `StoneBorderFrame side="right"`
- Fjerne `p-[0.5%]` padding fra panel-wrapperne (StoneBorderFrame handterer dette)

#### Steg 4: Fiks eksisterende build-feil
- **GameBoard.tsx linje 381**: Fjern `week={week}` prop fra mobile RightSideTabs
- **DeveloperTab.tsx**: Fikse type-feil ved a bruke spesifikke store-selektorer i stedet for hele store-objektet
- **QuestPanel.tsx**: Fikse "bounty" type-sammenligninger
- **networkState.ts**: Fikse type-casting

#### Steg 5: Logg til log.md

### Tekniske detaljer

**Bildegenerering:**
- Bruker `google/gemini-2.5-flash-image` modellen via Lovable AI
- Genererer bildene under bygging/utvikling og lagrer som statiske filer i `public/ui/`
- To bilder: `stone-border-left.png` og `stone-border-right.png`

**StoneBorderFrame.tsx:**
```
interface StoneBorderFrameProps {
  side: 'left' | 'right';
  children: React.ReactNode;
}
```
- Bruker bakgrunnsbilde som dekker hele containeren
- Innvendig padding (~8-12%) slik at panelinnholdet sitter inni steinrammen
- Gjennomsiktig senter slik at panelinnholdet er lesbart

**Filer som opprettes/endres:**

| Fil | Endring |
|-----|---------|
| `public/ui/stone-border-left.png` | **Ny** - AI-generert steinmur venstre ramme |
| `public/ui/stone-border-right.png` | **Ny** - AI-generert steinmur hoyre ramme |
| `src/components/game/StoneBorderFrame.tsx` | **Ny** - Wrapper-komponent med steinmur-bakgrunn |
| `src/components/game/GameBoard.tsx` | Wrap sidepaneler + fiks `week` build-feil |
| `src/components/game/tabs/DeveloperTab.tsx` | Fiks type-feil med store |
| `src/components/game/QuestPanel.tsx` | Fiks "bounty" type-feil |
| `src/network/networkState.ts` | Fiks type-casting |
| `log.md` | Logg dagens endringer |

