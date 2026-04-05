# Freessenger

Simple WebSocket messenger with hash-based rooms and complete privacy protection.

## Overview

Freessenger is a private, anonymous chat application that allows users to create temporary chat rooms with unique hash codes. All messages are ephemeral and not stored on the server, ensuring complete privacy and anonymity.

Live implementation: https://freessenger.com

## Features

- Create temporary chat rooms with 64-character hash codes
- No registration or login required - complete anonymity
- Real-time messaging via WebSocket with Cloudflare protection
- Participant count display
- Messages are not stored (ephemeral - disappear when room is empty)
- 2000 character limit per message
- File sharing up to 10MB with 60-second auto-deletion
- Animal name avatars for anonymous identity
- Light/Dark theme support
- Mobile-optimized responsive design
- Full UTF-8 support for international filenames

## Architecture

- **Backend**: Node.js + Express + WebSocket
- **Frontend**: Svelte 5
- **Deployment**: Cloudflare (proxied) + Nginx
- **File Storage**: Temporary with automatic cleanup

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm
- Nginx (for production)

### Local Development

1. Install dependencies:
```bash
npm install
cd client && npm install
```

2. Start development servers:
```bash
npm run dev
```

This will start:
- Express server on http://localhost:3000
- WebSocket server integrated with Express
- Svelte development server on http://localhost:5173

## Production Deployment

### 1. Server Setup

1. Install Node.js:
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Clone and build:
```bash
git clone <your-repo>
cd freessenger
npm install
cd client && npm install && npm run build
```

3. Create systemd service:
```bash
sudo nano /etc/systemd/system/freessenger.service
```

Service file content:
```ini
[Unit]
Description=Freessenger WebSocket Chat
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/freessenger
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

4. Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable freessenger
sudo systemctl start freessenger
```

### 2. Nginx Configuration

Configure Nginx to proxy requests to your Node.js application. The configuration should be added to the existing `/etc/nginx/sites-available/default` file.

Key settings needed:
- Proxy requests from port 80/443 to localhost:3000
- Enable WebSocket support with Upgrade headers
- Serve static files from /uploads/ directory
- Set proper headers for proxy forwarding

After configuration, test and reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Cloudflare Configuration

1. **DNS Settings**:
   - Set freessenger.com to point to your server IP
   - Use **Full SSL** mode for complete encryption

2. **Network Settings**:
   - Enable WebSocket proxying
   - Enable WebSocket Connection Reuse
   - Set SSL/TLS to **Full (strict)**

3. **Proxy Status**:
   - Use **Proxied (orange cloud)** for DDoS protection
   - This works with modern Cloudflare WebSocket support

## Security Features

- **Rate Limiting**: 5 messages per second per IP
- **Connection Limits**: 10 WebSocket connections per IP
- **File Size Limits**: 10MB maximum upload size
- **XSS Protection**: Message sanitization
- **No Data Storage**: Messages exist only in memory
- **Anonymous Identity**: Random animal names generated per session
- **Temporary Files**: Auto-deletion after 60 seconds
- **UTF-8 Support**: Proper encoding for international filenames

## File Upload System

- **Supported Formats**: All file types accepted
- **Size Limit**: 10MB per file
- **Storage**: Temporary with unique hash-based filenames
- **Auto-cleanup**: Files deleted after 60 seconds
- **Progress Display**: Real-time upload progress with percentage
- **Original Names**: UTF-8 encoded to preserve international characters

## WebSocket Protocol

```javascript
// Room creation
{
  type: 'create_room',
  response: { type: 'room_created', roomHash: 'abc123...' }
}

// Join room
{
  type: 'join',
  roomHash: 'abc123...'
}

// Send message
{
  type: 'message',
  message: 'Hello world!'
}

// File sharing
{
  type: 'file',
  fileUrl: '/uploads/hash123.ext',
  fileName: 'document.pdf',
  fileSize: 1024000,
  fileType: 'application/pdf'
}

// Typing indicators
{
  type: 'typing_start' | 'typing_stop'
}
```

## Environment Variables

```bash
PORT=3000                    # Server port
NODE_ENV=production         # Environment mode
```

## Monitoring

Check application status:
```bash
sudo systemctl status freessenger
sudo journalctl -u freessenger -f
```

## Performance Optimization

- **CDN**: Cloudflare for static assets
- **Compression**: Gzip enabled via Nginx
- **Caching**: Browser caching for static files
- **WebSocket**: Keep-alive connections
- **Build**: Optimized single-bundle output

## Troubleshooting

### Common Issues

1. **WebSocket not connecting**:
   - Check Cloudflare proxy settings
   - Verify Nginx WebSocket configuration
   - Ensure SSL certificate is valid

2. **File upload failures**:
   - Check upload directory permissions
   - Verify 10MB size limit
   - Check available disk space

3. **High memory usage**:
   - Restart service: sudo systemctl restart freessenger
   - Monitor logs: sudo journalctl -u freessenger -f

### Debug Mode

Enable debug logging by editing the service file:
```bash
sudo systemctl edit freessenger
```

Add:
```ini
[Service]
Environment=DEBUG=freessenger:*
```

Then restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart freessenger
```

## License

MIT License - feel free to use and modify.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Privacy First**: No tracking, no storage, no registration required. Your conversations remain completely private.
