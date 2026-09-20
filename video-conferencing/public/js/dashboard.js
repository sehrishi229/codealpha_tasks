class Dashboard {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
    this.init();
  }

  init() {
    if (!this.token || !this.user) {
      window.location.href = '/login';
      return;
    }

    this.updateUserDisplay();
    this.bindEvents();
    this.loadMeetings();
  }

  updateUserDisplay() {
    const el = document.getElementById('userName');
    if (el) {
      el.textContent = this.user.display_name || this.user.username;
    }
  }

  bindEvents() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      });
    }

    const createForm = document.getElementById('createMeetingForm');
    if (createForm) {
      createForm.addEventListener('submit', (e) => this.createMeeting(e));
    }

    const joinForm = document.getElementById('joinMeetingForm');
    if (joinForm) {
      joinForm.addEventListener('submit', (e) => this.joinMeeting(e));
    }

    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => this.copyLink());
    }
  }

  async loadMeetings() {
    const container = document.getElementById('meetingsContainer');
    if (!container) return;

    container.innerHTML = '<p class="loading">Loading meetings...</p>';

    try {
      const response = await fetch('/api/meetings', {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        container.innerHTML = '<p class="error-message">Failed to load meetings</p>';
        return;
      }

      if (!data.meetings || data.meetings.length === 0) {
        container.innerHTML = '<p class="loading">No meetings yet. Create one to get started!</p>';
        return;
      }

      container.innerHTML = data.meetings.map(meeting => this.renderMeetingCard(meeting)).join('');
    } catch (err) {
      container.innerHTML = '<p class="error-message">Failed to load meetings</p>';
    }
  }

  renderMeetingCard(meeting) {
    const created = new Date(meeting.created_at).toLocaleDateString();
    return `
      <div class="meeting-card">
        <h3>${meeting.title}</h3>
        <div class="meeting-code">${meeting.meeting_code}</div>
        <div class="participants">${created}</div>
        <div class="meeting-actions">
          <button class="btn btn-sm btn-primary" onclick="dashboard.joinMeetingByCode('${meeting.meeting_code}')">Join</button>
          <button class="btn btn-sm btn-secondary" onclick="dashboard.openMeeting('${meeting.uuid}')">Enter Room</button>
        </div>
      </div>
    `;
  }

  async createMeeting(e) {
    e.preventDefault();
    const form = e.target;
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const password = form.password.value;
    const hasPassword = form.has_password.checked;
    const maxParticipants = parseInt(form.max_participants.value) || 50;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          title,
          description,
          has_password: hasPassword,
          password: hasPassword ? password : null,
          max_participants: maxParticipants,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to create meeting');
        return;
      }

      const meetingUrl = `${window.location.origin}/meeting/${data.meeting.uuid}`;
      document.getElementById('meetingLink').value = meetingUrl;
      document.getElementById('meetingCode').textContent = data.meeting.meeting_code;
      document.getElementById('copyModal').style.display = 'flex';

      form.reset();
      form.has_password.checked = false;
      form.password.value = '';
    } catch (err) {
      alert('Network error. Please try again.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Meeting';
    }
  }

  async joinMeeting(e) {
    e.preventDefault();
    const form = e.target;
    const code = form.meeting_code.value.trim().toUpperCase();
    const password = form.password.value;

    if (!code) {
      alert('Please enter a meeting code');
      return;
    }

    try {
      const response = await fetch('/api/meetings/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          meeting_code: code,
          password: password || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to join meeting');
        return;
      }

      window.location.href = `/meeting/${data.meeting.uuid}`;
    } catch (err) {
      alert('Network error. Please try again.');
    }
  }

  joinMeetingByCode(code) {
    window.location.href = `/meeting/${code}`;
  }

  openMeeting(uuid) {
    window.location.href = `/meeting/${uuid}`;
  }

  copyLink() {
    const linkInput = document.getElementById('meetingLink');
    linkInput.select();
    document.execCommand('copy');
    linkInput.setSelectionRange(0, 0);
  }
}

const dashboard = new Dashboard();