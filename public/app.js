// State management
let currentUser = JSON.parse(localStorage.getItem('unitransit_user') || 'null');
let authToken = localStorage.getItem('unitransit_token') || null;
let currentTab = 'dashboard';
let authMode = 'login'; // 'login', 'register-driver', 'register-student'
let mapInstance = null;
let mapMarkers = [];
let simulationInterval = null;
let pollingInterval = null;

// Helpers
function showToast(msg, isSuccess = true) {
  const toast = document.getElementById('toast');
  const text = document.getElementById('toast-message');
  const icon = document.getElementById('toast-icon');
  text.textContent = msg;
  icon.setAttribute('data-lucide', isSuccess ? 'check-circle' : 'alert-circle');
  icon.className = `w-4 h-4 ${isSuccess ? 'text-emerald-400' : 'text-rose-400'}`;
  lucide.createIcons();

  toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
  }, 3500);
}

async function api(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  try {
    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'API request failed');
    }
    return data;
  } catch (err) {
    showToast(err.message, false);
    throw err;
  }
}

// Authentication
async function handleLogin(username, password) {
  try {
    const res = await api('/auth/login', 'POST', { username, password });
    currentUser = res.user;
    authToken = res.token;
    localStorage.setItem('unitransit_user', JSON.stringify(currentUser));
    localStorage.setItem('unitransit_token', authToken);
    showToast(`Welcome, ${currentUser.name}!`);
    currentTab = 'dashboard';
    startRealtimePolling();
    renderApp();
  } catch (err) {
    console.error(err);
  }
}

async function handleRegisterDriver(data) {
  try {
    const res = await api('/auth/register-driver', 'POST', data);
    currentUser = res.user;
    authToken = res.token;
    localStorage.setItem('unitransit_user', JSON.stringify(currentUser));
    localStorage.setItem('unitransit_token', authToken);
    showToast(res.message);
    currentTab = 'dashboard';
    startRealtimePolling();
    renderApp();
  } catch (err) {
    console.error(err);
  }
}

async function handleRegisterStudent(data) {
  try {
    const res = await api('/auth/register-student', 'POST', data);
    currentUser = res.user;
    authToken = res.token;
    localStorage.setItem('unitransit_user', JSON.stringify(currentUser));
    localStorage.setItem('unitransit_token', authToken);
    showToast(res.message);
    currentTab = 'dashboard';
    startRealtimePolling();
    renderApp();
  } catch (err) {
    console.error(err);
  }
}

function setAuthMode(mode) {
  authMode = mode;
  renderApp();
}

function logout() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('unitransit_user');
  localStorage.removeItem('unitransit_token');
  if (simulationInterval) clearInterval(simulationInterval);
  if (pollingInterval) clearInterval(pollingInterval);
  authMode = 'login';
  showToast('Logged out successfully');
  renderApp();
}

function navigate(tab) {
  currentTab = tab;
  renderApp();
}

// Cross-tab and Real-time Live Synchronization
window.addEventListener('storage', (e) => {
  if (e.key === 'unitransit_user') {
    currentUser = JSON.parse(e.newValue || 'null');
    authToken = localStorage.getItem('unitransit_token') || null;
    renderApp();
  }
});

function startRealtimePolling() {
  if (pollingInterval) clearInterval(pollingInterval);
  // Auto-refresh dynamic data every 5 seconds so multiple open tabs stay in sync
  pollingInterval = setInterval(async () => {
    if (!currentUser || !authToken) return;
    try {
      // 1. If currently a Driver, sync assigned route/bus dynamically
      if (currentUser.role === 'DRIVER') {
        const meRes = await api('/me');
        if (meRes.user) {
          const oldRoute = currentUser.assignedRouteId;
          const oldBus = currentUser.assignedBusId;
          currentUser.assignedRouteId = meRes.user.assignedRouteId;
          currentUser.assignedBusId = meRes.user.assignedBusId;
          currentUser.dutyStatus = meRes.user.dutyStatus;
          localStorage.setItem('unitransit_user', JSON.stringify(currentUser));
          if (oldRoute !== currentUser.assignedRouteId || oldBus !== currentUser.assignedBusId) {
            showToast(`Management assigned you to ${currentUser.assignedRouteId || 'new route'} & ${currentUser.assignedBusId || 'bus'}!`);
            if (currentTab === 'dashboard') renderRoleDashboard(document.getElementById('portal-content'));
          }
        }
      }
      // 2. If Management and currently on Drivers or Students page, re-render table smoothly
      if (currentUser.role === 'TRANSPORT_ADMIN' || currentUser.role === 'SUPER_ADMIN') {
        const content = document.getElementById('portal-content');
        if (content && currentTab === 'drivers' && !document.getElementById('assign-modal')) {
          renderDriverAllocation(content, true);
        } else if (content && currentTab === 'students' && !document.getElementById('register-modal')) {
          renderStudents(content, true);
        }
      }
    } catch (err) {
      // ignore intermittent background polling errors
    }
  }, 4000);
}

