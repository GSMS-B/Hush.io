// Chat functionality
let currentRoom = null;
let messages = [];
let roomTimer = 60; // Default 60 seconds - will be updated by server
let messageIdCounter = 0;
let isAdmin = false;
let typingUsers = new Map(); // username -> timeoutId

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeChat();
    setupEventListeners();
});

function initializeChat() {
    // Load room data from localStorage
    const roomData = localStorage.getItem('currentRoom');    
    if (roomData) {
        currentRoom = JSON.parse(roomData);
        updateRoomDisplay();
        
        // Connect to the room via Socket.IO if we have room data
        if (currentRoom.name && currentRoom.username) {
            connectToRoom();
        }
    } else {
        // Check URL parameters for room and username
        const urlParams = new URLSearchParams(window.location.search);
        const roomName = urlParams.get('room');
        const username = urlParams.get('username');
        console.log(roomName + " " + username);
        
        if (roomName && username) {
            // We have room info from URL, try to connect
            currentRoom = {
                name: roomName,
                username: username,
                password: generateRoomCode()
            };
            // console.log(currentRoom);
            localStorage.setItem('currentRoom', JSON.stringify(currentRoom));
            // updateRoomDisplay(); 
            connectToRoom();
        }
    }

    
    // Set share code
    document.getElementById('shareCode').value = currentRoom.code;
}
function connectToRoom() {
    
    // Initialize Socket.IO connection
    const socket = io("https://hush-io.onrender.com",{
        transports: ["websocket", "polling"],
        withCredentials: true
    });
        socket.on('connect', () => {
        console.log('Connected to server');
        // console.log("CurrentRoom:", currentRoom);

        if (currentRoom && currentRoom.name && currentRoom.username) {
            socket.emit('joinRoom', {
                room: currentRoom.name,
                username: currentRoom.username,
                password: currentRoom.password || ''
            }, (response) => {
                console.log(response);
                
                if (response.success) {
                    console.log('Successfully joined room:', currentRoom.name);
                } else {
                    console.log(currentRoom.name + " " + currentRoom.username);
                    console.error('Failed to join room:', response.error);
                }
            });
        } else {
            console.error("❌ currentRoom is not ready yet");
        }
    });

    
    // Handle room timer updates
    socket.on('roomTimer', (data) => {
        roomTimer = data.timer;
        updateTimerDisplay();
        updateWelcomeMessage();
        updateTimerButtons();
        // console.log('Room timer set to:', roomTimer);
    });
    
    // Handle timer updates from other users
    socket.on('timerUpdated', (data) => {
        roomTimer = data.timer;
        updateTimerDisplay();
        updateWelcomeMessage();
        updateTimerButtons();
        showToast(`Timer updated to ${formatTime(roomTimer)}`);
        // console.log('Timer updated to:', roomTimer);
    });
    
    // Handle timer errors
    socket.on('timerError', (data) => {
        showToast(data.error);
        console.error('Timer error:', data.error);
    });

    // Admin status
    socket.on('adminStatus', (data) => {
        isAdmin = !!data.isAdmin;
        updateTimerButtonsState();
        if (isAdmin) {
            showToast('You are the room admin');
        } else {
            if (data.adminUsername) {
                showToast(`Admin: ${data.adminUsername}`);
            }
        }
        const closeBtn = document.getElementById('closeRoomBtn');
        if (closeBtn) closeBtn.disabled = !isAdmin;
    });
    
    // Handle existing messages when joining
    socket.on('existingMessages', (existingMessages) => {
        console.log('Loading existing messages:', existingMessages.length);
        existingMessages.forEach(msg => {
            const message = {
                id: msg.id,
                text: msg.message,
                timestamp: new Date(msg.timestamp),
                type: msg.username === currentRoom.username ? 'sent' : 'received',
                timer: msg.timer,
                username: msg.username
            };
            
            messages.push(message);
            displayMessage(message);
            
            // Calculate remaining time for existing messages
            const elapsed = Math.floor((Date.now() - msg.timestamp) / 1000);
            const remaining = Math.max(0, msg.timer - elapsed);
            
            if (remaining > 0) {
                startMessageCountdown(message.id, remaining);
            } else {
                // Message should be deleted immediately
                setTimeout(() => deleteMessage(message.id), 100);
            }
        });
    });
    
    // Handle user list updates
    socket.on('userList', (users) => {
        // console.log('Users in room:', users);
        // Show notification when users join/leave
        if (users.length > 1) {
            showToast(`${users.length} users in the room`);
        }
    });
    
    // Handle incoming messages
    socket.on('receiveMessage', (data) => {
        // Don't display our own messages as received (they're already displayed as sent)
        if (data.username === currentRoom.username) {
            return;
        }
        const message = {
            id: data.id,
            text: data.message,
            timestamp: new Date(data.timestamp),
            type: 'received',
            timer: data.timer,
            username: data.username
        };
        messages.push(message);
        displayMessage(message);
        startMessageCountdown(message.id, data.timer);
    });
    
    // Handle server-initiated message deletion
    socket.on('deleteMessage', (data) => {
        deleteMessage(data.messageId);
    });

    // Typing indicators
    socket.on('userTyping', ({ username, isTyping }) => {
        if (!username || username === currentRoom.username) return;
        const container = document.getElementById('typingIndicators');
        if (!container) return;
        const key = username.toLowerCase();
        if (isTyping) {
            // Add or refresh indicator with auto-timeout
            addTypingIndicator(container, username);
            const existingTimeout = typingUsers.get(key);
            if (existingTimeout) clearTimeout(existingTimeout);
            const timeoutId = setTimeout(() => removeTypingIndicator(container, username), 3000);
            typingUsers.set(key, timeoutId);
        } else {
            removeTypingIndicator(container, username);
        }
    });

    // Room closed by admin
    socket.on('roomClosed', ({ message }) => {
        showToast(message || 'Room closed');
        // Disable input
        const input = document.getElementById('messageInput');
        const btn = document.getElementById('sendButton');
        input.disabled = true;
        btn.disabled = true;
    });
    
    // Store socket reference
    window.chatSocket = socket;
}

