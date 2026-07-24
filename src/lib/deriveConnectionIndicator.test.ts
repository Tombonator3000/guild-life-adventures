import { describe, expect, it } from 'vitest';
import { deriveConnectionIndicator } from './deriveConnectionIndicator';

describe('deriveConnectionIndicator', () => {
  it('shows a healthy connected state with low latency', () => {
    expect(deriveConnectionIndicator('connected', 42)).toEqual({
      label: 'Online',
      icon: 'wifi',
      iconClass: 'text-green-600',
      latencyClass: 'text-green-700',
      showLatency: true,
    });
  });

  it('uses warning and error latency thresholds only while connected', () => {
    expect(deriveConnectionIndicator('connected', 150)).toMatchObject({
      iconClass: 'text-yellow-500',
      latencyClass: 'text-yellow-600',
      showLatency: true,
    });
    expect(deriveConnectionIndicator('connected', 250)).toMatchObject({
      iconClass: 'text-red-500',
      latencyClass: 'text-red-600',
      showLatency: true,
    });
  });

  it('hides latency when a connected peer has not reported it yet', () => {
    expect(deriveConnectionIndicator('connected', 0)).toMatchObject({
      label: 'Online',
      icon: 'wifi',
      showLatency: false,
    });
  });

  it('shows progress states instead of claiming the session is online', () => {
    expect(deriveConnectionIndicator('connecting', 0)).toMatchObject({
      label: 'Connecting',
      icon: 'loading',
      showLatency: false,
    });
    expect(deriveConnectionIndicator('reconnecting', 80)).toMatchObject({
      label: 'Reconnecting',
      icon: 'loading',
      showLatency: false,
    });
  });

  it('shows offline and error states with no stale latency', () => {
    expect(deriveConnectionIndicator('disconnected', 35)).toEqual({
      label: 'Offline',
      icon: 'offline',
      iconClass: 'text-red-600',
      latencyClass: 'text-red-600',
      showLatency: false,
    });
    expect(deriveConnectionIndicator('error', 35)).toMatchObject({
      label: 'Connection Error',
      icon: 'offline',
      showLatency: false,
    });
  });
});
