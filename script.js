// Firebase configuration - YOUR ACTUAL CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBOth5SxinCh2ndsgKa9Mwry9IPF4SKq-g",
    authDomain: "favor-tracker-af25f.firebaseapp.com",
    databaseURL: "https://favor-tracker-af25f-default-rtdb.firebaseio.com",
    projectId: "favor-tracker-af25f",
    storageBucket: "favor-tracker-af25f.firebasestorage.app",
    messagingSenderId: "444981205078",
    appId: "1:444981205078:web:e51ec9904d52a9823ac3f7",
    measurementId: "G-YXF34QBPBG"
};

// Star rating values (just 1-5, no points)
const FAVOR_VALUES = {
    5: 'Helping friends move',
    4: 'Spontaneous gift',
    3: 'Holiday related gift',
    2: 'Cup of coffee',
    1: 'Cup of water'
};

// App state
let currentUser = '';
let allTransactions = [];
let userStats = {};
let selectedStarsGiven = 3;
let selectedStarsReceived = 3;
let db = null;

// Initialize Firebase
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        return;
    }
    
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// Toggle help modal
function toggleHelp() {
    const modal = document.getElementById('helpModal');
    modal.classList.toggle('show');
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('helpModal');
    if (event.target === modal) {
        modal.classList.remove('show');
    }
}

