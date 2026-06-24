/**
 * PPS (Pusat Pemindahan Sementara) Management View
 */
import { getSession, showToast, showConfirm, formatDateTime, generateId } from '../utils.js?v=26';
import { store } from '../store.js?v=26';
import { router } from '../router.js?v=26';
import { renderHeader, initHeader } from '../components/header.js?v=26';
import { renderSidebar, initSidebar } from '../components/sidebar.js?v=26';

/**
 * Render the PPS management view
 */
export async function renderPPSView() {
    const session = getSession();
    if (!session || (session.role !== 'district' && session.role !== 'supervisor')) {
        router.navigate('login');
        return;
    }

    const allPPS = await store.getPPSByDistrict(session.district);
    const activePPS = allPPS.filter(p => p.status === 'active');
    const closedPPS = allPPS.filter(p => p.status === 'closed');

    const app = document.getElementById('app');

    app.innerHTML = `
    ${renderHeader()}
    <div class="app-layout">
        ${renderSidebar()}
        <main class="main-content fade-in">
            <div class="page-header">
                <div class="page-header-left">
                    <button class="btn btn-icon" onclick="window.location.hash='district'" title="Kembali">←</button>
                    <div>
                        <h2 class="page-title">🏕️ Pengurusan Pusat Pemindahan Sementara (PPS)</h2>
                        <p class="page-subtitle">Daftar, urus dan tutup PPS di daerah ${session.districtName}</p>
                    </div>
                </div>
            </div>

            <!-- Add New PPS Form -->
            <div class="section-card">
                <div class="section-card-header">
                    <h3>➕ Daftar PPS Baharu</h3>
                </div>
                <form id="pps-form" class="entry-form">
                    <div class="form-fields-grid">
                        <div class="form-field grid-col-half">
                            <label class="field-label" for="pps-name">Nama PPS <span class="required">*</span></label>
                            <input type="text" class="input-field" id="pps-name" placeholder="cth: Dewan Komuniti Kg. Baru" required>
                        </div>
                        <div class="form-field grid-col-half">
                            <label class="field-label" for="pps-location">Lokasi / Alamat</label>
                            <input type="text" class="input-field" id="pps-location" placeholder="cth: Jalan Utama, Kg. Baru">
                        </div>
                        <div class="form-field grid-col-third">
                            <label class="field-label" for="pps-capacity">Kapasiti (orang)</label>
                            <input type="number" class="input-field" id="pps-capacity" min="0" placeholder="0">
                        </div>
                        <div class="form-field grid-col-third">
                            <label class="field-label" for="pps-date">Tarikh Dibuka</label>
                            <input type="date" class="input-field" id="pps-date" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="form-field grid-col-third" style="display: flex; align-items: flex-end;">
                            <button type="submit" class="btn btn-primary btn-block">
                                ✅ Daftar PPS
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Active PPS -->
            <div class="section-card">
                <div class="section-card-header">
                    <h3>🟢 PPS Aktif</h3>
                    <span class="badge badge-success">${activePPS.length} aktif</span>
                </div>
                ${activePPS.length > 0 ? `
                <div class="pps-grid">
                    ${activePPS.map(pps => `
                    <div class="pps-card pps-active">
                        <div class="pps-card-header">
                            <span class="pps-status-dot active"></span>
                            <h4 class="pps-name">${pps.name}</h4>
                        </div>
                        <div class="pps-card-body">
                            <div class="pps-info"><span class="pps-info-icon">📍</span> ${pps.location || 'Tiada alamat'}</div>
                            <div class="pps-info"><span class="pps-info-icon">👥</span> Kapasiti: ${pps.capacity || '-'} orang</div>
                            <div class="pps-info"><span class="pps-info-icon">📅</span> Dibuka: ${formatDateTime(pps.dateOpened)}</div>
                        </div>
                        <div class="pps-card-actions">
                            <button class="btn btn-danger btn-sm" onclick="window.app.closePPS('${pps.id}')">
                                🔴 Tutup PPS
                            </button>
                        </div>
                    </div>`).join('')}
                </div>` : `
                <div class="empty-state">
                    <span class="empty-icon">🏕️</span>
                    <p>Tiada PPS aktif. Sila daftarkan PPS baharu.</p>
                </div>`}
            </div>

            <!-- Closed PPS -->
            ${closedPPS.length > 0 ? `
            <div class="section-card">
                <div class="section-card-header">
                    <h3>🔴 PPS Ditutup</h3>
                    <span class="badge badge-secondary">${closedPPS.length}</span>
                </div>
                <div class="pps-grid">
                    ${closedPPS.map(pps => `
                    <div class="pps-card pps-closed">
                        <div class="pps-card-header">
                            <span class="pps-status-dot closed"></span>
                            <h4 class="pps-name">${pps.name}</h4>
                        </div>
                        <div class="pps-card-body">
                            <div class="pps-info"><span class="pps-info-icon">📍</span> ${pps.location || '-'}</div>
                            <div class="pps-info"><span class="pps-info-icon">📅</span> Dibuka: ${formatDateTime(pps.dateOpened)}</div>
                            <div class="pps-info"><span class="pps-info-icon">📅</span> Ditutup: ${formatDateTime(pps.dateClosed)}</div>
                        </div>
                    </div>`).join('')}
                </div>
            </div>` : ''}
        </main>
    </div>
    `;

    initHeader();
    initSidebar();
    initPPSEvents(session);
}

function initPPSEvents(session) {
    const form = document.getElementById('pps-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('pps-name').value.trim();
            if (!name) {
                showToast('Sila masukkan nama PPS', 'warning');
                return;
            }

            const ppsData = {
                district: session.district,
                name: name,
                location: document.getElementById('pps-location').value.trim(),
                capacity: parseInt(document.getElementById('pps-capacity').value) || 0,
                status: 'active',
                dateOpened: new Date(document.getElementById('pps-date').value).getTime(),
                dateClosed: null
            };

            try {
                await store.addPPS(ppsData);
                showToast(`✅ PPS "${name}" berjaya didaftarkan!`, 'success');
                await renderPPSView();
            } catch (err) {
                console.error('Add PPS error:', err);
                showToast('❌ Gagal mendaftar PPS', 'error');
            }
        });
    }
}

// Global PPS actions
window.app = window.app || {};
window.app.closePPS = (ppsId) => {
    showConfirm(
        'Tutup PPS?',
        'PPS yang ditutup tidak boleh menerima data baharu. Anda pasti?',
        async () => {
            await store.closePPS(ppsId);
            showToast('PPS telah ditutup', 'info');
            await renderPPSView();
        }
    );
};
