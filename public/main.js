const chatForm = document.getElementById('chat-form');
const chatMessages = document.getElementById('chat-messages');
const mediaFileInput = document.getElementById('media-file');

const socket = io();

const params = new URLSearchParams(window.location.search);
const username = params.get('username');
const room = params.get('room');

// Fixed: Redirect to index.html if username or room are missing
if (!username || !room) {
    alert('Username and room are required!');
    window.location.href = 'index.html';
}

socket.emit('joinRoom', { username, room });

socket.on('message', message => {
    outputMessage(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('mediaMessage', data => {
    outputMediaMessage(data);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = e.target.elements.msg.value;
    if (!msg) return;
    socket.emit('chatMessage', msg, username, room);
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
});

mediaFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('mediaFile', file);
    formData.append('username', username);
    formData.append('room', room);

    fetch('/upload', { method: 'POST', body: formData })
    .then(response => response.text())
    .then(data => console.log('Upload successful:', data))
    .catch(error => console.error('Upload error:', error));

    mediaFileInput.value = '';
});

function outputMessage(message) {
    const div = document.createElement('div');
    div.classList.add('message');
    div.innerHTML = message;
    chatMessages.appendChild(div);
}

function outputMediaMessage(data) {
    const { username, filePath } = data;
    const div = document.createElement('div');
    div.classList.add('message');
    const isImage = filePath.match(/\.(jpeg|jpg|gif|png)$/) != null;
    let mediaElement;
    if (isImage) {
        mediaElement = `<img src="${filePath}" alt="Image from ${username}" style="max-width: 100%; border-radius: 5px;">`;
    } else {
        const fileName = filePath.split('/').pop();
        mediaElement = `<a href="${filePath}" target="_blank" download>${fileName}</a>`;
    }
    div.innerHTML = `<strong>${username}:</strong><br>${mediaElement}`;
    chatMessages.appendChild(div);
}