// Top Bar Header
function renderHeader() {
  const bar = document.getElementById('nav-user-bar');
  if (!currentUser) {
    bar.innerHTML = `
      <div class="flex items-center space-x-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-medium text-slate-200">Karunya Transit Portal Online</span>
      </div>
    `;
  } else {
    // Distinct high-contrast badges per role
    let roleBadge = 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40';
    let roleInitialBg = 'bg-gradient-to-tr from-indigo-600 to-sky-500';
    if (currentUser.role === 'DRIVER') {
      roleBadge = 'bg-amber-500/20 text-amber-300 border-amber-400/40';
      roleInitialBg = 'bg-gradient-to-tr from-amber-600 to-orange-500';
    } else if (currentUser.role === 'STUDENT') {
      roleBadge = 'bg-sky-500/20 text-sky-300 border-sky-400/40';
      roleInitialBg = 'bg-gradient-to-tr from-sky-600 to-teal-500';
    }

    bar.innerHTML = `
      <div class="flex items-center space-x-3.5">
        <div class="text-right hidden sm:block">
          <div class="text-xs font-bold text-white tracking-tight">${currentUser.name}</div>
          <div class="flex items-center justify-end space-x-1.5 mt-0.5">
            <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${roleBadge}">
              ${currentUser.role.replace('_', ' ')}
            </span>
            <span class="text-[10px] text-slate-400 font-medium">&bull; Karunya</span>
          </div>
        </div>
        <div class="w-9 h-9 rounded-xl ${roleInitialBg} text-white font-extrabold flex items-center justify-center text-sm shadow-md border border-white/20">
          ${currentUser.name[0]}
        </div>
        <button onclick="logout()" class="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition border border-transparent hover:border-rose-500/30" title="Log out">
          <i data-lucide="log-out" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  }
  lucide.createIcons();
}

// Main Viewport Render
async function renderApp() {
  renderHeader();
  const root = document.getElementById('app-root');

  // IF NOT LOGGED IN: SHOW ONLY THE AUTHENTICATION LOGIN PAGE
  if (!currentUser) {
    root.innerHTML = renderLoginPage();
    lucide.createIcons();
    attachLoginForm();
    return;
  }

  // IF LOGGED IN: RENDER DEDICATED ROLE DASHBOARD WITH EXCLUSIVE SPLIT NAVIGATION
  root.innerHTML = `
    <div class="flex-1 flex w-full h-full overflow-hidden bg-slate-50/80">
      
      <!-- LEFT SIDEBAR: CRISP CONTRASTING NAVIGATION -->
      <aside class="w-64 bg-white border-r border-slate-200/90 flex flex-col h-full flex-shrink-0 z-20 shadow-xs">
        
        <!-- Role Specific Header Pill -->
        <div class="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center space-x-2">
            <span class="w-2 h-2 rounded-full ${currentUser.role === 'DRIVER' ? 'bg-amber-500' : currentUser.role === 'STUDENT' ? 'bg-sky-500' : 'bg-indigo-600'}"></span>
            <span class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">${getRoleTitle()}</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">ONLINE</span>
        </div>

        <!-- Strict Role Nav Links with High Contrast Selection -->
        <div class="flex-1 overflow-y-auto p-3 space-y-1">
          ${getRoleNavLinks().map(link => {
            const isActive = currentTab === link.tab;
            let activeClass = 'bg-slate-900 text-white font-bold shadow-sm';
            let inactiveClass = 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold';
            let iconActive = 'text-sky-400';
            let iconInactive = 'text-slate-400';

            return `
              <button onclick="navigate('${link.tab}')" class="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition duration-150 ${isActive ? activeClass : inactiveClass}">
                <i data-lucide="${link.icon}" class="w-4 h-4 ${isActive ? iconActive : iconInactive}"></i>
                <span>${link.title}</span>
              </button>
            `;
          }).join('')}
        </div>

        <!-- User Information & Logout in Sidebar -->
        <div class="p-3.5 border-t border-slate-200/80 bg-slate-50/90 space-y-2">
          <div class="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
            <div class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Profile</div>
            <div class="text-xs font-bold text-slate-900 truncate mt-0.5">${currentUser.name}</div>
            <div class="text-[10px] font-mono font-medium text-slate-500 truncate">${currentUser.username} &bull; <span class="text-indigo-600 font-bold">${currentUser.role}</span></div>
          </div>
          <button onclick="logout()" class="w-full py-2 px-3 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-700 hover:text-rose-600 rounded-xl text-xs font-bold shadow-2xs transition flex items-center justify-center space-x-2">
            <i data-lucide="log-out" class="w-3.5 h-3.5 text-rose-500"></i>
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      <!-- MAIN WORKSPACE -->
      <section class="flex-1 h-full overflow-y-auto px-6 py-6" id="portal-content">
        <div class="flex items-center justify-center h-64 text-slate-400 text-xs font-medium">
          <i data-lucide="loader-2" class="w-5 h-5 animate-spin mr-2 text-indigo-600"></i> Loading workspace...
        </div>
      </section>

    </div>
  `;
  lucide.createIcons();

  const content = document.getElementById('portal-content');
  try {
    if (currentTab === 'dashboard') await renderRoleDashboard(content);
    else if (currentTab === 'drivers') await renderDriverAllocation(content);
    else if (currentTab === 'tracking') await renderLiveTracking(content);
    else if (currentTab === 'buses') await renderBuses(content);
    else if (currentTab === 'routes') await renderRoutes(content);
    else if (currentTab === 'students') await renderStudents(content);
    else if (currentTab === 'trips') await renderTrips(content);
    else if (currentTab === 'attendance') await renderAttendance(content);
    else if (currentTab === 'fees') await renderFees(content);
    else if (currentTab === 'complaints') await renderComplaints(content);
    else if (currentTab === 'maintenance') await renderMaintenance(content);
  } catch (err) {
    content.innerHTML = `<div class="bg-rose-50 text-rose-700 p-4 rounded-xl border border-rose-200 text-xs">Failed to render view: ${err.message}</div>`;
  }
  lucide.createIcons();
}

// Role Title & Navigation Splits
function getRoleTitle() {
  if (currentUser.role === 'DRIVER') return 'Driver Workspace';
  if (currentUser.role === 'STUDENT') return 'Student Workspace';
  return 'Management Directorate';
}

function getRoleNavLinks() {
  // 1. DRIVER DASHBOARD (Strictly Driver Specific Tools)
  if (currentUser.role === 'DRIVER') {
    return [
      { tab: 'dashboard', title: 'Driver Dashboard', icon: 'steering-wheel' },
      { tab: 'trips', title: 'My Assigned Trips', icon: 'calendar' },
      { tab: 'attendance', title: 'Student Boarding Scanner', icon: 'check-square' },
      { tab: 'tracking', title: 'Live Route GPS Broadcaster', icon: 'map-pin' },
      { tab: 'routes', title: 'Coimbatore Route Corridors', icon: 'git-branch' }
    ];
  }

  // 2. STUDENT DASHBOARD (Strictly Student Transit Tools)
  if (currentUser.role === 'STUDENT') {
    return [
      { tab: 'dashboard', title: 'Student Transit Hub', icon: 'layout-dashboard' },
      { tab: 'tracking', title: 'My Bus Live Tracking', icon: 'map-pin' },
      { tab: 'routes', title: 'City Bus Stops & Timings', icon: 'git-branch' },
      { tab: 'fees', title: 'My Bus Pass & Invoices', icon: 'credit-card' },
      { tab: 'attendance', title: 'My Boarding History', icon: 'clipboard-check' },
      { tab: 'complaints', title: 'Helpdesk & Lost Property', icon: 'message-square' }
    ];
  }

  // 3. MANAGEMENT DASHBOARD (Strictly Full Administrative Fleet Control)
  return [
    { tab: 'dashboard', title: 'Management Overview', icon: 'layout-dashboard' },
    { tab: 'drivers', title: 'Driver Route Allocation', icon: 'steering-wheel' },
    { tab: 'tracking', title: 'Full Fleet Live GPS Radar', icon: 'map-pin' },
    { tab: 'buses', title: 'College Buses (1 to 10)', icon: 'bus' },
    { tab: 'routes', title: 'Routes & Stop Sequencer', icon: 'git-branch' },
    { tab: 'students', title: 'Student Pass Allocations', icon: 'users' },
    { tab: 'trips', title: 'Daily Trip Schedules', icon: 'calendar' },
    { tab: 'attendance', title: 'Boarding Audit Trail', icon: 'clipboard-check' },
    { tab: 'fees', title: 'Fee Collection Ledger', icon: 'receipt' },
    { tab: 'maintenance', title: 'Fleet Maintenance Log', icon: 'wrench' },
    { tab: 'complaints', title: 'Helpdesk Tickets', icon: 'message-square' }
  ];
}

// ----------------------------------------------------
// LOGIN & REGISTRATION GATEWAY (NO DEMO SHORTCUTS)
// ----------------------------------------------------
function renderLoginPage() {
  if (authMode === 'register-driver') {
    return renderDriverRegisterPage();
  }
  if (authMode === 'register-student') {
    return renderStudentRegisterPage();
  }

  return `
    <div class="flex-1 flex items-center justify-center p-6 w-full bg-[#f1f5f9]">
      <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/90 shadow-2xl space-y-6">
        
        <!-- Header -->
        <div class="text-center space-y-2">
          <div class="relative w-14 h-14 mx-auto">
            <div class="absolute inset-0 bg-gradient-to-tr from-indigo-500 via-sky-400 to-emerald-400 rounded-2xl rotate-6 opacity-75 blur-xs"></div>
            <div class="relative w-14 h-14 rounded-2xl bg-[#090d16] p-2.5 flex items-center justify-center border border-indigo-400/50 shadow-xl">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <path d="M8 30C12 20 18 12 32 10" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
                <path d="M12 32C18 32 24 28 28 20" stroke="#a5b4fc" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="2 3"/>
                <circle cx="32" cy="10" r="5" fill="#4f46e5" stroke="#ffffff" stroke-width="1.8"/>
                <circle cx="32" cy="10" r="2" fill="#38bdf8"/>
                <circle cx="8" cy="30" r="3" fill="#10b981"/>
              </svg>
            </div>
          </div>
          <h2 class="text-2xl font-black text-slate-900 tracking-tight pt-1">UniTransit Portal</h2>
          <p class="text-xs text-slate-500 font-medium">Sign in with your university credentials or register a new transit account</p>
        </div>

        <!-- Login Form with High Contrast Focus Rings -->
        <form id="login-form" class="space-y-4 text-xs">
          <div>
            <label class="block font-bold text-slate-800 mb-1">Username or Campus Email</label>
            <input type="text" id="login-username" required placeholder="e.g. driver1, student1, or management" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium text-slate-900 bg-slate-50/50">
          </div>
          <div>
            <label class="block font-bold text-slate-800 mb-1">Password</label>
            <input type="password" id="login-password" required placeholder="Enter your password" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium text-slate-900 bg-slate-50/50">
          </div>
          <button type="submit" class="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-2">
            <span>Sign In to Dashboard</span>
            <i data-lucide="arrow-right" class="w-4 h-4 text-indigo-400"></i>
          </button>
        </form>

        <!-- New User Self-Registration Gateway with Clear Distinct Palettes -->
        <div class="pt-4 border-t border-slate-100 space-y-2.5">
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">
            New Registration Portal
          </div>
          <div class="grid grid-cols-2 gap-2.5 text-center text-xs">
            <button onclick="setAuthMode('register-driver')" class="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-950 transition flex flex-col items-center justify-center space-y-1 shadow-2xs">
              <i data-lucide="steering-wheel" class="w-5 h-5 text-amber-600"></i>
              <span class="font-bold text-xs">Driver Register</span>
              <span class="text-[10px] text-amber-700 font-medium">Join fleet &bull; Await route</span>
            </button>
            <button onclick="setAuthMode('register-student')" class="p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-950 transition flex flex-col items-center justify-center space-y-1 shadow-2xs">
              <i data-lucide="graduation-cap" class="w-5 h-5 text-indigo-600"></i>
              <span class="font-bold text-xs">Student Register</span>
              <span class="text-[10px] text-indigo-700 font-medium">Choose bus &bull; Instant pass</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

function renderDriverRegisterPage() {
  return `
    <div class="flex-1 flex items-center justify-center p-6 w-full bg-[#f1f5f9]">
      <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/90 shadow-2xl space-y-5">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Driver Registration</h2>
            <p class="text-xs text-slate-500 font-medium">Register as a Karunya University Transit Driver</p>
          </div>
          <button onclick="setAuthMode('login')" class="text-xs font-bold text-indigo-600 hover:text-indigo-800">
            &larr; Back to Login
          </button>
        </div>

        <form id="driver-reg-form" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-800 mb-1">Full Legal Name *</label>
            <input type="text" id="drv-name" required placeholder="e.g. S. Kumaran" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 font-medium bg-slate-50/50">
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="block font-bold text-slate-800 mb-1">Username *</label>
              <input type="text" id="drv-username" required placeholder="e.g. driver3" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 font-medium bg-slate-50/50">
            </div>
            <div>
              <label class="block font-bold text-slate-800 mb-1">Password *</label>
              <input type="password" id="drv-password" required placeholder="Create password" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 font-medium bg-slate-50/50">
            </div>
          </div>
          <div>
            <label class="block font-bold text-slate-800 mb-1">Commercial Driver License #</label>
            <input type="text" id="drv-license" required placeholder="e.g. TN-37-20210008412" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 font-mono bg-slate-50/50">
          </div>
          <div>
            <label class="block font-bold text-slate-800 mb-1">Mobile Contact Phone</label>
            <input type="text" id="drv-phone" required placeholder="e.g. +91 98422 77112" class="w-full px-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100 font-medium bg-slate-50/50">
          </div>

          <div class="p-3.5 bg-amber-50/80 border border-amber-300/80 rounded-2xl text-amber-950 text-[11px] leading-relaxed">
            <strong>Operational Note:</strong> Upon registering, your driver profile immediately syncs to the <strong>Management Directorate</strong>. Management will assign your vehicle and route corridor from the 10 available lines.
          </div>

          <button type="submit" class="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-1.5">
            <span>Complete Driver Registration</span>
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        </form>

      </div>
    </div>
  `;
}

function renderStudentRegisterPage() {
  return `
    <div class="flex-1 flex items-center justify-center p-6 w-full bg-[#f1f5f9]">
      <div class="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/90 shadow-2xl space-y-5">
        
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-xl font-black text-slate-900 tracking-tight">Student Transit Registration</h2>
            <p class="text-xs text-slate-500 font-medium">Enroll as a day-scholar and choose your college bus</p>
          </div>
          <button onclick="setAuthMode('login')" class="text-xs font-bold text-indigo-600 hover:text-indigo-800">
            &larr; Back to Login
          </button>
        </div>

        <form id="student-reg-form" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-800 mb-1">Full Student Name *</label>
            <input type="text" id="stu-name" required placeholder="e.g. K. Vignesh" class="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium bg-slate-50/50">
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-800 mb-1">Register # (URK ID) *</label>
              <input type="text" id="stu-id" required placeholder="URK23CS1090" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-mono uppercase bg-slate-50/50">
            </div>
            <div>
              <label class="block font-bold text-slate-800 mb-1">Department</label>
              <input type="text" id="stu-dept" required placeholder="CSE / AI / ECE / BT" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium bg-slate-50/50">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-800 mb-1">Username *</label>
              <input type="text" id="stu-username" required placeholder="e.g. student3" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium bg-slate-50/50">
            </div>
            <div>
              <label class="block font-bold text-slate-800 mb-1">Password *</label>
              <input type="password" id="stu-password" required placeholder="Create password" class="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium bg-slate-50/50">
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-800 mb-1">Choose College Bus to Travel In *</label>
            <select id="stu-bus" required class="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium bg-slate-50/50">
              <option value="BUS-1">Bus 1 &bull; Gandhipuram to Karunya Nagar (via Town Hall, Perur)</option>
              <option value="BUS-2">Bus 2 &bull; Ukkadam to Karunya Nagar (via Kuniyamuthur, Kovaipudur)</option>
              <option value="BUS-3">Bus 3 &bull; Singanallur to Karunya Nagar (via Ramanathapuram, Sungam)</option>
              <option value="BUS-4">Bus 4 &bull; Peelamedu & Hopes to Karunya Nagar (via Lakshmi Mills)</option>
              <option value="BUS-5">Bus 5 &bull; Saibaba Colony & RS Puram to Karunya Nagar</option>
              <option value="BUS-6">Bus 6 &bull; Vadavalli & Thondamuthur to Karunya Nagar</option>
              <option value="BUS-7">Bus 7 &bull; Sundarapuram & Kovaipudur to Karunya Nagar</option>
              <option value="BUS-8">Bus 8 &bull; Saravanampatti & Ganapathy to Karunya Nagar</option>
              <option value="BUS-9">Bus 9 &bull; Thudiyalur & Kavundampalayam to Karunya Nagar</option>
              <option value="BUS-10">Bus 10 &bull; Sulur & Ondipudur to Karunya Nagar</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-800 mb-1">Preferred Pickup Boarding Stop</label>
            <input type="text" id="stu-stop" required placeholder="e.g. Gandhipuram Central Stand, Perur Temple, Ukkadam" class="w-full px-4 py-2 rounded-xl border border-slate-300 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 font-medium bg-slate-50/50">
          </div>

          <button type="submit" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-1.5">
            <span>Register & Confirm Transit Pass</span>
            <i data-lucide="check" class="w-4 h-4"></i>
          </button>
        </form>

      </div>
    </div>
  `;
}

function attachLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('login-username').value.trim();
      const p = document.getElementById('login-password').value.trim();
      handleLogin(u, p);
    });
  }

  const driverForm = document.getElementById('driver-reg-form');
  if (driverForm) {
    driverForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleRegisterDriver({
        name: document.getElementById('drv-name').value.trim(),
        username: document.getElementById('drv-username').value.trim(),
        password: document.getElementById('drv-password').value.trim(),
        licenseNumber: document.getElementById('drv-license').value.trim(),
        phone: document.getElementById('drv-phone').value.trim()
      });
    });
  }

  const studentForm = document.getElementById('student-reg-form');
  if (studentForm) {
    studentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleRegisterStudent({
        name: document.getElementById('stu-name').value.trim(),
        studentId: document.getElementById('stu-id').value.trim(),
        department: document.getElementById('stu-dept').value.trim(),
        username: document.getElementById('stu-username').value.trim(),
        password: document.getElementById('stu-password').value.trim(),
        chosenBusId: document.getElementById('stu-bus').value,
        chosenStopId: document.getElementById('stu-stop').value.trim()
      });
    });
  }
}

