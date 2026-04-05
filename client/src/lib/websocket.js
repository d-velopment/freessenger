class WebSocketManager {
  constructor() {
    this.ws = null;
    this.roomHash = null;
    this.callbacks = {};
    this.onConnectedCallbacks = [];
    this.clientId = null; // Will be set by server
    this.keepAliveInterval = null; // Interval for keepAlive pings
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

    // Determine WebSocket protocol based on current page protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Connecting to WebSocket at: ${wsUrl}`);
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to WebSocket server');
      // Call all registered onConnected callbacks
      this.onConnectedCallbacks.forEach(callback => callback());
      
      if (this.roomHash) {
        this.joinRoom(this.roomHash);
        
        // Start keepAlive ping every 30 seconds
        this.keepAliveInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ type: 'keepAlive' });
            console.log('Sent keepAlive ping');
          }
        }, 30000);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'client_id') {
          this.clientId = data.clientId;
          if (this.callbacks[data.type]) {
            this.callbacks[data.type](data);
          }
        } else if (this.callbacks[data.type]) {
          this.callbacks[data.type](data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from WebSocket server');
      
      // Clear keepAlive interval
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
      
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
