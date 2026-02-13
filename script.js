// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBOth5SxinCh2ndsgKa9Mwry9IPF4SKq-g",
    authDomain: "favor-tracker-af25f.firebaseapp.com",
    databaseURL: "https://favor-tracker-af25f-default-rtdb.firebaseio.com",
    projectId: "favor-tracker-af25f",
    storageBucket: "favor-tracker-af25f.firebasestorage.app",
    messagingSenderId: "444981205078",
    appId: "1:444981205078:web:e51ec9904d52a9823ac3f7"
};

let currentUser = '';
let allTransactions = [];
let userStats = {};
let homeRating = 3;
let homeType = 'given';
let currentFeedFilter = 'all';
let modalRating = 3;
let modalType = 'given';
let modalFriendName = '';
let db = null;

// Init Firebase
function initFirebase() {
    if (typeof firebase === 'undefined') return;
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    } catch (error) {
        console.error('Firebase error:', error);
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
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    initFirebase();
    loadData();
    switchTab('home');
}

// Switch tabs
function switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    if (tab === 'home') {
        document.getElementById('homePage').classList.add('active');
        document.getElementById('navHome').classList.add('active');
    } else if (tab === 'connections') {
        document.getElementById('connectionsPage').classList.add('active');
        document.getElementById('navConnections').classList.add('active');
        renderConnections();
    } else if (tab === 'public') {
        document.getElementById('publicPage').classList.add('active');
        document.getElementById('navPublic').classList.add('active');
        filterFeed('all');
    } else if (tab === 'leaderboard') {
        document.getElementById('leaderboardPage').classList.add('active');
        document.getElementById('navStats').classList.add('active');
        renderLeaderboard();
    }
}

// Home page functions
function selectHomeType(type) {
    homeType = type;
    document.querySelectorAll('.home-toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const placeholder = type === 'given' ? 'What favor did you give?' : 'What favor did you receive?';
    document.getElementById('homeInput').placeholder = placeholder;
}

function setHomeRating(rating) {
    homeRating = rating;
    const stars = document.querySelectorAll('#homeStarRating .star-icon');
    stars.forEach((star, idx) => {
        star.classList.toggle('filled', idx < rating);
    });
}

function submitFromHome() {
    const favor = document.getElementById('homeInput').value.trim();
    if (!favor) {
        alert('Please describe the favor');
        return;
    }
    if (!db) {
        alert('Database not connected');
        return;
    }
    
    const transaction = {
        username: currentUser,
        type: homeType,
        favor: favor,
        stars: homeRating,
        timestamp: new Date().toISOString()
    };
    
    db.ref('transactions').push().set(transaction)
        .then(() => {
            document.getElementById('homeInput').value = '';
            homeRating = 3;
            setHomeRating(3);
            alert('Favor logged! 🌟');
        })
        .catch((error) => {
            alert('Error: ' + error.message);
        });
}

// Central give/receive button
function showGiveReceiveModal() {
    switchTab('home');
}

// Load data
function loadData() {
    if (!db) return;
    db.ref('transactions').on('value', (snapshot) => {
        allTransactions = [];
        snapshot.forEach((child) => {
            const t = child.val();
            t.id = child.key;
            allTransactions.push(t);
        });
        calculateStats();
        
        // Refresh current view
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            if (activePage.id === 'connectionsPage') renderConnections();
            else if (activePage.id === 'publicPage') filterFeed(currentFeedFilter);
            else if (activePage.id === 'leaderboardPage') renderLeaderboard();
        }
    });
}

// Calculate stats
function calculateStats() {
    userStats = {};
    allTransactions.forEach(t => {
        if (!userStats[t.username]) {
            userStats[t.username] = {
                given: 0,
                received: 0,
                starsGiven: 0,
                starsReceived: 0,
                transactions: []
            };
        }
        if (t.type === 'given') {
            userStats[t.username].given += 1;
            userStats[t.username].starsGiven += t.stars;
        } else {
            userStats[t.username].received += 1;
            userStats[t.username].starsReceived += t.stars;
        }
        userStats[t.username].transactions.push(t);
    });
}

// Render connections
function renderConnections() {
    const listEl = document.getElementById('connectionsList');
    const friends = Object.keys(userStats).filter(u => u !== currentUser);
    
    if (friends.length === 0) {
        listEl.innerHTML = '<div class="empty-state">No connections yet. Add a friend and log a favor to get started!</div>';
        return;
    }
    
    let html = '';
    friends.forEach(friendName => {
        const stats = userStats[friendName];
        const recentTrans = stats.transactions
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 3);
        
        html += `
            <div class="connection-card">
                <div class="connection-header">
                    <div class="connection-name">${friendName}</div>
                    <div class="connection-stars">
                        <span>${stats.starsGiven}★</span> | <span>${stats.starsReceived}★</span>
                    </div>
                </div>
                ${recentTrans.length > 0 ? `
                    <div class="transaction-label">Recent Activity ➔</div>
                    ${recentTrans.map(t => `
                        <div class="mini-transaction">
                            <div class="mini-initial">${t.username.charAt(0).toUpperCase()}</div>
                            <div style="flex: 1;">${t.favor.substring(0, 40)}${t.favor.length > 40 ? '...' : ''}</div>
                            <div>${'★'.repeat(t.stars)}</div>
                        </div>
                    `).join('')}
                ` : ''}
            </div>
        `;
    });
    listEl.innerHTML = html;
}

