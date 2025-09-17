const path = require("path");
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'https://hush-io.onrender.com',
    credentials: true,
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
// In-memory storage
let rooms = {};
let messages = {}; // Store messages with their deletion timers

app.use(express.static(path.join(__dirname, "public")));
// __dirname works in CommonJS
app.get("/", (req, res) => {
 res.sendFile(path.join(__dirname, "public", "lobby.html"));}
);

// REST API: Get all rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Object.keys(rooms).map(room => ({
    name: room,
    users: rooms[room].users.length,
    limit: rooms[room].limit,
    hasPassword: !!rooms[room].password,
    timer: rooms[room].timer || 60 // Default 60 seconds
  }));
  console.log('Getting rooms:', roomList);
  res.json(roomList);
});

// REST API: Create a new room
app.post('/api/rooms', (req, res) => {
  const { name, password, limit, timer } = req.body;
  console.log('Creating room:', { name, password, limit, timer });
  
  if (!name || rooms[name]) {
    return res.status(400).json({ error: 'Room name required or already exists' });
  }
  
  // Set default limit for public rooms (no password)
  let userLimit = limit;
  if (!password && !limit) {
    userLimit = 1000; // Default limit for public rooms
  }
  
  rooms[name] = { 
    password: password || '', 
    users: [],
    limit: userLimit,
    timer: timer || 60, // Default 60 seconds
    adminUsername: null, // will be set when the first user joins
    closed: false
  };
  
  // Initialize messages array for this room
  messages[name] = [];
  
  console.log('Room created:', rooms[name]);
  res.json({ success: true, name });
});

// REST API: Verify password for a room
app.post('/api/verify-password', (req, res) => {
  const { room, password } = req.body;
  console.log('Verifying password for room:', room);
  
  if (!rooms[room]) {
    return res.status(404).json({ error: 'Room does not exist' });
  }
  
  if (rooms[room].password && rooms[room].password !== password) {
    return res.json({ success: false, error: 'Incorrect password' });
  }
  
  res.json({ success: true });
});

// REST API: Update room timer
app.post('/api/rooms/:room/timer', (req, res) => {
  const { room } = req.params;
  const { timer } = req.body;
  
  if (!rooms[room]) {
    return res.status(404).json({ error: 'Room does not exist' });
  }
  if (rooms[room].closed) {
    return res.status(400).json({ error: 'Room is closed' });
  }
  
  if (!timer || timer < 10 || timer > 3600) {
    return res.status(400).json({ error: 'Timer must be between 10 and 3600 seconds' });
  }
  
  rooms[room].timer = timer;
  console.log(`Updated timer for room ${room} to ${timer} seconds`);
  
  // Notify all users in the room about the timer change
  io.to(room).emit('timerUpdated', { timer });
  
  res.json({ success: true, timer });
});

// Function to delete a message after timer expires
function scheduleMessageDeletion(roomName, messageId, timer) {
  setTimeout(() => {
    if (messages[roomName]) {
      messages[roomName] = messages[roomName].filter(msg => msg.id !== messageId);
      // Notify all users in the room to delete this message
      io.to(roomName).emit('deleteMessage', { messageId });
      console.log(`Message ${messageId} deleted from room ${roomName}`);
    }
  }, timer * 1000);
}