// ----------------------------------------------------
// DEDICATED ROLE DASHBOARDS
// ----------------------------------------------------
async function renderRoleDashboard(container) {
  // A. BUS DRIVER DASHBOARD
  if (currentUser.role === 'DRIVER') {
    const tripsRes = await api('/trips');
    const myTrips = tripsRes.data || [];

    const assignedBus = currentUser.assignedBusId || 'Awaiting Allocation';
    const assignedRoute = currentUser.assignedRouteId || 'Awaiting Management Route Assignment';

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Hero Header Card -->
        <div class="relative overflow-hidden bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-white p-6 rounded-3xl shadow-lg border border-amber-500/30">
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1.5">
              <div class="flex items-center space-x-2">
                <span class="text-[10px] font-mono uppercase bg-black/25 px-2.5 py-1 rounded-full border border-white/20 tracking-wider">Bus Driver Operations Cockpit</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${currentUser.dutyStatus === 'ON_DUTY' ? 'bg-emerald-400 text-slate-950' : 'bg-amber-300 text-slate-900'}">
                  ${currentUser.dutyStatus || 'ON_DUTY'}
                </span>
              </div>
              <h2 class="text-2xl font-black tracking-tight">${currentUser.name}</h2>
              <p class="text-xs text-amber-100 flex items-center space-x-2">
                <span>Vehicle: <strong class="text-white">${assignedBus}</strong></span>
                <span>&bull;</span>
                <span>Corridor: <strong class="text-white">${assignedRoute}</strong></span>
              </p>
            </div>
            <div class="flex flex-wrap gap-2.5">
              <button onclick="navigate('attendance')" class="px-4 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-xs shadow-md hover:bg-amber-50 transition flex items-center space-x-2">
                <i data-lucide="scan" class="w-4 h-4 text-amber-600"></i>
                <span>Open Boarding Scanner</span>
              </button>
              <button onclick="navigate('tracking')" class="px-4 py-2.5 bg-slate-950/60 text-white font-bold rounded-xl text-xs border border-white/20 hover:bg-slate-950/80 transition flex items-center space-x-2">
                <i data-lucide="map-pin" class="w-4 h-4 text-amber-400"></i>
                <span>Broadcast Live GPS</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 3 Essential KPI Metrics -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg border border-amber-100">
              <i data-lucide="bus" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Designated Vehicle</div>
              <div class="text-xl font-black text-slate-900 mt-0.5">${assignedBus}</div>
              <div class="text-[11px] text-amber-700 font-medium">${assignedRoute}</div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg border border-sky-100">
              <i data-lucide="users" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Boarded Today</div>
              <div class="text-xl font-black text-slate-900 mt-0.5">${myTrips.length > 0 ? (myTrips[0].boardedCount || 0) : 0} Students</div>
              <div class="text-[11px] text-emerald-600 font-medium">Verified QR / Token scans</div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100">
              <i data-lucide="activity" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Current Status</div>
              <div class="text-xl font-black text-emerald-600 mt-0.5">${myTrips.length > 0 ? myTrips[0].status : (currentUser.assignedRouteId ? 'READY ON CORRIDOR' : 'AWAITING ASSIGNMENT')}</div>
              <div class="text-[11px] text-slate-500">${currentUser.assignedRouteId ? 'Karunya Nagar Transit Service' : 'Waiting for management dispatch'}</div>
            </div>
          </div>
        </div>

        <!-- Today's Schedule Card -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">Today's Operating Trips & Corridor Schedules</h3>
              <p class="text-xs text-slate-500">Live trip lifecycle, departure timings, and student boarding scanner controls.</p>
            </div>
          </div>

          ${myTrips.length === 0 ? `
            <div class="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
              <i data-lucide="calendar" class="w-8 h-8 text-slate-400 mx-auto"></i>
              <p class="font-bold text-slate-800 text-sm">${currentUser.assignedRouteId ? 'Trip scheduled on ' + currentUser.assignedRouteId : 'No Route Allocated Yet'}</p>
              <p class="text-xs text-slate-500 max-w-sm mx-auto">When the Management Directorate assigns your route or dispatches trips, they will appear here in real time.</p>
            </div>
          ` : myTrips.map(t => `
            <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">${t.type || 'PICKUP'}</span>
                  <span class="font-bold text-slate-900 text-sm">${t.routeName}</span>
                </div>
                <div class="text-slate-500">
                  Scheduled Time: <strong class="text-slate-700">${t.startTime} to ${t.endTime}</strong> &bull; Boarded: <strong class="text-sky-700">${t.boardedCount || 0}</strong> students
                </div>
              </div>
              <button onclick="updateTripStatus('${t.id}', '${t.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS'}')" class="px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${t.status === 'IN_PROGRESS' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-emerald-600 text-white hover:bg-emerald-500'}">
                ${t.status === 'IN_PROGRESS' ? 'Complete Trip' : 'Start Active Trip'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // B. STUDENT DASHBOARD
  if (currentUser.role === 'STUDENT') {
    const invRes = await api('/invoices');
    const myInvoices = invRes.data || [];

    const assignedBus = currentUser.assignedBusId || 'Bus 1';
    const assignedRoute = currentUser.assignedRouteId || 'Route 1 (Gandhipuram to Karunya Nagar)';
    const assignedStop = currentUser.assignedStopId || 'Campus Gate / Gandhipuram';

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Hero Header Card -->
        <div class="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-700 text-white p-6 rounded-3xl shadow-lg border border-blue-500/30">
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="space-y-1.5">
              <div class="flex items-center space-x-2">
                <span class="text-[10px] font-mono uppercase bg-black/25 px-2.5 py-1 rounded-full border border-white/20 tracking-wider">Day-Scholar Student Transit Portal</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-950">PASS ACTIVE</span>
              </div>
              <h2 class="text-2xl font-black tracking-tight">${currentUser.name} (${currentUser.studentId || 'STUDENT'})</h2>
              <p class="text-xs text-blue-100 flex items-center space-x-2">
                <span>Department: <strong class="text-white">${currentUser.department || 'B.Tech'}</strong></span>
                <span>&bull;</span>
                <span>Designated Bus: <strong class="text-white">${assignedBus}</strong></span>
              </p>
            </div>
            <div>
              <button onclick="navigate('tracking')" class="px-5 py-2.5 bg-white text-blue-900 font-bold rounded-xl text-xs shadow-md hover:bg-blue-50 transition flex items-center space-x-2">
                <i data-lucide="map-pin" class="w-4 h-4 text-blue-600"></i>
                <span>Track My Bus Live</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 3 Clean Metrics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg border border-sky-100">
              <i data-lucide="bus" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">My Designated Bus</div>
              <div class="text-xl font-black text-slate-900 mt-0.5">${assignedBus}</div>
              <div class="text-[11px] text-sky-600 font-medium">${assignedRoute}</div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-100">
              <i data-lucide="map-pin" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Designated Pickup Stop</div>
              <div class="text-xl font-black text-slate-900 mt-0.5 truncate">${assignedStop}</div>
              <div class="text-[11px] text-indigo-600 font-medium">Daily Service Timings Active</div>
            </div>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
            <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-100">
              <i data-lucide="shield-check" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Semester Pass Status</div>
              <div class="text-xl font-black text-emerald-600 mt-0.5">PAID & ACTIVE</div>
              <div class="text-[11px] text-slate-500">Odd Semester 2026-27 Pass Valid</div>
            </div>
          </div>
        </div>

        <!-- Student Receipts Section -->
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-sm font-bold text-slate-900">My University Transit Pass & Digital Fee Receipts</h3>
              <p class="text-xs text-slate-500">Official proof of semester transport payment and Karunya bus pass.</p>
            </div>
          </div>

          <div class="space-y-2.5">
            ${myInvoices.map(inv => `
              <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div class="space-y-0.5">
                  <div class="font-bold text-slate-900 text-sm">${inv.planTitle}</div>
                  <div class="text-slate-500 text-[11px]">
                    Receipt Number: <strong class="text-sky-700 font-mono">${inv.receiptNumber || 'Pending'}</strong> &bull; Paid via: <span class="text-slate-700">${inv.paymentMethod}</span>
                  </div>
                </div>
                <div class="flex items-center space-x-3">
                  <span class="text-sm font-black text-slate-900">₹${(inv.amount || 14500).toLocaleString('en-IN')}</span>
                  <span class="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-xs flex items-center space-x-1">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                    <span>Paid</span>
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    lucide.createIcons();
    return;
  }

  // C. MANAGEMENT DASHBOARD (Full Administrative Director View)
  const statsRes = await api('/stats');
  const stats = statsRes.data;

  container.innerHTML = `
    <div class="space-y-5">
      <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="text-[11px] font-bold uppercase tracking-wider text-sky-600 font-mono">Karunya University Directorate</div>
          <h2 class="text-xl font-bold text-slate-900 mt-0.5">Transport Management Operations</h2>
          <p class="text-xs text-slate-500">Fleet Control &bull; Buses 1 to 10 &bull; Coimbatore City Corridors</p>
        </div>
        <button onclick="navigate('drivers')" class="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl shadow transition">
          Assign Driver Routes
        </button>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-[11px] font-bold text-slate-400 uppercase">Active Fleet</div>
          <div class="text-2xl font-black text-slate-900 mt-1">${stats.activeBuses} / ${stats.totalBuses}</div>
          <div class="text-[11px] text-sky-600 font-medium">Buses 1 to 10</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-[11px] font-bold text-slate-400 uppercase">Coimbatore Routes</div>
          <div class="text-2xl font-black text-slate-900 mt-1">${stats.activeRoutes} Corridors</div>
          <div class="text-[11px] text-blue-600 font-medium">Siruvani & Perur Roads</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-[11px] font-bold text-slate-400 uppercase">Active Trips</div>
          <div class="text-2xl font-black text-slate-900 mt-1">${stats.tripsInProgress} Dispatched</div>
          <div class="text-[11px] text-amber-600 font-medium">${stats.driversOnDuty} Drivers on duty</div>
        </div>
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div class="text-[11px] font-bold text-slate-400 uppercase">Total Pass Revenue</div>
          <div class="text-2xl font-black text-slate-900 mt-1">₹${stats.totalRevenueCollected.toLocaleString('en-IN')}</div>
          <div class="text-[11px] text-emerald-600 font-medium">Recorded in MongoDB</div>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// LIVE TRACKING (OpenStreetMap)
// ----------------------------------------------------
async function renderLiveTracking(container) {
  const busesRes = await api('/buses');
  const routesRes = await api('/routes');
  const buses = busesRes.data;
  const routes = routesRes.data;

  container.innerHTML = `
    <div class="space-y-4 h-full flex flex-col">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Karunya Nagar &bull; Coimbatore Live Map</h2>
          <p class="text-xs text-slate-500">Live positions for Buses 1 to 10 operating along Siruvani & Perur corridors.</p>
        </div>
        <button id="sim-btn" onclick="toggleSimulation()" class="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition">
          Start Live Movement
        </button>
      </div>

      <div class="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex-1 min-h-[440px]">
        <div id="tracking-map"></div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
        ${buses.slice(0, 5).map(b => `
          <div class="bg-white p-2.5 rounded-lg border border-slate-200 text-xs shadow-xs">
            <div class="flex justify-between items-center">
              <span class="font-bold text-slate-900">${b.busNumber || b.regNumber}</span>
              <span class="w-2 h-2 rounded-full ${b.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
            </div>
            <div class="text-[10px] text-slate-500 mt-1 truncate">${b.assignedRoute}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  setTimeout(() => initMap(buses, routes), 100);
}

function initMap(buses, routes) {
  if (mapInstance) {
    mapInstance.remove();
  }

  mapInstance = L.map('tracking-map').setView([10.9800, 76.8600], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapInstance);

  mapMarkers = [];

  const karunyaIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color:#0066cc;color:white;padding:3px 7px;border-radius:6px;font-size:10px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.3);white-space:nowrap;">🎓 Karunya University</div>`,
    iconSize: [115, 25]
  });
  L.marker([10.9360, 76.7441], { icon: karunyaIcon }).addTo(mapInstance).bindPopup("<strong>Karunya University Main Campus</strong><br>Karunya Nagar, Coimbatore");

  routes.forEach(route => {
    if (route.stops && route.stops.length > 0) {
      const latlngs = route.stops.map(s => [s.lat, s.lng]);
      L.polyline(latlngs, { color: '#0284c7', weight: 3.5, opacity: 0.8 }).addTo(mapInstance);

      route.stops.forEach(s => {
        L.circleMarker([s.lat, s.lng], {
          radius: 4,
          color: '#0f172a',
          fillColor: '#38bdf8',
          fillOpacity: 1
        }).addTo(mapInstance).bindPopup(`<strong>${s.name}</strong><br>${route.routeNumber} (${s.pickupTime})`);
      });
    }
  });

  buses.forEach(bus => {
    if (bus.currentLat && bus.currentLng) {
      const marker = L.marker([bus.currentLat, bus.currentLng]).addTo(mapInstance);
      marker.bindPopup(`
        <div class="text-xs">
          <strong>${bus.busNumber || bus.regNumber}</strong> (${bus.regNumber})<br>
          Driver: ${bus.assignedDriver}<br>
          Speed: ${bus.speedKmh || 0} km/h
        </div>
      `);
      mapMarkers.push({ busId: bus.id, marker });
    }
  });
}

function toggleSimulation() {
  const btn = document.getElementById('sim-btn');
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    btn.textContent = 'Start Live Movement';
    btn.className = 'px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition';
    showToast('Simulation paused');
  } else {
    btn.textContent = 'Pause Movement';
    btn.className = 'px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-500 transition';
    showToast('Simulating live movement along Siruvani Road');

    simulationInterval = setInterval(async () => {
      mapMarkers.forEach(m => {
        const curLatLng = m.marker.getLatLng();
        const newLat = curLatLng.lat + (Math.random() - 0.52) * 0.001;
        const newLng = curLatLng.lng + (Math.random() - 0.52) * 0.001;
        m.marker.setLatLng([newLat, newLng]);
      });
    }, 2000);
  }
}

// ----------------------------------------------------
// MANAGEMENT: DRIVER ROUTE ALLOCATION MODULE
// ----------------------------------------------------
async function renderDriverAllocation(container, isSilentRefresh = false) {
  const driversRes = await api('/drivers');
  const routesRes = await api('/routes');
  const busesRes = await api('/buses');
  const drivers = driversRes.data || [];
  const routes = routesRes.data || [];
  const buses = busesRes.data || [];

  window._cachedRoutes = routes;
  window._cachedBuses = buses;

  const html = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-lg font-bold text-slate-900">Driver & Corridor Allocation Center</h2>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">LIVE SYNC</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Management assigns Coimbatore routes (1 to 10) and college buses directly to registered drivers.</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200 uppercase">
            <tr>
              <th class="py-2.5 px-3">Driver Name</th>
              <th class="py-2.5 px-3">License & Expiry</th>
              <th class="py-2.5 px-3">Contact</th>
              <th class="py-2.5 px-3">Assigned Vehicle</th>
              <th class="py-2.5 px-3">Assigned Route</th>
              <th class="py-2.5 px-3">Duty Status</th>
              <th class="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${drivers.map(d => `
              <tr class="hover:bg-slate-50/60 ${d.dutyStatus === 'PENDING_ASSIGNMENT' ? 'bg-amber-50/40' : ''}">
                <td class="py-2.5 px-3 font-bold text-slate-900">
                  ${d.name}
                  <span class="block text-[10px] text-slate-400 font-normal">ID: ${d.id} &bull; ${d.username}</span>
                </td>
                <td class="py-2.5 px-3 text-slate-600 font-mono">
                  ${d.licenseNumber || 'Verified RTO'}
                  <span class="block text-[10px] text-slate-400">Exp: ${d.licenseExpiry || '2028-12-31'}</span>
                </td>
                <td class="py-2.5 px-3 text-slate-600">${d.phone}</td>
                <td class="py-2.5 px-3 font-semibold ${d.assignedBusId ? 'text-sky-700' : 'text-amber-600 italic'}">${d.assignedBusId || 'Unassigned'}</td>
                <td class="py-2.5 px-3 font-medium ${d.assignedRouteId ? 'text-slate-800' : 'text-amber-600 italic'}">${d.assignedRouteId || 'Awaiting Route'}</td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${d.dutyStatus === 'PENDING_ASSIGNMENT' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${d.dutyStatus || 'ON_DUTY'}</span>
                </td>
                <td class="py-2.5 px-3 text-right">
                  <button onclick="openAssignModal('${d.id}', '${d.name}', '${d.assignedRouteId || ''}', '${d.assignedBusId || ''}')" class="px-2.5 py-1 ${d.dutyStatus === 'PENDING_ASSIGNMENT' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-sky-600 hover:bg-sky-500'} text-white rounded-md text-[11px] font-semibold transition">
                    ${d.assignedRouteId ? 'Reassign' : 'Assign Route'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (isSilentRefresh) {
    if (container) container.innerHTML = html;
  } else {
    container.innerHTML = html;
  }
}

function openAssignModal(driverId, driverName, currentRoute, currentBus) {
  const routes = window._cachedRoutes || [];
  const buses = window._cachedBuses || [];

  const defaultRoutes = [
    'Route 1 (Gandhipuram to Karunya Nagar)',
    'Route 2 (Ukkadam to Karunya Nagar)',
    'Route 3 (Singanallur to Karunya Nagar)',
    'Route 4 (Vadavalli & Thondamuthur to Karunya)',
    'Route 5 (Saibaba Colony & RS Puram to Karunya)',
    'Route 6 (Peelamedu & Hopes to Karunya Nagar)',
    'Route 7 (Sundarapuram & Kovaipudur to Karunya)',
    'Route 8 (Saravanampatti & Ganapathy to Karunya)',
    'Route 9 (Thudiyalur & Kavundampalayam to Karunya)',
    'Route 10 (Sulur & Ondipudur to Karunya Nagar)'
  ];

  const defaultBuses = [
    { id: 'BUS-1', name: 'Bus 1 (TN 37 BK 1001) - 55 Seats' },
    { id: 'BUS-2', name: 'Bus 2 (TN 37 BK 1002) - 50 Seats' },
    { id: 'BUS-3', name: 'Bus 3 (TN 37 BK 1003) - 45 Seats' },
    { id: 'BUS-4', name: 'Bus 4 (TN 37 BK 1004) - 52 Seats' },
    { id: 'BUS-5', name: 'Bus 5 (TN 37 BK 1005) - 55 Seats' },
    { id: 'BUS-6', name: 'Bus 6 (TN 37 BK 1006) - 48 Seats' },
    { id: 'BUS-7', name: 'Bus 7 (TN 37 BK 1007) - 50 Seats' },
    { id: 'BUS-8', name: 'Bus 8 (TN 37 BK 1008) - 55 Seats' },
    { id: 'BUS-9', name: 'Bus 9 (TN 37 BK 1009) - 48 Seats' },
    { id: 'BUS-10', name: 'Bus 10 (TN 37 BK 1010) - 52 Seats' }
  ];

  const modalHtml = `
    <div id="assign-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Assign Route to Driver</h3>
            <p class="text-[11px] text-slate-500">${driverName} (${driverId})</p>
          </div>
          <button onclick="document.getElementById('assign-modal').remove()" class="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form id="assign-form" class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Select Transit Corridor (Out of 10 Available Routes) *</label>
            <select id="assign-route-id" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 font-medium">
              ${(routes.length > 0 ? routes : defaultRoutes.map(r => ({ name: r }))).map(r => `
                <option value="${r.name || r.routeNumber}" ${currentRoute && (currentRoute.includes(r.name) || r.name.includes(currentRoute)) ? 'selected' : ''}>
                  ${r.name || r.routeNumber}
                </option>
              `).join('')}
            </select>
          </div>
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Select Assigned College Bus *</label>
            <select id="assign-bus-id" class="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-sky-500 font-medium">
              ${(buses.length > 0 ? buses : defaultBuses).map(b => `
                <option value="${b.id}" ${currentBus === b.id ? 'selected' : ''}>
                  ${b.busNumber || b.id} (${b.regNumber || b.name || ''})
                </option>
              `).join('')}
            </select>
          </div>
          <div class="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="document.getElementById('assign-modal').remove()" class="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
            <button type="submit" class="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow">Confirm Assignment</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('assign-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const assignedRouteId = document.getElementById('assign-route-id').value;
    const assignedBusId = document.getElementById('assign-bus-id').value;

    const res = await api(`/drivers/${driverId}/assign`, 'PATCH', {
      assignedRouteId,
      assignedBusId
    });

    document.getElementById('assign-modal').remove();
    showToast(res.message);
    renderDriverAllocation(document.getElementById('portal-content'));
  });
}

// ----------------------------------------------------
// BUSES (1 to 10)
// ----------------------------------------------------
async function renderBuses(container) {
  const busesRes = await api('/buses');
  const buses = busesRes.data;

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Karunya College Buses (1 to 10)</h2>
          <p class="text-xs text-slate-500">Official fleet for Coimbatore routes with RTO fitness validity.</p>
        </div>
        ${currentUser.role === 'TRANSPORT_ADMIN' ? `
          <button onclick="openAddBusModal()" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition">
            + Add Bus
          </button>
        ` : ''}
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200 uppercase">
            <tr>
              <th class="py-2.5 px-3">Bus #</th>
              <th class="py-2.5 px-3">Registration</th>
              <th class="py-2.5 px-3">Capacity</th>
              <th class="py-2.5 px-3">Driver</th>
              <th class="py-2.5 px-3">Route</th>
              <th class="py-2.5 px-3">Status</th>
              <th class="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${buses.map(b => `
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-bold text-slate-900">${b.busNumber || 'Bus'}</td>
                <td class="py-2.5 px-3 font-semibold text-slate-800">${b.regNumber}</td>
                <td class="py-2.5 px-3 text-slate-600">${b.capacity} Seats</td>
                <td class="py-2.5 px-3 text-slate-700">${b.assignedDriver}</td>
                <td class="py-2.5 px-3 text-slate-600">${b.assignedRoute}</td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${b.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${b.status}</span>
                </td>
                <td class="py-2.5 px-3 text-right">
                  <button onclick="deleteBus('${b.id}')" class="text-rose-500 hover:text-rose-700 font-medium">Archive</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function deleteBus(id) {
  if (!confirm(`Archive bus ${id}?`)) return;
  await api(`/buses/${id}`, 'DELETE');
  showToast('Bus archived');
  renderBuses(document.getElementById('portal-content'));
}

function openAddBusModal() {
  const busNumber = prompt('Enter Bus Number (e.g. Bus 11):', 'Bus 11');
  if (!busNumber) return;
  const regNumber = prompt('Enter Registration (e.g. TN 37 BK 1011):', 'TN 37 BK 1011');
  if (!regNumber) return;

  api('/buses', 'POST', {
    busNumber,
    regNumber,
    model: 'Ashok Leyland Viking',
    capacity: 55,
    fuelType: 'Diesel / BS-VI',
    status: 'ACTIVE',
    assignedDriver: 'Unassigned',
    assignedRoute: 'Route 1 (Gandhipuram to Karunya)',
    fitnessCertExpiry: '2027-12-31',
    currentLat: 10.9360,
    currentLng: 76.7441,
    speedKmh: 0
  }).then(() => {
    showToast(`${busNumber} registered`);
    renderBuses(document.getElementById('portal-content'));
  });
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------
async function renderRoutes(container) {
  const routesRes = await api('/routes');
  const routes = routesRes.data;

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Coimbatore City &bull; Karunya Nagar Corridors</h2>
        <p class="text-xs text-slate-500">Scheduled college transit routes and sequenced pickup arrival points.</p>
      </div>

      <div class="space-y-3">
        ${routes.map(r => `
          <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <div>
                <span class="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">${r.routeNumber}</span>
                <span class="font-bold text-slate-900 ml-1.5">${r.name}</span>
              </div>
              <span class="text-slate-500">${r.distanceKm} KM &bull; Departure: <strong class="text-slate-700">${r.departureTime}</strong></span>
            </div>

            <div class="flex flex-wrap gap-1.5 pt-1">
              ${r.stops.map(s => `
                <div class="flex items-center space-x-1 px-2 py-1 rounded bg-white text-slate-700 border border-slate-200 text-[11px]">
                  <span class="w-3.5 h-3.5 rounded-full bg-sky-600 text-white text-[9px] flex items-center justify-center font-bold">${s.sequence}</span>
                  <span>${s.name}</span>
                  <span class="text-sky-600 font-semibold text-[10px]">(${s.pickupTime})</span>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// STUDENTS
// ----------------------------------------------------
async function renderStudents(container, isSilentRefresh = false) {
  const studentsRes = await api('/students');
  const students = studentsRes.data || [];

  const html = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-lg font-bold text-slate-900">Student Transit Pass Directory</h2>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 animate-pulse">REALTIME SYNC</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Registered day scholars, selected college buses, and allocated route corridors.</p>
        </div>
        ${currentUser.role === 'TRANSPORT_ADMIN' ? `
          <button onclick="openRegisterStudentModal()" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition">
            + Enroll Student
          </button>
        ` : ''}
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200 uppercase">
            <tr>
              <th class="py-2.5 px-3">Register #</th>
              <th class="py-2.5 px-3">Name</th>
              <th class="py-2.5 px-3">Department</th>
              <th class="py-2.5 px-3">Chosen Bus</th>
              <th class="py-2.5 px-3">Route Corridor</th>
              <th class="py-2.5 px-3">Pickup Stop</th>
              <th class="py-2.5 px-3">Pass Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${students.map(s => `
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-mono font-bold text-sky-700">${s.id}</td>
                <td class="py-2.5 px-3 font-bold text-slate-900">${s.name}</td>
                <td class="py-2.5 px-3 text-slate-600">${s.department || 'B.Tech'}</td>
                <td class="py-2.5 px-3 font-bold text-sky-800">${s.assignedBusId || 'Bus 1'}</td>
                <td class="py-2.5 px-3 font-medium text-slate-800">${s.assignedRouteId || 'Coimbatore Link'}</td>
                <td class="py-2.5 px-3 text-slate-600">${s.assignedStopId}</td>
                <td class="py-2.5 px-3">
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">${s.subscriptionStatus || 'ACTIVE'}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (isSilentRefresh) {
    if (container) container.innerHTML = html;
  } else {
    container.innerHTML = html;
  }
}

function openRegisterStudentModal() {
  const id = prompt('Enter Student Register # (URK ID):', 'URK23CS1090');
  if (!id) return;
  const name = prompt('Enter Full Name:', 'K. Vignesh');
  if (!name) return;

  api('/students', 'POST', {
    id,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, '')}@karunya.edu.in`,
    phone: '+91 98422 11223',
    department: 'Computer Science & Engineering',
    courseYear: 'B.Tech - 2nd Year',
    assignedRouteId: 'Route 1 (Gandhipuram to Karunya)',
    assignedStopId: 'Town Hall / Railway Station Road',
    subscriptionStatus: 'ACTIVE',
    emergencyContact: 'Parent Contact (+91 94430 00000)'
  }).then(() => {
    showToast(`Enrolled ${name} (${id})`);
    renderStudents(document.getElementById('portal-content'));
  });
}

// ----------------------------------------------------
// TRIPS (MY ASSIGNED TRIPS FOR DRIVERS / ALL TRIPS FOR MANAGEMENT)
// ----------------------------------------------------
async function renderTrips(container) {
  const tripsRes = await api('/trips');
  let trips = tripsRes.data || [];

  // If driver has an assigned route from management but no historical trip entry yet, generate display record
  if (currentUser.role === 'DRIVER' && trips.length === 0 && currentUser.assignedRouteId) {
    trips = [{
      id: 'TRP-TODAY',
      routeName: currentUser.assignedRouteId,
      busRegNumber: currentUser.assignedBusId || 'Designated College Bus',
      driverName: currentUser.name,
      status: 'SCHEDULED',
      boardedCount: 0,
      totalAssignedStudents: 45,
      startTime: '07:15 AM',
      endTime: '08:15 AM'
    }];
  }

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
      <div class="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <div class="flex items-center space-x-2">
            <h2 class="text-lg font-bold text-slate-900">${currentUser.role === 'DRIVER' ? 'My Assigned Operating Trips' : 'Daily University Transit Schedules'}</h2>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">DISPATCH READY</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">${currentUser.role === 'DRIVER' ? 'Your active morning pickup & evening return corridors assigned by Directorate.' : 'Fleet schedule dispatch from Coimbatore to Karunya Nagar.'}</p>
        </div>
      </div>

      ${trips.length === 0 ? `
        <div class="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
          <i data-lucide="calendar" class="w-8 h-8 text-slate-400 mx-auto"></i>
          <p class="font-bold text-slate-800 text-sm">No Active Trips Assigned Yet</p>
          <p class="text-xs text-slate-500 max-w-sm mx-auto">When the Management Directorate assigns your corridor from Driver Allocation, it will immediately display here.</p>
        </div>
      ` : `
        <div class="space-y-3">
          ${trips.map(t => `
            <div class="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-amber-200 transition">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <span class="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">${t.id}</span>
                  <span class="px-2.5 py-0.5 rounded text-[10px] font-bold ${t.status === 'IN_PROGRESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${t.status}</span>
                </div>
                <div class="font-bold text-base text-slate-900 mt-1">${t.routeName}</div>
                <div class="text-slate-500 flex items-center space-x-2">
                  <span>Assigned Vehicle: <strong class="text-slate-800 font-bold">${t.busRegNumber}</strong></span>
                  <span>&bull;</span>
                  <span>Scheduled: <strong class="text-slate-700">${t.startTime || '07:15 AM'} - ${t.endTime || '08:15 AM'}</strong></span>
                </div>
              </div>

              <div class="flex items-center space-x-3">
                <div class="text-right hidden sm:block">
                  <div class="font-black text-slate-900 text-sm">${t.boardedCount || 0} / ${t.totalAssignedStudents || 45}</div>
                  <div class="text-[10px] text-slate-400 font-medium">Students Boarded</div>
                </div>
                ${(currentUser.role === 'DRIVER' || currentUser.role === 'TRANSPORT_ADMIN') ? `
                  <button onclick="updateTripStatus('${t.id}', '${t.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS'}')" class="px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${t.status === 'IN_PROGRESS' ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-emerald-600 text-white hover:bg-emerald-500'}">
                    ${t.status === 'IN_PROGRESS' ? 'Complete Trip' : 'Start Trip'}
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
  lucide.createIcons();
}

async function updateTripStatus(id, status) {
  await api(`/trips/${id}/status`, 'PATCH', { status });
  showToast(`Trip ${status}`);
  renderTrips(document.getElementById('portal-content'));
}

// ----------------------------------------------------
// ATTENDANCE
// ----------------------------------------------------
async function renderAttendance(container) {
  const attRes = await api('/attendance');
  const records = attRes.data;

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Student Boarding Check-in</h2>
          <p class="text-xs text-slate-500">Driver verification events on active trips.</p>
        </div>
        ${(currentUser.role === 'DRIVER' || currentUser.role === 'TRANSPORT_ADMIN') ? `
          <button onclick="openMarkAttendanceModal()" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition">
            + Check-In Student
          </button>
        ` : ''}
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 text-slate-500 font-semibold border-y border-slate-200 uppercase">
            <tr>
              <th class="py-2.5 px-3">Event ID</th>
              <th class="py-2.5 px-3">Student</th>
              <th class="py-2.5 px-3">Pickup Stop</th>
              <th class="py-2.5 px-3">Time</th>
              <th class="py-2.5 px-3">Verified By</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${records.map(r => `
              <tr class="hover:bg-slate-50/60">
                <td class="py-2.5 px-3 font-mono font-bold text-slate-800">${r.id}</td>
                <td class="py-2.5 px-3 font-bold text-slate-900">${r.studentName}</td>
                <td class="py-2.5 px-3 text-slate-600">${r.stopName}</td>
                <td class="py-2.5 px-3 text-slate-500">${new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="py-2.5 px-3 text-slate-600">${r.verifiedBy}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function openMarkAttendanceModal() {
  const studentName = prompt('Enter Student Name for boarding check-in:', 'Rahul Krishnan (URK22CS1045)');
  if (!studentName) return;

  api('/attendance', 'POST', {
    tripId: 'TRP-101',
    studentId: 'URK22CS1045',
    studentName,
    routeId: 'RT-1',
    stopName: 'Gandhipuram Central Bus Stand',
    eventType: 'BOARDED'
  }).then(() => {
    showToast(`Checked in ${studentName}`);
    renderAttendance(document.getElementById('portal-content'));
  });
}

// ----------------------------------------------------
// FEES & INVOICES
// ----------------------------------------------------
async function renderFees(container) {
  const invRes = await api('/invoices');
  const invoices = invRes.data;

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Karunya Bus Pass & Fee Invoices</h2>
        <p class="text-xs text-slate-500">Day-scholar bus fee receipts and online payments.</p>
      </div>

      <div class="space-y-3">
        ${invoices.map(inv => `
          <div class="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div class="flex items-center space-x-2">
                <span class="font-mono font-bold text-slate-900">${inv.id}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${inv.status}</span>
              </div>
              <div class="font-bold text-sm text-slate-900 mt-1">${inv.planTitle}</div>
              <div class="text-slate-500">Student: <strong class="text-slate-700">${inv.studentName}</strong> (${inv.studentId})</div>
              ${inv.receiptNumber ? `<div class="text-sky-700 font-mono mt-0.5 font-medium">Receipt: ${inv.receiptNumber}</div>` : ''}
            </div>

            <div class="flex items-center space-x-3">
              <span class="text-base font-black text-slate-900">₹${inv.amount.toLocaleString('en-IN')}</span>
              ${inv.status !== 'PAID' ? `
                <button onclick="payInvoice('${inv.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow transition">
                  Pay Fee
                </button>
              ` : `
                <span class="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold border border-emerald-200">Paid</span>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

async function payInvoice(id) {
  await api(`/invoices/pay/${id}`, 'POST', { paymentMethod: 'Karunya NetBanking' });
  showToast('Payment successful!');
  renderFees(document.getElementById('portal-content'));
}

// ----------------------------------------------------
// COMPLAINTS
// ----------------------------------------------------
async function renderComplaints(container) {
  const cmpRes = await api('/complaints');
  const complaints = cmpRes.data;

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">Transport Helpdesk & Lost Items</h2>
          <p class="text-xs text-slate-500">Submit requests regarding bus timings or items left on buses.</p>
        </div>
        <button onclick="openSubmitTicketModal()" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg shadow transition">
          + New Ticket
        </button>
      </div>

      <div class="space-y-2.5">
        ${complaints.length === 0 ? `<div class="text-xs text-slate-400 py-6 text-center">No active tickets.</div>` : ''}
        ${complaints.map(c => `
          <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
            <div class="flex justify-between font-bold text-slate-900">
              <span>${c.subject}</span>
              <span class="px-2 py-0.5 rounded text-[10px] ${c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${c.status}</span>
            </div>
            <p class="text-slate-600">${c.description}</p>
            <div class="text-[10px] text-slate-400 pt-1">By: ${c.submittedBy}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function openSubmitTicketModal() {
  const subject = prompt('Ticket Summary / Issue:');
  if (!subject) return;
  const description = prompt('Provide details:');

  api('/complaints', 'POST', { subject, description, category: 'Bus Service' }).then(() => {
    showToast('Ticket submitted');
    renderComplaints(document.getElementById('portal-content'));
  });
}

// ----------------------------------------------------
// MAINTENANCE
// ----------------------------------------------------
async function renderMaintenance(container) {
  const mntRes = await api('/maintenance');
  const records = mntRes.data;

  container.innerHTML = `
    <div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div>
        <h2 class="text-lg font-bold text-slate-900">Karunya Bus Fleet Maintenance Log</h2>
        <p class="text-xs text-slate-500">Workshop repair orders and preventive servicing.</p>
      </div>

      <div class="space-y-2.5">
        ${records.map(m => `
          <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1">
            <div class="flex justify-between font-bold text-slate-900">
              <span>${m.issueType} (${m.regNumber})</span>
              <span class="text-slate-700 font-bold">₹${m.cost.toLocaleString('en-IN')}</span>
            </div>
            <p class="text-slate-600">${m.notes}</p>
            <div class="text-[10px] text-slate-400">${m.serviceStation} &bull; ${m.scheduledDate}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  renderApp();
});