// Add friend with favor
function addFriendWithFavor(type) {
    const friendName = document.getElementById('friendInput').value.trim();
    
    if (!friendName) {
        alert('Please enter a friend\'s name');
        return;
    }
    
    if (friendName.toLowerCase() === currentUser.toLowerCase()) {
        alert('You cannot add yourself as a friend!');
        return;
    }
    
    // Set up modal
    modalFriendName = friendName;
    modalType = type;
    modalRating = 3;
    
    // Update modal UI
    if (type === 'given') {
        document.getElementById('modalTitle').textContent = 'FAVOR YOU GAVE';
        document.getElementById('modalInput').placeholder = 'What favor did you give?';
    } else {
        document.getElementById('modalTitle').textContent = 'FAVOR YOU RECEIVED';
        document.getElementById('modalInput').placeholder = 'What favor did you receive?';
    }
    
    document.getElementById('modalFriendName').textContent = `Friend: ${friendName}`;
    document.getElementById('modalInput').value = '';
    setModalRating(3);
    
    // Show modal
    document.getElementById('transactionModal').classList.add('show');
}

// Set modal rating
function setModalRating(rating) {
    modalRating = rating;
    const stars = document.querySelectorAll('#modalStarRating .star-icon');
    stars.forEach((star, idx) => {
        star.classList.toggle('filled', idx < rating);
    });
}

// Submit from modal
function submitFromModal() {
    const favor = document.getElementById('modalInput').value.trim();
    
    if (!favor) {
        alert('Please describe the favor');
        return;
    }
    
    if (!db) {
        alert('Database not connected');
        return;
    }
    
    const transaction = {
        username: modalType === 'given' ? currentUser : modalFriendName,
        type: modalType,
        favor: favor,
        stars: modalRating,
        timestamp: new Date().toISOString()
    };
    
    db.ref('transactions').push().set(transaction)
        .then(() => {
            closeTransactionModal();
            document.getElementById('friendInput').value = '';
            alert(`Favor logged with ${modalFriendName}! 🌟`);
        })
        .catch((error) => {
            alert('Error: ' + error.message);
        });
}

// Close transaction modal
function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('show');
    document.getElementById('modalInput').value = '';
    document.getElementById('modalFriendName').textContent = '';
    modalRating = 3;
    setModalRating(3);
}

// Filter feed
function filterFeed(type) {
    currentFeedFilter = type;
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const feedEl = document.getElementById('publicFeedContent');
    
    let filtered = allTransactions;
    if (type === 'given') {
        filtered = allTransactions.filter(t => t.type === 'given');
    } else if (type === 'received') {
        filtered = allTransactions.filter(t => t.type === 'received');
    }
    
    if (filtered.length === 0) {
        feedEl.innerHTML = '<div class="empty-state">No transactions yet</div>';
        return;
    }
    
    const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let html = '';
    sorted.forEach(t => {
        const initial = t.username.charAt(0).toUpperCase();
        const action = t.type === 'given' ? 'gave a favor' : 'received a favor';
        
        html += `
            <div class="feed-item">
                <div class="feed-header">
                    <div class="feed-initial">${initial}</div>
                    <div>
                        <div class="feed-username">${t.username}</div>
                        <div class="feed-action">${action}</div>
                    </div>
                </div>
                <div class="feed-favor">${t.favor}</div>
                <div class="feed-stars">
                    ${Array(t.stars).fill('<img src="assets/star.png" class="star-img-small">').join('')}
                </div>
                <div class="feed-time">${formatTime(t.timestamp)}</div>
            </div>
        `;
    });
    feedEl.innerHTML = html;
}

// Render leaderboard
function renderLeaderboard() {
    const boardEl = document.getElementById('leaderboardContent');
    
    if (Object.keys(userStats).length === 0) {
        boardEl.innerHTML = '<div class="empty-state">No data yet</div>';
        return;
    }
    
    const sorted = Object.keys(userStats).sort((a, b) => 
        userStats[b].starsReceived - userStats[a].starsReceived
    );
    
    let html = '';
    sorted.forEach((username, index) => {
        const stats = userStats[username];
        html += `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">#${index + 1}</span>
                <div style="flex: 1;">
                    <div class="leaderboard-name">${username}</div>
                    <div class="leaderboard-stats">Given: ${stats.starsGiven}★ | Received: ${stats.starsReceived}★</div>
                </div>
                <div class="leaderboard-score">${stats.starsReceived}★</div>
            </div>
        `;
    });
    boardEl.innerHTML = html;
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

// Toggle help
function toggleHelp() {
    document.getElementById('helpModal').classList.toggle('show');
}

// Close modals
window.onclick = function(event) {
    const helpModal = document.getElementById('helpModal');
    const transModal = document.getElementById('transactionModal');
    
    if (event.target === helpModal) {
        toggleHelp();
    }
    if (event.target === transModal) {
        closeTransactionModal();
    }
}