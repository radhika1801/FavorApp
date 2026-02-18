// ══════════════════════════════════════
//  FIREBASE CONFIG
// ══════════════════════════════════════
const firebaseConfig = {
    apiKey: "AIzaSyBOth5SxinCh2ndsgKa9Mwry9IPF4SKq-g",
    authDomain: "favor-tracker-af25f.firebaseapp.com",
    databaseURL: "https://favor-tracker-af25f-default-rtdb.firebaseio.com",
    projectId: "favor-tracker-af25f",
    storageBucket: "favor-tracker-af25f.firebasestorage.app",
    messagingSenderId: "444981205078",
    appId: "1:444981205078:web:e51ec9904d52a9823ac3f7"
};

// ══════════════════════════════════════
//  STATE
// ══════════════════════════════════════
let currentUser    = '';
let allTransactions = [];
let userStats      = {};
let db             = null;

let grRating = 3;
let grType   = 'given';

let currentFeedFilter = 'all';

let modalRating    = 3;
let modalType      = 'given';
let modalFriendVal = '';

// ══════════════════════════════════════
//  FIREBASE
// ══════════════════════════════════════
function initFirebase() {
    if (typeof firebase === 'undefined') return;
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
    } catch (e) { console.error('Firebase error:', e); }
}

// ══════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════
function login() {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) { toast('Please enter your name', 'warn'); return; }
    currentUser = username;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';

    const welcomeEl = document.getElementById('homeWelcomeText');
    if (welcomeEl) welcomeEl.textContent = 'Welcome back ' + currentUser;

    initFirebase();
    loadData();
    switchTab('home');
}

// ══════════════════════════════════════
//  TAB SWITCHING
// ══════════════════════════════════════
const TAB_CONFIG = {
    home:        { page: 'homePage',         nav: 'navHome',        icon: 'assets/home.png',               title: '' },
    public:      { page: 'publicPage',       nav: 'navPublic',      icon: 'assets/publicfeedicon.png',     title: 'Public Feed' },
    giveReceive: { page: 'giveReceivePage',  nav: 'navGR',          icon: 'assets/giveandrecieveicon.png', title: 'Log a Favor' },
    connections: { page: 'connectionsPage',  nav: 'navConnections', icon: 'assets/connections.png',        title: 'My Connections' },
    leaderboard: { page: 'leaderboardPage',  nav: 'navLeaderboard', icon: 'assets/Leaderboard.png',        title: 'Leaderboard' }
};

function switchTab(tab) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('nav-active'));

    const cfg = TAB_CONFIG[tab];
    if (!cfg) return;

    const pageEl = document.getElementById(cfg.page);
    if (pageEl) pageEl.classList.add('active');

    const navEl = document.getElementById(cfg.nav);
    if (navEl) navEl.classList.add('nav-active');

    // Top header is hidden — titles/icons are shown within each page

    if (tab === 'public')      renderFeed(currentFeedFilter);
    if (tab === 'connections') renderConnections('');
    if (tab === 'leaderboard') renderLeaderboard();
}

// ══════════════════════════════════════
//  GIVE & RECEIVE PAGE
// ══════════════════════════════════════
function selectGRType(type) {
    grType = type;
    const ta = document.getElementById('grInput');
    const givenBtn = document.getElementById('grGivenBtn');
    const recvBtn  = document.getElementById('grReceivedBtn');
    if (type === 'given') {
        givenBtn.className = 'gr-toggle-btn gr-given-active';
        recvBtn.className  = 'gr-toggle-btn gr-received-inactive';
        setImg('grFavorIcon', 'assets/giving_icon1.png');
        document.getElementById('grLabelText').textContent = 'Given Favor';
        ta.placeholder = 'Describe the favor you gave...';
        ta.classList.remove('border-received'); ta.classList.add('border-given');
    } else {
        givenBtn.className = 'gr-toggle-btn gr-given-inactive';
        recvBtn.className  = 'gr-toggle-btn gr-received-active';
        setImg('grFavorIcon', 'assets/giving_icon.png');
        document.getElementById('grLabelText').textContent = 'Received Favor';
        ta.placeholder = 'Describe the favor you received...';
        ta.classList.remove('border-given'); ta.classList.add('border-received');
    }
}

