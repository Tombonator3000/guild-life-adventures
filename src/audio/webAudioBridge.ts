// webAudioBridge — Shared Web Audio API bridge for iOS volume control.
// iOS Safari ignores HTMLAudioElement.volume. By routing audio through
// Web Audio API GainNodes, we get programmatic volume control on all platforms.
// Desktop browsers: element.volume is set to 1, GainNode controls actual volume.
// iOS/iPadOS: element.volume is read-only (ignored), GainNode provides the only control.
//
// IMPORTANT: All functions are safe to call even if AudioContext is unavailable.
// If Web Audio fails, audio managers fall back to HTMLAudioElement.volume.

let ctx: AudioContext | null = null;
let resumeRegistered = false;
let audioContextFailed = false;

/** Create or get the shared AudioContext. Returns null if unavailable. */
function getContext(): AudioContext | null {
  if (audioContextFailed) return null;
  if (ctx) return ctx;

  try {
    ctx = new AudioContext();
  } catch {
    console.warn('[WebAudio] AudioContext unavailable — falling back to element.volume');
    audioContextFailed = true;
    return null;
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
 * Returns a GainNode for volume control, or null if AudioContext is unavailable.
 * When null is returned, callers should fall back to element.volume.
 * IMPORTANT: Can only be called ONCE per element (browser restriction).
 */
export function connectElement(element: HTMLAudioElement): GainNode | null {
  const audioCtx = getContext();
  if (!audioCtx) return null;

  try {
    const source = audioCtx.createMediaElementSource(element);
    const gain = audioCtx.createGain();
    source.connect(gain);
    gain.connect(audioCtx.destination);
    // Set element volume to max — GainNode handles actual volume
    element.volume = 1;
    return gain;
  } catch {
    console.warn('[WebAudio] Failed to connect element — falling back to element.volume');
    return null;
  }
}

/**
 * Resume the AudioContext if suspended (call on user interaction).
 */
export function resumeAudioContext() {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}
