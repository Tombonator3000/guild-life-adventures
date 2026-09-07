# Classic location visits: verified checkpoint

Runtime/test revision: `35ca8933c4e4e8f7eb83512a08d2db588dcc014f`.

- [Passing workflow](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34095687365)
- [Browser captures](https://github.com/Tombonator3000/guild-life-adventures/actions/runs/34095687365/artifacts/10008590178)
- [Owner-approved scope](../../design/CLASSIC_VISUAL_DIRECTION.md)

## Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Original board and characters | PASS | No changes to city assets, NPC assets, location geometry, sidebars or center-frame bounds. Inspected actual Forge and Guild Hall desktop captures. |
| Workplace coverage | PASS | Browser journey visits all ten workplaces and checks the original image/video loads. |
| Real actions | PASS | Hiring, working, phone work in both orientations and bank deposit/withdraw availability pass through existing actions. |
| Work preview | PASS | Three regression tests compare preview with real service results, including festival, bonus, debt, short shift and clothing block cases. |
| Regressions | PASS | 721 tests in 87 files; all 15 browser journeys, including existing tutorial, save/load and multiplayer tests. |
| Build and repository gates | PASS | Production build, configured check:types, ESLint (27 warnings, no errors), audio integrity. |
| Direct app typecheck | FAIL, existing baseline | `tsc --noEmit -p tsconfig.app.json` reports the same 185 diagnostics on clean main 244df16 and this version. The configured root check does not expose these. No new diagnostics remain in this change. |
| Visual review | PASS within the fixed-frame scope | Inspected final Forge, employed Guild Hall, phone landscape and phone portrait captures. The board and original caricatures are retained; work buttons and outcomes remain reachable. |
| Physical phone performance | UNVERIFIED | CI Chromium viewport emulation is not a Samsung S24 hardware test. No new FPS claim. |

## Corrections during review

The first browser attempt expected an image at every location and failed at the General Store's existing video portrait. Corrected the test to check either decoded image or video media; original videos are retained. All 14 existing browser journeys passed even in that first run.

The shallow landscape frame required scrolling the services and work card together to keep both accessible. Desktop employer/shop rows were made visibly clickable. The mobile resource strip now starts at gold/time and supports horizontal scrolling instead of centering and clipping its first resources. Portrait phone space is still constrained by the owner's fixed central frame; this is intentionally not a new board layout.

Sample captures: desktop-forge.png, desktop-employed.png, mobile-employed-844.png, mobile-employed-390.png and mobile-bank.png in the classic-locations test directory of the artifact. The runtime captures include the existing developer panel used for location traversal; it remains hidden in normal play unless explicitly activated.