function setGRRating(r) { grRating = r; updateStars('grStarRow', r); }

function submitFromGR() {
    const favor = document.getElementById('grInput').value.trim();
    if (!favor) { toast('Please describe the favor', 'warn'); return; }
    if (!db)    { toast('Database not connected', 'error'); return; }
    pushTransaction({ username: currentUser, type: grType, favor, stars: grRating })
        .then(() => {
            document.getElementById('grInput').value = '';
            grRating = 3; setGRRating(3);
            toast('Favor logged! 🌟');
        }).catch(e => toast('Error: ' + e.message, 'error'));
}

// ══════════════════════════════════════
//  FIREBASE DATA
// ══════════════════════════════════════
function pushTransaction(data) {
    return db.ref('transactions').push().set({
        ...data,
        timestamp: new Date().toISOString()
    });
}

function loadData() {
    if (!db) return;
    db.ref('transactions').on('value', snap => {
        allTransactions = [];
        snap.forEach(child => {
            const t = child.val();
            t.id = child.key;
            allTransactions.push(t);
        });
        calculateStats();
        const active = document.querySelector('.page.active');
        if (!active) return;
        if (active.id === 'publicPage')      renderFeed(currentFeedFilter);
        if (active.id === 'connectionsPage') renderConnections();
        if (active.id === 'leaderboardPage') renderLeaderboard();
    });
}

function calculateStats() {
    userStats = {};
    allTransactions.forEach(t => {
        if (!userStats[t.username]) {
            userStats[t.username] = { given:0, received:0, starsGiven:0, starsReceived:0, transactions:[] };
        }
        const s = userStats[t.username];
        if (t.type === 'given') { s.given++; s.starsGiven += (t.stars||0); }
        else                    { s.received++; s.starsReceived += (t.stars||0); }
        s.transactions.push(t);
    });
}

// ══════════════════════════════════════
//  PUBLIC FEED — with color-coded bg
// ══════════════════════════════════════
function filterFeed(type, e) {
    currentFeedFilter = type;

    // Update active filter button
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('f-active'));
    if (e && e.currentTarget) e.currentTarget.classList.add('f-active');

    // Swap list background colour via class
    const list = document.getElementById('publicFeedContent');
    if (list) {
        list.classList.remove('feed-list-all','feed-list-given','feed-list-received');
        list.classList.add('feed-list-' + type);
    }

    renderFeed(type);
}

