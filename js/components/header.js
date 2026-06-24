/**
 * App Header Component
 */
import { getSession, clearSession } from '../utils.js?v=26';
import { STATE_INFO } from '../config/districts.js?v=26';
import { router } from '../router.js?v=26';

/**
 * Render the app header
 * @returns {string} HTML string
 */
export function renderHeader() {
    const session = getSession();
    if (!session) return '';

    let roleIcon, roleText, roleClass;
    
    if (session.role === 'state') {
        roleIcon = '🏛️';
        roleText = 'Jabatan Kesihatan Negeri';
        roleClass = 'role-state';
    } else if (session.role === 'supervisor') {
        roleIcon = '👨‍💼';
        roleText = `Penyelia Daerah (${session.districtName})`;
        roleClass = 'role-supervisor';
    } else {
        roleIcon = '🏥';
        roleText = `Petugas Daerah (${session.districtName})`;
        roleClass = 'role-district';
    }

    return `
    <header class="app-header" id="app-header">
        <div class="header-left">
            <button class="btn btn-icon sidebar-toggle" id="sidebar-toggle" title="Menu">
                <span class="hamburger">☰</span>
            </button>
            <div class="header-brand">
                <img src="images/jata-negara.png" alt="Jata Negara Malaysia" class="jata-negara-logo-header" width="40" height="33">
                <div class="brand-text">
                    <h1>Sistem Pelaporan Bencana Banjir</h1>
                    <span class="brand-subtitle">${STATE_INFO.fullName} &bull; KPAS 2026</span>
                </div>
            </div>
        </div>
        <div class="header-right">
            <div class="header-role ${roleClass}">
                <span class="role-icon">${roleIcon}</span>
                <span class="role-text" style="font-weight: 600;">${roleText}</span>
            </div>
            <div class="header-time" id="header-time"></div>
            <button class="btn btn-icon btn-logout" id="btn-logout" title="Log Keluar">
                🚪
            </button>
        </div>
    </header>
    `;
}

/**
 * Initialize header event listeners
 */
export function initHeader() {
    // Sidebar toggle
    const toggle = document.getElementById('sidebar-toggle');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });
    }

    // Logout
    const logout = document.getElementById('btn-logout');
    if (logout) {
        logout.addEventListener('click', () => {
            if (window.app && typeof window.app.logout === 'function') {
                window.app.logout();
            } else {
                clearSession();
                router.navigate('login');
            }
        });
    }

    // Live clock
    updateClock();
    setInterval(updateClock, 60000);
}

function updateClock() {
    const el = document.getElementById('header-time');
    if (el) {
        const now = new Date();
        const time = now.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
        el.innerHTML = `<span class="clock-time">${time}</span><span class="clock-date">${date}</span>`;
    }
}
