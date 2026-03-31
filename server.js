require('dotenv').config();
const WebSocket = require('ws');
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const http = require('http');
const os = require('os');
const app = express();

const PORT = process.env.PORT || 3000;
const MAX_WS_CONNECTIONS_PER_IP = 10;
const MAX_WS_MESSAGES_PER_SECOND = 5;

// --------------------------------------------------------------

// Rate limiting - store request timestamps per IP
const requestTimestamps = new Map();

// Rate limiting middleware (MAX_WS_MESSAGES_PER_SECOND requests per second per IP)
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!requestTimestamps.has(ip)) {
    requestTimestamps.set(ip, []);
  }
  
  const timestamps = requestTimestamps.get(ip);
  // Remove timestamps older than 1 second
  const recentTimestamps = timestamps.filter(t => now - t < 1000);
  
  if (recentTimestamps.length >= Math.max(MAX_WS_MESSAGES_PER_SECOND * 10, 20)) { // 20 is minimum for Svelte Kit
    console.log("[RateLimit] IP " + ip + " exceeded HTTP request rate limit", recentTimestamps.length);
    return res.status(429).json({ error: 'Too many requests' });
  }

  recentTimestamps.push(now);
  requestTimestamps.set(ip, recentTimestamps);
  next();
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, 'client/dist')));

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Cleanup old IP requests periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  requestTimestamps.forEach((timestamps, ip) => {
    const recentTimestamps = timestamps.filter(t => now - t < 1000);
    if (recentTimestamps.length === 0) {
      requestTimestamps.delete(ip);
    } else {
      requestTimestamps.set(ip, recentTimestamps);
    }
  });
}, 5 * 60 * 1000);

// WebSocket rate limiting
const wsConnections = new Map(); // IP -> count
const wsMessageTimestamps = new Map(); // clientId -> timestamps

// Store rooms and their participants
const rooms = new Map();

// Store typing users per room
const typingUsers = new Map(); // roomHash -> Set of clientIds

// Generate 64-character hash
function generateHash() {
  return crypto.randomBytes(32).toString('hex');
}

// Validate hash format (alphanumeric only)
function isValidHash(hash) {
  return /^[a-f0-9]{64}$/i.test(hash);
}

// Get room participant count
function getParticipantCount(roomHash) {
  const room = rooms.get(roomHash);
  return room ? room.size : 0;
}

// Get global statistics
function getStats() {
  let totalUsers = 0;
  rooms.forEach(room => {
    totalUsers += room.size;
  });
  return {
    onlineUsers: totalUsers,
    activeRooms: rooms.size
  };
}

// Broadcast stats to all connected clients
function broadcastStats() {
  const stats = getStats();
  console.log(`[Stats] Online: ${stats.onlineUsers}, Rooms: ${stats.activeRooms}`);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'stats',
        ...stats
      }));
    }
  });
}

