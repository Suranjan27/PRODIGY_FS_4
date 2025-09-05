// server.js
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// --- multer setup for file uploads ---
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage
}).single('mediaFile');

// --- Static Folders ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// --- Route for the root URL to serve the login page ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- File Upload Endpoint ---
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(500).send('Upload failed.');
        }
        if (req.file == undefined) {
            return res.status(400).send('No file selected.');
        }

        const { username, room } = req.body;
        const filePath = `/uploads/${req.file.filename}`;

        io.to(room).emit('mediaMessage', { username, filePath });

        res.status(200).send('File uploaded successfully.');
    });
});

// --- User connection tracking ---
const users = {};

// --- Socket.io connection logic ---
io.on('connection', socket => {
    console.log('A new user has connected...');

    socket.on('joinRoom', ({ username, room }) => {
        socket.join(room);
        users[socket.id] = { username, room };

        // Welcome message to the user
        socket.emit('message', `Welcome to the ${room} chat, ${username}!`);

        // Broadcast to others in the room
        socket.broadcast
            .to(room)
            .emit('message', `${username} has joined the chat.`);
    });

    socket.on('chatMessage', (msg, username, room) => {
        io.to(room).emit('message', `<strong>${username}:</strong> ${msg}`);
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        const user = users[socket.id];
        if (user) {
            io.to(user.room).emit('message', `${user.username} has left the chat.`);
            delete users[socket.id];
        }
        console.log('A user has disconnected.');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));