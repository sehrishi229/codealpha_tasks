// Social Media App JavaScript

class Toast {
  static container = null;

  static init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  static show(message, type = 'info', duration = 4000) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = document.createElement('i');
    if (type === 'success') {
      icon.className = 'fas fa-check-circle';
    } else if (type === 'error') {
      icon.className = 'fas fa-exclamation-circle';
    } else {
      icon.className = 'fas fa-info-circle';
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.onclick = () => this.remove(toast);

    toast.appendChild(icon);
    toast.appendChild(textSpan);
    toast.appendChild(closeBtn);

    this.container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  static remove(toast) {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }
}

window.Toast = Toast;

class SocialApp {
  constructor() {
    this.init();
  }

  init() {
    this.initImagePreview();
    this.initLikeButtons();
    this.initCommentForms();
    this.initFollowButtons();
    this.initDeleteComment();
    this.initMobileMenu();
  }

  initImagePreview() {
    const imageInput = document.getElementById('image');
    const documentInput = document.getElementById('document');
    const imagePreview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const fileNameSpan = document.getElementById('fileName');
    const removeImageBtn = document.getElementById('removeImage');

    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            previewImg.src = event.target.result;
            imagePreview.classList.remove('hidden');
            imagePreview.classList.add('flex');
            fileNameSpan.textContent = file.name;
          };
          reader.readAsDataURL(file);
        }
      });
    }

    if (documentInput) {
      documentInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          fileNameSpan.textContent = file.name;
        }
      });
    }

    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', () => {
        if (imageInput) imageInput.value = '';
        if (documentInput) documentInput.value = '';
        if (imagePreview) {
          imagePreview.classList.add('hidden');
          imagePreview.classList.remove('flex');
        }
        if (fileNameSpan) fileNameSpan.textContent = '';
      });
    }
  }

  initLikeButtons() {
    const likeButtons = document.querySelectorAll('.like-btn');
    likeButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const postId = btn.dataset.postId;
        if (!postId) return;

        const heartIcon = btn.querySelector('.fa-heart');
        const countSpan = btn.querySelector('.like-count, .like-count-display');

        btn.classList.add('loading');
        heartIcon.classList.add('liked');

        try {
          const response = await fetch(`/post/${postId}/like`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
          });

          if (!response.ok) {
            throw new Error('Failed to update like');
          }

          const data = await response.json();
          if (countSpan) {
            countSpan.textContent = data.count;
          }

          if (data.liked) {
            heartIcon.classList.add('liked');
            Toast.show('Post liked!', 'success');
          } else {
            heartIcon.classList.remove('liked');
            Toast.show('Like removed', 'info');
          }

          const postCard = document.getElementById(`post-${postId}`);
          if (postCard) {
            const statsSpan = postCard.querySelector('.post-stats span');
            if (statsSpan) {
              statsSpan.textContent = `${data.count} likes`;
            }
          }
        } catch (error) {
          console.error('Like error:', error);
          heartIcon.classList.toggle('liked');
        } finally {
          btn.classList.remove('loading');
        }
      });
    });
  }

  initCommentForms() {
    const commentForms = document.querySelectorAll('.comment-form');
    commentForms.forEach(form => {
      const postId = form.id.replace('commentForm', '');
      if (!postId) return;

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = form.querySelector('textarea');
        const content = textarea.value.trim();

        if (!content) {
          alert('Please write something before posting.');
          return;
        }

        form.querySelector('button').classList.add('loading');
        form.querySelector('button').disabled = true;

        try {
          const response = await fetch(`/post/${postId}/comment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin',
            body: JSON.stringify({ content: content })
          });

          if (!response.ok) {
            throw new Error('Failed to add comment');
          }

          const data = await response.json();

          if (data.comments) {
            const commentsList = document.querySelector('.comments-list');
            if (commentsList) {
              commentsList.innerHTML = data.comments.map(c => this.renderComment(c)).join('');
              textarea.value = '';
              this.initDeleteComment();
            }
            Toast.show('Comment has been posted!', 'success');
          }
        } catch (error) {
          console.error('Comment error:', error);
          alert('Failed to add comment. Please try again.');
        } finally {
          form.querySelector('button').classList.remove('loading');
          form.querySelector('button').disabled = false;
        }
      });
    });
  }

  getAvatarUrl(user, size = 'md') {
    const picture = user.profile_picture || user.avatar || user.picture;
    if (picture && picture !== 'default-avatar.png' && picture !== 'default-avatar.svg') {
      return `/uploads/${picture}`;
    }
    const name = user.full_name || user.username || 'U';
    const initials = this.getInitials(name);
    const bg = this.getAvatarColor(initials);
    const sizeMap = { sm: 32, md: 48, lg: 64, xl: 96 };
    const px = sizeMap[size] || 48;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><rect width="${px}" height="${px}" rx="${px / 2}" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${px * 0.4}" font-weight="bold">${initials}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  getInitials(name) {
    if (!name) return '?';
    const names = name.trim().split(/\s+/);
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }

  getAvatarColor(initials) {
    const colors = ['#1da1f2', '#6542e2', '#e14942', '#17bf63', '#f5a623', '#60a5fa', '#7c3aed', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < initials.length; i++) {
      hash += initials.charCodeAt(i);
    }
    return colors[hash % colors.length];
  }

  renderComment(comment) {
    const timeAgo = this.formatTime(comment.created_at);
    let html = `<div class="comment" id="comment-${comment.id}">
      <img src="${this.getAvatarUrl({ profile_picture: comment.profile_picture, username: comment.username, full_name: comment.full_name }, 'sm')}" alt="avatar" class="avatar-sm">
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-author">${comment.full_name || comment.username}</span>
          <span class="comment-username">@${comment.username}</span>
          <span class="comment-time">${timeAgo}</span>
        </div>
        <p class="comment-text">${this.escapeHtml(comment.content)}</p>
      </div>`;

    if (window.currentUser && comment.user_id === window.currentUser.id) {
      html += `<button class="delete-comment-btn" data-comment-id="${comment.id}"><i class="fas fa-trash"></i></button>`;
    }
    html += '</div>';
    return html;
  }

  initFollowButtons() {
    const followButtons = document.querySelectorAll('.follow-btn');
    followButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const userId = btn.dataset.userId;
        const action = btn.dataset.action;

        if (!userId || !action) return;

        btn.classList.add('loading');

        try {
          const response = await fetch(`/${action}/${userId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
          });

          if (!response.ok) {
            throw new Error('Failed to update follow status');
          }

          const data = await response.json();
          if (action === 'follow') {
            btn.textContent = 'Following';
            btn.dataset.action = 'unfollow';
            Toast.show('Following user!', 'success');
          } else {
            btn.textContent = 'Follow';
            btn.dataset.action = 'follow';
            Toast.show('Unfollowed user', 'info');
          }
        } catch (error) {
          console.error('Follow error:', error);
          alert('Failed to update follow status.');
        } finally {
          btn.classList.remove('loading');
        }
      });
    });
  }

  initDeleteComment() {
    const deleteButtons = document.querySelectorAll('.delete-comment-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const commentId = btn.dataset.commentId;
        if (!commentId) return;

        if (!confirm('Are you sure you want to delete this comment?')) return;

        btn.classList.add('loading');

        try {
          const response = await fetch(`/comment/${commentId}/delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
          });

          if (!response.ok) {
            throw new Error('Failed to delete comment');
          }

          const data = await response.json();
          if (data.success) {
            const commentEl = document.getElementById(`comment-${commentId}`);
            if (commentEl) commentEl.remove();
            Toast.show('Comment deleted', 'info');
          }
        } catch (error) {
          console.error('Delete comment error:', error);
          alert('Failed to delete comment.');
        } finally {
          btn.classList.remove('loading');
        }
      });
    });
  }

  initMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }
  }

  formatTime(dateString) {
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

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.confirmDeletePost = function(e, postId) {
  e.preventDefault();
  if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
    window.location.href = `/delete-post/${postId}`;
  }
  return false;
};

window.formatTime = function(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

  return date.toLocaleDateString();
};

window.escapeHtml = function(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

document.addEventListener('DOMContentLoaded', function() {
  const app = new SocialApp();
});