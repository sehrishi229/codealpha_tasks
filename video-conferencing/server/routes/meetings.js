const express = require('express');
const { validationResult } = require('express-validator');
const Meeting = require('../models/Meeting');
const MeetingParticipant = require('../models/MeetingParticipant');
const ChatMessage = require('../models/ChatMessage');
const SharedFile = require('../models/SharedFile');
const { authMiddleware, optionalAuth } = require('../middlewares/auth');
const { validateMeetingCreate, validateMeetingJoin, validateMeetingId, validateMessage } = require('../middlewares/validation');

const router = express.Router();

router.post('/', authMiddleware, validateMeetingCreate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const meeting = await Meeting.create({
      title: req.body.title,
      description: req.body.description,
      host_id: req.user.id,
      has_password: req.body.has_password,
      password: req.body.password,
      max_participants: req.body.max_participants || 50,
      scheduled_for: req.body.scheduled_for || null,
    });
    res.status(201).json({ meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', optionalAuth, async (req, res) => {
  try {
    let meetings;
    if (req.user) {
      meetings = await Meeting.getByUser(req.user.id);
    } else {
      meetings = await Meeting.getAllActive();
    }
    res.json({ meetings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', optionalAuth, validateMeetingId, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    if (meeting.has_password) {
      delete meeting.password_hash;
    }
    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/join', validateMeetingJoin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const meeting = await Meeting.findById(req.body.meeting_code);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.has_password) {
      const passwordValid = Meeting.verifyPassword(meeting, req.body.password || '');
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid meeting password' });
      }
    }

    const participantCount = await Meeting.countParticipants(meeting.id);
    if (participantCount >= meeting.max_participants) {
      return res.status(400).json({ error: 'Meeting is full' });
    }

    res.json({ meeting: { uuid: meeting.uuid, meeting_code: meeting.meeting_code, title: meeting.title, has_password: meeting.has_password, max_participants: meeting.max_participants } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/participants', authMiddleware, validateMeetingId, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const participants = await MeetingParticipant.getActiveByMeetingDetailed(meeting.id);
    res.json({ participants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/messages', authMiddleware, validateMeetingId, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const messages = await ChatMessage.getByMeeting(meeting.id);
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/files', authMiddleware, validateMeetingId, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    const files = await SharedFile.getByMeeting(meeting.id);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, validateMeetingId, async (req, res) => {
  try {
    const deleted = await Meeting.deleteById(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Meeting not found or not authorized' });
    }
    res.json({ message: 'Meeting deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;