/**
 * Generic Form Entry View
 * Renders any borang based on its FORM_CONFIG definition
 */
import { getSession, showToast, formatDateTime, formatDateInput, getToday, getTimePeriod, showConfirm } from '../utils.js?v=26';
import { FORM_CONFIGS } from '../config/forms.js?v=26';
import { store } from '../store.js?v=26';
import { router } from '../router.js?v=26';
import { renderHeader, initHeader } from '../components/header.js?v=26';
import { renderSidebar, initSidebar } from '../components/sidebar.js?v=26';
import { generateExcelReport } from '../excel-generator.js?v=26';

/**
 * Render the form entry view
 * @param {{ formId: string }} params
 */
export async function renderFormView(params) {
    const session = getSession();
    if (!session) { router.navigate('login'); return; }

    const formId = params.formId;
    const config = FORM_CONFIGS[formId];
    if (!config) {
        showToast('Borang tidak dijumpai', 'error');
        router.navigate(session.role === 'state' ? 'dashboard' : 'district');
        return;
    }

    const isState = session.role === 'state';
    const app = document.getElementById('app');

    // Get active PPS for this district
    let ppsList = [];
    if (!isState) {
        ppsList = (await store.getActivePPS(session.district)) || [];
    }

    // Get recent submissions for this form
    const fetchedSubs = await store.getSubmissions(formId, {
        district: isState ? undefined : session.district
    });
    const recentSubs = fetchedSubs || [];
    const last10 = recentSubs.slice(-10).reverse();

    // Build form HTML
    let formHtml = '';
    if (config.isAutoReport) {
        formHtml = await buildAutoReportView(config, session);
    } else {
        formHtml = isState 
            ? buildStateView(config, recentSubs) 
            : buildFormEntry(config, session, ppsList);
    }

    app.innerHTML = `
    ${renderHeader()}
    <div class="app-layout">
        ${renderSidebar()}
        <main class="main-content fade-in">
            <div class="page-header">
                <div class="page-header-left">
                    <button class="btn btn-icon" onclick="history.back()" title="Kembali">←</button>
                    <div>
                        <h2 class="page-title">${config.icon} ${config.title}</h2>
                        <p class="page-subtitle">${config.description || ''}</p>
                    </div>
                </div>
                <div class="page-header-right" style="display: flex; gap: 8px; align-items: center;">
                    ${!isState ? `
                    <button class="btn btn-secondary btn-sm" onclick="window.app.exportForm('${config.id}')">
                        📥 Eksport Excel
                    </button>
                    ` : ''}
                    <span class="badge badge-${config.type === 'linelist' ? 'info' : 'primary'}">
                        ${config.type === 'linelist' ? '📋 Senarai' : '📊 Harian'}
                    </span>
                </div>
            </div>

            ${formHtml}

            <!-- Recent Submissions -->
            ${(!config.isAutoReport && !isState && last10.length > 0) ? `
            <div class="section-card" style="margin-top: 24px;">
                <div class="section-card-header">
                    <h3>📝 Rekod Terkini</h3>
                    <span class="badge badge-secondary">${recentSubs.length} rekod</span>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Masa</th>
                                <th>Daerah</th>
                                ${config.hasPPS ? '<th>PPS</th>' : ''}
                                <th>Status</th>
                                <th>Ringkasan</th>
                                <th>Tindakan</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${last10.map(sub => {
                                const status = sub.status || 'draft';
                                const statusBadge = status === 'verified' 
                                    ? '<span class="badge badge-success">Disahkan</span>' 
                                    : '<span class="badge badge-warning">Draf</span>';
                                
                                return `
                            <tr>
                                <td class="text-nowrap">${formatDateTime(sub.timestamp)}</td>
                                <td>${sub.district ? sub.district.toUpperCase().replace(/_/g, ' ') : '-'}</td>
                                ${config.hasPPS ? `<td>${sub.ppsName || '-'}</td>` : ''}
                                <td>${statusBadge}</td>
                                <td class="text-muted">${getSummaryText(sub.data, config)}</td>
                                <td style="display: flex; gap: 4px; flex-wrap: wrap;">
                                    ${formId === 'J5_1_Fasiliti' ? `
                                        <button class="btn btn-sm btn-secondary" onclick="window.app.updateReopenDate(${sub.id}, '${formId}')" title="Kemaskini">📅</button>
                                    ` : ''}
                                    
                                    ${status === 'draft' && session.role === 'district' ? `
                                        <button class="btn btn-icon btn-sm btn-primary" onclick="window.app.editSubmission(${sub.id})" title="Edit">✏️</button>
                                    ` : ''}
                                    
                                    ${status === 'draft' && session.role === 'supervisor' ? `
                                        <button class="btn btn-icon btn-sm btn-success" onclick="window.app.verifySubmission(${sub.id}, '${formId}')" title="Sahkan">✅</button>
                                    ` : ''}
                                    
                                    ${(session.role === 'district' || session.role === 'supervisor') ? `
                                        <button class="btn btn-icon btn-sm btn-danger" onclick="window.app.deleteSubmission(${sub.id}, '${formId}')" title="Padam">🗑️</button>
                                    ` : ''}
                                </td>
                            </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>` : ''}
        </main>
    </div>
    `;

    initHeader();
    initSidebar();
    if (!isState) {
        await initFormEvents(formId, config, session);
    }
}

/**
 * Build the form entry HTML for district users
 */
function buildFormEntry(config, session, ppsList) {
    let sectionsHtml = '';

    for (const section of config.sections) {
        let fieldsHtml = '';
        for (const field of section.fields) {
            fieldsHtml += renderField(field, session, config.id);
        }

        sectionsHtml += `
        <div class="form-section">
            <h3 class="form-section-title">${section.title}</h3>
            <div class="form-fields-grid">
                ${fieldsHtml}
            </div>
        </div>`;
    }

    // PPS selector if applicable
    let ppsSelector = '';
    if (config.hasPPS) {
        const ppsOptions = ppsList.map(p => 
            `<option value="${p.id}" data-name="${p.name}">${p.name}</option>`
        ).join('');
        
        ppsSelector = `
        <div class="form-section pps-section">
            <h3 class="form-section-title">🏕️ Pusat Pemindahan Sementara (PPS)</h3>
            <div class="form-fields-grid">
                <div class="form-field grid-col-half">
                    <label class="field-label" for="field-pps">Pilih PPS <span class="required">*</span></label>
                    <select class="select-field" id="field-pps" required>
                        <option value="">-- Pilih PPS --</option>
                        ${ppsOptions}
                    </select>
                </div>
                ${ppsList.length === 0 ? `
                <div class="form-field grid-col-half">
                    <div class="alert-inline alert-warning">
                        <span>⚠️ Tiada PPS aktif.</span>
                        <a href="#pps">Daftar PPS terlebih dahulu →</a>
                    </div>
                </div>` : ''}
            </div>
        </div>`;
    }

    return `
    <form class="entry-form" id="entry-form" novalidate>
        <div class="form-meta">
            <div class="form-meta-item">
                <span class="meta-icon">📅</span>
                <span class="meta-label">Tarikh:</span>
                <span class="meta-value">${new Date().toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
            <div class="form-meta-item">
                <span class="meta-icon">⏰</span>
                <span class="meta-label">Sesi:</span>
                <span class="meta-value badge badge-primary">${getTimePeriod()}</span>
            </div>
            <div class="form-meta-item">
                <span class="meta-icon">🏥</span>
                <span class="meta-label">Daerah:</span>
                <span class="meta-value">${session.districtName}</span>
            </div>
        </div>

        ${ppsSelector}
        ${sectionsHtml}

        <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="btn-clear-form">
                🔄 Kosongkan
            </button>
            <button type="submit" class="btn btn-primary btn-lg" id="btn-submit-form">
                💾 Simpan Draf
            </button>
            <input type="hidden" id="edit-submission-id" value="">
        </div>
    </form>`;
}

/**
 * Render a single form field
 */
function renderField(field, session, formId = '') {
    const gridClass = field.gridColumn === 'full' ? 'grid-col-full' 
        : field.gridColumn === 'third' ? 'grid-col-third' 
        : 'grid-col-half';
    
    const requiredMark = field.required ? '<span class="required">*</span>' : '';
    const isAuto = field.autoCalc != null;
    const isReadonly = isAuto || field.readonly;
    const readonlyAttr = isReadonly ? 'readonly tabindex="-1"' : '';
    const autoClass = isReadonly ? 'field-auto' : '';

    let inputHtml = '';

    switch (field.type) {
        case 'number':
            inputHtml = `<input type="number" class="input-field ${autoClass}" id="field-${field.id}" 
                name="${field.id}" min="${field.min ?? 0}" step="${field.step || 1}" 
                placeholder="${field.placeholder || '0'}" ${readonlyAttr}
                ${field.required ? 'required' : ''}>`;
            break;
        
        case 'text':
            // Auto-fill district or state
            let autoValue = '';
            if (field.id === 'Negeri') autoValue = 'KEDAH';
            if (field.id === 'Daerah' && session) autoValue = session.districtName || '';
            inputHtml = `<input type="text" class="input-field ${autoClass}" id="field-${field.id}" 
                name="${field.id}" placeholder="${field.placeholder || ''}" 
                value="${autoValue}" ${autoValue ? 'readonly' : ''}
                ${field.required ? 'required' : ''}>`;
            break;
        
        case 'date':
            inputHtml = `<input type="date" class="input-field" id="field-${field.id}" 
                name="${field.id}" value="${getToday()}" 
                ${field.required ? 'required' : ''}>`;
            break;
        
        case 'select':
            const options = (field.options || []).map(opt => 
                `<option value="${opt}">${opt}</option>`
            ).join('');
            inputHtml = `<select class="select-field" id="field-${field.id}" name="${field.id}" 
                ${field.required ? 'required' : ''}>
                <option value="">-- Pilih --</option>
                ${options}
            </select>`;
            break;
        
        case 'textarea':
            inputHtml = `<textarea class="input-field textarea-field" id="field-${field.id}" 
                name="${field.id}" rows="3" placeholder="${field.placeholder || ''}"
                ${field.required ? 'required' : ''}></textarea>`;
            break;
        
        default:
            inputHtml = `<input type="text" class="input-field" id="field-${field.id}" 
                name="${field.id}" ${field.required ? 'required' : ''}>`;
    }

    let helpTextHtml = '';
    if (formId === 'J6_Borang6' && field.id === 'Berjangkit_Bil') {
        helpTextHtml = `<div id="auto-populated-info" class="field-help-text" style="margin-top: 6px; font-size: 11.5px; line-height: 1.4; display: block;"></div>`;
    }

    return `
    <div class="form-field ${gridClass}">
        <label class="field-label" for="field-${field.id}">
            ${field.label} ${requiredMark}
            ${isAuto ? '<span class="auto-badge">Auto</span>' : ''}
        </label>
        ${inputHtml}
        ${helpTextHtml}
    </div>`;
}

/**
 * Build the state-level view for a form (Full Data Table)
 */
function buildStateView(config, allSubs) {
    // Get all fields
    const allFields = [];
    for (const section of config.sections) {
        for (const field of section.fields) {
            allFields.push(field);
        }
    }

    // Build headers
    const ths = allFields.map(f => `<th>${f.label}</th>`).join('');

    // Build rows (latest first)
    let tableRows = '';
    const sortedSubs = [...allSubs].sort((a, b) => b.timestamp > a.timestamp ? 1 : -1);

    for (const sub of sortedSubs) {
        let tds = '';
        for (const field of allFields) {
            const val = sub.data[field.id];
            tds += `<td>${val !== undefined && val !== null ? val : '-'}</td>`;
        }

        tableRows += `<tr>
            <td class="text-nowrap">${formatDateTime(sub.timestamp)}</td>
            <td class="text-bold">${sub.district ? sub.district.toUpperCase().replace(/_/g, ' ') : '-'}</td>
            ${config.hasPPS ? `<td>${sub.ppsName || '-'}</td>` : ''}
            ${tds}
        </tr>`;
    }

    return `
    <div class="section-card">
        <div class="section-card-header">
            <h3>📑 Senarai Keseluruhan Rekod (${allSubs.length})</h3>
            <button class="btn btn-secondary btn-sm" onclick="window.app.exportForm('${config.id}')">
                📥 Eksport CSV
            </button>
        </div>
        <div class="table-container" style="max-height: 70vh; overflow-y: auto;">
            <table class="data-table" style="min-width: max-content;">
                <thead style="position: sticky; top: 0; z-index: 1; background: var(--bg-card); box-shadow: 0 1px 3px rgba(0,0,0,0.5);">
                    <tr>
                        <th>Tarikh / Masa</th>
                        <th>Daerah</th>
                        ${config.hasPPS ? '<th>PPS</th>' : ''}
                        ${ths}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || `<tr><td colspan="${allFields.length + 3}" class="text-center text-muted">Tiada data direkodkan</td></tr>`}
                </tbody>
            </table>
        </div>
    </div>`;
}

/**
 * Build Auto-Report view (e.g. for J5_2_Fasiliti)
 */
async function buildAutoReportView(config, session) {
    if (config.id === 'J5_2_Fasiliti') {
        const isState = session.role === 'state';
        // Fetch J5_1_Fasiliti submissions
        const subs = await store.getSubmissions('J5_1_Fasiliti', {
            district: isState ? undefined : session.district
        });
        
        // Compute summary
        const summary = {};
        // Sort by timestamp ascending so that later records for the same facility override earlier ones
        const sortedSubs = [...subs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const latestFacilities = {};
        for (const sub of sortedSubs) {
            const facilityName = (sub.data.Nama_Fasiliti || '').trim().toUpperCase();
            if (facilityName) {
                latestFacilities[facilityName] = sub;
            }
        }
        
        for (const sub of Object.values(latestFacilities)) {
            const dist = sub.district || 'TIADA DAERAH';
            if (!summary[dist]) {
                summary[dist] = { Beroperasi: 0, Pindah_Operasi: 0, Tidak_Beroperasi: 0, Jumlah: 0 };
            }
            const status = sub.data.Status_Operasi_Semasa || sub.data.Status_Operasi_Awal;
            if (status === 'Telah Operasi di fasiliti asal' || status === 'Beroperasi') {
                summary[dist].Beroperasi++;
            } else if (status === 'Masih Pindah Operasi' || status === 'Pindah Operasi') {
                summary[dist].Pindah_Operasi++;
            } else if (status === 'Masih Tutup Operasi' || status === 'Tidak Operasi') {
                summary[dist].Tidak_Beroperasi++;
            }
            summary[dist].Jumlah++;
        }
        
        let tableRows = '';
        let totalB = 0, totalP = 0, totalT = 0, totalJ = 0;
        
        for (const [dist, data] of Object.entries(summary).sort()) {
            totalB += data.Beroperasi;
            totalP += data.Pindah_Operasi;
            totalT += data.Tidak_Beroperasi;
            totalJ += data.Jumlah;
            
            tableRows += `<tr>
                <td class="text-bold">${dist.toUpperCase().replace(/_/g, ' ')}</td>
                <td class="text-right text-success" style="font-weight: 600;">${data.Beroperasi}</td>
                <td class="text-right text-warning" style="font-weight: 600;">${data.Pindah_Operasi}</td>
                <td class="text-right text-danger" style="font-weight: 600;">${data.Tidak_Beroperasi}</td>
                <td class="text-right text-bold" style="font-size: 1.1em;">${data.Jumlah}</td>
            </tr>`;
        }

        return `
        <div class="section-card">
            <div class="section-card-header">
                <h3>📊 Ringkasan Automatik Fasiliti Terjejas</h3>
                <span class="badge badge-info">Dikemaskini secara langsung dari Jadual 5.1</span>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Daerah</th>
                            <th class="text-right">Beroperasi</th>
                            <th class="text-right">Pindah Operasi</th>
                            <th class="text-right">Tidak Beroperasi</th>
                            <th class="text-right">Jumlah Terjejas</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="5" class="text-center text-muted">Tiada data fasiliti direkodkan</td></tr>'}
                    </tbody>
                    ${tableRows ? `
                    <tfoot>
                        <tr class="total-row">
                            <td class="text-bold">JUMLAH KESELURUHAN</td>
                            <td class="text-right">${totalB}</td>
                            <td class="text-right">${totalP}</td>
                            <td class="text-right">${totalT}</td>
                            <td class="text-right">${totalJ}</td>
                        </tr>
                    </tfoot>` : ''}
                </table>
            </div>
        </div>`;
    }
    
    if (config.id === 'J10_2_Vektor') {
        const isState = session.role === 'state';
        // Fetch J10_1_Vektor submissions
        const subs = await store.getSubmissions('J10_1_Vektor', {
            district: isState ? undefined : session.district
        });
        
        // Group by district
        const summary = {};
        for (const sub of subs) {
            const dist = sub.district || 'TIADA DAERAH';
            if (!summary[dist]) {
                summary[dist] = { 
                    PPS_Diperiksa: new Set(),
                    PPS_Positif: 0,
                    Bekas_Diperiksa: 0,
                    Bekas_Positif: 0,
                    Fogging: 0,
                    Larviciding: 0
                };
            }
            if (sub.ppsId) summary[dist].PPS_Diperiksa.add(sub.ppsId);
            summary[dist].PPS_Positif += parseInt(sub.data.PPS_Positif_Bil) || 0;
            summary[dist].Bekas_Diperiksa += parseInt(sub.data.Bekas_Diperiksa_Bil) || 0;
            summary[dist].Bekas_Positif += parseInt(sub.data.Bekas_Positif_Bil) || 0;
            summary[dist].Fogging += parseInt(sub.data.Fogging_Bil) || 0;
            summary[dist].Larviciding += parseInt(sub.data.Larviciding_Bil) || 0;
        }
        
        let tableRows = '';
        let totalActivePPS = 0;
        let totalDiperiksa = 0;
        let totalPositif = 0;
        let totalBekasD = 0;
        let totalBekasP = 0;
        let totalFog = 0;
        let totalLar = 0;
        
        for (const [dist, data] of Object.entries(summary).sort()) {
            const activePPSList = await store.getActivePPS(dist);
            const activePPSCount = activePPSList.length;
            const countDiperiksa = data.PPS_Diperiksa.size;
            
            const ai = countDiperiksa === 0 ? '0.00' : ((data.PPS_Positif / countDiperiksa) * 100).toFixed(2);
            const bi = countDiperiksa === 0 ? '0.00' : ((data.Bekas_Positif / countDiperiksa) * 100).toFixed(2);
            
            totalActivePPS += activePPSCount;
            totalDiperiksa += countDiperiksa;
            totalPositif += data.PPS_Positif;
            totalBekasD += data.Bekas_Diperiksa;
            totalBekasP += data.Bekas_Positif;
            totalFog += data.Fogging;
            totalLar += data.Larviciding;
            
            tableRows += `<tr>
                <td class="text-bold">${dist.toUpperCase().replace(/_/g, ' ')}</td>
                <td class="text-right">${activePPSCount}</td>
                <td class="text-right">${countDiperiksa}</td>
                <td class="text-right">${data.PPS_Positif}</td>
                <td class="text-right">${data.Bekas_Diperiksa}</td>
                <td class="text-right">${data.Bekas_Positif}</td>
                <td class="text-right text-warning" style="font-weight:600;">${ai}%</td>
                <td class="text-right text-warning" style="font-weight:600;">${bi}</td>
                <td class="text-right">${data.Fogging}</td>
                <td class="text-right">${data.Larviciding}</td>
            </tr>`;
        }
        
        const overallAI = totalDiperiksa === 0 ? '0.00' : ((totalPositif / totalDiperiksa) * 100).toFixed(2);
        const overallBI = totalDiperiksa === 0 ? '0.00' : ((totalBekasP / totalDiperiksa) * 100).toFixed(2);

        return `
        <div class="section-card">
            <div class="section-card-header">
                <h3>📊 Ringkasan Aktiviti Kawalan Vektor Denggi</h3>
                <span class="badge badge-info">Dikemaskini secara langsung dari Jadual 10.1</span>
            </div>
            <div class="table-container" style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Daerah</th>
                            <th class="text-right">PPS Aktif</th>
                            <th class="text-right">PPS Dilawati</th>
                            <th class="text-right">PPS Positif</th>
                            <th class="text-right">Bekas Diperiksa</th>
                            <th class="text-right">Bekas Positif</th>
                            <th class="text-right">Aedes Index (AI)</th>
                            <th class="text-right">Breteau Index (BI)</th>
                            <th class="text-right">Fogging (Sesi)</th>
                            <th class="text-right">Larviciding (Sesi)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows || '<tr><td colspan="10" class="text-center text-muted">Tiada data kawalan vektor direkodkan</td></tr>'}
                    </tbody>
                    ${tableRows ? `
                    <tfoot>
                        <tr class="total-row">
                            <td class="text-bold">JUMLAH KESELURUHAN</td>
                            <td class="text-right">${totalActivePPS}</td>
                            <td class="text-right">${totalDiperiksa}</td>
                            <td class="text-right">${totalPositif}</td>
                            <td class="text-right">${totalBekasD}</td>
                            <td class="text-right">${totalBekasP}</td>
                            <td class="text-right">${overallAI}%</td>
                            <td class="text-right">${overallBI}</td>
                            <td class="text-right">${totalFog}</td>
                            <td class="text-right">${totalLar}</td>
                        </tr>
                    </tfoot>` : ''}
                </table>
            </div>
        </div>`;
    }

    return `<div class="alert-inline alert-info">Laporan automatik belum dikonfigurasi untuk borang ini.</div>`;
}

/**
 * Get summary text from submission data
 */
function getSummaryText(data, config) {
    if (!data) return '-';
    const entries = Object.entries(data).filter(([k, v]) => v != null && v !== '' && v !== 0);
    const preview = entries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(', ');
    return preview || '-';
}

/**
 * Initialize form event listeners
 */
async function initFormEvents(formId, config, session) {
    const form = document.getElementById('entry-form');
    if (!form) return;

    // Auto-populate PPS_Aktif for Jadual 10
    const ppsAktifField = document.getElementById('field-PPS_Aktif');
    if (ppsAktifField) {
        try {
            const activePPS = await store.getActivePPS(session.district);
            ppsAktifField.value = activePPS.length;
        } catch (err) {
            console.error('Failed to auto-populate PPS_Aktif:', err);
        }
    }

    // Auto-calculation on input change
    form.addEventListener('input', (e) => {
        if (e.target.matches('.input-field')) {
            runAutoCalculations(config);
        }
    });

    // Auto-populate Table 6 (J6_Borang6) Penyakit Berjangkit from Table 7 (J7_Borang7)
    if (formId === 'J6_Borang6') {
        const ppsField = document.getElementById('field-pps');
        if (ppsField) {
            const handlePPSChange = async () => {
                const ppsId = ppsField.value;
                const infoEl = document.getElementById('auto-populated-info');
                const berjangkitInput = document.getElementById('field-Berjangkit_Bil');
                
                if (!ppsId) {
                    if (infoEl) infoEl.innerHTML = '';
                    return;
                }
                
                if (infoEl) {
                    infoEl.innerHTML = '<span style="color: var(--text-muted);">🔄 Menyemak data Jadual 7...</span>';
                }
                
                try {
                    const today = getToday();
                    const submissions = await store.getSubmissions('J7_Borang7', {
                        district: session.district,
                        ppsId: ppsId,
                        dateFrom: today,
                        dateTo: today
                    });
                    
                    if (submissions && submissions.length > 0) {
                        // Get latest submission for today
                        const latestSub = submissions[0];
                        const totalBerjangkit = latestSub.data.Jumlah_Keseluruhan || 0;
                        
                        if (berjangkitInput) {
                            berjangkitInput.value = totalBerjangkit;
                            // Visual feedback
                            berjangkitInput.style.borderColor = '#2ecc71';
                            berjangkitInput.style.boxShadow = '0 0 5px rgba(46, 204, 113, 0.3)';
                            setTimeout(() => {
                                berjangkitInput.style.borderColor = '';
                                berjangkitInput.style.boxShadow = '';
                            }, 3000);
                        }
                        
                        if (infoEl) {
                            infoEl.innerHTML = `<span style="color: #2ecc71; font-weight: 600;">✓ Auto-populated dari Jadual 7 hari ini bagi PPS ini (Jumlah: ${totalBerjangkit})</span>`;
                        }
                        
                        // Trigger auto-calculations for J6
                        runAutoCalculations(config);
                    } else {
                        if (infoEl) {
                            infoEl.innerHTML = `<span style="color: var(--accent-color); font-weight: 500;">⚠️ Jadual 7 belum diisi untuk PPS ini hari ini. Sila isi Jadual 7 dahulu untuk auto-populate, atau masukkan secara manual.</span>`;
                        }
                    }
                } catch (err) {
                    console.error('Failed to auto-populate from J7:', err);
                    if (infoEl) {
                        infoEl.innerHTML = '<span style="color: var(--danger-color);">⚠️ Gagal mencedok data penyakit berjangkit.</span>';
                    }
                }
            };
            
            ppsField.addEventListener('change', handlePPSChange);
            // Run initially if a PPS is already selected
            if (ppsField.value) {
                handlePPSChange();
            }
        }
    }

    // Clear form
    const clearBtn = document.getElementById('btn-clear-form');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            showConfirm(
                'Kosongkan Borang?',
                'Semua data yang belum dihantar akan hilang.',
                () => {
                    form.reset();
                    // Re-fill auto values
                    const daerahField = document.getElementById('field-Daerah');
                    if (daerahField) daerahField.value = session.districtName;
                    const negeriField = document.getElementById('field-Negeri');
                    if (negeriField) negeriField.value = 'KEDAH';
                    const editId = document.getElementById('edit-submission-id');
                    if (editId) editId.value = '';
                    const submitBtn = document.getElementById('btn-submit-form');
                    if (submitBtn) submitBtn.innerHTML = '💾 Simpan Draf';
                    
                    showToast('Borang telah dikosongkan', 'info');
                }
            );
        });
    }

    // Submit form
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validate PPS selection if needed
        if (config.hasPPS) {
            const ppsField = document.getElementById('field-pps');
            if (ppsField && !ppsField.value) {
                showToast('Sila pilih PPS terlebih dahulu', 'warning');
                ppsField.focus();
                return;
            }
        }

        // Collect form data
        const formData = {};
        for (const section of config.sections) {
            for (const field of section.fields) {
                const el = document.getElementById(`field-${field.id}`);
                if (el) {
                    let value = el.value;
                    if (field.type === 'number' && value !== '') {
                        value = parseFloat(value) || 0;
                    }
                    formData[field.id] = value;
                }
            }
        }

        // Get PPS info
        let ppsId = null;
        let ppsName = null;
        if (config.hasPPS) {
            const ppsField = document.getElementById('field-pps');
            if (ppsField) {
                ppsId = ppsField.value;
                ppsName = ppsField.options[ppsField.selectedIndex]?.dataset?.name || '';
            }
        }

        const editIdField = document.getElementById('edit-submission-id');
        const isEdit = editIdField && editIdField.value !== '';
        const submissionId = isEdit ? parseInt(editIdField.value, 10) : null;

        try {
            if (isEdit) {
                await store.updateSubmission(submissionId, formData);
                showToast('✅ Rekod draf berjaya dikemaskini!', 'success');
            } else {
                await store.addSubmission(formId, session.district, formData, ppsId, ppsName, 'draft');
                showToast('✅ Draf berjaya disimpan!', 'success');
            }
            
            // Re-render to show updated submissions list
            await renderFormView({ formId });
        } catch (err) {
            console.error('Submit error:', err);
            showToast('❌ Gagal menyimpan data. Sila cuba lagi.', 'error');
        }
    });

    // Run initial auto-calculations
    runAutoCalculations(config);

    // Attach global edit handler
    window.app.editSubmission = async (id) => {
        const subs = await store.getSubmissions(formId);
        const sub = subs.find(s => s.id === id);
        if (!sub) return;
        
        // Populate fields
        for (const [key, value] of Object.entries(sub.data)) {
            const el = document.getElementById(`field-${key}`);
            if (el) el.value = value;
        }
        
        // Set PPS
        if (config.hasPPS && sub.ppsId) {
            const ppsField = document.getElementById('field-pps');
            if (ppsField) {
                ppsField.value = sub.ppsId;
                ppsField.dispatchEvent(new Event('change'));
            }
        }
        
        // Set edit state
        const editIdField = document.getElementById('edit-submission-id');
        if (editIdField) editIdField.value = id;
        const submitBtn = document.getElementById('btn-submit-form');
        if (submitBtn) submitBtn.innerHTML = '💾 Kemaskini Draf';
        
        // Scroll to form
        document.getElementById('entry-form').scrollIntoView({ behavior: 'smooth' });
        showToast('Mod kemaskini diaktifkan', 'info');
    };
}

/**
 * Run auto-calculations for all computed fields
 */
function runAutoCalculations(config) {
    for (const section of config.sections) {
        for (const field of section.fields) {
            if (!field.autoCalc) continue;

            const el = document.getElementById(`field-${field.id}`);
            if (!el) continue;

            const calc = field.autoCalc;

            if (calc.type === 'sum') {
                let total = 0;
                for (const sourceId of (calc.sources || [])) {
                    const sourceEl = document.getElementById(`field-${sourceId}`);
                    if (sourceEl) {
                        total += parseFloat(sourceEl.value) || 0;
                    }
                }
                el.value = total;
            } else if (calc.type === 'division_percentage') {
                const numeratorEl = document.getElementById(`field-${calc.numerator}`);
                const denominatorEl = document.getElementById(`field-${calc.denominator}`);
                if (numeratorEl && denominatorEl) {
                    const num = parseFloat(numeratorEl.value) || 0;
                    const den = parseFloat(denominatorEl.value) || 0;
                    el.value = den === 0 ? '0.00' : ((num / den) * 100).toFixed(2);
                }
            }
            // Note: 'cumulative' type would need async data from store
            // For now, cumulative fields are left for the user or set to 0
        }
    }
}

// Expose delete function globally
window.app = window.app || {};
window.app.deleteSubmission = async (id, formId) => {
    showConfirm(
        'Padam Rekod?',
        'Rekod yang dipadam tidak boleh dikembalikan.',
        async () => {
            await store.deleteSubmission(id);
            showToast('Rekod telah dipadam', 'info');
            await renderFormView({ formId });
        }
    );
};

window.app.verifySubmission = async (id, formId) => {
    showConfirm(
        'Sahkan Rekod?',
        'Adakah anda pasti mahu mengesahkan rekod ini? Data yang disahkan akan dihantar ke peringkat Negeri.',
        async () => {
            await store.updateSubmission(id, {}, 'verified');
            showToast('✅ Rekod telah disahkan', 'success');
            await renderFormView({ formId });
        }
    );
};

window.app.updateReopenDate = async (id, formId) => {
    const subs = await store.getSubmissions(formId);
    const sub = subs.find(s => s.id === id);
    if (!sub) return;

    const overlay = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const footerEl = document.getElementById('modal-footer');

    titleEl.textContent = 'Kemaskini Status Operasi & Tarikh Buka';
    
    const currentStatus = sub.data.Status_Operasi_Semasa || '';
    const currentReopenDate = sub.data.Tarikh_Buka || '';

    bodyEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 8px;">
            <p>Fasiliti: <strong>${sub.data.Nama_Fasiliti}</strong></p>
            
            <div class="form-field">
                <label class="field-label" for="modal-status-semasa" style="display: block; margin-bottom: 6px; font-weight: 500;">Status Operasi Semasa</label>
                <select class="select-field" id="modal-status-semasa" style="width: 100%; padding: 8px; border-radius: 4px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color);">
                    <option value="Masih Pindah Operasi" ${currentStatus === 'Masih Pindah Operasi' ? 'selected' : ''}>Masih Pindah Operasi</option>
                    <option value="Masih Tutup Operasi" ${currentStatus === 'Masih Tutup Operasi' ? 'selected' : ''}>Masih Tutup Operasi</option>
                    <option value="Telah Operasi di fasiliti asal" ${currentStatus === 'Telah Operasi di fasiliti asal' ? 'selected' : ''}>Telah Operasi di fasiliti asal</option>
                </select>
            </div>
            
            <div class="form-field">
                <label class="field-label" for="modal-tarikh-buka" style="display: block; margin-bottom: 6px; font-weight: 500;">Tarikh Buka Semula (jika diketahui)</label>
                <input type="date" class="input-field" id="modal-tarikh-buka" value="${currentReopenDate}" style="width: 100%; padding: 8px; border-radius: 4px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color);">
            </div>
        </div>
    `;

    footerEl.innerHTML = `
        <button class="btn btn-secondary" id="modal-update-cancel">Batal</button>
        <button class="btn btn-primary" id="modal-update-confirm">Simpan Rekod</button>
    `;

    overlay.classList.remove('hidden');

    document.getElementById('modal-update-confirm').onclick = async () => {
        const newStatus = document.getElementById('modal-status-semasa').value;
        const newReopenDate = document.getElementById('modal-tarikh-buka').value;

        overlay.classList.add('hidden');
        try {
            await store.updateSubmission(id, {
                Status_Operasi_Semasa: newStatus,
                Tarikh_Buka: newReopenDate
            });
            showToast('Rekod telah dikemaskini', 'success');
            await renderFormView({ formId });
        } catch (err) {
            console.error('Update error:', err);
            showToast('Gagal mengemaskini rekod', 'error');
        }
    };

    document.getElementById('modal-update-cancel').onclick = () => {
        overlay.classList.remove('hidden');
    };
};
