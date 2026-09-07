import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUpdateMonitor, readBuildMarker } from '@/hooks/appUpdateMonitor';

const build = '2026-09-07T10:00:00.000Z';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('deployed update detection', () => {
  it('rejects missing/invalid markers and supports both deployed formats', () => {
    for (const value of [null, {}, '<html>', {version:'undefined'}, {buildTime:42}]) expect(readBuildMarker(value)).toBeNull();
    expect(readBuildMarker({version:build})).toBe(build);
    expect(readBuildMarker({buildTime:build})).toBe(build);
  });
  it('detects a new deployment on wake, shares one poll, and cleans up', async () => {
    vi.useFakeTimers();
    let marker = build;
    const fetcher = vi.fn(async () => ({ok:true,json:async () => ({version:marker})}));
    vi.stubGlobal('fetch',fetcher);
    const notify = vi.fn();
    const monitor = createUpdateMonitor(build,'/guild-life-adventures/version.json',notify);
    monitor.start(); monitor.start(); await monitor.check();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(monitor.getSnapshot()).toBe(false);
    marker='2026-09-07T11:00:00.000Z';
    window.dispatchEvent(new Event('focus')); await monitor.check();
    expect(monitor.getSnapshot()).toBe(true);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toMatch(/^\/guild-life-adventures\/version.json\?/);
    monitor.stop(); const calls=fetcher.mock.calls.length;
    window.dispatchEvent(new Event('online')); await vi.advanceTimersByTimeAsync(120000);
    expect(fetcher).toHaveBeenCalledTimes(calls);
  });
  it('does not notify for failed requests or invalid deployment JSON, then recovers', async () => {
    const fetcher=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ok:true,json:async()=>({})}).mockResolvedValueOnce({ok:true,json:async()=>({buildTime:'2026-09-08T00:00:00.000Z'})});
    vi.stubGlobal('fetch',fetcher);
    const monitor=createUpdateMonitor(build,'/version.json',vi.fn());
    await monitor.check(); await monitor.check(); expect(monitor.getSnapshot()).toBe(false);
    await monitor.check(); expect(monitor.getSnapshot()).toBe(true);
  });
});