// Select stars
function selectStars(type, stars) {
    if (type === 'given') {
        selectedStarsGiven = stars;
        const buttons = document.querySelectorAll('.form-section:first-child .star-btn');
        buttons.forEach((btn, idx) => {
            if (idx + 1 === stars) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    } else {
        selectedStarsReceived = stars;
        const buttons = document.querySelectorAll('.form-section:nth-child(2) .star-btn');
        buttons.forEach((btn, idx) => {
            if (idx + 1 === stars) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }
}

// Login
function login() {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) {
        alert('Please enter your name');
        return;
    }
    
    currentUser = username;
    document.getElementById('headerUsername').textContent = `Logged in as ${username}`;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    // Initialize Firebase and load data
    initFirebase();
    loadData();
}

// Switch tabs
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    if (tab === 'private') {
        document.getElementById('privatePage').classList.add('active');
    } else {
        document.getElementById('publicPage').classList.add('active');
        renderPublicFeed();
    }
}

// Submit favor
function submitFavor(type) {
    const textEl = document.getElementById(type === 'given' ? 'favorGivenText' : 'favorReceivedText');
    
    const favor = textEl.value.trim();
    const stars = type === 'given' ? selectedStarsGiven : selectedStarsReceived;
    
    if (!favor) {
        alert('Please describe the favor');
        return;
    }
    
    if (!db) {
        alert('Database not connected. Please refresh the page.');
        return;
    }
    
    const transaction = {
        username: currentUser,
        type: type,
        favor: favor,
        stars: stars,
        timestamp: new Date().toISOString()
    };
    
    // Save to Firebase
    const newRef = db.ref('transactions').push();
    newRef.set(transaction)
        .then(() => {
            // Reset form
            textEl.value = '';
            if (type === 'given') {
                selectedStarsGiven = 3;
                selectStars('given', 3);
            } else {
                selectedStarsReceived = 3;
                selectStars('received', 3);
            }
            alert('Favor logged successfully!');
        })
        .catch((error) => {
            console.error('Error saving:', error);
            alert('Error saving favor: ' + error.message);
        });
}

// Load all data from Firebase
function loadData() {
    if (!db) {
        console.error('Database not initialized');
        return;
    }
    
    // Listen for real-time updates
    db.ref('transactions').on('value', (snapshot) => {
        allTransactions = [];
        
        snapshot.forEach((childSnapshot) => {
            const transaction = childSnapshot.val();
            transaction.id = childSnapshot.key;
            allTransactions.push(transaction);
        });
        
        calculateStats();
        renderUserStats();
        
        // Update public feed if it's open
        if (document.getElementById('publicPage').classList.contains('active')) {
            renderPublicFeed();
        }
    });
}

// Calculate stats
function calculateStats() {
    userStats = {};
    allTransactions.forEach(t => {
        if (!userStats[t.username]) {
            userStats[t.username] = {
                favorsGiven: 0,
                favorsReceived: 0,
                starsGiven: 0,
                starsReceived: 0,
                avgStarsGiven: 0,
                avgStarsReceived: 0
            };
        }
        
        if (t.type === 'given') {
            userStats[t.username].favorsGiven += 1;
            userStats[t.username].starsGiven += t.stars;
        } else {
            userStats[t.username].favorsReceived += 1;
            userStats[t.username].starsReceived += t.stars;
        }
        
        // Calculate averages
        if (userStats[t.username].favorsGiven > 0) {
            userStats[t.username].avgStarsGiven = 
                (userStats[t.username].starsGiven / userStats[t.username].favorsGiven).toFixed(1);
        }
        if (userStats[t.username].favorsReceived > 0) {
            userStats[t.username].avgStarsReceived = 
                (userStats[t.username].starsReceived / userStats[t.username].favorsReceived).toFixed(1);
        }
    });
}

// Render user stats
function renderUserStats() {
    const statsEl = document.getElementById('userStats');
    const stats = userStats[currentUser];
    
    if (!stats) {
        statsEl.innerHTML = '<h3>Your Stats</h3><p style="color: #999;">No favors logged yet</p>';
        return;
    }
    
    statsEl.innerHTML = `
        <h3>Your Stats</h3>
        <div class="stat-row">
            <span class="stat-label">Favors Given:</span>
            <span class="stat-value">${stats.favorsGiven} (avg ${stats.avgStarsGiven || 0} ★)</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Favors Received:</span>
            <span class="stat-value">${stats.favorsReceived} (avg ${stats.avgStarsReceived || 0} ★)</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Total Stars Given:</span>
            <span class="stat-value">${stats.starsGiven} ★</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Total Stars Received:</span>
            <span class="stat-value profit">${stats.starsReceived} ★</span>
        </div>
    `;
}

// Render public feed
function renderPublicFeed() {
    renderLeaderboard();
    renderTransactionFeed();
}

// Render leaderboard
function renderLeaderboard() {
    const leaderboardEl = document.getElementById('leaderboard');
    
    if (Object.keys(userStats).length === 0) {
        leaderboardEl.innerHTML = '<h3>Leaderboard</h3><p class="empty-state">No transactions yet</p>';
        return;
    }
    
    const sorted = Object.keys(userStats).sort((a, b) => 
        userStats[b].starsReceived - userStats[a].starsReceived
    );
    
    let html = '<h3>Leaderboard</h3>';
    sorted.forEach(username => {
        const stats = userStats[username];
        html += `
            <div class="leaderboard-item">
                <div>
                    <div class="leaderboard-user">${username}</div>
                    <div class="leaderboard-score">Given: ${stats.starsGiven}★ | Received: ${stats.starsReceived}★</div>
                </div>
                <div class="leaderboard-profit">
                    ${stats.starsReceived}★
                </div>
            </div>
        `;
    });
    
    leaderboardEl.innerHTML = html;
}

// Render transaction feed
function renderTransactionFeed() {
    const feedEl = document.getElementById('transactionFeed');
    
    if (allTransactions.length === 0) {
        feedEl.innerHTML = '<div class="empty-state">No transactions yet. Start logging favors!</div>';
        return;
    }
    
    const sorted = [...allTransactions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let html = '';
    sorted.forEach(t => {
        const initial = t.username.charAt(0).toUpperCase();
        const actionText = t.type === 'given' ? 'gave a favor' : 'received a favor';
        const time = formatTime(t.timestamp);
        const stars = '★'.repeat(t.stars);
        
        html += `
            <div class="transaction-item">
                <div class="transaction-header">
                    <div class="avatar">${initial}</div>
                    <div class="transaction-info">
                        <div class="transaction-users">${t.username}</div>
                        <div class="transaction-action">${actionText}</div>
                    </div>
                </div>
                <div class="transaction-description">${t.favor}</div>
                <div class="transaction-stars">${stars}</div>
                <div class="transaction-meta">${time}</div>
            </div>
        `;
    });
    
    feedEl.innerHTML = html;
}

// Format time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}