function updateRoomDisplay() {
    document.getElementById('roomName').textContent = currentRoom.name;
    document.getElementById('roomCode').textContent = `Code: ${currentRoom.code}`;
}

function updateTimerDisplay() {
    document.getElementById('timerDisplay').textContent = formatTime(roomTimer);
}

function updateWelcomeMessage() {
    document.getElementById('welcomeTimer').textContent = formatTime(roomTimer);
}

function updateTimerButtons() {
    const timerBtns = document.querySelectorAll('.timer-btn');
    timerBtns.forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.time) === roomTimer) {
            btn.classList.add('active');
        }
    });
}

function updateTimerButtonsState() {
    const timerBtns = document.querySelectorAll('.timer-btn');
    timerBtns.forEach(btn => {
        btn.disabled = !isAdmin;
        btn.title = isAdmin ? 'Change message timer for the room' : 'Only the room creator can change the timer';
        if (!isAdmin) {
            btn.classList.remove('active');
        }
    });
    // Re-apply active for current timer
    updateTimerButtons();
}

function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds}s`;
    } else if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m`;
    } else {
        return `${Math.floor(seconds / 3600)}h`;
    }
}

function setupEventListeners() {
    // Message input
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const charCount = document.getElementById('charCount');
    
    messageInput.addEventListener('input', function() {
        const length = this.value.length;
        charCount.textContent = `${length}/500`;
        
        // Enable/disable send button
        sendButton.disabled = length === 0;
        // Emit typing
        if (window.chatSocket && currentRoom?.name) {
            window.chatSocket.emit('typing', { room: currentRoom.name, username: currentRoom.username });
            // Stop typing after debounce
            if (window._stopTypingTimeout) clearTimeout(window._stopTypingTimeout);
            window._stopTypingTimeout = setTimeout(() => {
                window.chatSocket.emit('stopTyping', { room: currentRoom.name, username: currentRoom.username });
            }, 1200);
        }
    });
    
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Timer buttons
    const timerBtns = document.querySelectorAll('.timer-btn');
    timerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const newTimer = parseInt(this.dataset.time);
            
            // Send timer update to server
            if (window.chatSocket && currentRoom.name) {
                window.chatSocket.emit('updateTimer', {
                    room: currentRoom.name,
                    timer: newTimer
                });
            }
        });
    });

    // Close room button
    const closeBtn = document.getElementById('closeRoomBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (!isAdmin) return;
            if (!confirm('Are you sure you want to close this room for everyone?')) return;
            if (window.chatSocket && currentRoom?.name) {
                window.chatSocket.emit('closeRoom', { room: currentRoom.name });
            }
        });
    }
}

