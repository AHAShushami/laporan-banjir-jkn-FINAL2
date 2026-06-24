/**
 * Sidebar Navigation Component
 */
import { getSession } from '../utils.js?v=26';
import { router } from '../router.js?v=26';
import { FORM_ORDER, FORM_CONFIGS, FORM_CATEGORIES } from '../config/forms.js?v=26';

/**
 * Render the sidebar navigation
 * @returns {string} HTML string
 */
export function renderSidebar() {
    const session = getSession();
    if (!session) return '';

    const isState = session.role === 'state';

    // Group forms by category
    const grouped = {};
    for (const formId of FORM_ORDER) {
        const config = FORM_CONFIGS[formId];
        if (!config) continue;
        const cat = config.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ id: formId, ...config });
    }

    let navItems = '';

    // Home / Dashboard
    if (isState) {
        navItems += `
        <a href="#dashboard" class="nav-item" data-route="dashboard">
            <span class="nav-icon">📊</span>
            <span class="nav-label">Dashboard Negeri</span>
        </a>`;
    } else {
        navItems += `
        <a href="#district" class="nav-item" data-route="district">
            <span class="nav-icon">🏠</span>
            <span class="nav-label">Laman Utama</span>
        </a>
        <a href="#pps" class="nav-item" data-route="pps">
            <span class="nav-icon">🏕️</span>
            <span class="nav-label">Urus PPS</span>
        </a>`;
    }

    navItems += `<div class="nav-divider"></div>`;
    navItems += `<div class="nav-section-title">Borang Pelaporan</div>`;

    // Forms grouped by category
    for (const [catId, catInfo] of Object.entries(FORM_CATEGORIES)) {
        const forms = grouped[catId];
        if (!forms || forms.length === 0) continue;

        navItems += `<div class="nav-category">
            <div class="nav-category-header" data-category="${catId}">
                <span class="nav-icon">${catInfo.icon}</span>
                <span class="nav-label">${catInfo.label}</span>
                <span class="nav-chevron">▸</span>
            </div>
            <div class="nav-category-items" id="nav-cat-${catId}">`;

        for (const form of forms) {
            const route = isState ? `submissions/${form.id}` : `form/${form.id}`;
            navItems += `
                <a href="#${route}" class="nav-item nav-sub-item" data-route="${route}">
                    <span class="nav-icon">${form.icon}</span>
                    <span class="nav-label">${form.shortTitle}</span>
                </a>`;
        }

        navItems += `</div></div>`;
    }

    return `
    <aside class="sidebar" id="app-sidebar">
        <nav class="sidebar-nav">
            ${navItems}
        </nav>
        <div class="sidebar-footer">
            <div class="sidebar-version">v1.0.0 | KPAS JKN</div>
        </div>
    </aside>
    `;
}

/**
 * Initialize sidebar event listeners
 */
export function initSidebar() {
    // Category expand/collapse
    document.querySelectorAll('.nav-category-header').forEach(header => {
        header.addEventListener('click', () => {
            const catId = header.dataset.category;
            const items = document.getElementById(`nav-cat-${catId}`);
            if (items) {
                items.classList.toggle('expanded');
                header.classList.toggle('expanded');
            }
        });
    });

    // Expand all categories by default
    document.querySelectorAll('.nav-category-items').forEach(el => {
        el.classList.add('expanded');
    });
    document.querySelectorAll('.nav-category-header').forEach(el => {
        el.classList.add('expanded');
    });

    // Highlight active nav item
    updateActiveNav();
}

/**
 * Update active navigation state
 */
export function updateActiveNav() {
    const currentRoute = window.location.hash.slice(1) || 'login';
    document.querySelectorAll('.nav-item').forEach(item => {
        const route = item.dataset.route;
        if (route && currentRoute.startsWith(route)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}
