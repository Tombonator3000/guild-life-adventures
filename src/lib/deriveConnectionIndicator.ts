import type { ConnectionStatus } from '@/network/types';

export interface ConnectionIndicatorPresentation {
  label: string;
  icon: 'wifi' | 'loading' | 'offline';
  iconClass: string;
  latencyClass: string;
  showLatency: boolean;
}

function getLatencyClass(latency: number) {
  if (latency > 200) return 'text-red-600';
  if (latency > 100) return 'text-yellow-600';
  return 'text-green-700';
}

export function deriveConnectionIndicator(
  connectionStatus: ConnectionStatus,
  latency: number,
): ConnectionIndicatorPresentation {
  if (connectionStatus === 'connected') {
    const latencyClass = getLatencyClass(latency);
    return {
      label: 'Online',
      icon: 'wifi',
      iconClass: latencyClass.replace('-600', '-500').replace('-700', '-600'),
      latencyClass,
      showLatency: latency > 0,
    };
  }

  if (connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
    return {
      label: connectionStatus === 'connecting' ? 'Connecting' : 'Reconnecting',
      icon: 'loading',
      iconClass: 'text-yellow-600',
      latencyClass: 'text-yellow-600',
      showLatency: false,
    };
  }

  return {
    label: connectionStatus === 'error' ? 'Connection Error' : 'Offline',
    icon: 'offline',
    iconClass: 'text-red-600',
    latencyClass: 'text-red-600',
    showLatency: false,
  };
}
