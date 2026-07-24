import type { ConnectionStatus } from '@/network/types';

export interface ConnectionIndicatorPresentation {
  label: string;
  icon: 'wifi' | 'loading' | 'offline';
  iconClass: string;
  latencyClass: string;
  showLatency: boolean;
}

function getConnectedClasses(latency: number) {
  if (latency > 200) {
    return { iconClass: 'text-red-500', latencyClass: 'text-red-600' };
  }
  if (latency > 100) {
    return { iconClass: 'text-yellow-500', latencyClass: 'text-yellow-600' };
  }
  return { iconClass: 'text-green-600', latencyClass: 'text-green-700' };
}

export function deriveConnectionIndicator(
  connectionStatus: ConnectionStatus,
  latency: number,
): ConnectionIndicatorPresentation {
  if (connectionStatus === 'connected') {
    const classes = getConnectedClasses(latency);
    return {
      label: 'Online',
      icon: 'wifi',
      ...classes,
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
