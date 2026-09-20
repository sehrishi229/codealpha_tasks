const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initDB } = require('./app/config/database');
const { wss } = require('./app/websocket/server');

const app = express();
const server = http.createServer(app);

// Initialize database
initDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./app/routes/auth'));
app.use('/api/projects', require('./app/routes/projects'));
app.use('/api/tasks', require('./app/routes/tasks'));
app.use('/api/notifications', require('./app/routes/notifications'));

// HTML routes - handle SPA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/dashboard*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/project/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'project.html'));
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

wss.on('listening', () => {
    console.log('WebSocket server listening on port 8080');
});