wss.on('connection', (ws, req) => {
  let currentRoom = null;
  const clientId = Math.random().toString(36).substr(2, 9); // Unique ID for this client
  const clientIp = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

  // Send server clientId to client immediately
  ws.send(JSON.stringify({
    type: 'client_id',
    clientId: clientId
  }));

  // Check max connections per IP
  const connectionsFromIp = wsConnections.get(clientIp) || 0;
  if (connectionsFromIp >= MAX_WS_CONNECTIONS_PER_IP) {
    ws.close(1008, 'Too many connections from your IP');
    return;
  }
  wsConnections.set(clientIp, connectionsFromIp + 1);
  
  ws.on('message', (message) => {
    try {
      // Check message rate limit
      const now = Date.now();
      if (!wsMessageTimestamps.has(clientId)) {
        wsMessageTimestamps.set(clientId, []);
      }
      
      const timestamps = wsMessageTimestamps.get(clientId);
      const recentMessages = timestamps.filter(t => now - t < 1000);
      
      if (recentMessages.length >= MAX_WS_MESSAGES_PER_SECOND) {
        console.log(`[RateLimit] Client ${clientId} exceeded message rate limit`);
        ws.send(JSON.stringify({ type: 'rate_limit_exceeded' }));
        return;
      }
      
      recentMessages.push(now);
      wsMessageTimestamps.set(clientId, recentMessages);

      const data = JSON.parse(message);

      switch (data.type) {
        case 'get_stats':
          // Send current stats to requesting client
          ws.send(JSON.stringify({
            type: 'stats',
            ...getStats()
          }));
          break;

        case 'join':
          if (data.roomHash && isValidHash(data.roomHash)) {
            // Leave current room if any
            if (currentRoom) {
              const oldRoom = rooms.get(currentRoom);
              if (oldRoom) {
                oldRoom.delete(ws);
                if (oldRoom.size === 0) {
                  rooms.delete(currentRoom);
                } else {
                  // Notify others about participant count change
                  broadcastToRoom(currentRoom, {
                    type: 'participant_count',
                    count: oldRoom.size
                  }, ws);
                }
              }
            }

            // Join new room (automatically creates if doesn't exist)
            currentRoom = data.roomHash;
            if (!rooms.has(currentRoom)) {
              rooms.set(currentRoom, new Set());
            }
            rooms.get(currentRoom).add(ws);

            // Send current participant count to new user
            ws.send(JSON.stringify({
              type: 'participant_count',
              count: rooms.get(currentRoom).size
            }));

            // Notify others about new participant
            broadcastToRoom(currentRoom, {
              type: 'participant_count',
              count: rooms.get(currentRoom).size
            }, ws);

            // Broadcast connection message to others in the room
            broadcastToRoom(currentRoom, {
              type: 'message',
              message: 'connected',
              timestamp: Date.now(),
              clientId: clientId,
              isSystem: true
            }, ws);

            // Broadcast updated stats to all clients
            broadcastStats();
          }
          break;

        case 'message':
          if (currentRoom && data.message && typeof data.message === 'string') {
            // Limit message to 2000 characters
            const trimmedMessage = data.message.substring(0, 2000);

            // Broadcast message to all participants in the room except sender
            broadcastToRoom(currentRoom, {
              type: 'message',
              message: trimmedMessage,
              timestamp: Date.now(),
              clientId: clientId
            }, ws); // Exclude sender
          }
          break;

        case 'create_room':
          const newHash = generateHash();
          ws.send(JSON.stringify({
            type: 'room_created',
            roomHash: newHash
          }));
          break;

        case 'typing_start':
          if (currentRoom && clientId) {
            if (!typingUsers.has(currentRoom)) {
              typingUsers.set(currentRoom, new Set());
            }
            typingUsers.get(currentRoom).add(clientId);

            // Broadcast typing indicator to others
            broadcastToRoom(currentRoom, {
              type: 'user_typing',
              clientId: clientId,
              typing: true
            }, ws);
          }
          break;

        case 'typing_stop':
          if (currentRoom && clientId) {
            const roomTypingUsers = typingUsers.get(currentRoom);
            if (roomTypingUsers) {
              roomTypingUsers.delete(clientId);

              // Broadcast stop typing to others
              broadcastToRoom(currentRoom, {
                type: 'user_typing',
                clientId: clientId,
                typing: false
              }, ws);

              // Clean up empty typing sets
              if (roomTypingUsers.size === 0) {
                typingUsers.delete(currentRoom);
              }
            }
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    // Decrement connection count for this IP
    const connectionsFromIp = wsConnections.get(clientIp) || 1;
    if (connectionsFromIp <= 1) {
      wsConnections.delete(clientIp);
    } else {
      wsConnections.set(clientIp, connectionsFromIp - 1);
    }
    
    // Clean up message timestamps
    wsMessageTimestamps.delete(clientId);
    console.log(`[WS] Disconnected from ${clientIp}`);

    // Remove from current room
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          rooms.delete(currentRoom);
        } else {
          // Notify others about participant count change
          broadcastToRoom(currentRoom, {
            type: 'participant_count',
            count: room.size
          });

          // Broadcast disconnection message to others in the room
          broadcastToRoom(currentRoom, {
            type: 'message',
            message: 'disconnected',
            timestamp: Date.now(),
            clientId: clientId,
            isSystem: true
          });
        }
      }

      // Remove from typing users
      const roomTypingUsers = typingUsers.get(currentRoom);
      if (roomTypingUsers && clientId) {
        roomTypingUsers.delete(clientId);

        // Notify others that this user stopped typing
        broadcastToRoom(currentRoom, {
          type: 'user_typing',
          clientId: clientId,
          typing: false
        });

        // Clean up empty typing sets
        if (roomTypingUsers.size === 0) {
          typingUsers.delete(currentRoom);
        }
      }
    }

    // Broadcast updated stats to all clients
    broadcastStats();
  });
});

function broadcastToRoom(roomHash, data, excludeWs = null) {
  const room = rooms.get(roomHash);
  if (room) {
    const message = JSON.stringify(data);
    room.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// Cleanup WebSocket message timestamps periodically (every minute)
setInterval(() => {
  const now = Date.now();
  wsMessageTimestamps.forEach((timestamps, clientId) => {
    const recentTimestamps = timestamps.filter(t => now - t < 1000);
    if (recentTimestamps.length === 0) {
      wsMessageTimestamps.delete(clientId);
    } else {
      wsMessageTimestamps.set(clientId, recentTimestamps);
    }
  });
}, 60 * 1000);

// Serve the main page for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Get local IP address for network access
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  if (process.env.NODE_ENV === 'production') {
    // Production - just show it's listening
    console.log(`\nServer running on port ${PORT}`);
    console.log(`WebSocket server running on same port\n`);
  } else {
    // Development - show local IP
    const localIP = getLocalIP();
    console.log(`\nServer running on http://${localIP}:${PORT}`);
    console.log(`WebSocket server running on same port\n`);
  }
});

