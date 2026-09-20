function formatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

  return date.toLocaleDateString();
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return div;
}

function getInitials(name) {
  if (!name) return '?';
  const names = name.trim().split(/\s+/);
  if (names.length === 1) return names[0][0].toUpperCase();
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

function getAvatarColor(initials) {
  const colors = ['#1da1f2', '#6542e2', '#e14942', '#17bf63', '#f5a623', '#60a5fa', '#7c3aed', '#ec4899'];
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash += initials.charCodeAt(i);
  }
  return colors[hash % colors.length];
}

function getAvatarUrl(user, size = 'md') {
  const picture = user.profile_picture || user.avatar || user.picture;
  if (picture && picture !== 'default-avatar.png' && picture !== 'default-avatar.svg') {
    return `/uploads/${picture}`;
  }
  const name = user.full_name || user.username || 'U';
  const initials = getInitials(name);
  const bg = getAvatarColor(initials);
  const sizeMap = { sm: 32, md: 48, lg: 64, xl: 96 };
  const px = sizeMap[size] || 48;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><rect width="${px}" height="${px}" rx="${px / 2}" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${px * 0.4}" font-weight="bold">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

module.exports = { formatTime, formatDate, escapeHtml, getInitials, getAvatarColor, getAvatarUrl };