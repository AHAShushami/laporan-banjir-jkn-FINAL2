/**
 * State Dashboard View - Aggregated data for JKN
 */
import { getSession, showToast, formatDateTime, formatNumber, calcChange, toCSV, downloadFile, getToday } from '../utils.js?v=26';
import { FORM_ORDER, FORM_CONFIGS, FORM_CATEGORIES } from '../config/forms.js?v=26';
import { DISTRICTS } from '../config/districts.js?v=26';
import { store } from '../store.js?v=26';
import { router } from '../router.js?v=26';
import { renderHeader, initHeader } from '../components/header.js?v=26';
import { renderSidebar, initSidebar } from '../components/sidebar.js?v=26';
import { SETTINGS } from '../config/settings.js?v=26';

let currentSelectedDate = '';

/**
 * Render the state dashboard
 */
export async function renderDashboardView() {
    const session = getSession();
    if (!session || session.role !== 'state') {
        router.navigate('login');
        return;
    }

    const app = document.getElementById('app');

    // Gather KPI data
    let totalSubmissions = 0;
    let todaySubmissions = 0;
    const today = getToday();
    const selectedDate = currentSelectedDate || today;
    const districtActivity = {};

    for (const d of DISTRICTS) {
        districtActivity[d.id] = { name: d.name, submissions: 0, todaySubmissions: 0 };
    }

    for (const formId of FORM_ORDER) {
        const subs = await store.getSubmissions(formId);
        totalSubmissions += subs.length;
        for (const sub of subs) {
            const subDate = new Date(sub.timestamp).toISOString().split('T')[0];
            if (subDate === selectedDate) {
                todaySubmissions++;
            }
            if (sub.district && districtActivity[sub.district]) {
                districtActivity[sub.district].submissions++;
                if (subDate === selectedDate) {
                    districtActivity[sub.district].todaySubmissions++;
                }
            }
        }
    }

    // Gather active PPS and victim counts by district as of selectedDate
    let totalStateVictims = 0;
    let totalActivePPS = 0;
    
    const activeDistrictsList = [];
    const safeDistrictsList = [];

    for (const d of DISTRICTS) {
        const allPPS = await store.getPPSByDistrict(d.id);
        
        // Filter PPS active status based on the selectedDate
        const activePPSList = allPPS.filter(pps => {
            const openDateStr = pps.dateOpened ? new Date(pps.dateOpened).toISOString().split('T')[0] : '';
            const closeDateStr = pps.dateClosed ? new Date(pps.dateClosed).toISOString().split('T')[0] : '';
            
            const opened = openDateStr && openDateStr <= selectedDate;
            const notClosed = !closeDateStr || closeDateStr >= selectedDate;
            
            return opened && notClosed && pps.status !== 'inactive';
        });
        
        if (activePPSList.length === 0) {
            safeDistrictsList.push(d);
            continue;
        }

        const ppsListWithVictims = [];
        let districtTotalVictims = 0;
        totalActivePPS += activePPSList.length;

        for (const pps of activePPSList) {
            // Get all J6_Borang6 submissions for this district and filter by ID or name fallback
            const allDistrictSubs = await store.getSubmissions('J6_Borang6', {
                district: d.id
            });
            const submissions = allDistrictSubs.filter(s => s.ppsId === pps.id || (s.ppsName && s.ppsName === pps.name));

            let victims = 0;
            if (submissions && submissions.length > 0) {
                // Find latest submission on or before the selectedDate
                const validSub = submissions.find(s => s.date.split('T')[0] <= selectedDate);
                if (validSub) {
                    victims = parseInt(validSub.data?.Kes_Diperiksa_Bil) || 0;
                }
            }

            ppsListWithVictims.push({
                name: pps.name,
                location: pps.location || 'Tiada Alamat',
                capacity: pps.capacity || 0,
                victims: victims
            });
            districtTotalVictims += victims;
        }

        totalStateVictims += districtTotalVictims;
        activeDistrictsList.push({
            district: d,
            totalVictims: districtTotalVictims,
            activePPSCount: activePPSList.length,
            ppsList: ppsListWithVictims
        });
    }

    // Build HTML for active disaster zones
    let districtPPSCardsHtml = '';
    for (const item of activeDistrictsList) {
        const d = item.district;
        
        let ppsItemsHtml = `
        <ul class="dpc-pps-list">
            ${item.ppsList.map(p => {
                const occupancyRate = p.capacity > 0 ? (p.victims / p.capacity) * 100 : 0;
                
                // Color-coding based on occupancy rate
                let colorClass = 'green';
                let statusText = 'Selamat';
                
                if (occupancyRate >= 85) {
                    colorClass = 'red';
                    statusText = 'Padat';
                } else if (occupancyRate >= 50) {
                    colorClass = 'amber';
                    statusText = 'Sederhana';
                }
                
                const rateText = p.capacity > 0 ? `${occupancyRate.toFixed(1)}%` : 'N/A';
                const pulseClass = occupancyRate >= 85 ? 'occupancy-pulse' : '';
                
                return `
                <li class="dpc-pps-item ${pulseClass}">
                    <div class="dpc-pps-meta">
                        <div class="dpc-pps-title-group">
                            <span class="dpc-pps-name" title="${p.name}">⛺ ${p.name}</span>
                            <span class="dpc-pps-location" title="${p.location}">📍 ${p.location}</span>
                        </div>
                        <div class="dpc-pps-capacity-info">
                            <span class="dpc-pps-count">${formatNumber(p.victims)} mangsa</span>
                            <span class="dpc-pps-capacity">${p.capacity > 0 ? `Kapasiti: ${formatNumber(p.capacity)}` : 'Tiada had'}</span>
                        </div>
                    </div>
                    
                    ${p.capacity > 0 ? `
                        <div class="pps-occupancy-container">
                            <div class="pps-progress-track">
                                <div class="pps-progress-fill progress-${colorClass}" style="width: ${Math.min(occupancyRate, 100)}%"></div>
                            </div>
                            <div class="pps-progress-meta">
                                <span class="pps-status-badge-compact ${colorClass}">${statusText}</span>
                                <span class="pps-occupancy-rate ${colorClass}">${rateText} Terisi</span>
                            </div>
                        </div>
                    ` : ''}
                </li>`;
            }).join('')}
        </ul>`;

        districtPPSCardsHtml += `
        <div class="district-pps-card active">
            <div class="dpc-header">
                <span class="dpc-district-name">${d.name}</span>
                <span class="badge badge-danger">${item.activePPSCount} PPS Aktif</span>
            </div>
            <div class="dpc-body">
                <div class="dpc-total-victims">
                    <span class="dpc-victims-count">${formatNumber(item.totalVictims)}</span>
                    <span class="dpc-victims-label">Jumlah Mangsa Daerah</span>
                </div>
                ${ppsItemsHtml}
            </div>
        </div>`;
    }

    // Build HTML for safe zones
    let safeZonesHtml = '';
    if (safeDistrictsList.length > 0) {
        safeZonesHtml = `
        <div class="safe-zones-section">
            <div class="safe-zones-header">
                <h4 class="safe-zones-title">🟢 Zon Selamat (Tiada PPS Aktif)</h4>
            </div>
            <div class="safe-districts-flex">
                ${safeDistrictsList.map(d => `
                    <div class="safe-district-pill">
                        <span class="safe-pill-icon">✓</span>
                        <span class="safe-pill-name">${d.name}</span>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    // Get active districts (those with submissions today)
    const activeDistricts = Object.values(districtActivity).filter(d => d.todaySubmissions > 0).length;

    // Build district activity table rows
    let districtRows = '';
    for (const d of DISTRICTS) {
        const info = districtActivity[d.id];
        const statusClass = info.todaySubmissions > 0 ? 'status-active' : 'status-inactive';
        const statusText = info.todaySubmissions > 0 ? '✅ Aktif' : '⏳ Belum';
        districtRows += `
        <tr>
            <td class="text-bold">${d.name}</td>
            <td class="text-center"><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td class="text-right">${info.todaySubmissions}</td>
            <td class="text-right">${info.submissions}</td>
        </tr>`;
    }

    // Build form summary cards
    let formSummaryCards = '';
    for (const formId of FORM_ORDER.slice(0, 6)) { // Show top 6 forms
        const config = FORM_CONFIGS[formId];
        if (!config) continue;
        let targetFormId = formId;
        if (formId === 'J5_2_Fasiliti') targetFormId = 'J5_1_Fasiliti';
        if (formId === 'J10_2_Vektor') targetFormId = 'J10_1_Vektor';
        const subs = await store.getSubmissions(targetFormId);
        const todaySubs = subs.filter(s => new Date(s.timestamp).toISOString().split('T')[0] === selectedDate);
        const districtsReported = new Set(todaySubs.map(s => s.district)).size;

        formSummaryCards += `
        <div class="dashboard-form-card" onclick="window.location.hash='submissions/${formId}'">
            <div class="dfc-header">
                <span class="dfc-icon">${config.icon}</span>
                <span class="dfc-title">${config.shortTitle}</span>
            </div>
            <div class="dfc-stats">
                <div class="dfc-stat">
                    <span class="dfc-stat-value">${todaySubs.length}</span>
                    <span class="dfc-stat-label">${selectedDate === today ? 'Hari Ini' : 'Hari Dipilih'}</span>
                </div>
                <div class="dfc-stat">
                    <span class="dfc-stat-value">${districtsReported}/${DISTRICTS.length}</span>
                    <span class="dfc-stat-label">Daerah</span>
                </div>
            </div>
            <div class="dfc-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(districtsReported / DISTRICTS.length * 100)}%"></div>
                </div>
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
                    <div>
                        <h2 class="page-title" style="display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            📊 Dashboard Negeri Kedah
                            <span id="sync-status-badge" class="badge badge-success" style="font-size: 11px; vertical-align: middle; padding: 4px 10px;">✅ Bersinkron (Lokal)</span>
                        </h2>
                        <p class="page-subtitle">
                            Paparan data pada: <strong id="selected-date-text" style="color: var(--color-accent-light);">
                                ${(() => {
                                    const [year, month, dayStr] = selectedDate.split('-');
                                    return new Date(year, month - 1, dayStr).toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                                })()}
                            </strong>
                        </p>
                    </div>
                </div>
                <div class="page-header-right" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                    <div class="date-filter-group" style="display: flex; align-items: center; gap: 8px; background: rgba(255, 255, 255, 0.05); padding: 4px 12px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color);">
                        <label for="dashboard-date-filter" style="font-size: 13px; font-weight: 700; color: var(--text-secondary); margin: 0; white-space: nowrap;">📅 Tarikh Paparan:</label>
                        <input type="date" id="dashboard-date-filter" class="input-field" value="${selectedDate}" max="${today}" style="max-width: 140px; padding: 4px 8px; height: 32px; min-height: 32px; margin: 0; font-size: 13px; background: transparent; border: none; color: var(--text-primary); outline: none;" />
                    </div>
                    <button class="btn btn-secondary" onclick="window.app.forceSync()" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); color: white; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; height: 40px;" title="Muat Turun Data dari Google Sheets">
                        🔄 Kemaskini
                    </button>
                    <button class="btn btn-secondary" onclick="window.app.openExportExcelModal()" style="background: linear-gradient(135deg, #107c41, #1f9a55); border: none; color: white; display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; height: 40px;">
                        📥 Laporan Excel JKN
                    </button>
                    <button class="btn btn-secondary" onclick="window.app.exportAll()" style="padding: 8px 12px; height: 40px;">
                        📥 Eksport Semua Data
                    </button>
                    <button class="btn btn-primary" onclick="window.app.loadSampleData()" style="padding: 8px 12px; height: 40px;">
                        🔧 Muat Data Contoh
                    </button>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="kpi-grid kpi-grid-4">
                <div class="kpi-card kpi-card-primary">
                    <div class="kpi-icon">📝</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${todaySubmissions}</span>
                        <span class="kpi-label">Entri (${selectedDate === today ? 'Hari Ini' : 'Tarikh Dipilih'})</span>
                    </div>
                </div>
                <div class="kpi-card kpi-card-success">
                    <div class="kpi-icon">🏥</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${activeDistricts} / ${DISTRICTS.length}</span>
                        <span class="kpi-label">Daerah Aktif (${selectedDate === today ? 'Hari Ini' : 'Tarikh Dipilih'})</span>
                    </div>
                </div>
                <div class="kpi-card kpi-card-warning">
                    <div class="kpi-icon">🏕️</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${totalActivePPS}</span>
                        <span class="kpi-label">PPS Aktif (${selectedDate === today ? 'Hari Ini' : 'Tarikh Dipilih'})</span>
                    </div>
                </div>
                <div class="kpi-card kpi-card-accent">
                    <div class="kpi-icon">👥</div>
                    <div class="kpi-content">
                        <span class="kpi-value">${formatNumber(totalStateVictims)}</span>
                        <span class="kpi-label">Mangsa (${selectedDate === today ? 'Terkini' : 'Tarikh Dipilih'})</span>
                    </div>
                </div>
            </div>

            <!-- Incident Map and Quick Summary Row -->
            <div class="map-summary-row" style="margin-bottom: 24px;">
                <!-- Map Panel (Left) -->
                <div class="section-card map-card" style="margin-bottom: 0;">
                    <div class="section-card-header">
                        <h3 style="display: inline-flex; align-items: center; gap: 8px;">🗺️ Peta Kedudukan & Lokasi PPS</h3>
                        <span class="badge badge-info">GIS Live Map</span>
                    </div>
                    <div id="state-map" style="width: 100%; height: 450px; border-radius: var(--border-radius-sm); border: 1px solid var(--border-color); position: relative; z-index: 10;"></div>
                </div>

                <!-- Incident Feed (Right) -->
                <div class="section-card incident-card" style="margin-bottom: 0;">
                    <div class="section-card-header">
                        <h3 style="display: inline-flex; align-items: center; gap: 8px;">🚨 Status Kawasan Terjejas</h3>
                        <span class="badge badge-danger">${activeDistrictsList.length} Daerah</span>
                    </div>
                    <div class="incident-feed-container" style="height: 450px; overflow-y: auto; padding-right: 8px; display: flex; flex-direction: column; gap: 12px;">
                        ${activeDistrictsList.length > 0 ? activeDistrictsList.map(item => `
                            <div class="incident-feed-item" style="background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); border-left: 4px solid var(--color-danger); border-radius: var(--border-radius-sm); padding: 14px; display: flex; flex-direction: column; gap: 6px; transition: var(--transition);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 800; font-size: 15px; color: var(--text-primary);">${item.district.name}</span>
                                    <span class="badge badge-danger" style="font-size: 10px; padding: 2px 6px;">${item.activePPSCount} PPS Buka</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                                    <span style="font-size: 12px; color: var(--text-secondary);">Jumlah Mangsa Terkini:</span>
                                    <span style="font-size: 20px; font-weight: 800; color: var(--color-accent-light);">${formatNumber(item.totalVictims)} orang</span>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="dpc-empty-state" style="padding: 100px 0; text-align: center; display: flex; flex-direction: column; align-items: center;">
                                <span style="font-size: 40px; display: block; margin-bottom: 12px;">🟢</span>
                                <span style="font-weight: 700; color: var(--color-success); font-size: 15px;">Tiada Daerah Terjejas</span>
                                <span style="font-size: 12px; color: var(--text-muted); max-width: 200px; margin-top: 6px;">Semua daerah berada dalam keadaan selamat.</span>
                            </div>
                        `}
                    </div>
                </div>
            </div>



            <!-- District Reporting Status -->
            <div class="dashboard-grid">
                <div class="section-card">
                    <div class="section-card-header">
                        <h3>🏥 Status Pelaporan Daerah</h3>
                        <span class="badge badge-${activeDistricts === DISTRICTS.length ? 'success' : 'warning'}">
                            ${activeDistricts}/${DISTRICTS.length} Daerah
                        </span>
                    </div>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Daerah</th>
                                    <th class="text-center">Status</th>
                                    <th class="text-right">${selectedDate === today ? 'Hari Ini' : 'Hari Dipilih'}</th>
                                    <th class="text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${districtRows}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="section-card">
                    <div class="section-card-header">
                        <h3>📋 Ringkasan Borang</h3>
                    </div>
                    <div class="dashboard-form-grid">
                        ${formSummaryCards}
                    </div>
                    <div style="padding: 16px; text-align: center;">
                        <p class="text-muted">Klik borang untuk lihat data terperinci</p>
                    </div>
                </div>
            </div>
        </main>
    </div>
    `;

    initHeader();
    initSidebar();
    
    // Initialize the Leaflet KML map
    await initLocalGISMap(activeDistrictsList);

    // Bind date picker changes
    const dateFilter = document.getElementById('dashboard-date-filter');
    if (dateFilter) {
        dateFilter.addEventListener('change', async (e) => {
            currentSelectedDate = e.target.value;
            await renderDashboardView();
        });
    }

    // Background Sync logic
    const syncBadge = document.getElementById('sync-status-badge');
    if (SETTINGS.GOOGLE_SHEETS_API_URL && !window.app.stateSynced) {
        if (syncBadge) {
            syncBadge.className = 'badge badge-info';
            syncBadge.innerHTML = '🔄 Menyinkron data...';
        }
        
        store.syncStateDataFromServer().then(async (success) => {
            window.app.stateSynced = true;
            const newSyncBadge = document.getElementById('sync-status-badge');
            if (newSyncBadge) {
                newSyncBadge.className = 'badge badge-success';
                newSyncBadge.innerHTML = '✅ Terkini (Google Sheets)';
            }
            showToast('🔄 Data berjaya disinkronkan dari Google Sheets backend.', 'success');
            // Re-render dashboard to show new data
            await renderDashboardView();
        }).catch(err => {
            const newSyncBadge = document.getElementById('sync-status-badge');
            if (newSyncBadge) {
                newSyncBadge.className = 'badge badge-danger';
                newSyncBadge.innerHTML = '❌ Gagal Sinkron';
            }
            showToast('❌ Gagal sinkronisasi data Google Sheets. Menggunakan data tempatan.', 'error');
        });
    } else if (SETTINGS.GOOGLE_SHEETS_API_URL && window.app.stateSynced) {
        if (syncBadge) {
            syncBadge.className = 'badge badge-success';
            syncBadge.innerHTML = '✅ Terkini (Google Sheets)';
        }
    }
}

// Global dashboard actions
window.app = window.app || {};
window.app.stateSynced = window.app.stateSynced || false;

// Force synchronization function
window.app.forceSync = async () => {
    window.app.stateSynced = false;
    await renderDashboardView();
};

window.app.exportForm = async (formId) => {
    try {
        const csv = await store.exportFormData(formId, 'csv');
        const config = FORM_CONFIGS[formId];
        downloadFile(csv, `${config?.shortTitle || formId}_${getToday()}.csv`, 'text/csv');
        showToast('📥 Data berjaya dieksport!', 'success');
    } catch (err) {
        console.error('Export error:', err);
        showToast('❌ Gagal eksport data', 'error');
    }
};

window.app.loadSampleData = async () => {
    try {
        await store.seedSampleData();
        showToast('🔧 Data contoh berjaya dimuat!', 'success');
        await renderDashboardView();
    } catch (err) {
        console.error('Seed error:', err);
        showToast('❌ Gagal muat data contoh', 'error');
    }
};

/**
 * Initialize the Leaflet KML-based map dynamically on the state dashboard
 * @param {Array} activeDistrictsList
 */
async function initLocalGISMap(activeDistrictsList) {
    const mapContainer = document.getElementById('state-map');
    if (!mapContainer) return;

    // Center map around Kedah center coordinates (roughly lat 6.12, lon 100.37)
    const map = L.map('state-map').setView([6.12, 100.37], 9);

    // Dark matter tiles from CartoDB (perfect for the premium dark theme)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    try {
        // Fetch local KML file
        const response = await fetch('Daerah Kedah.kml?v=22');
        if (!response.ok) {
            console.error('KML file not found');
            return;
        }
        const kmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
        const placemarks = xmlDoc.getElementsByTagName('Placemark');

        for (const pm of placemarks) {
            const nameNode = pm.getElementsByTagName('name')[0];
            const name = nameNode ? nameNode.textContent.trim() : '';
            const districtNameUpper = name.toUpperCase();

            // Find if this district has active PPS
            const activeData = activeDistrictsList.find(item => item.district.name === districtNameUpper);
            const isActive = !!activeData;

            // Styling colors matching state dashboard
            const color = isActive ? '#ef4444' : '#10b981';
            const fillColor = isActive ? '#ef4444' : '#10b981';
            const fillOpacity = isActive ? 0.35 : 0.12;

            // Extract coordinates from KML coordinates tag
            const coordNodes = pm.getElementsByTagName('coordinates');
            const polygonsLatLngs = [];

            for (const coordNode of coordNodes) {
                const text = coordNode.textContent.trim();
                if (!text) continue;
                // Split by whitespace/newlines
                const pointStrings = text.split(/\s+/);
                const latLngs = [];
                for (const ptStr of pointStrings) {
                    const parts = ptStr.split(',');
                    if (parts.length >= 2) {
                        const lon = parseFloat(parts[0]);
                        const lat = parseFloat(parts[1]);
                        if (!isNaN(lon) && !isNaN(lat)) {
                            // Leaflet expects [latitude, longitude]
                            latLngs.push([lat, lon]);
                        }
                    }
                }
                if (latLngs.length > 0) {
                    polygonsLatLngs.push(latLngs);
                }
            }

            if (polygonsLatLngs.length > 0) {
                // Draw district polygon on Leaflet map
                const leafletPolygon = L.polygon(polygonsLatLngs, {
                    color: color,
                    weight: 2,
                    fillColor: fillColor,
                    fillOpacity: fillOpacity,
                    className: 'district-boundary'
                }).addTo(map);

                // Build custom dark-themed popup content
                let popupHtml = `<div class="map-popup-content">`;
                popupHtml += `<h4 class="popup-title">${districtNameUpper}</h4>`;

                if (isActive) {
                    popupHtml += `<span class="popup-status status-danger">🚨 ${activeData.activePPSCount} PPS Aktif</span>`;
                    popupHtml += `<p class="popup-metric">👥 <strong>${formatNumber(activeData.totalVictims)}</strong> mangsa pemindahan</p>`;
                    popupHtml += `<div class="popup-pps-list-container">`;
                    popupHtml += `<p class="popup-list-header">Senarai Pusat Pemindahan:</p>`;
                    popupHtml += `<ul class="popup-pps-list">`;
                    activeData.ppsList.forEach(p => {
                        popupHtml += `<li>⛺ ${p.name} <span style="float: right; font-weight: 700; color: var(--color-accent-light);">${formatNumber(p.victims)} mangsa</span></li>`;
                    });
                    popupHtml += `</ul>`;
                    popupHtml += `</div>`;
                } else {
                    popupHtml += `<span class="popup-status status-success">🟢 Keadaan Selamat</span>`;
                    popupHtml += `<p class="popup-metric">Tiada PPS aktif dilaporkan di daerah ini.</p>`;
                }
                popupHtml += `</div>`;

                leafletPolygon.bindPopup(popupHtml, {
                    className: 'dark-theme-popup',
                    maxWidth: 280
                });

                // Micro-interactions/hover animations
                leafletPolygon.on('mouseover', function () {
                    this.setStyle({
                        fillOpacity: isActive ? 0.5 : 0.25,
                        weight: 3
                    });
                });

                leafletPolygon.on('mouseout', function () {
                    this.setStyle({
                        fillOpacity: fillOpacity,
                        weight: 2
                    });
                });
            }
        }
    } catch (err) {
        console.error('Error loading or rendering local KML map:', err);
    }
}
