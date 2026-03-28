# Freessenger

Simple WebSocket messenger with hash-based rooms.

## Features

- Create temporary chat rooms with 64-character hash codes
- No registration or login required
- Real-time messaging via WebSocket
- Participant count display
- Messages are not stored (only live transmission)
- 2000 character limit per message
- Built with Node.js backend and Svelte 5 frontend

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

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
- WebSocket server on ws://localhost:8080
- Svelte development server on http://localhost:5173

### Usage

1. Open http://localhost:3000 in your browser
2. Create a new room or join an existing one using a 64-character hash
3. Share the room hash with others to invite them to the chat
4. Messages are transmitted in real-time to all participants

### Production Build

```bash
npm run build
npm start
```

## Architecture

- **Backend**: Node.js with Express and WebSocket (ws)
- **Frontend**: Svelte 5 with Vite
- **Communication**: WebSocket for real-time messaging
- **Room Management**: Hash-based room identification
- **Storage**: No persistent storage (in-memory only)

## Room Hash Format

- 64-character hexadecimal string
- Generated using crypto.randomBytes(32).toString('hex')
- Example: `a1b2c3d4e5f6...` (64 characters total)

