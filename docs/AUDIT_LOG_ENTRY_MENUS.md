# Golden entry menus — 2026-09-13

Base: `4b3cbd9b861c5436509ce94b271d0f3e1774c4d2` (main after newspaper fix #416).

The owner supplied three phone screenshots, confirmed that Chrome's **Desktop site** setting was enabled, and authorized the proposed overhaul, gold buttons and appropriate merges. The original screenshots showed a desktop-sized menu scaled down on a phone: very small text and controls, weak secondary-action contrast and a long setup form with no clear selected preset.

## Accepted design and implementation

- Preserve the existing Guildholm day/night artwork, character portraits and underlying game rules.
- Shared embossed gold primary actions and dark brass secondary buttons; 48px minimum button height, visible keyboard focus, readable labels and safe-area padding.
- A clearer title hierarchy, real autosave week/player details in Continue, and accessible Load Saved navigation. Deleting the autosave immediately removes Continue.
- Two setup steps: Players → Game Goals. Going back preserves names, portraits, individual AI difficulty, tutorial choice and every goal value.
- Two player cards per page; preserve six total players and four AI rivals. Validate blank, overlong and duplicate names across humans and AI.
- Paged original portrait artwork, category filters, custom-photo upload, focus containment, Escape and focus restoration.
- The four existing presets and their exact targets remain intact. A visible selected state and summary replace the dense slider-first presentation. Edited targets are labelled Custom; all sliders and the optional Adventure Goal remain available.
- Natural page scrolling for long content, with a sticky action summary. No scrolling player list or scrolling portrait grid. The complete portrait dialog can scroll when screen height or text size requires it.
- Reduced motion and the existing atmosphere/text preferences are respected. Title particles decrease from 120 stars/22 embers to 40/12. No per-frame React state, canvas or WebGL is introduced.

The responsive viewport declaration is unchanged. Chrome Desktop site intentionally requests desktop layout; native phone layout is obtained by disabling that browser setting. No browser sniffing or forced viewport rewriting is used.

## Review and corrections

- Real store tests cover the setup payload rather than mirroring CSS or relying on mocked state transitions.
- Explicit form button types prevent add/remove/portrait controls from starting the game.
- AI names are validated together with local names; setup returns to the page containing an invalid name.
- Portrait names originally wrapped awkwardly in four narrow columns. Three columns on phones provide readable labels while retaining the original art.
- Portrait and save dialogs use the existing Radix dependency for keyboard focus containment and Escape; focus returns to the opening control.
- The real save/resume/delete browser journey passes. Its first cold development-server attempt exceeded a 5-second lazy-board-load assertion; the scoped wait now allows 15 seconds. No gameplay assertions were removed.
- Existing browser journeys advance through the new goals step; their game, economy, save, touch and online assertions are retained.

## Verification

| Check | Evidence |
|---|---|
| TypeScript | Both configured app and build checks pass, including new test files |
| Unit/component/network tests | 774 tests across 104 files pass |
| Setup state | Four new real-store component tests cover payload preservation, AI names, player limits/paging and custom targets |
| Entry browser checks | Six scenarios pass: 320×740, 390×844, 844×390, 1280×720, real save/resume/delete, and extra-large text/reduced motion |
| Browser layout assertions | No horizontal clipping, no nested scrolling in setup, button/input/select targets at least 44px, correct selected states and keyboard focus return |
| Production build | Passes |
| ESLint | Zero errors; 18 inherited warnings |
| Balance smoke | Three seeded production games finish; the reproducibility test passes |
| Audio integrity | 42 assets; zero silent, invalid or duplicate groups |
| Complete browser regression suite | Required before merge in the PR's reusable Agent validation check; retains existing gameplay, online, touch and keyboard journeys |

Local visual checks use Chromium 153 in an isolated test harness because the standard browser-download endpoint was unavailable. The project remains pinned to Playwright 1.61.1 and uses its bundled Chromium in CI. Local Google Fonts requests were unavailable, so the retained local screenshots show the configured serif fallback. CI also retains screenshots from the actual app. Physical-device FPS and audio output are not inferred from viewport tests.

## Runtime captures

These are screenshots of the implemented app, not design mockups. WebP copies only compress the PNG captures.

| Surface | Evidence |
|---|---|
| Title on phone | [390×844](qa/entry-menus/title-mobile.webp) |
| Title on desktop | [1280×720](qa/entry-menus/title-desktop.webp) |
| Game goals on phone | [Selected Adventure preset](qa/entry-menus/goals-mobile.webp) |
| Portrait selection | [Original artwork with larger controls](qa/entry-menus/portraits-mobile.webp) |

## Maintenance integration

#416 was merged with green checks. #418 integrates #379, #380, #381, #382, #383, #386 and #387, preserving their commit ancestry. Workflow conflicts retain always-on artifacts and the post-#417 dependency cleanup. Vite 8 #388 remains separate: SWC plugin 3.11 and Vitest 3.2 do not declare support for Vite 8.

Release status is recorded by the PR checks and deployment workflow. A successful GitHub Pages deployment alone does not establish that the separate `guild-life.com`/Lovable deployment is current; the live build and menu assets must be checked separately.