function renderFeed(type) {
    const el = document.getElementById('publicFeedContent');
    if (!el) return;
    let list = allTransactions;
    if (type === 'given')    list = list.filter(t => t.type === 'given');
    if (type === 'received') list = list.filter(t => t.type === 'received');

    if (list.length === 0) {
        el.innerHTML = '<div class="empty-state">No favors yet.<br>Be the first to log one!</div>';
        return;
    }
    const sorted = [...list].sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
    el.innerHTML = sorted.map(t => {
        const action = t.type === 'given' ? 'Gave a favor' : 'Received a favor';
        return `<div class="feed-card">
            <div class="feed-header">
                <img src="assets/friends.png" class="feed-av-img" alt="">
                <div>
                    <div class="feed-username">${esc(t.username)}</div>
                    <div class="feed-action">${action}</div>
                    <div class="feed-favor">${esc(t.favor)}</div>
                    <div class="feed-stars">${starsHTML(t.stars)}</div>
                    <div class="feed-time">${relTime(t.timestamp)}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════
//  CONNECTIONS
// ══════════════════════════════════════
function renderConnections(filter = '') {
    const el = document.getElementById('connectionsList');
    if (!el) return;
    let friends = Object.keys(userStats).filter(u => u.toLowerCase() !== currentUser.toLowerCase());

    // Apply search filter
    if (filter) {
        friends = friends.filter(u => u.toLowerCase().includes(filter.toLowerCase()));
    }

    if (friends.length === 0) {
        el.innerHTML = '<div class="empty-state" style="color:#fff;padding:30px 20px;text-align:center;">No connections found.</div>';
        return;
    }

    el.innerHTML = friends.map(name => {
        return `<div class="conn-row">
            <div class="conn-row-av">
                <img src="assets/friends.png" alt="">
            </div>
            <div class="conn-row-name">${esc(name)}</div>
        </div>`;
    }).join('');
}

function filterConnections(val) {
    renderConnections(val);
}

function addFriendWithFavor(type) {
    const name = document.getElementById('friendInput').value.trim();
    if (!name) { toast("Enter a friend's name", 'warn'); return; }
    if (name.toLowerCase() === currentUser.toLowerCase()) { toast("Can't add yourself!", 'warn'); return; }

    modalFriendVal = name;
    modalType      = type;
    modalRating    = 3;

    const isGiven = type === 'given';
    document.getElementById('modalTitle').textContent      = isGiven ? 'FAVOR YOU GAVE' : 'FAVOR YOU RECEIVED';
    document.getElementById('modalFriendName').textContent = `Friend: ${name}`;
    const ta = document.getElementById('modalInput');
    ta.placeholder = isGiven ? 'What favor did you give?' : 'What favor did you receive?';
    ta.value = '';
    ta.classList.toggle('border-given',    isGiven);
    ta.classList.toggle('border-received', !isGiven);
    setModalRating(3);
    document.getElementById('transactionModal').classList.add('show');
}

function setModalRating(r) { modalRating = r; updateStars('modalStarRow', r); }

function submitFromModal() {
    const favor = document.getElementById('modalInput').value.trim();
    if (!favor) { toast('Please describe the favor', 'warn'); return; }
    if (!db)    { toast('Database not connected', 'error'); return; }
    const username = modalType === 'given' ? currentUser : modalFriendVal;
    pushTransaction({ username, type: modalType, favor, stars: modalRating })
        .then(() => {
            closeTransactionModal();
            document.getElementById('friendInput').value = '';
            toast(`Favor logged with ${modalFriendVal}! 🌟`);
        }).catch(e => toast('Error: ' + e.message, 'error'));
}

function closeTransactionModal() {
    document.getElementById('transactionModal').classList.remove('show');
    document.getElementById('modalInput').value = '';
    document.getElementById('modalFriendName').textContent = '';
    modalRating = 3; setModalRating(3);
}

// ══════════════════════════════════════
//  LEADERBOARD
// ══════════════════════════════════════
function renderLeaderboard() {
    const el = document.getElementById('leaderboardContent');
    if (!el) return;
    const users = Object.keys(userStats);
    if (users.length === 0) {
        el.innerHTML = '<div style="color:#fff;padding:30px;text-align:center;font-family:var(--fn);">No data yet. Start logging favors!</div>';
        return;
    }
    const sorted = [...users].sort((a,b) =>
        (userStats[b].starsGiven + userStats[b].starsReceived) -
        (userStats[a].starsGiven + userStats[a].starsReceived)
    );
    el.innerHTML = sorted.map((name, i) => {
        return `<div class="lb-row">
            <span class="lb-row-num">${i + 1}</span>
            <div class="lb-row-av"><img src="assets/friends.png" alt=""></div>
            <div class="lb-row-name">${esc(name)}</div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════
//  HELP MODAL
// ══════════════════════════════════════
function toggleHelp() {
    document.getElementById('helpModal').classList.toggle('show');
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function updateTypeToggle(givenId, receivedId, type) {
    const gBtn = document.getElementById(givenId);
    const rBtn = document.getElementById(receivedId);
    if (type === 'given') {
        gBtn.classList.add('is-active');
        rBtn.classList.remove('is-active');
        gBtn.classList.add('is-given');
    } else {
        rBtn.classList.add('is-active');
        gBtn.classList.remove('is-active');
    }
}

function updateStars(rowId, rating) {
    document.querySelectorAll(`#${rowId} .star`).forEach((s,i) => {
        s.classList.toggle('filled', i < rating);
    });
}

function setImg(id, src) {
    const el = document.getElementById(id);
    if (el) { el.src = src; el.style.display=''; }
}

function starsHTML(count) {
    let h = '';
    for (let i=0; i<(count||0); i++) h += `<img src="assets/star.png" alt="★">`;
    return h;
}

function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function relTime(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff/60000);
    const h = Math.floor(diff/3600000);
    const d = Math.floor(diff/86400000);
    if (m < 1)  return 'Just now';
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d < 7)  return `${d}d ago`;
    return new Date(ts).toLocaleDateString();
}

// ══════════════════════════════════════
//  TOAST
// ══════════════════════════════════════
function toast(msg, type='success') {
    document.querySelectorAll('.app-toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = 'app-toast';
    el.textContent = msg;
    const colors = {
        success: 'linear-gradient(135deg,#3bacc8,#3a78c8)',
        warn:    'linear-gradient(135deg,#ffd966,#f0a020)',
        error:   'linear-gradient(135deg,#f07840,#c83820)'
    };
    Object.assign(el.style, {
        position:'fixed', bottom:'100px', left:'50%',
        transform:'translateX(-50%) translateY(12px)',
        background: colors[type]||colors.success,
        color:'#fff', padding:'11px 22px', borderRadius:'28px',
        fontFamily:"'Neuropol',Arial,sans-serif", fontSize:'13px', fontWeight:'700',
        boxShadow:'0 6px 22px rgba(0,0,0,0.22)', zIndex:'9999',
        opacity:'0', transition:'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        whiteSpace:'nowrap', letterSpacing:'0.5px'
    });
    document.body.appendChild(el);
    requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(12px)';
        setTimeout(() => el.remove(), 300);
    }, 2600);
}

// ══════════════════════════════════════
//  CLOSE MODALS ON BACKDROP CLICK
// ══════════════════════════════════════
window.onclick = e => {
    if (e.target === document.getElementById('helpModal'))         toggleHelp();
    if (e.target === document.getElementById('transactionModal'))  closeTransactionModal();
};

/* ─────────────────────────────
   AD CAROUSEL
───────────────────────────── */
const AD_IMGS = ['assets/ad1.png', 'assets/ad2.png', 'assets/ad3.png'];
let adCurrent = 0;
let adModalCurrent = 0;

function adGoTo(idx) {
    adCurrent = (idx + AD_IMGS.length) % AD_IMGS.length;
    const track = document.getElementById('adTrack');
    if (!track) return;
    // Track is 300% wide; each slide = 1/3 = 33.333%
    track.style.transform = `translateX(-${adCurrent * (100 / AD_IMGS.length)}%)`;
    // Update dots
    document.querySelectorAll('.ad-dot').forEach((d, i) => {
        d.classList.toggle('ad-dot-active', i === adCurrent);
    });
}

function adNav(dir) {
    adGoTo(adCurrent + dir);
}

function openAdModal(idx) {
    adModalCurrent = idx;
    document.getElementById('adModalImg').src = AD_IMGS[idx];
    document.getElementById('adModalOverlay').classList.add('show');
}

function adModalNav(dir) {
    adModalCurrent = (adModalCurrent + dir + AD_IMGS.length) % AD_IMGS.length;
    document.getElementById('adModalImg').src = AD_IMGS[adModalCurrent];
}

function closeAdModal() {
    document.getElementById('adModalOverlay').classList.remove('show');
}

// Auto-advance every 4s
setInterval(() => { adNav(1); }, 4000);