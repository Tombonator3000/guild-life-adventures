/** One monitor shared by every banner/options subscriber. Network failure never means update. */
export function readBuildMarker(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const value = record.buildTime ?? record.version;
  return typeof value === 'string' && value.trim() && value !== 'undefined' ? value : null;
}

export function createUpdateMonitor(currentBuild: string, versionUrl: string, onChange: () => void) {
  let available = false;
  let stopped = true;
  let inFlight: Promise<void> | null = null;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let legacyMarker: string | null = null;
  const markAvailable = () => { if (!available) { available = true; onChange(); } };
  const check = (): Promise<void> => {
    if (inFlight) return inFlight;
    const request = new AbortController();
    controller = request;
    const timeout = setTimeout(() => request.abort(), 5000);
    inFlight = (async () => {
      try {
        const response = await fetch(`${versionUrl}?_=${Date.now()}`, { cache: 'no-store', signal: request.signal });
        if (!response.ok || request.signal.aborted) return;
        const data = await response.json();
        const marker = readBuildMarker(data);
        if (!marker || request.signal.aborted) return;
        // Current deployments use the build timestamp in both fields. Old dev
        // markers have no relationship to the running bundle: baseline, then watch.
        if (data.buildTime || /^\d{4}-\d\d-\d\dT/.test(marker)) {
          if (marker !== currentBuild) markAvailable();
        } else {
          if (legacyMarker !== null && legacyMarker !== marker) markAvailable();
          legacyMarker = marker;
        }
      } catch { /* Offline, invalid JSON or timeout: retry on the next wake/poll. */ }
      finally { clearTimeout(timeout); inFlight = null; if (controller === request) controller = null; }
    })();
    return inFlight;
  };
  const wake = () => { if (!stopped && document.visibilityState !== 'hidden') void check(); };
  return {
    getSnapshot: () => available,
    markAvailable,
    check,
    start() {
      if (!stopped) return;
      stopped = false;
      void check();
      timer = setInterval(wake, 60_000);
      window.addEventListener('focus', wake);
      window.addEventListener('online', wake);
      document.addEventListener('visibilitychange', wake);
    },
    stop() {
      stopped = true;
      clearInterval(timer);
      controller?.abort();
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    },
  };
}
