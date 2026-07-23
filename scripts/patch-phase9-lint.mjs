import { readFileSync, writeFileSync } from 'node:fs';

const replacements = [
  {
    path: 'src/components/game/HexShopPanel.tsx',
    pairs: [
      [`const useHexDefense = useGameStore(state => state.useHexDefense);`, `const performHexDefense = useGameStore(state => state.useHexDefense);`],
      [`useHexDefense(player.id, 'amulet')`, `performHexDefense(player.id, 'amulet')`],
      [`useHexDefense(player.id, 'dispel', targetLocation)`, `performHexDefense(player.id, 'dispel', targetLocation)`],
    ],
  },
  {
    path: 'src/components/game/GraveyardHexPanel.tsx',
    pairs: [
      [`const useGraveyardHexService = useGameStore(state => state.useGraveyardHexService);`, `const performGraveyardHexService = useGameStore(state => state.useGraveyardHexService);`],
      [`useGraveyardHexService(player.id, service)`, `performGraveyardHexService(player.id, service)`],
    ],
  },
];

for (const { path, pairs } of replacements) {
  let source = readFileSync(path, 'utf8');
  for (const [search, replacement] of pairs) {
    if (!source.includes(search)) throw new Error(`Missing lint target in ${path}: ${search}`);
    source = source.replaceAll(search, replacement);
  }
  writeFileSync(path, source);
  console.log(`Patched ${path}`);
}
