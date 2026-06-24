/**
 * Login / Role Selection View
 */
import { DISTRICTS, STATE_INFO } from '../config/districts.js?v=26';
import { setSession, showToast } from '../utils.js?v=26';
import { router } from '../router.js?v=26';
import { store } from '../store.js?v=26';

/**
 * Render the login view
 */
export async function renderLoginView() {
    const app = document.getElementById('app');

    const districtOptions = DISTRICTS.map(d => 
        `<option value="${d.id}">${d.name}</option>`
    ).join('');

    app.innerHTML = `
    <div class="login-view fade-in">
        <div class="login-backdrop">
            <div class="login-particles"></div>
        </div>
        <div class="login-container">
            <div class="login-header">
                <img src="images/jata-negara.png" alt="Jata Negara Malaysia" class="jata-negara-logo-login" width="100" height="82">
                <h1 class="login-title-new">Sistem Pelaporan Bencana Banjir</h1>
                <p class="login-subtitle-state">${STATE_INFO.fullName}</p>
                <p class="login-subtitle-unit">Unit Kesihatan Pekerjaan & Alam Sekitar (KPAS) 2026</p>
                <div class="login-badge">
                    <span class="badge badge-warning">⚡ Musim Tengkujuh 2025-2026</span>
                </div>
            </div>

            <div class="login-card">
                <h2 class="login-card-title">Sila Pilih Peranan</h2>
                <p class="login-card-desc">Pilih peranan anda untuk mengakses sistem pelaporan</p>

                <div class="role-selector">
                    <button class="role-card" id="role-district" data-role="district">
                        <div class="role-card-icon">🏥</div>
                        <div class="role-card-content">
                            <h3>Bilik Gerakan Bencana Daerah</h3>
                            <p>Isi data pelaporan banjir untuk daerah anda</p>
                        </div>
                        <div class="role-card-arrow">→</div>
                    </button>

                    <button class="role-card" id="role-supervisor" data-role="supervisor">
                        <div class="role-card-icon">👨‍💼</div>
                        <div class="role-card-content">
                            <h3>Penyelia Daerah</h3>
                            <p>Sahkan data pelaporan bagi daerah anda</p>
                        </div>
                        <div class="role-card-arrow">→</div>
                    </button>

                    <button class="role-card" id="role-state" data-role="state">
                        <div class="role-card-icon">🏛️</div>
                        <div class="role-card-content">
                            <h3>Jabatan Kesihatan Negeri</h3>
                            <p>Lihat dashboard & data agregat seluruh negeri</p>
                        </div>
                        <div class="role-card-arrow">→</div>
                    </button>
                </div>

                <div class="district-selector hidden" id="district-selector">
                    <div class="form-field">
                        <label class="field-label" for="select-district">Pilih Daerah Anda</label>
                        <select class="select-field" id="select-district">
                            <option value="">-- Pilih Daerah --</option>
                            ${districtOptions}
                        </select>
                    </div>
                    <button class="btn btn-primary btn-lg btn-block" id="btn-enter-district">
                        <span>Masuk ke Sistem</span>
                        <span class="btn-arrow">→</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" id="btn-back-roles" style="margin-top: 12px;">
                        ← Kembali
                    </button>
                </div>
            </div>

            <div class="login-footer">
                <p>Kementerian Kesihatan Malaysia © 2026</p>
            </div>
        </div>
    </div>
    `;

    initLoginEvents();
}

function initLoginEvents() {
    // Role selection - District
    document.getElementById('role-district').addEventListener('click', () => {
        window._selectedRole = 'district';
        document.querySelector('.role-selector').classList.add('hidden');
        document.getElementById('district-selector').classList.remove('hidden');
        document.getElementById('select-district').focus();
    });

    // Role selection - Supervisor
    document.getElementById('role-supervisor').addEventListener('click', () => {
        window._selectedRole = 'supervisor';
        document.querySelector('.role-selector').classList.add('hidden');
        document.getElementById('district-selector').classList.remove('hidden');
        document.getElementById('select-district').focus();
    });

    // Role selection - State
    document.getElementById('role-state').addEventListener('click', async () => {
        setSession({ role: 'state' });
        await store.init();
        showToast('Selamat datang ke Dashboard Negeri', 'success');
        router.navigate('dashboard');
    });

    // Back to role selection
    document.getElementById('btn-back-roles').addEventListener('click', () => {
        document.querySelector('.role-selector').classList.remove('hidden');
        document.getElementById('district-selector').classList.add('hidden');
    });

    // Enter district
    document.getElementById('btn-enter-district').addEventListener('click', async () => {
        const select = document.getElementById('select-district');
        const districtId = select.value;
        
        if (!districtId) {
            showToast('Sila pilih daerah terlebih dahulu', 'warning');
            select.focus();
            return;
        }

        const district = DISTRICTS.find(d => d.id === districtId);
        const role = window._selectedRole || 'district';
        setSession({ 
            role: role, 
            district: districtId, 
            districtName: district.name 
        });
        
        await store.init();
        const roleName = role === 'supervisor' ? 'Penyelia' : 'PKD';
        showToast(`Selamat datang, ${roleName} ${district.name}`, 'success');
        router.navigate('district');
    });

    // Enter on select
    document.getElementById('select-district').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btn-enter-district').click();
        }
    });
}
