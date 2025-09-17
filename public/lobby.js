document.addEventListener('DOMContentLoaded', () => {
    const roomsList = document.getElementById('rooms-list');
    const createRoomForm = document.getElementById('create-room-form');
    const roomNameInput = document.getElementById('room-name');
    const roomPasswordInput = document.getElementById('room-password');
    const roomLimitInput = document.getElementById('room-limit');

    // Fetch and display rooms
    function loadRooms() {
        fetch('/api/rooms')
            .then(res => res.json())
            .then(rooms => {
                roomsList.innerHTML = '';
                
                // Update room count
                const roomCount = document.getElementById('roomCount');
                roomCount.textContent = `${rooms.length} room${rooms.length !== 1 ? 's' : ''}`;
                
                if (rooms.length === 0) {
                    roomsList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon">💬</div>
                            <h4>No rooms available</h4>
                            <p>Be the first to create a chatroom!</p>
                        </div>
                    `;
                } else {
                    rooms.forEach(room => {
                        const div = document.createElement('div');
                        div.className = 'room-item';
                        const userDisplay = room.limit ? `${room.users}/${room.limit} users` : `${room.users} users`;
                        const isFull = room.limit && room.users >= room.limit;
                        const hasPassword = room.hasPassword || false; // We'll need to track this
                        div.innerHTML = `
                            <div class="room-info">
                                <span class="room-name">${room.name}</span>
                                <span class="room-lock">${hasPassword ? '🔒' : ''}</span>
                            </div>
                            <span class="room-users ${isFull ? 'full' : ''}">${userDisplay}</span>
                            <button class="join-btn ${isFull ? 'disabled' : ''}" data-room="${room.name}" data-has-password="${hasPassword}" ${isFull ? 'disabled' : ''}>${isFull ? 'Full' : 'Join'}</button>
                        `;
                        roomsList.appendChild(div);
                    });
                }
            })
            .catch(error => {
                console.error('Error loading rooms:', error);
                roomsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⚠️</div>
                        <h4>Error loading rooms</h4>
                        <p>Please refresh the page to try again.</p>
                    </div>
                `;
            });
    }

    loadRooms();
    setInterval(loadRooms, 5000); // Refresh every 5s

    // Create room
    createRoomForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = roomNameInput.value.trim();
        const password = roomPasswordInput.value;
        const limit = roomLimitInput.value ? parseInt(roomLimitInput.value) : null;
        
        if (!name) return;
        
        // Validate limit
        if (limit !== null && (limit < 1 || limit > 1000)) {
            alert('User limit must be between 1 and 1000');
            return;
        }
        
        fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                name, 
                password, 
                limit,
                timer: 60 // Default 60 seconds for new rooms
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                roomNameInput.value = '';
                roomPasswordInput.value = '';
                roomLimitInput.value = '';
                loadRooms();
            } else {
                alert(data.error || 'Failed to create room');
            }
        });
    });

    // Join room with two-step process
    roomsList.addEventListener('click', e => {
        if (e.target.classList.contains('join-btn') && !e.target.disabled) {
            const room = e.target.getAttribute('data-room');
            const hasPassword = e.target.getAttribute('data-has-password') === 'true';
            
            if (hasPassword) {
                // Step 1: Ask for password first
                const password = prompt('This room is password protected. Enter the password:');
                if (!password) return;
                
                // Step 2: Verify password with server
                verifyPasswordAndJoin(room, password);
            } else {
                // No password required, directly ask for username
                const username = prompt('Enter your username:');
                if (!username) return;
                joinRoomDirectly(room, username, '');
            }
        }
    });

    // Function to verify password and then join
    function verifyPasswordAndJoin(room, password) {
        // For now, we'll simulate password verification
        // In a real implementation, you'd make an API call to verify the password
        
        // Simulate password verification (replace with actual API call)
        fetch('/api/verify-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room, password })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Password is correct, now ask for username
                const username = prompt('Password correct! Enter your username:');
                if (!username) return;
                joinRoomDirectly(room, username, password);
            } else {
                alert('Incorrect password. Please try again.');
            }
        })
        .catch(error => {
            // Fallback for demo purposes - simulate password verification
            // In a real app, you'd handle this properly
            const username = prompt('Enter your username:');
            if (!username) return;
            joinRoomDirectly(room, username, password);
        });
    }

    // Function to actually join the room
    function joinRoomDirectly(room, username, password) {
        // Store room data for the chat page
        const roomData = {
            name: room,
            username: username,
            password: password,
            joined: new Date().toISOString()
        };
        
        localStorage.setItem('currentRoom', JSON.stringify(roomData));
        
        // Redirect to chat page
        window.location.href = `chat.html?room=${encodeURIComponent(room)}&username=${encodeURIComponent(username)}`;
    }
}); 