class MeetingApp {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.socket = null;
    this.localStream = null;
    this.peerConnections = new Map();
    this.isAudioMuted = false;
    this.isVideoOff = false;
    this.isScreenSharing = false;
    this.isWhiteboardOpen = false;
    this.currentMeeting = null;
    this.isHost = false;
    this.maxParticipants = 50;
    this.whiteboardCtx = null;
    this.whiteboardData = [];
    this.isEraser = false;

    this.STUN_SERVERS = (typeof process !== 'undefined' && process.env && process.env.STUN_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302')
      .split(',')
      .filter(s => s.trim())
      .map(s => ({ urls: s.trim() }));

    this.RTC_CONFIG = {
      iceServers: this.STUN_SERVERS,
    };

    this.init();
  }

  init() {
    if (!this.token || !this.user) {
      window.location.href = '/login';
      return;
    }

    const meetingId = window.location.pathname.split('/').pop();
    if (!meetingId) {
      window.location.href = '/dashboard';
      return;
    }

    this.currentMeeting = { uuid: meetingId };
    this.meetingUuid = meetingId;

    this.setupSocket();
    this.setupUI();
    this.setupWhiteboard();
    this.fetchMeetingInfo();
  }

  setupSocket() {
    this.socket = io('http://localhost:4300', {
      auth: { token: this.token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.socket.emit('meeting:join', { meeting_uuid: this.meetingUuid });
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.handleDisconnect();
    });

    this.socket.on('participants:list', (participants) => {
      this.handleParticipantsList(participants);
    });

    this.socket.on('participant:joined', (participant) => {
      this.handleParticipantJoined(participant);
    });

    this.socket.on('participant:left', (data) => {
      this.handleParticipantLeft(data);
    });

    this.socket.on('participant:media-toggled', (data) => {
      this.handleMediaToggled(data);
    });

    this.socket.on('webrtc:offer', (payload) => {
      this.handleOffer(payload);
    });

    this.socket.on('webrtc:answer', (payload) => {
      this.handleAnswer(payload);
    });

    this.socket.on('webrtc:ice-candidate', (payload) => {
      this.handleIceCandidate(payload);
    });

    this.socket.on('chat:message', (message) => {
      this.addMessage(message);
    });

    this.socket.on('chat:history', (messages) => {
      this.renderMessages(messages);
    });

    this.socket.on('file:shared', (file) => {
      this.handleFileShared(file);
    });

    this.socket.on('whiteboard:draw', (data) => {
      if (!this.isEraser) this.drawOnCanvas(data);
    });

    this.socket.on('whiteboard:erase', (data) => {
      this.drawOnCanvas(data, true);
    });

    this.socket.on('whiteboard:clear', () => {
      this.clearCanvas();
    });

    this.socket.on('screen:shared', (data) => {
      this.handleScreenShared(data);
    });

    this.socket.on('screen:stopped', (data) => {
      this.handleScreenStopped(data);
    });

    this.socket.on('meeting:error', (data) => {
      this.showLobbyError(data.error || 'Meeting error');
    });
  }

  async fetchMeetingInfo() {
    try {
      const response = await fetch(`/api/meetings/${this.meetingUuid}`, {
        headers: { 'Authorization': `Bearer ${this.token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        this.showLobbyError(data.error || 'Meeting not found');
        return;
      }

      this.currentMeeting = data.meeting;
      this.maxParticipants = data.meeting.max_participants;
      this.isHost = data.meeting.host_id === this.user.id;

      document.getElementById('lobbyMeetingTitle').textContent = this.currentMeeting.title;
      document.getElementById('lobbyMeetingCode').textContent = `Code: ${this.currentMeeting.meeting_code}`;
      document.getElementById('joinMeetingBtn').disabled = false;

      await this.initLocalMedia();
    } catch (err) {
      this.showLobbyError('Failed to load meeting info');
    }
  }

  async initLocalMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      const localVideo = document.getElementById('localVideo');
      if (localVideo) {
        localVideo.srcObject = this.localStream;
      }

      const lobbyVideo = document.getElementById('lobbyVideo');
      if (lobbyVideo) {
        lobbyVideo.srcObject = this.localStream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  }

  setupUI() {
    const joinBtn = document.getElementById('joinMeetingBtn');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => this.joinMeeting());
    }

    const toggleMicBtn = document.getElementById('toggleMicBtn');
    if (toggleMicBtn) {
      toggleMicBtn.addEventListener('click', () => this.toggleAudio());
    }

    const toggleCamBtn = document.getElementById('toggleCamBtn');
    if (toggleCamBtn) {
      toggleCamBtn.addEventListener('click', () => this.toggleVideo());
    }

    const toggleMicBtn2 = document.getElementById('toggleMicBtn2');
    if (toggleMicBtn2) {
      toggleMicBtn2.addEventListener('click', () => this.toggleAudio());
    }

    const toggleCamBtn2 = document.getElementById('toggleCamBtn2');
    if (toggleCamBtn2) {
      toggleCamBtn2.addEventListener('click', () => this.toggleVideo());
    }

    const toggleScreenBtn = document.getElementById('toggleScreenBtn');
    if (toggleScreenBtn) {
      toggleScreenBtn.addEventListener('click', () => this.toggleScreenShare());
    }

    const leaveBtn = document.getElementById('leaveMeetingBtn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => this.leaveMeeting());
    }

    const messageForm = document.getElementById('messageForm');
    if (messageForm) {
      messageForm.addEventListener('submit', (e) => this.sendMessage(e));
    }

    const fileUploadForm = document.getElementById('fileUploadForm');
    if (fileUploadForm) {
      fileUploadForm.addEventListener('submit', (e) => this.uploadFile(e));
    }

    const toggleChatBtn = document.getElementById('toggleChatBtn');
    if (toggleChatBtn) {
      toggleChatBtn.addEventListener('click', () => this.toggleSidebar('chatTab'));
    }

    const toggleParticipantsBtn = document.getElementById('toggleParticipantsBtn');
    if (toggleParticipantsBtn) {
      toggleParticipantsBtn.addEventListener('click', () => this.toggleSidebar('participantsTab'));
    }

    const toggleWhiteboardBtn = document.getElementById('toggleWhiteboardBtn');
    if (toggleWhiteboardBtn) {
      toggleWhiteboardBtn.addEventListener('click', () => this.toggleSidebar('whiteboardTab'));
    }

    const toggleFilesBtn = document.getElementById('toggleFilesBtn');
    if (toggleFilesBtn) {
      toggleFilesBtn.addEventListener('click', () => this.toggleSidebar('filesTab'));
    }

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => this.switchTab(e));
    });

    const clearWhiteboardBtn = document.getElementById('clearWhiteboard');
    if (clearWhiteboardBtn) {
      clearWhiteboardBtn.addEventListener('click', () => this.clearCanvas());
    }

    const eraseWhiteboardBtn = document.getElementById('eraseWhiteboard');
    if (eraseWhiteboardBtn) {
      eraseWhiteboardBtn.addEventListener('click', () => this.toggleEraser());
    }
  }

  joinMeeting() {
    const lobby = document.getElementById('lobby');
    const meeting = document.getElementById('meeting');
    if (lobby) lobby.style.display = 'none';
    if (meeting) meeting.style.display = 'block';

    this.socket.emit('meeting:join', { meeting_uuid: this.meetingUuid });
    this.updateParticipantCount();

    if (!this.localStream) {
      this.initLocalMedia();
    }
  }

  showLobbyError(message) {
    const errorEl = document.getElementById('lobbyError');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    const joinBtn = document.getElementById('joinMeetingBtn');
    if (joinBtn) {
      joinBtn.disabled = true;
    }
  }

  handleDisconnect() {
    const videoGrid = document.getElementById('videoGrid');
    if (videoGrid) {
      const remoteVideos = videoGrid.querySelectorAll('.remote-video');
      remoteVideos.forEach(v => v.remove());
    }
  }

  handleParticipantsList(participants) {
    this.renderParticipants(participants);
  }

  handleParticipantJoined(participant) {
    this.addParticipant(participant);
    this.updateParticipantCount();
  }

  handleParticipantLeft(data) {
    this.removeParticipant(data.socket_id);
    this.updateParticipantCount();
  }

  handleMediaToggled(data) {
    const participant = this.peerConnections.get(data.socket_id);
    if (participant) {
      participant.isMuted = data.is_muted;
      participant.isVideoOn = data.is_video_on;
    }
  }

  renderParticipants(participants) {
    const list = document.getElementById('participantsList');
    if (!list) return;

    const html = participants.map(p => `
      <div class="participant-item ${p.id == this.user.id ? 'you' : ''}">
        <div class="participant-avatar">${this.getInitials(p.display_name || p.username)}</div>
        <div class="participant-info">
          <div class="participant-name">${p.display_name || p.username}${p.id == this.user.id ? ' (You)' : ''}</div>
          <div class="participant-status">${p.is_host ? 'Host' : 'Participant'}</div>
        </div>
      </div>
    `).join('');

    list.innerHTML = html;
  }

  addParticipant(participant) {
    const list = document.getElementById('participantsList');
    if (!list) return;

    const existing = list.querySelector(`[data-id="${participant.id}"]`);
    if (existing) return;

    const item = document.createElement('div');
    item.className = 'participant-item';
    item.dataset.id = participant.id;
    item.innerHTML = `
      <div class="participant-avatar">${this.getInitials(participant.display_name || participant.username)}</div>
      <div class="participant-info">
        <div class="participant-name">${participant.display_name || participant.username}</div>
        <div class="participant-status">${participant.is_host ? 'Host' : 'Participant'}</div>
      </div>
    `;
    list.appendChild(item);
  }

  removeParticipant(socketId) {
    const list = document.getElementById('participantsList');
    if (!list) return;
    const item = list.querySelector(`[data-socket="${socketId}"]`);
    if (item) item.remove();
  }

  updateParticipantCount() {
    const countEl = document.getElementById('participantCount');
    if (!countEl || !this.currentMeeting) return;
    const count = document.querySelectorAll('.participant-item').length || 1;
    countEl.textContent = `${count} / ${this.maxParticipants}`;
  }

  getInitials(name) {
    const parts = (name || 'Unknown').split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().substring(0, 2);
  }

  toggleAudio() {
    if (!this.localStream) return;
    this.isAudioMuted = !this.isAudioMuted;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = !this.isAudioMuted;
    });
    const btn = document.getElementById('toggleMicBtn2');
    if (btn) {
      btn.classList.toggle('active', this.isAudioMuted);
      btn.querySelector('.toolbar-label').textContent = this.isAudioMuted ? 'Unmute' : 'Mute';
    }
  }

  toggleVideo() {
    if (!this.localStream) return;
    this.isVideoOff = !this.isVideoOff;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = !this.isVideoOff;
    });
    const btn = document.getElementById('toggleCamBtn2');
    if (btn) {
      btn.classList.toggle('active', this.isVideoOff);
      btn.querySelector('.toolbar-label').textContent = this.isVideoOff ? 'Start Video' : 'Stop Video';
    }
  }

  async toggleScreenShare() {
    if (!this.isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        this.isScreenSharing = true;

        const currentVideoTrack = this.localStream.getVideoTracks()[0];
        this.localStream.removeTrack(currentVideoTrack);
        screenStream.getVideoTracks().forEach(track => {
          this.localStream.addTrack(track);
        });

        const btn = document.getElementById('toggleScreenBtn');
        if (btn) {
          btn.classList.add('active');
          btn.querySelector('.toolbar-label').textContent = 'Stop Share';
        }

        this.socket.emit('screen:share-start');

        screenStream.getTracks().forEach(track => {
          track.onended = () => this.stopScreenShare();
        });
      } catch (err) {
        console.error('Screen share failed:', err);
      }
    } else {
      this.stopScreenShare();
    }
  }

  stopScreenShare() {
    this.isScreenSharing = false;
    this.socket.emit('screen:share-stop');
    const btn = document.getElementById('toggleScreenBtn');
    if (btn) {
      btn.classList.remove('active');
      btn.querySelector('.toolbar-label').textContent = 'Share Screen';
    }
    window.location.reload();
  }

  handleScreenShared(data) {
    console.log('Screen shared by:', data.socket_id);
  }

  handleScreenStopped(data) {
    console.log('Screen share stopped by:', data.socket_id);
  }

  leaveMeeting() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

    this.peerConnections.forEach(pc => {
      pc.close();
    });
    this.peerConnections.clear();

    if (this.socket) {
      this.socket.emit('meeting:leave');
    }

    window.location.href = '/dashboard';
  }

  sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (!message) return;

    this.socket.emit('chat:message', {
      message,
      message_type: 'text',
    });
    input.value = '';
  }

  addMessage(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message-container ${message.user_id == this.user.id ? 'own' : ''}`;
    messageDiv.innerHTML = `
      <div class="message-sender">${message.user.display_name || message.user.username}</div>
      <div class="message-bubble">${this.escapeHtml(message.message)}</div>
    `;
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
  }

  renderMessages(messages) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    if (!messages || messages.length === 0) {
      container.innerHTML = '<div class="message welcome">No messages yet. Say hello!</div>';
      return;
    }

    container.innerHTML = messages.map(m => `
      <div class="message-container ${m.user_id == this.user.id ? 'own' : ''}">
        <div class="message-sender">${m.display_name || m.username}</div>
        <div class="message-bubble">${this.escapeHtml(m.message)}</div>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  uploadFile(e) {
    e.preventDefault();
    const input = document.getElementById('fileInput');
    if (!input.files || !input.files[0]) return;

    const formData = new FormData();
    formData.append('file', input.files[0]);

    fetch(`/api/files/upload/${this.meetingUuid}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.token}` },
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (data.file) {
          this.socket.emit('file:share', {
            file_id: data.file.id,
            filename: data.file.original_filename,
            file_size: data.file.file_size,
            mime_type: data.file.mime_type,
          });
          input.value = '';
        }
      })
      .catch(err => console.error('File upload error:', err));
  }

  handleFileShared(file) {
    const filesList = document.getElementById('filesList');
    if (!filesList) return;

    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <span class="file-icon">📎</span>
      <div class="file-info">
        <div class="file-name">${this.escapeHtml(file.filename)}</div>
        <div class="file-meta">${this.formatFileSize(file.file_size)} - ${file.user.display_name}</div>
      </div>
      <a href="/uploads/${file.filename}" target="_blank" class="btn btn-sm btn-secondary">Download</a>
    `;
    filesList.appendChild(item);
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  switchTab(e) {
    const tabId = e.target.dataset.tab;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.getElementById(`${tabId}Tab`).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
  }

  toggleSidebar(tabId) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.toggle('visible');
    }
  }

  setupWhiteboard() {
    const canvas = document.getElementById('whiteboard');
    if (!canvas) return;

    this.whiteboardCtx = canvas.getContext('2d');
    this.whiteboardCtx.lineCap = 'round';
    this.whiteboardCtx.lineJoin = 'round';
    this.whiteboardCtx.lineWidth = 3;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseDown = (e) => {
      if (!this.isWhiteboardOpen) return;
      isDrawing = true;
      [lastX, lastY] = this.getCanvasCoords(e, canvas);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing || !this.isWhiteboardOpen) return;
      e.preventDefault();
      const [x, y] = this.getCanvasCoords(e, canvas);

      const data = {
        x: x, y: y,
        lastX: lastX, lastY: lastY,
        color: this.isEraser ? '#000' : '#fff',
        lineWidth: this.isEraser ? 20 : 3,
        userId: this.user.id,
      };

      this.drawOnCanvas(data);
      this.socket.emit('whiteboard:draw', data);

      [lastX, lastY] = [x, y];
    };

    const handleMouseUp = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseout', handleMouseUp);

    if ('ontouchstart' in window) {
      canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
        isDrawing = true;
        e.preventDefault();
      }, { passive: false });

      canvas.addEventListener('touchmove', (e) => {
        if (!isDrawing || !this.isWhiteboardOpen) return;
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const data = {
          x, y,
          lastX: lastX, lastY: lastY,
          color: this.isEraser ? '#000' : '#fff',
          lineWidth: this.isEraser ? 20 : 3,
          userId: this.user.id,
        };

        this.drawOnCanvas(data);
        this.socket.emit('whiteboard:draw', data);
        [lastX, lastY] = [x, y];
      }, { passive: false });

      canvas.addEventListener('touchend', () => {
        isDrawing = false;
      });
    }
  }

  getCanvasCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top];
    }
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  drawOnCanvas(data, isErase = false) {
    if (!this.whiteboardCtx) return;
    this.whiteboardCtx.strokeStyle = isErase || this.isEraser ? '#000' : data.color || '#fff';
    this.whiteboardCtx.lineWidth = data.lineWidth || (isErase || this.isEraser ? 20 : 3);
    this.whiteboardCtx.globalCompositeOperation = (isErase || this.isEraser || data.color === '#000') ? 'destination-out' : 'source-over';
    this.whiteboardCtx.beginPath();
    this.whiteboardCtx.moveTo(data.lastX, data.lastY);
    this.whiteboardCtx.lineTo(data.x, data.y);
    this.whiteboardCtx.stroke();
    this.whiteboardCtx.globalCompositeOperation = 'source-over';
  }

  clearCanvas() {
    if (this.whiteboardCtx) {
      this.whiteboardCtx.clearRect(0, 0, 600, 400);
    }
    this.socket.emit('whiteboard:clear');
  }

  toggleEraser() {
    this.isEraser = !this.isEraser;
    const btn = document.getElementById('eraseWhiteboard');
    if (btn) {
      btn.classList.toggle('active', this.isEraser);
      btn.textContent = this.isEraser ? 'Drawing' : 'Eraser';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

const meetingApp = new MeetingApp();