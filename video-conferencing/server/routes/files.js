const express = require('express');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const Meeting = require('../models/Meeting');
const SharedFile = require('../models/SharedFile');
const { authMiddleware } = require('../middlewares/auth');
const { validateMeetingId } = require('../middlewares/validation');

const router = express.Router();

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-rar-compressed',
  'application/json',
  'application/octet-stream',
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf',
  '.txt', '.csv', '.md', '.json',
  '.doc', '.docx',
  '.xls', '.xlsx',
  '.ppt', '.pptx',
  '.zip', '.rar',
];

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.scr', '.sh', '.php', '.js', '.jar', '.dll', '.so', '.dmg'];

router.post('/upload/:id', authMiddleware, validateMeetingId, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');

    if (file.size > maxSize) {
      return res.status(400).json({ error: 'File too large' });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ error: 'File type not allowed' });
      }
    }

    const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await file.mv(filePath);

    const sharedFile = await SharedFile.create({
      meeting_id: meeting.id,
      user_id: req.user.id,
      filename,
      original_filename: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
    });

    res.status(201).json({ file: sharedFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/:filename', async (req, res) => {
  try {
    const uploadDir = path.resolve(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');
    const filePath = path.join(uploadDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;