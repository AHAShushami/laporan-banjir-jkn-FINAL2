/**
 * District Home View - Shows all available forms as cards
 */
import { getSession, formatDateTime, getTimePeriod, showToast } from '../utils.js?v=26';
import { FORM_ORDER, FORM_CONFIGS, FORM_CATEGORIES } from '../config/forms.js?v=26';
import { store } from '../store.js?v=26';
import { router } from '../router.js?v=26';
import { renderHeader, initHeader } from '../components/header.js?v=26';
import { renderSidebar, initSidebar } from '../components/sidebar.js?v=26';

/**
 * Render the district home view
 */
export async function renderDistrictView() {
    const session = getSession();
    if (!session || (session.role !== 'district' && session.role !== 'supervisor')) {
        router.navigate('login');
        return;
    }

    const app = document.getElementById('app');
    const activePPS = await store.getActivePPS(session.district);
    
    // Get recent submissions count
    const today = new Date().toISOString().split('T')[0];
    let todaySubmissions = 0;
    for (const formId of FORM_ORDER) {
        const subs = await store.getSubmissions(formId, { 
            district: session.district, 
            dateFrom: today 
        });
        todaySubmissions += subs.length;
    }

    // Build form cards grouped by category
    let formCardsHtml = '';
    const grouped = {};
    for (const formId of FORM_ORDER) {
        const config = FORM_CONFIGS[formId];
        if (!config) continue;
        const cat = config.category || 'other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ id: formId, ...config });
    }

    for (const [catId, catInfo] of Object.entries(FORM_CATEGORIES)) {
        const forms = grouped[catId];
        if (!forms || forms.length === 0) continue;

        let cards = '';
        for (const form of forms) {
            // Get latest submission for this form or its source form
            let sourceFormId = form.id;
            const isAuto = form.isAutoReport === true;
            if (form.id === 'J5_2_Fasiliti') {
                sourceFormId = 'J5_1_Fasiliti';
            } else if (form.id === 'J10_2_Vektor') {
                sourceFormId = 'J10_1_Vektor';
            }

            const latest = await store.getLatestSubmission(sourceFormId, session.district);
            const lastSubmitted = latest ? formatDateTime(latest.timestamp) : (isAuto ? 'Sentiasa dikemaskini' : 'Belum diisi');
            
            let statusClass, statusText;
            if (isAuto) {
                statusClass = latest && latest.date === today ? 'status-done' : 'status-pending';
                statusText = latest && latest.date === today 
                    ? '📊 Auto-kemaskini hari ini' 
                    : '⏳ Tiada data sumber hari ini';
            } else {
                statusClass = latest && latest.date === today ? 'status-done' : 'status-pending';
                statusText = latest && latest.date === today ? '✅ Telah diisi hari ini' : '⏳ Belum diisi hari ini';
            }

            cards += `
            <div class="form-card" data-form-id="${form.id}" onclick="window.location.hash='form/${form.id}'">
                <div class="form-card-header">
                    <span class="form-card-icon">${form.icon}</span>
                    <span class="form-card-type badge badge-${form.type === 'linelist' ? 'info' : form.type === 'daily' ? 'primary' : 'secondary'}">${form.type === 'linelist' ? 'Senarai' : form.type === 'daily' ? 'Harian' : 'Ringkasan'}</span>
                </div>
                <h3 class="form-card-title">${form.shortTitle}</h3>
                <p class="form-card-desc">${form.description || ''}</p>
                <div class="form-card-footer">
                    <span class="form-card-status ${statusClass}">${statusText}</span>
                    <span class="form-card-time">${lastSubmitted}</span>
                </div>
            </div>`;
        }

        formCardsHtml += `
        <div class="category-section">
            <div class="category-header">
                <span class="category-icon">${catInfo.icon}</span>
                <h2 class="category-title">${catInfo.label}</h2>
            </div>
            <div class="form-cards-grid">
                ${cards}
            </div>
        </div>`;
    }

    app.innerHTML = `
    ${renderHeader()}
    <div class="app-layout">
        ${renderSidebar()}
        <main class="main-content fade-in">
            <div class="page-header">
                <div class="page-header-left">
                    <h2 class="page-title">🏥 Bilik Gerakan Bencana ${session.districtName} ${session.role === 'supervisor' ? '(Mod Penyelia)' : ''}</h2>
                    <p class="page-subtitle">Sesi Pelaporan ${getTimePeriod()} | ${new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div class="page-header-right" style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="window.app.openExportExcelModal()" style="background: linear-gradient(135deg, #107c41, #1f9a55); border: none; color: white; display: inline-flex; align-items: center; gap: 6px;">
                        📥 Laporan Penuh Excel
                    </button>
                    <button class="btn btn-secondary" onclick="window.app.exportAll()">
                        📥 Eksport Semua Data
                    </button>
                    <button class="btn btn-primary" onclick="window.location.hash='pps'">
                        🏕️ Urus PPS (${activePPS.length} Aktif)
                    </button>
                </div>
            </div>

            <!-- Quick Stats -->
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon">📝</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${todaySubmissions}</span>
                        <span class="kpi-label">Borang Diisi Hari Ini</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">📋</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${FORM_ORDER.length}</span>
                        <span class="kpi-label">Jumlah Borang</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon">🏕️</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${activePPS.length}</span>
                        <span class="kpi-label">PPS Aktif</span>
                    </div>
                </div>
                <div class="kpi-card kpi-card-accent">
                    <div class="kpi-icon">⏰</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${getTimePeriod()}</span>
                        <span class="kpi-label">Sesi Semasa</span>
                    </div>
                </div>
            </div>

            <!-- Active PPS Banner -->
            ${activePPS.length > 0 ? `
            <div class="alert-banner alert-info">
                <span class="alert-icon">🏕️</span>
                <div class="alert-content">
                    <strong>PPS Aktif:</strong> 
                    ${activePPS.map(p => p.name).join(' • ')}
                </div>
                <a href="#pps" class="alert-action">Urus PPS →</a>
            </div>` : `
            <div class="alert-banner alert-warning">
                <span class="alert-icon">⚠️</span>
                <div class="alert-content">
                    <strong>Tiada PPS aktif.</strong> Sila daftarkan PPS sebelum mengisi borang.
                </div>
                <a href="#pps" class="alert-action">Daftar PPS →</a>
            </div>`}

            <!-- Form Cards -->
            ${formCardsHtml}
        </main>
    </div>
    `;

    initHeader();
    initSidebar();
}
