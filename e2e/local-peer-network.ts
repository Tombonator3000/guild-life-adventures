import type { Page, Route } from '@playwright/test';

function localPeerModule(channelName: string): string {
  return `
const CHANNEL_NAME = ${JSON.stringify(channelName)};
const localPeers = new Set();

class Emitter {
  constructor() {
    this.handlers = new Map();
  }

  on(event, handler) {
    const handlers = this.handlers.get(event) ?? new Set();
    handlers.add(handler);
    this.handlers.set(event, handlers);
    return this;
  }

  off(event, handler) {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event, ...args) {
    for (const handler of [...(this.handlers.get(event) ?? [])]) {
      handler(...args);
    }
  }
}

class LocalDataConnection extends Emitter {
  constructor(owner, peerId, connectionId) {
    super();
    this.owner = owner;
    this.peer = peerId;
    this.connectionId = connectionId;
    this.open = false;
    this.closed = false;
  }

  send(data) {
    if (!this.open || this.closed) throw new Error('Connection is not open');
    this.owner.post({
      kind: 'data',
      from: this.owner.id,
      to: this.peer,
      connectionId: this.connectionId,
      data,
    });
  }

  close() {
    this.owner.closeConnection(this.connectionId, true);
  }

  markOpen() {
    if (this.open || this.closed) return;
    this.open = true;
    this.emit('open');
  }

  receive(data) {
    if (!this.closed) this.emit('data', data);
  }

  remoteClose() {
    if (this.closed) return;
    this.closed = true;
    this.open = false;
    this.emit('close');
  }
}

class LocalPeer extends Emitter {
  constructor(idOrOptions) {
    super();
    this.id = typeof idOrOptions === 'string'
      ? idOrOptions
      : 'e2e-guest-' + crypto.randomUUID();
    this.disconnected = false;
    this.destroyed = false;
    this.connections = new Map();
    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = event => this.handleMessage(event.data);
    this.onPageHide = () => this.destroy();
    window.addEventListener('pagehide', this.onPageHide, { once: true });
    localPeers.add(this);
    setTimeout(() => {
      if (!this.destroyed) this.emit('open', this.id);
    }, 0);
  }

  connect(peerId) {
    const connectionId = this.id + ':' + peerId + ':' + crypto.randomUUID();
    const connection = new LocalDataConnection(this, peerId, connectionId);
    this.connections.set(connectionId, connection);
    this.post({ kind: 'connect-request', from: this.id, to: peerId, connectionId });
    return connection;
  }

  post(message) {
    if (!this.destroyed) this.channel.postMessage(message);
  }

  handleMessage(message) {
    if (!message || message.to !== this.id || this.destroyed) return;

    if (message.kind === 'connect-request') {
      const connection = new LocalDataConnection(this, message.from, message.connectionId);
      this.connections.set(message.connectionId, connection);
      this.emit('connection', connection);
      setTimeout(() => {
        if (connection.closed || this.destroyed) return;
        connection.markOpen();
        this.post({
          kind: 'connect-accept',
          from: this.id,
          to: message.from,
          connectionId: message.connectionId,
        });
      }, 0);
      return;
    }

    const connection = this.connections.get(message.connectionId);
    if (!connection) return;

    if (message.kind === 'connect-accept') {
      connection.markOpen();
    } else if (message.kind === 'data') {
      connection.receive(message.data);
    } else if (message.kind === 'close') {
      this.connections.delete(message.connectionId);
      connection.remoteClose();
    }
  }

  closeConnection(connectionId, notifyRemote) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.closed) return;
    this.connections.delete(connectionId);
    connection.closed = true;
    connection.open = false;
    if (notifyRemote) {
      this.post({
        kind: 'close',
        from: this.id,
        to: connection.peer,
        connectionId,
      });
    }
    connection.emit('close');
  }

  dropConnections() {
    for (const connectionId of [...this.connections.keys()]) {
      this.closeConnection(connectionId, true);
    }
  }

  reconnect() {
    if (this.destroyed) return;
    this.disconnected = false;
    setTimeout(() => this.emit('open', this.id), 0);
  }

  disconnect() {
    if (this.destroyed) return;
    this.disconnected = true;
    this.emit('disconnected');
  }

  destroy() {
    if (this.destroyed) return;
    this.dropConnections();
    this.destroyed = true;
    localPeers.delete(this);
    window.removeEventListener('pagehide', this.onPageHide);
    this.channel.close();
    this.emit('close');
  }
}

globalThis.__guildE2EPeerControl = {
  dropConnections() {
    for (const peer of localPeers) peer.dropConnections();
  },
  peerIds() {
    return [...localPeers].map(peer => peer.id);
  },
};

export default LocalPeer;
`;
}

export async function installLocalPeerNetwork(page: Page, channelName: string) {
  const moduleBody = localPeerModule(channelName);
  const fulfillPeerModule = async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: moduleBody,
    });
  };

  await page.route(/\/node_modules\/\.vite\/deps\/peerjs\.js(?:\?.*)?$/, fulfillPeerModule);
}
