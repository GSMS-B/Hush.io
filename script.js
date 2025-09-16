// Navigation functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Mobile menu toggle
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Smooth scrolling and active link highlighting
    function updateActiveLink() {
        const sections = document.querySelectorAll('section[id]');
        const scrollPos = window.scrollY + 100;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            const correspondingLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            
            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(link => link.classList.remove('active'));
                if (correspondingLink) {
                    correspondingLink.classList.add('active');
                }
            }
        });
    }
    
    // Update active link on scroll
    window.addEventListener('scroll', updateActiveLink);
    
    // Update active link on page load
    updateActiveLink();
    
    // Form submission
    const contactForm = document.querySelector('.form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(this);
            const name = formData.get('name');
            const email = formData.get('email');
            const subject = formData.get('subject');
            const message = formData.get('message');
            
            // Simple validation
            if (!name || !email || !subject || !message) {
                alert('Please fill in all fields.');
                return;
            }
            
            // Simulate form submission
            const submitBtn = this.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            setTimeout(() => {
                alert('Thank you for your message! We\'ll get back to you soon.');
                this.reset();
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }, 2000);
        });
    }
    
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.service-card, .feature-item, .step, .contact-method');
    animateElements.forEach(el => {
        observer.observe(el);
    });
});

// Open chat function
function openChat() {
    // Check if chat.html exists, if not, create a simple modal
    const chatUrl = 'chat.html';
    const chatWindow = window.open(chatUrl, 'hushChat', 'width=400,height=600,scrollbars=no,resizable=yes');
    
    // If the chat window couldn't be opened (popup blocked or file doesn't exist)
    if (!chatWindow) {
        // Create a modal overlay
        createChatModal();
    }
}

function createChatModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('chatModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Create modal HTML
    const modalHTML = `
        <div id="chatModal" class="chat-modal-overlay">
            <div class="chat-modal">
                <div class="chat-header">
                    <h3>🤫 hush.io Chat</h3>
                    <button onclick="closeChatModal()" class="close-btn">&times;</button>
                </div>
                <div class="chat-setup">
                    <div class="setup-section">
                        <h4>Create or Join Room</h4>
                        <div class="input-group">
                            <input type="text" id="roomName" placeholder="Room name" maxlength="20">
                            <input type="password" id="roomPassword" placeholder="Password (optional)">
                            <input type="number" id="roomLimit" placeholder="Max users (optional)" min="1" max="1000">
                        </div>
                        <div class="timer-section">
                            <label>Message disappear after:</label>
                            <div class="timer-options">
                                <button class="timer-btn" data-time="30">30s</button>
                                <button class="timer-btn active" data-time="60">1m</button>
                                <button class="timer-btn" data-time="300">5m</button>
                                <button class="timer-btn" data-time="900">15m</button>
                            </div>
                        </div>
                        <button onclick="startChat()" class="start-chat-btn">Start Chatting</button>
                    </div>
                    <div class="setup-divider">or</div>
                    <div class="setup-section">
                        <h4>Join Existing Room</h4>
                        <input type="text" id="joinRoomCode" placeholder="Enter room code">
                        <button onclick="joinRoom()" class="join-room-btn">Join Room</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add modal styles
    const modalStyles = `
        <style>
        .chat-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        }
        
        .chat-modal {
            background: white;
            border-radius: 20px;
            width: 90%;
            max-width: 500px;
            max-height: 90%;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .chat-header {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 20px;
            border-radius: 20px 20px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .chat-header h3 {
            margin: 0;
            font-size: 1.3rem;
        }
        
        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 5px;
            border-radius: 5px;
            transition: background-color 0.3s ease;
        }
        
        .close-btn:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .chat-setup {
            padding: 30px;
        }
        
        .setup-section {
            margin-bottom: 30px;
        }
        
        .setup-section h4 {
            color: #1e293b;
            margin-bottom: 15px;
            font-size: 1.1rem;
        }
        
        .input-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .input-group input {
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        .input-group input:focus {
            outline: none;
            border-color: #6366f1;
        }
        
        .timer-section {
            margin-bottom: 20px;
        }
        
        .timer-section label {
            display: block;
            color: #374151;
            font-weight: 500;
            margin-bottom: 10px;
        }
        
        .timer-options {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .timer-btn {
            padding: 8px 16px;
            background: #f1f5f9;
            border: 2px solid transparent;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            color: #64748b;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .timer-btn:hover,
        .timer-btn.active {
            background: #6366f1;
            color: white;
            border-color: #6366f1;
        }
        
        .start-chat-btn,
        .join-room-btn {
            width: 100%;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .start-chat-btn:hover,
        .join-room-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.3);
        }
        
        .setup-divider {
            text-align: center;
            color: #94a3b8;
            font-weight: 500;
            margin: 20px 0;
            position: relative;
        }
        
        .setup-divider::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: #e5e7eb;
            z-index: 1;
        }
        
        .setup-divider {
            background: white;
            padding: 0 15px;
            display: inline-block;
            position: relative;
            z-index: 2;
        }
        </style>
    `;
    
    // Add styles to head
    document.head.insertAdjacentHTML('beforeend', modalStyles);
    
    // Add timer button functionality
    const timerBtns = document.querySelectorAll('.timer-btn');
    timerBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            timerBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function closeChatModal() {
    const modal = document.getElementById('chatModal');
    if (modal) {
        modal.remove();
    }
}

function startChat() {
    const roomName = document.getElementById('roomName').value.trim();
    const roomPassword = document.getElementById('roomPassword').value;
    const roomLimit = document.getElementById('roomLimit').value ? parseInt(document.getElementById('roomLimit').value) : null;
    const selectedTimer = document.querySelector('.timer-btn.active').dataset.time;
    
    if (!roomName) {
        alert('Please enter a room name');
        return;
    }
    
    // Validate limit
    if (roomLimit !== null && (roomLimit < 1 || roomLimit > 1000)) {
        alert('User limit must be between 1 and 1000');
        return;
    }
    
    // Generate room code
    const roomCode = generateRoomCode();
    
    // Store room data in localStorage for demo purposes
    const roomData = {
        name: roomName,
        password: roomPassword,
        limit: roomLimit,
        timer: parseInt(selectedTimer),
        code: roomCode,
        created: new Date().toISOString()
    };
    
    localStorage.setItem('currentRoom', JSON.stringify(roomData));
    
    // Close modal and open chat
    closeChatModal();
    
    // Open chat interface
    window.open('chat.html', 'hushChat', 'width=400,height=600,scrollbars=no,resizable=yes');
}

function joinRoom() {
    const roomCode = document.getElementById('joinRoomCode').value.trim();
    
    if (!roomCode) {
        alert('Please enter a room code');
        return;
    }
    
    // For demo purposes, we'll simulate joining a room
    const roomData = {
        name: 'Joined Room',
        password: '',
        timer: 60,
        code: roomCode,
        joined: new Date().toISOString()
    };
    
    localStorage.setItem('currentRoom', JSON.stringify(roomData));
    
    // Close modal and open chat
    closeChatModal();
    
    // Open chat interface
    window.open('chat.html', 'hushChat', 'width=400,height=600,scrollbars=no,resizable=yes');
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('chatModal');
    if (modal && e.target === modal) {
        closeChatModal();
    }
});

// Close modal with escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeChatModal();
    }
});