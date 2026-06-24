/**
 * Utility functions for the Flood Reporting App
 */

/**
 * Format a date object to dd/mm/yyyy string
 * @param {Date} date 
 * @returns {string}
 */
export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Format a date to yyyy-mm-dd for input fields
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateInput(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Format datetime for display
 * @param {Date|string} date 
 * @returns {string}
 */
export function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Get today's date as yyyy-mm-dd
 * @returns {string}
 */
export function getToday() {
    return formatDateInput(new Date());
}

/**
 * Get time period label (Pagi/Tengahari/Petang/Malam)
 * @returns {string}
 */
export function getTimePeriod() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Pagi';
    if (hour < 15) return 'Tengahari';
    if (hour < 18) return 'Petang';
    return 'Malam';
}

/**
 * Show a toast notification
 * @param {string} message 
 * @param {'success'|'error'|'warning'|'info'} type 
 * @param {number} duration - ms
 */
export function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} fade-in`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show a confirmation modal
 * @param {string} title 
 * @param {string} message 
 * @param {Function} onConfirm 
 * @param {Function} onCancel 
 */
export function showConfirm(title, message, onConfirm, onCancel) {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    titleEl.textContent = title;
    bodyEl.innerHTML = `<p>${message}</p>`;
    footerEl.innerHTML = `
        <button class="btn btn-secondary" id="modal-cancel">Batal</button>
        <button class="btn btn-primary" id="modal-confirm">Sahkan</button>
    `;

    overlay.classList.remove('hidden');

    document.getElementById('modal-confirm').onclick = () => {
        overlay.classList.add('hidden');
        if (onConfirm) onConfirm();
    };
    document.getElementById('modal-cancel').onclick = () => {
        overlay.classList.add('hidden');
        if (onCancel) onCancel();
    };
}

/**
 * Convert form data to CSV string
 * @param {Array<Object>} data 
 * @returns {string}
 */
export function toCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
        headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"` 
                : str;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger a file download
 * @param {string} content 
 * @param {string} filename 
 * @param {string} mimeType 
 */
export function downloadFile(content, filename, mimeType = 'text/csv') {
    const blob = new Blob(['\ufeff' + content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Debounce function
 * @param {Function} fn 
 * @param {number} delay 
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Simple HTML escaping
 * @param {string} str 
 * @returns {string}
 */
export function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Generate a simple unique ID
 * @returns {string}
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Get the current session from localStorage
 * @returns {{ role: 'district'|'state', district?: string, districtName?: string } | null}
 */
export function getSession() {
    const session = localStorage.getItem('floodapp_session');
    return session ? JSON.parse(session) : null;
}

/**
 * Set the current session
 * @param {Object} session 
 */
export function setSession(session) {
    localStorage.setItem('floodapp_session', JSON.stringify(session));
}

/**
 * Clear the current session
 */
export function clearSession() {
    localStorage.removeItem('floodapp_session');
}

/**
 * Format a number with thousands separator
 * @param {number} num 
 * @returns {string}
 */
export function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('ms-MY');
}

/**
 * Calculate percentage change
 * @param {number} current 
 * @param {number} previous 
 * @returns {{ value: number, direction: 'up'|'down'|'same', formatted: string }}
 */
export function calcChange(current, previous) {
    if (!previous || previous === 0) {
        return { value: 0, direction: 'same', formatted: '-' };
    }
    const change = ((current - previous) / previous) * 100;
    return {
        value: change,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
        formatted: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
    };
}
