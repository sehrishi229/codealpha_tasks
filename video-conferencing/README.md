# CollabMeet - Real-time Video Conferencing

A full-stack real-time video conferencing web application built with WebRTC, Socket.IO, and JWT authentication.

## Features

- **Authentication**: bcrypt password hashing, JWT tokens, HTTP-only cookies
- **Meetings**: Unique meeting codes, optional passwords, participant limits
- **WebRTC Video/Audio**: P2P media streams with STUN/TURN support
- **Screen Sharing**: Real-time screen capture and sharing
- **Chat**: Real-time text messaging with message history
- **File Sharing**: Secure upload with MIME type validation
- **Whiteboard**: Collaborative canvas with draw/erase/clear
- **Responsive UI**: Dark-themed interface with mobile support

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: SQLite (WAL mode)
- **Real-time**: Socket.IO for signaling, WebRTC for P2P media
- **Auth**: bcryptjs (12 rounds), jsonwebtoken
- **Security**: Helmet, express-rate-limit, express-validator, express-fileupload

## Quick Start

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
cd video-conferencing
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and adjust values as needed:

```bash
cp .env.example .env
```

### Database Initialization

```bash
npm run init-db
```

This creates the SQLite database and seeds it with 5 demo users:

| Email | Password |
|-------|----------|
| admin@collabmeet.com | admin1234 |
| alice@collabmeet.com | alice1234 |
| bob@collabmeet.com | bob1234 |
| charlie@collabmeet.com | charlie1234 |
| diana@collabmeet.com | diana1234 |

### Running the Application

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

Visit `http://localhost:4300` in your browser.

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepass123",
  "display_name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": { "id": 1, "uuid": "...", "username": "john_doe", "email": "john@example.com", "display_name": "John Doe" }
}
```

#### POST /api/auth/login

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "admin@collabmeet.com",
  "password": "admin1234"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "uuid": "...", "username": "admin", "email": "...", "display_name": "Admin User" }
}
```

#### POST /api/auth/logout

Clears the session token.

#### GET /api/auth/me

Returns the authenticated user's information (requires JWT).

### Meeting Endpoints

#### POST /api/meetings

Create a new meeting (requires auth).

**Request Body:**
```json
{
  "title": "Team Sync",
  "description": "Weekly team meeting",
  "has_password": true,
  "password": "secret123",
  "max_participants": 50
}
```

#### GET /api/meetings

List meetings. Returns user's meetings if authenticated, otherwise all active public meetings.

#### GET /api/meetings/:id

Get meeting details by UUID or meeting code.

#### POST /api/meetings/join

Join a meeting by code. Validates password if the meeting is protected.

**Request Body:**
```json
{
  "meeting_code": "ABC123",
  "password": "secret123"
}
```

#### GET /api/meetings/:id/participants

Get active participants in a meeting.

#### GET /api/meetings/:id/messages

Get chat message history for a meeting.

#### GET /api/meetings/:id/files

Get files shared in a meeting.

#### DELETE /api/meetings/:id

Delete a meeting (host only).

### File Endpoints

#### POST /api/files/upload/:id

Upload a file to a meeting. Supports images, PDFs, documents, and archives up to 10MB.

#### GET /api/files/:id/:filename

Download a shared file.

## Socket.IO Events

The server uses Socket.IO for real-time communication. Authentication is done via JWT token in the connection handshake.

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `meeting:join` | `{ meeting_uuid }` | Join a meeting room |
| `meeting:leave` | - | Leave the current meeting |
| `webrtc:offer` | `{ offer, to }` | WebRTC offer for P2P connection |
| `webrtc:answer` | `{ answer, to }` | WebRTC answer |
| `webrtc:ice-candidate` | `{ candidate, to }` | ICE candidate exchange |
| `chat:message` | `{ message, message_type }` | Send a chat message |
| `chat:history` | `{ meeting_uuid }` | Request chat history |
| `file:share` | `{ file_id, filename, file_size, mime_type }` | Announce a file share |
| `whiteboard:draw` | `{ x, y, lastX, lastY, color, lineWidth, userId }` | Whiteboard draw data |
| `whiteboard:erase` | - | Erase whiteboard |
| `whiteboard:clear` | - | Clear the whiteboard |
| `media:toggle` | `{ is_muted, is_video_on }` | Toggle media settings |
| `screen:share-start` | - | Start screen sharing |
| `screen:share-stop` | - | Stop screen sharing |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `participants:list` | `[participant]` | List of current participants |
| `participant:joined` | `participant` | New participant joined |
| `participant:left` | `{ id, socket_id }` | Participant left |
| `participant:media-toggled` | `{ id, socket_id, is_muted, is_video_on }` | Media state changed |
| `webrtc:offer` | `payload` | Incoming WebRTC offer |
| `webrtc:answer` | `payload` | Incoming WebRTC answer |
| `webrtc:ice-candidate` | `payload` | Incoming ICE candidate |
| `chat:message` | `message` | New chat message |
| `chat:history` | `[messages]` | Chat message history |
| `file:shared` | `file` | New file shared |
| `whiteboard:draw` | `data` | Whiteboard draw data |
| `whiteboard:erase` | `data` | Whiteboard erase |
| `whiteboard:clear` | - | Whiteboard cleared |
| `whiteboard:load` | `[data]` | Load existing whiteboard data |
| `screen:shared` | `{ socket_id }` | Screen sharing started |
| `screen:stopped` | `{ socket_id }` | Screen sharing stopped |
| `meeting:error` | `{ error }` | Error occurred |

## Security

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: Signed with secret, configurable expiry
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: express-validator on all routes
- **XSS Protection**: Helmet + input sanitization
- **File Upload Security**: MIME type validation, blocked extensions, size limits
- **SQL Injection Prevention**: Parameterized queries throughout
- **CORS**: Configured to allow only CLIENT_URL

## WebRTC Configuration

Configure STUN/TURN servers via environment variables:

```env
STUN_SERVERS=stun:stun.l.google.com:19302
TURN_SERVERS=turn:your-turn-server:3478
TURN_USERNAME=turn_username
TURN_PASSWORD=turn_password
```

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | Registered users with bcrypt-hashed passwords |
| `meetings` | Meeting metadata (title, code, password, host) |
| `meeting_participants` | Active participants per meeting |
| `chat_messages` | Text chat messages |
| `shared_files` | File metadata for uploads |

## Project Structure

```
video-conferencing/
├── public/
│   ├── css/
│   │   ├── auth.css
│   │   ├── app.css
│   │   └── meeting.css
│   ├── js/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   └── meeting.js
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── meeting.html
│   └── index.html
├── server/
│   ├── config/
│   │   ├── database.js
│   │   └── initDb.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Meeting.js
│   │   ├── MeetingParticipant.js
│   │   ├── ChatMessage.js
│   │   └── SharedFile.js
│   ├── middlewares/
│   │   ├── auth.js
│   │   └── validation.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── meetings.js
│   │   └── files.js
│   ├── services/
│   │   └── authService.js
│   └── index.js
├── database/
│   └── schema.sql
├── scripts/
│   └── seedDatabase.js
├── uploads/
├── .env
├── .env.example
├── package.json
└── README.md
```

## License

MIT