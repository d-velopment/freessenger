class WebSocketManager {
  constructor() {
    this.ws = null;
    this.roomHash = null;
    this.callbacks = {};
    this.onConnectedCallbacks = [];
    this.clientId = Math.random().toString(36).substr(2, 9); // Generate unique ID for this client
  }

  onConnected(callback) {
    this.onConnectedCallbacks.push(callback);
    // If already connected, call immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      callback();
    }
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to WebSocket server');
      // Call all registered onConnected callbacks
      this.onConnectedCallbacks.forEach(callback => callback());
      
      if (this.roomHash) {
        this.joinRoom(this.roomHash);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.callbacks[data.type]) {
          this.callbacks[data.type](data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      setTimeout(() => this.connect(), 3000); // Reconnect after 3 seconds
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  joinRoom(roomHash) {
    this.roomHash = roomHash;
    this.send({ type: 'join', roomHash });
  }

  sendMessage(message) {
    this.send({ type: 'message', message });
  }

  createRoom() {
    this.send({ type: 'create_room' });
  }

  on(event, callback) {
    this.callbacks[event] = callback;
  }

  startTyping() {
    this.send({ type: 'typing_start' });
  }

  stopTyping() {
    this.send({ type: 'typing_stop' });
  }

  getStats() {
    this.send({ type: 'get_stats' });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsManager = new WebSocketManager();
