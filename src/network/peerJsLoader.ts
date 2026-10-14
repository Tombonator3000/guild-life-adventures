import type Peer from 'peerjs';

type PeerConstructor = typeof Peer;
let pending: Promise<PeerConstructor> | null = null;

/**
 * PeerJS (with its WebRTC adapter, about a seventh of the startup bundle) loads on the
 * first online action instead of at game start. A failed load can be retried.
 */
export function loadPeerJs(): Promise<PeerConstructor> {
  pending ??= import('peerjs')
    .then(module => module.default)
    .catch(error => {
      pending = null;
      throw error;
    });
  return pending;
}
