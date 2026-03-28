const WebSocket = require('ws');
const crypto = require('crypto');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from client directory
app.use(express.static(path.join(__dirname, 'client/dist')));

// WebSocket server
const wss = new WebSocket.Server({ port: 8080, host: '0.0.0.0' });

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

wss.on('connection', (ws) => {
  let currentRoom = null;
  const clientId = Math.random().toString(36).substr(2, 9); // Unique ID for this client

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
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

// Serve the main page for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`WebSocket server running on ws://0.0.0.0:8080`);
  console.log(`Access from other devices: http://YOUR_IP:${PORT}`);
});