// Socket.IO events
io.on('connection', (socket) => {
  socket.on('joinRoom', ({ room, username, password }, callback) => {
    if (!rooms[room]) {
      return callback({ error: 'Room does not exist' });
    }
    if (rooms[room].closed) {
      return callback({ error: 'Room is closed' });
    }
    if (rooms[room].password && rooms[room].password !== password) {
      return callback({ error: 'Incorrect password' });
    }
    
    // Check user limit
    if (rooms[room].limit && rooms[room].users.length >= rooms[room].limit) {
      return callback({ error: 'Room is full' });
    }
    
    socket.join(room);
    rooms[room].users.push({ id: socket.id, username });
    
    // Assign admin if not set
    if (!rooms[room].adminUsername) {
      rooms[room].adminUsername = username;
    }
    
    // Send current room timer to the joining user
    socket.emit('roomTimer', { timer: rooms[room].timer || 60 });
    
    // Inform user of admin status
    const isAdmin = rooms[room].adminUsername === username;
    socket.emit('adminStatus', { isAdmin, adminUsername: rooms[room].adminUsername });
    
    // Send existing messages to the joining user
    if (messages[room]) {
      socket.emit('existingMessages', messages[room]);
    }
    
    io.to(room).emit('userList', rooms[room].users.map(u => u.username));
    callback({ success: true });
  });

  socket.on('leaveRoom', ({ room, username }) => {
    socket.leave(room);
    if (rooms[room]) {
      rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);
      io.to(room).emit('userList', rooms[room].users.map(u => u.username));
      // Do not delete room when empty; it persists until admin closes it
    }
  });

  socket.on('sendMessage', ({ room, username, message }) => {
    if (!rooms[room] || !messages[room]) {
      return;
    }
    if (rooms[room].closed) {
      return;
    }
    
    const messageId = Date.now() + Math.random().toString(36).substr(2, 9);
    const roomTimer = rooms[room].timer || 60;
    
    const messageData = {
      id: messageId,
      username,
      message,
      timestamp: Date.now(),
      timer: roomTimer
    };
    
    // Store message in server memory
    messages[room].push(messageData);
    
    // Schedule message deletion
    scheduleMessageDeletion(room, messageId, roomTimer);
    
    // Broadcast message to all users in the room
    io.to(room).emit('receiveMessage', messageData);
    
    console.log(`Message sent in room ${room} by ${username}, will be deleted in ${roomTimer} seconds`);
  });

  socket.on('updateTimer', ({ room, timer }) => {
    if (!rooms[room]) {
      return;
    }
    if (rooms[room].closed) {
      socket.emit('timerError', { error: 'Room is closed' });
      return;
    }
    // Validate timer
    if (timer < 10 || timer > 3600) {
      socket.emit('timerError', { error: 'Timer must be between 10 and 3600 seconds' });
      return;
    }
    // Check admin permission
    const user = rooms[room].users.find(u => u.id === socket.id);
    if (!user || user.username !== rooms[room].adminUsername) {
      socket.emit('timerError', { error: 'Only the room creator can change the timer' });
      return;
    }
    rooms[room].timer = timer;
    // Notify all users in the room about the timer change
    io.to(room).emit('timerUpdated', { timer });
    console.log(`Timer updated in room ${room} to ${timer} seconds by ${user?.username}`);
  });

  // Typing indicators
  socket.on('typing', ({ room, username }) => {
    if (!rooms[room] || rooms[room].closed) return;
    socket.to(room).emit('userTyping', { username, isTyping: true });
  });
  socket.on('stopTyping', ({ room, username }) => {
    if (!rooms[room]) return;
    socket.to(room).emit('userTyping', { username, isTyping: false });
  });

  // Close room (admin only)
  socket.on('closeRoom', ({ room }) => {
    if (!rooms[room]) return;
    const user = rooms[room].users.find(u => u.id === socket.id);
    if (!user || user.username !== rooms[room].adminUsername) {
      socket.emit('roomError', { error: 'Only the room creator can close the room' });
      return;
    }
    rooms[room].closed = true;
    io.to(room).emit('roomClosed', { message: 'The room was closed by the admin.' });
    // Give clients a moment to handle before cleanup
    setTimeout(() => {
      // Force all sockets to leave the room
      const roomSet = io.sockets.adapter.rooms.get(room);
      if (roomSet) {
        for (const socketId of roomSet) {
          const s = io.sockets.sockets.get(socketId);
          if (s) s.leave(room);
        }
      }
      delete rooms[room];
      delete messages[room];
    }, 500);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (rooms[room]) {
        rooms[room].users = rooms[room].users.filter(u => u.id !== socket.id);
        io.to(room).emit('userList', rooms[room].users.map(u => u.username));
        // Room persists; do not auto-delete when empty
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 
