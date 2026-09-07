# Window, Cave and update pass

Base: d5a71f9 (merged PR407). Owner scope: keep city, frame and original caricatures.

Acceptance: services wrap; long location content uses explicit pages without internal scrolling or lost actions; Cave encounter/result/retreat are legible; Blood Moon and spring rules agree; a deployed marker change offers a controlled update.

Implementation: CSS column fragmentation keeps one live component tree while Previous/Next turns pages. Keyboard focus reveals its page. Cave planning separates exploration, equipment and records; existing woodcut artwork gains restrained light/motion governed by the environment setting. No new save fields. Blood Moon filters the encounter pool; old saved springs show a blocked state.

Update investigation: GitHub Pages run 34101881407 successfully published merged PR407. Existing SW has no asset precache and can remain byte-identical across releases; version polling is the primary signal. Old hook only recognized buildTime, duplicated registration timers, did not check on wake/reconnect; main.tsx separately awaited an unbounded root-path request and reloaded from localStorage history. One shared monitor now owns bounded requests, focus/reconnect/polling and both marker fields. Startup mounts directly. Production emits version and buildTime from the same timestamp. Update Now saves the current game before existing guarded cache refresh. The live custom domain could not be read from this environment; a GitHub push alone does not prove Lovable/custom-domain publication.

Verification: pending runtime CI and visual review. Unit tests cover marker formats, wake, single polling, teardown, network recovery and Blood Moon across floors. Browser journeys cover market sizes, saved-adventurer Cave entry/resolution/retreat and update notification/reload. Physical-device performance remains unmeasured.
