require('dotenv').config();
const WebSocket = require('ws');
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const app = express();

const PORT = process.env.PORT || 3000;
const MAX_WS_CONNECTIONS_PER_IP = 10;
const MAX_WS_MESSAGES_PER_SECOND = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const FILE_CLEANUP_TIME = 60 * 1000; // 60 секунд

// Создаем папку для загрузок
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Хранилище загруженных файлов с таймерами
const uploadedFiles = new Map(); // filename -> { path, cleanupTimer }

// Multer конфигурация для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Максимум 1 файл за раз
  },
  fileFilter: (req, file, cb) => {
    // Разрешаем только изображения и видео
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
    }
  }
});

// Функция для удаления файла через указанное время
function scheduleFileDeletion(filename, filePath) {
  const cleanupTimer = setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FileCleanup] Deleted file: ${filename}`);
      }
      uploadedFiles.delete(filename);
    } catch (error) {
      console.error(`[FileCleanup] Error deleting file ${filename}:`, error);
    }
  }, FILE_CLEANUP_TIME);
  
  return cleanupTimer;
}

// Функция для немедленного удаления файла
function deleteFile(filename) {
  const fileInfo = uploadedFiles.get(filename);
  if (fileInfo) {
    // Отменяем таймер автоудаления
    if (fileInfo.cleanupTimer) {
      clearTimeout(fileInfo.cleanupTimer);
    }
    
    // Удаляем файл
    try {
      if (fs.existsSync(fileInfo.path)) {
        fs.unlinkSync(fileInfo.path);
        console.log(`[FileCleanup] Manually deleted file: ${filename}`);
      }
    } catch (error) {
      console.error(`[FileCleanup] Error manually deleting file ${filename}:`, error);
    }
    
    uploadedFiles.delete(filename);
  }
}

// --------------------------------------------------------------

// Security functions
function isOriginAllowed(origin) {
  const allowedOrigins = [
    'http://localhost:3000',
    'https://freessenger.com',
    'https://www.freessenger.com',
  ];
  
  // Дополнительно: проверяем host header для CloudFlare
  if (!origin || origin === 'unknown') {
    return true; // Разрешаем все без origin (CloudFlare может не отправлять origin)
  }
  
  return allowedOrigins.includes(origin);
}

// Sanitize message content to prevent XSS attacks
function sanitizeMessage(message) {
  if (typeof message !== 'string') return '';
  
  return message
    // Remove HTML tags
    .replace(/<script\b[^<]*(?:(?!<\/script>))*[^>]*>/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    // Remove potentially dangerous attributes
    .replace(/on\w+\s*=/gi, '')
    // Convert to plain text
    .trim()
    .substring(0, 2000); // Limit length
}

// --------------------------------------------------------------

// Rate limiting - store request timestamps per IP
const requestTimestamps = new Map();

// Security: Check origin for all HTTP requests (after static files)
app.use((req, res, next) => {
  // Skip origin check for static resources, uploads, health checks and OPTIONS requests
  const isStaticResource = req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm|ogg|mov|heic|heif)$/i);
  const isUploadsPath = req.path.startsWith('/uploads/');
  if (req.method === 'OPTIONS' || req.path === '/health' || isStaticResource || isUploadsPath) {
    console.log(`[DEBUG] Skipping origin check for: ${req.path}`);
    return next();
  }
  
  const origin = req.headers.origin || req.headers.referer || 'unknown';
  
  // Allow all localhost/127.0.0.1 access without origin check
  if (!origin || origin === 'unknown') {
    console.log(`[DEBUG] Allowing no-origin request from: ${req.headers.host}`);
    return next();
  }
  
  if (!isOriginAllowed(origin)) {
    console.log(`[Security] Blocked HTTP request from unauthorized origin: ${origin}, path: ${req.path}, host: ${req.headers.host}`);
    return res.status(403).json({ error: 'Unauthorized origin' });
  }
  
  console.log(`[DEBUG] Origin allowed: ${origin}`);
  next();
});

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

// Serve static files from client directory FIRST (before origin check)
app.use(express.static(path.join(__dirname, 'client/dist'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '1m', // Короткое время кеширования для загруженных файлов
  etag: true,
  lastModified: true
}));

// Handle root path - serve index.html
app.get('/', (req, res) => {
  console.log(`[DEBUG] Serving index.html for: ${req.headers.host}`);
  console.log(`[DEBUG] Request headers:`, req.headers);
  
  res.on('finish', () => {
    console.log(`[DEBUG] Response sent successfully for: ${req.headers.host}`);
  });
  
  res.on('error', (error) => {
    console.log(`[DEBUG] Response error for: ${req.headers.host}`, error);
  });
  
  res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
});

// File upload route
app.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Проверяем что файл действительно сохранен и имеет размер
    const fs = require('fs');
    const stats = fs.statSync(req.file.path);
    console.log(`[FileUpload] Saved file stats: ${req.file.filename}, size: ${stats.size} bytes, mimetype: ${req.file.mimetype}`);
    
    if (stats.size === 0) {
      console.error(`[FileUpload] ERROR: File saved with 0 bytes: ${req.file.filename}`);
      return res.status(500).json({ error: 'File upload failed - 0 bytes saved' });
    }
    
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: stats.size, // Используем реальный размер с диска
      mimetype: req.file.mimetype,
      path: req.file.path,
      url: `/uploads/${req.file.filename}`,
      uploadTime: Date.now(),
      willBeDeletedAt: Date.now() + FILE_CLEANUP_TIME
    };
    
    // Запланируем автоудаление файла
    const cleanupTimer = scheduleFileDeletion(req.file.filename, req.file.path);
    
    // Сохраним информацию о файле
    uploadedFiles.set(req.file.filename, {
      path: req.file.path,
      cleanupTimer: cleanupTimer,
      info: fileInfo
    });
    
    console.log(`[FileUpload] Uploaded: ${req.file.originalname} (${req.file.size} bytes)`);
    
    res.json({
      success: true,
      file: fileInfo
    });
    
  } catch (error) {
    console.error('[FileUpload] Error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Manual file deletion route
app.delete('/upload/:filename', (req, res) => {
  const filename = req.params.filename;
  deleteFile(filename);
  
  res.json({
    success: true,
    message: 'File deleted successfully'
  });
});

// Get file info route
app.get('/upload/:filename/info', (req, res) => {
  const filename = req.params.filename;
  const fileInfo = uploadedFiles.get(filename);
  
  if (!fileInfo) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.json({
    success: true,
    file: fileInfo.info
  });
});

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
      console.log(`[WebSocket] Received raw message from ${clientId}:`, message.toString());
      
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
      console.log(`[WebSocket] Parsed message from ${clientId}:`, data);

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
            // Sanitize message to prevent XSS attacks
            const sanitizedMessage = sanitizeMessage(data.message);
            
            // Log for debugging
            if (sanitizedMessage !== data.message) {
              console.log(`[Security] Message sanitized for client ${clientId}: "${data.message}" -> "${sanitizedMessage}"`);
            }
            
            // Broadcast sanitized message to all participants in room except sender
            broadcastToRoom(currentRoom, {
              type: 'message',
              message: sanitizedMessage,
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
    let sentCount = 0;
    console.log(`[Broadcast] Room ${roomHash} has ${room.size} clients, sending:`, data);
    room.forEach(client => {
      if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
        client.send(message);
        sentCount++;
        console.log(`[Broadcast] Sent message to client (readyState: ${client.readyState})`);
      } else if (client === excludeWs) {
        console.log(`[Broadcast] Skipped sender (excludeWs)`);
      } else {
        console.log(`[Broadcast] Skipped client (readyState: ${client.readyState})`);
      }
    });
    console.log(`[Broadcast] Sent to ${sentCount} clients`);
  } else {
    console.log(`[Broadcast] Room ${roomHash} not found!`);
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

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('[ERROR] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[ERROR] Unhandled Rejection:', reason);
});

// Express error handling
app.use((error, req, res, next) => {
  console.error('[ERROR] Express Error:', error);
  console.error('[ERROR] Request URL:', req.url);
  console.error('[ERROR] Request headers:', req.headers);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : error.message
    });
  }
});

// Multer error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ error: 'Too many files. Maximum is 1 file.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({ error: error.message });
  }
  
  next(error);
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

// SSL certificates for HTTPS/WSS (let's encrypt via certbot)
let sslOptions = null;
const USE_SSL = true; // Включаем SSL для работы через CloudFlare

if (process.env.NODE_ENV === 'production' && USE_SSL) {
  try {
    const now = new Date();
    const timestamp = now.toISOString();
    const localTime = now.toLocaleString();
    
    sslOptions = {
      key: fs.readFileSync('/etc/letsencrypt/live/freessenger.com/privkey.pem'),
      cert: fs.readFileSync('/etc/letsencrypt/live/freessenger.com/fullchain.pem')
    };
    
    console.log('\n' + '='.repeat(50));
    console.log(`🔐 SSL CERTIFICATES LOADED`);
    console.log(`📅 Date: ${localTime}`);
    console.log(`⏰ Time: ${timestamp}`);
    console.log(`📁 Key: /etc/letsencrypt/live/freessenger.com/privkey.pem`);
    console.log(`📄 Cert: /etc/letsencrypt/live/freessenger.com/fullchain.pem`);
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.log(`❌ SSL CERTIFICATES NOT FOUND`);
    console.log(`📅 Date: ${new Date().toLocaleString()}`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log(`🔍 Error: ${error.message}`);
    console.log(`💡 Run: certbot --nginx -d freessenger.com -d www.freessenger.com`);
    console.log(`🔄 Falling back to HTTP mode`);
    console.log('='.repeat(50) + '\n');
    sslOptions = null;
  }
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
