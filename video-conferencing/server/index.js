require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
const socketIo = require('socket.io');
const fs = require('fs');

const initDb = require('./config/initDb');
const db = require('./config/database');
const authRoutes = require('./routes/auth');
const meetingRoutes = require('./routes/meetings');
const fileRoutes = require('./routes/files');
const { verifyToken } = require('./services/authService');
const User = require('./models/User');
const Meeting = require('./models/Meeting');
const MeetingParticipant = require('./models/MeetingParticipant');
const ChatMessage = require('./models/ChatMessage');

const app = express();
const server = http.createServer(app);

initDb().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:4300',
    credentials: true,
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.socket.io', "'unsafe-inline'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https:', 'data:'],
        connectSrc: ["'self'", 'https://cdn.socket.io', 'ws:', 'wss:'],
        mediaSrc: ["'self'", 'blob:', 'https:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
      },
    },
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(fileUpload({
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  createParentPath: true,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const uploadsDir = path.resolve(__dirname, '../', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/files', fileRoutes);

app.use('/js', express.static(path.resolve(__dirname, '../public/js')));
app.use('/css', express.static(path.resolve(__dirname, '../public/css')));
app.use('/assets', express.static(path.resolve(__dirname, '../public/assets')));
app.use('/uploads', express.static(uploadsDir));

const indexHtmlPath = path.resolve(__dirname, '../public/index.html');
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/login.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/dashboard.html'));
});

app.get('/meeting/:id', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/meeting.html'));
});

const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:4300',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const activeRooms = new Map();
const whiteboards = new Map();
const roomCleanups = new Map();

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie?.split('token=')[1]?.split(';')[0];

  if (!token) {
    console.log('Socket auth: no token');
    return next(new Error('Authentication error'));
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.log('Socket auth: user not found');
      return next(new Error('User not found'));
    }
    socket.user = user;
    next();
  } catch (err) {
    console.log('Socket auth error:', err.message);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.display_name || socket.user.username} (${socket.user.id})`);

  socket.on('meeting:join', async (data) => {
    const { meeting_uuid } = data;
    const meeting = await Meeting.findById(meeting_uuid);

    if (!meeting) {
      socket.emit('meeting:error', { error: 'Meeting not found' });
      return;
    }

    const participant = await MeetingParticipant.add({
      meeting_id: meeting.id,
      user_id: socket.user.id,
      socket_id: socket.id,
      is_host: meeting.host_id === socket.user.id,
    });

    const roomName = `meeting:${meeting.uuid}`;
    socket.join(roomName);
    socket.data.meeting_uuid = meeting_uuid;
    socket.data.meeting_id = meeting.id;
    socket.data.roomName = roomName;
    socket.data.is_host = meeting.host_id === socket.user.id;

    if (!activeRooms.has(meeting.uuid)) {
      activeRooms.set(meeting.uuid, new Set());
    }
    activeRooms.get(meeting.uuid).add(socket.user.id);

    const participants = await MeetingParticipant.getActiveByMeetingDetailed(meeting.id);
    participants.forEach(p => {
      io.sockets.sockets.get(p.socket_id)?.data?.updateParticipant?.(p);
    });

    socket.to(roomName).emit('participant:joined', {
      id: socket.user.id,
      uuid: socket.user.uuid,
      username: socket.user.username,
      display_name: socket.user.display_name,
      is_host: meeting.host_id === socket.user.id,
      is_muted: false,
      is_video_on: true,
      socket_id: socket.id,
    });

    socket.emit('participants:list', participants.map(p => ({
      id: p.user_id,
      uuid: undefined,
      username: p.username,
      display_name: p.display_name,
      is_host: p.is_host === 1,
      is_muted: p.is_muted === 1,
      is_video_on: p.is_video_on === 1,
      socket_id: p.socket_id,
    })));

    socket.emit('whiteboard:load', whiteboards.get(meeting.uuid) || []);

    setTimeout(() => {
      socket.to(roomName).emit('participant:joined', {
        id: socket.user.id,
        username: socket.user.username,
        display_name: socket.user.display_name || socket.user.username,
        is_host: meeting.host_id === socket.user.id,
        is_muted: false,
        is_video_on: true,
        socket_id: socket.id,
      });
    }, 100);
  });

  socket.on('meeting:leave', async () => {
    if (!socket.data.meeting_id) return;

    await MeetingParticipant.removeBySocketId(socket.id);

    const roomName = socket.data.roomName;
    socket.to(roomName).emit('participant:left', {
      id: socket.user.id,
      socket_id: socket.id,
    });
    socket.leave(roomName);

    if (activeRooms.has(socket.data.meeting_uuid)) {
      activeRooms.get(socket.data.meeting_uuid).delete(socket.user.id);
      if (activeRooms.get(socket.data.meeting_uuid).size === 0) {
        activeRooms.delete(socket.data.meeting_uuid);
        whiteboards.delete(socket.data.meeting_uuid);
        cleanupRoom(socket.data.meeting_uuid);
      }
    }

    socket.data.meeting_uuid = null;
    socket.data.meeting_id = null;
    socket.data.roomName = null;
  });

  socket.on('webrtc:offer', (payload) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.to(roomName).emit('webrtc:offer', payload);
  });

  socket.on('webrtc:answer', (payload) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.to(roomName).emit('webrtc:answer', payload);
  });

  socket.on('webrtc:ice-candidate', (payload) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.to(roomName).emit('webrtc:ice-candidate', payload);
  });

  socket.on('chat:message', async (data) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;

    const message = await ChatMessage.create({
      meeting_id: socket.data.meeting_id,
      user_id: socket.user.id,
      message: data.message,
      message_type: data.message_type || 'text',
    });

    io.to(roomName).emit('chat:message', {
      id: message.id,
      meeting_id: message.meeting_id,
      user_id: message.user_id,
      message: message.message,
      message_type: message.message_type,
      created_at: message.created_at,
      user: {
        username: socket.user.username,
        display_name: socket.user.display_name || socket.user.username,
      },
    });
  });

  socket.on('chat:history', async ({ meeting_uuid }) => {
    const meeting = await Meeting.findById(meeting_uuid);
    if (!meeting) {
      socket.emit('chat:error', { error: 'Meeting not found' });
      return;
    }
    const messages = await ChatMessage.getByMeeting(meeting.id);
    socket.emit('chat:history', messages.map(m => ({
      ...m,
      user: { display_name: m.display_name || m.username },
    })));
  });

  socket.on('file:share', (data) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    io.to(roomName).emit('file:shared', {
      ...data,
      user: {
        id: socket.user.id,
        username: socket.user.username,
        display_name: socket.user.display_name || socket.user.username,
      },
    });
  });

  socket.on('media:toggle', ({ is_muted, is_video_on }) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.to(roomName).emit('participant:media-toggled', {
      id: socket.user.id,
      socket_id: socket.id,
      is_muted,
      is_video_on,
    });
  });

  socket.on('whiteboard:draw', (data) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    const wb = whiteboards.get(socket.data.meeting_uuid) || [];
    wb.push(data);
    if (wb.length > 500) wb.shift();
    whiteboards.set(socket.data.meeting_uuid, wb);
    socket.to(roomName).emit('whiteboard:draw', data);
  });

  socket.on('whiteboard:erase', (data) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    const wb = whiteboards.get(socket.data.meeting_uuid) || [];
    wb.push(data);
    if (wb.length > 500) wb.shift();
    whiteboards.set(socket.data.meeting_uuid, wb);
    socket.to(roomName).emit('whiteboard:erase', data);
  });

  socket.on('whiteboard:clear', () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    whiteboards.set(socket.data.meeting_uuid, []);
    socket.to(roomName).emit('whiteboard:clear');
  });

  socket.on('screen:share-start', () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.to(roomName).emit('screen:shared', { socket_id: socket.id });
  });

  socket.on('screen:share-stop', () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.to(roomName).emit('screen:stopped', { socket_id: socket.id });
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.user.display_name || socket.user.username}`);
    if (socket.data.meeting_id) {
      await MeetingParticipant.removeBySocketId(socket.id);
      const roomName = socket.data.roomName;
      if (roomName) {
        socket.to(roomName).emit('participant:left', {
          id: socket.user.id,
          socket_id: socket.id,
        });
      }
    }
  });
});

function cleanupRoom(meetingUuid) {
  console.log(`Cleaning up room: ${meetingUuid}`);
}

const PORT = process.env.PORT || 4300;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, server, io };