function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();
    
    if (!messageText) return;
    
    // Create message object with temporary ID for immediate display
    const tempId = 'temp_' + Date.now();
    const message = {
        id: tempId,
        text: messageText,
        timestamp: new Date(),
        type: 'sent',
        timer: roomTimer,
        username: currentRoom.username
    };
    
    // Add message to array
    messages.push(message);
    
    // Display message immediately
    displayMessage(message);
    
    // Clear input
    messageInput.value = '';
    document.getElementById('charCount').textContent = '0/500';
    document.getElementById('sendButton').disabled = true;
    if (window.chatSocket && currentRoom?.name) {
        window.chatSocket.emit('stopTyping', { room: currentRoom.name, username: currentRoom.username });
    }
    
    // Send message via Socket.IO if connected
    if (window.chatSocket && currentRoom.name) {
        window.chatSocket.emit('sendMessage', {
            room: currentRoom.name,
            username: currentRoom.username,
            message: messageText
        });
    }
}

function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.type}`;
    messageDiv.dataset.messageId = message.id;
    
    // Add username display for received messages
    if (message.type === 'received' && message.username) {
        const usernameDiv = document.createElement('div');
        usernameDiv.className = 'message-username';
        usernameDiv.textContent = message.username;
        messageDiv.appendChild(usernameDiv);
    }
    
    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';
    messageBubble.textContent = message.text;
    
    const messageMeta = document.createElement('div');
    messageMeta.className = 'message-meta';
    
    const messageTime = document.createElement('span');
    messageTime.textContent = message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const messageTimer = document.createElement('div');
    messageTimer.className = 'message-timer';
    messageTimer.innerHTML = `⏰ <span class="countdown">${formatTime(message.timer)}</span>`;
    
    messageMeta.appendChild(messageTime);
    messageMeta.appendChild(messageTimer);
    
    messageDiv.appendChild(messageBubble);
    messageDiv.appendChild(messageMeta);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Start countdown
    startMessageCountdown(message.id, message.timer);
}

function startMessageCountdown(messageId, duration) {
    let timeLeft = duration;
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    
    if (!messageElement) return;
    
    const countdownElement = messageElement.querySelector('.countdown');
    
    const countdown = setInterval(() => {
        timeLeft--;
        
        if (countdownElement) {
            countdownElement.textContent = formatTime(timeLeft);
        }
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
        }
    }, 1000);
}

function deleteMessage(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    
    if (messageElement) {
        messageElement.classList.add('disappearing');
        
        setTimeout(() => {
            messageElement.remove();
        }, 1000);
    }
    
    // Remove from messages array
    messages = messages.filter(msg => msg.id !== messageId);
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    settingsPanel.classList.toggle('active');
}

function copyRoomCode() {
    const shareCode = document.getElementById('shareCode');
    shareCode.select();
    document.execCommand('copy');
    showToast('Room code copied to clipboard!');
}

// (removed E2EE UI helpers)

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// (removed E2EE helpers)

function addTypingIndicator(container, username) {
    const key = username.toLowerCase();
    let indicator = container.querySelector(`[data-typing-user="${key}"]`);
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.dataset.typingUser = key;
        const avatar = document.createElement('div');
        avatar.className = 'typing-avatar';
        avatar.textContent = username.slice(0, 1).toUpperCase();
        const dots = document.createElement('div');
        dots.className = 'typing-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        const label = document.createElement('span');
        label.textContent = 'typing…';
        indicator.appendChild(avatar);
        indicator.appendChild(label);
        indicator.appendChild(dots);
        container.appendChild(indicator);
    }
}

function removeTypingIndicator(container, username) {
    const key = username.toLowerCase();
    const indicator = container.querySelector(`[data-typing-user="${key}"]`);
    if (indicator) indicator.remove();
    const t = typingUsers.get(key);
    if (t) clearTimeout(t);
    typingUsers.delete(key);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Handle window close - cleanup
window.addEventListener('beforeunload', function() {
    // Clean up any timers or connections here
    localStorage.removeItem('currentRoom');
});