/**
 * Sistem Pelaporan Bencana Banjir
 * Main Application Entry Point
 */
import { router } from './router.js?v=26';
import { store } from './store.js?v=26';
import { getSession, showToast, showConfirm, clearSession } from './utils.js?v=26';

// Import Views
import { renderLoginView } from './views/login.js?v=26';
import { renderDistrictView } from './views/district-home.js?v=26';
import { renderFormView } from './views/form-entry.js?v=26';
import { renderPPSView } from './views/pps-management.js?v=26';
import { renderDashboardView } from './views/state-dashboard.js?v=26';

// Setup Toast Container
function setupAppUI() {
    // Add toast container if it doesn't exist
    if (!document.getElementById('toast-container')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Add modal overlay if it doesn't exist
    if (!document.getElementById('modal-overlay')) {
        const modal = document.createElement('div');
        modal.id = 'modal-overlay';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title" id="modal-title">Confirm</h3>
                    <button class="modal-close" id="modal-close">&times;</button>
                </div>
                <div class="modal-body" id="modal-body">
                    Are you sure?
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="modal-btn-cancel">Batal</button>
                    <button class="btn btn-primary" id="modal-btn-confirm">Teruskan</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

// Register Routes
router.add('login', renderLoginView);
router.add('district', renderDistrictView);
router.add('pps', renderPPSView);
router.add('dashboard', renderDashboardView);
router.add('form/:formId', renderFormView);
router.add('submissions/:formId', renderFormView);

// Default route / Authentication guard
router.add('', () => {
    const session = getSession();
    if (!session) {
        router.navigate('login');
    } else if (session.role === 'state') {
        router.navigate('dashboard');
    } else if (session.role === 'district') {
        router.navigate('district');
    } else {
        router.navigate('login');
    }
});

// App Initialization
async function initApp() {
    setupAppUI();
    
    // Hide loading screen initially
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 1000);
    }

    // Initialize database
    try {
        await store.init();
        console.log('App Initialized Successfully');
        
        // Start router
        router.init();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('Gagal memuatkan sistem pengkalan data', 'error');
    }
}

// Make sure global helpers are available
window.app = window.app || {};
window.app.logout = () => {
    showConfirm('Log Keluar?', 'Adakah anda pasti untuk log keluar?', () => {
        clearSession();
        router.navigate('login');
    });
};
window.app.closeModal = () => {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.add('hidden');
};

// Global Export Functions
window.app.exportAll = async () => {
    try {
        const { getToday, downloadFile } = await import('./utils.js?v=26');
        const allData = await store.exportAllData();
        const json = JSON.stringify(allData, null, 2);
        downloadFile(json, `Laporan_Banjir_JKN_Kedah_${getToday()}.json`, 'application/json');
        showToast('📥 Data berjaya dieksport!', 'success');
    } catch (err) {
        console.error('Export error:', err);
        showToast('❌ Gagal eksport data', 'error');
    }
};

window.app.openExportExcelModal = () => {
    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    titleEl.textContent = 'Muat Turun Laporan Penuh Excel';
    
    // Quick import just for getToday
    import('./utils.js?v=26').then(({ getToday }) => {
        bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 8px;">
                <p>Pilih tarikh untuk laporan harian yang ingin dihasilkan:</p>
                <div class="form-field" style="display: flex; flex-direction: column; gap: 6px;">
                    <label class="field-label" for="export-date" style="font-weight: 500;">Tarikh Laporan</label>
                    <input type="date" class="input-field" id="export-date" value="${getToday()}" style="width: 100%; padding: 10px; border-radius: 4px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color);">
                </div>
            </div>
        `;
    });

    footerEl.innerHTML = `
        <button class="btn btn-secondary" id="modal-export-cancel">Batal</button>
        <button class="btn btn-primary" id="btn-export-excel-submit" style="background: linear-gradient(135deg, #107c41, #1f9a55); border: none; color: white;">Jana & Muat Turun</button>
    `;

    overlay.classList.remove('hidden');

    document.getElementById('modal-export-cancel').onclick = () => {
        overlay.classList.add('hidden');
    };

    document.getElementById('btn-export-excel-submit').onclick = async () => {
        const selectedDate = document.getElementById('export-date').value;
        if (!selectedDate) {
            showToast('Sila pilih tarikh terlebih dahulu', 'warning');
            return;
        }
        overlay.classList.add('hidden');
        await window.app.downloadExcelReport(selectedDate);
    };
};

window.app.downloadExcelReport = async (selectedDate) => {
    showToast('⏳ Menjana laporan Excel... Sila tunggu.', 'info', 5000);
    
    try {
        const { getSession } = await import('./utils.js?v=26');
        const session = getSession();
        const isState = session && session.role === 'state';
        const userDistrict = session ? session.district : null;

        const allSubs = [];
        const { FORM_ORDER } = await import('./config/forms.js?v=26');
        for (const formId of FORM_ORDER) {
            const subs = await store.getSubmissions(formId);
            // If district, only include their own submissions
            const filteredSubs = isState ? subs : subs.filter(s => s.district === userDistrict);
            allSubs.push(...filteredSubs);
        }

        const { DISTRICTS } = await import('./config/districts.js?v=26');
        const ppsList = [];
        for (const d of DISTRICTS) {
            const list = await store.getPPSByDistrict(d.id);
            ppsList.push(...list);
        }

        const { generateExcelReport } = await import('./excel-generator.js?v=26');
        const blob = await generateExcelReport(allSubs, ppsList, selectedDate);

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const { getToday } = await import('./utils.js?v=26');
        const fileNamePrefix = isState ? 'Laporan_Banjir_JKN_Kedah' : `Laporan_Banjir_Bilik_Gerakan_Bencana_${userDistrict.toUpperCase()}`;
        a.download = `${fileNamePrefix}_${selectedDate}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('✅ Laporan Excel berjaya dimuat turun!', 'success');
    } catch (err) {
        console.error('Excel generation error:', err);
        showToast('❌ Gagal menjana laporan Excel. Pastikan pelayar anda menyokong muat turun fail besar.', 'error');
    }
};

// Bootstrap the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
