const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const wss = new WebSocket.Server({ port: 8080 });

const clients = new Map();

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
        ws.close(4001, 'Token required');
        return;
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            ws.close(4001, 'Invalid token');
            return;
        }
        ws.userId = user.id;
        ws.username = user.username;
        clients.set(user.id, ws);

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleMessage(ws, data);
            } catch (e) {
                ws.send(JSON.stringify({ error: 'Invalid message' }));
            }
        });

        ws.on('close', () => {
            clients.delete(user.id);
        });
    });
});

function handleMessage(ws, data) {
    const { type, payload } = data;
    switch (type) {
        case 'subscribe':
            ws.projectId = payload.projectId;
            break;
        case 'join_task':
            ws.taskId = payload.taskId;
            break;
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
    }
}

function broadcastToProject(projectId, event) {
    for (const [userId, ws] of clients) {
        if (ws.projectId == projectId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(event));
        }
    }
}

function broadcastToUser(userId, event) {
    const ws = clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event));
    }
}

function broadcastToTask(taskId, event) {
    for (const [userId, ws] of clients) {
        if (ws.taskId == taskId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(event));
        }
    }
}

module.exports = { wss, broadcastToProject, broadcastToUser, broadcastToTask, clients };
