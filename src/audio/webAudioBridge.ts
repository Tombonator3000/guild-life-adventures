// webAudioBridge — Shared Web Audio API bridge for iOS volume control.
// iOS Safari ignores HTMLAudioElement.volume. By routing audio through
// Web Audio API GainNodes, we get programmatic volume control on all platforms.
// Desktop browsers: element.volume is set to 1, GainNode controls actual volume.
// iOS/iPadOS: element.volume is read-only (ignored), GainNode provides the only control.

let ctx: AudioContext | null = null;
let resumeRegistered = false;

/** Create or get the shared AudioContext. */
function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }

  // Register one-shot user-interaction listeners to resume suspended context (iOS policy)
  if (!resumeRegistered) {
    resumeRegistered = true;
    const resume = () => {
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    for (const event of ['click', 'touchstart', 'keydown', 'pointerdown'] as const) {
      document.addEventListener(event, resume, { capture: true });
    }
  }

  return ctx;
}

/**
 * Connect an HTMLAudioElement to the Web Audio graph.
 * Returns a GainNode for volume control.
 * IMPORTANT: Can only be called ONCE per element (browser restriction).
 * After connection, element.volume is bypassed — use the returned GainNode instead.
 */
export function connectElement(element: HTMLAudioElement): GainNode {
  const audioCtx = getContext();
  const source = audioCtx.createMediaElementSource(element);
  const gain = audioCtx.createGain();
  source.connect(gain);
  gain.connect(audioCtx.destination);
  // Set element volume to max — GainNode handles actual volume
  element.volume = 1;
  return gain;
}

/**
 * Resume the AudioContext if suspended (call on user interaction).
 */
export function resumeAudioContext() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
