let currentRoomId = null;
let currentUserRole = null;

// комнаты
async function loadRooms() {
  try {
    const response = await fetch('/api/chat/rooms');
    const data = await response.json();
    
    const roomsList = document.getElementById('roomsList');
    
    if (!data.rooms || data.rooms.length === 0) {
      roomsList.innerHTML = '<div class="empty-chat">Нет активных чатов</div>';
      return;
    }
    
    roomsList.innerHTML = data.rooms.map(room => `
      <div class="room-item" data-room-id="${room.id}" data-user-name="${room.user_name}" data-user-email="${room.user_email}">
        <div class="room-avatar">
          <i class="fas fa-user"></i>
        </div>
        <div class="room-info">
          <div class="room-name">${escapeHtml(room.user_name)}</div>
          <div class="room-email">${escapeHtml(room.user_email)}</div>
        </div>
      </div>
    `).join('');
    
    document.querySelectorAll('.room-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.room-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const roomId = parseInt(item.dataset.roomId);
        const userName = item.dataset.userName;
        openChat(roomId, userName);
      });
    });
    
    if (currentUserRole !== 'admin' && data.rooms.length > 0) {
      const firstRoom = document.querySelector('.room-item');
      if (firstRoom) firstRoom.click();
    }
    
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function openChat(roomId, userName) {
  currentRoomId = roomId;
  
  document.getElementById('chatUserName').textContent = userName;
  document.getElementById('messageInput').disabled = false;
  document.getElementById('sendBtn').disabled = false;
  
  // загрузка файлов
  const fileUploadLabel = document.getElementById('fileUploadLabel');
  const fileInput = document.getElementById('fileInput');
  if (fileUploadLabel) {
    fileUploadLabel.style.opacity = '1';
    fileUploadLabel.style.cursor = 'pointer';
    
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    newFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await uploadFile(roomId, file);
        newFileInput.value = '';
      }
    });
    
    document.getElementById('fileUploadLabel').querySelector('input').remove();
    document.getElementById('fileUploadLabel').appendChild(newFileInput);
  }
  
  await loadMessages();
}

async function loadMessages() {
  if (!currentRoomId) return;
  
  const fromDate = document.getElementById('dateFrom').value;
  const toDate = document.getElementById('dateTo').value;
  
  let url = `/api/chat/messages/${currentRoomId}`;
  const params = [];
  if (fromDate) params.push(`from=${fromDate}`);
  if (toDate) params.push(`to=${toDate}`);
  if (params.length) url += '?' + params.join('&');
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    const messagesArea = document.getElementById('messagesArea');
    
    if (!data.messages || data.messages.length === 0) {
      messagesArea.innerHTML = '<div class="empty-chat"><i class="fas fa-comment-dots"></i><p>Нет сообщений</p></div>';
      return;
    }
    
    messagesArea.innerHTML = data.messages.map(msg => {
      const isUser = msg.sender_role === 'user';
      return `
        <div class="message ${isUser ? 'user' : 'admin'}">
          <div class="message-bubble">
            <div class="message-sender">${escapeHtml(msg.sender)}</div>
            <div class="message-text">${msg.message}</div>
            <div class="message-time">${new Date(msg.timestamp).toLocaleString()}</div>
          </div>
        </div>
      `;
    }).join('');
    
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
  } catch (error) {
    console.error('Error loading messages:', error);
  }
}

async function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();
  
  if (!message || !currentRoomId) return;
  
  try {
    const response = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: currentRoomId, message: message })
    });
    
    const result = await response.json();
    
    if (result.success) {
      messageInput.value = '';
      await loadMessages();
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function uploadFile(roomId, file) {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch(`/api/chat/upload/${roomId}`, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      await loadMessages();
      alert(`Файл "${result.file.name}" загружен!`);
    } else {
      alert('Ошибка загрузки файла');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    alert('Ошибка загрузки файла');
  }
}

async function createRoom() {
  const userEmail = document.getElementById('newUserEmail').value;
  const userName = document.getElementById('newUserName').value;
  
  if (!userEmail || !userName) {
    alert('Заполните все поля');
    return;
  }
  
  try {
    const response = await fetch('/api/chat/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, userName })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Чат создан');
      document.getElementById('newUserEmail').value = '';
      document.getElementById('newUserName').value = '';
      loadRooms();
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error('Error creating room:', error);
  }
}

async function getUserInfo() {
  try {
    const response = await fetch('/api/account');
    if (response.status === 401) {
      window.location.href = '/login';
      return;
    }
    const data = await response.json();
    currentUserRole = data.user.role;
    
    if (currentUserRole === 'admin') {
      document.getElementById('adminPanel').style.display = 'block';
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

document.getElementById('sendBtn')?.addEventListener('click', sendMessage);
document.getElementById('applyDateFilter')?.addEventListener('click', () => {
  if (currentRoomId) loadMessages();
});
document.getElementById('resetDateFilter')?.addEventListener('click', () => {
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  if (currentRoomId) loadMessages();
});
document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
document.getElementById('createRoomBtn')?.addEventListener('click', createRoom);
document.getElementById('timeBackSelect')?.addEventListener('change', () => {
  if (currentRoomId) loadMessages();
});

getUserInfo().then(() => loadRooms());