/**
 * Client-Side Excel Report Generator using ExcelJS
 */

const DISTRICTS_ORDER = [
    { name: 'KULIM', key: 'kulim' },
    { name: 'KUBANG PASU', key: 'kubang_pasu' },
    { name: 'KOTA SETAR', key: 'kota_setar' },
    { name: 'POKOK SENA', key: 'pokok_sena' },
    { name: 'PADANG TERAP', key: 'padang_terap' },
    { name: 'SIK', key: 'sik' },
    { name: 'BALING', key: 'baling' },
    { name: 'BANDAR BAHARU', key: 'bandar_baharu' },
    { name: 'KUALA MUDA', key: 'kuala_muda' },
    { name: 'PENDANG', key: 'pendang' },
    { name: 'YAN', key: 'yan' },
    { name: 'LANGKAWI', key: 'langkawi' }
];

// Helper to calculate daily sum for a district
function getDistrictDailySum(formId, districtKey, date, fieldName, submissions) {
    let sum = 0;
    let hasData = false;
    for (const sub of submissions) {
        if (sub.formId === formId && sub.district === districtKey && sub.date === date) {
            const val = sub.data?.[fieldName];
            if (typeof val === 'number') {
                sum += val;
                hasData = true;
            } else if (val != null && !isNaN(Number(val))) {
                sum += Number(val);
                hasData = true;
            }
        }
    }
    return hasData ? sum : undefined;
}

// Helper to calculate cumulative sum for a district up to date
function getDistrictCumulativeSum(formId, districtKey, date, fieldName, submissions) {
    let sum = 0;
    let hasData = false;
    for (const sub of submissions) {
        if (sub.formId === formId && sub.district === districtKey && sub.date <= date) {
            const val = sub.data?.[fieldName];
            if (typeof val === 'number') {
                sum += val;
                hasData = true;
            } else if (val != null && !isNaN(Number(val))) {
                sum += Number(val);
                hasData = true;
            }
        }
    }
    return hasData ? sum : undefined;
}

// Helper to get latest text on date
function getDistrictLatestText(formId, districtKey, date, fieldName, submissions) {
    let latestSub = null;
    for (const sub of submissions) {
        if (sub.formId === formId && sub.district === districtKey && sub.date === date) {
            if (!latestSub || sub.timestamp > latestSub.timestamp) {
                latestSub = sub;
            }
        }
    }
    return latestSub?.data?.[fieldName] || undefined;
}

/**
 * Main function to generate and download the JKN Excel report
 * @param {Array} submissions All submissions from store
 * @param {Array} ppsList All PPS from store
 * @param {string} selectedDate YYYY-MM-DD string
 */
export async function generateExcelReport(submissions, ppsList, selectedDate) {
    if (!window.ExcelJS) {
        throw new Error('Pustaka ExcelJS gagal dimuatkan dari CDN.');
    }

    // 1. Fetch template.xlsx as ArrayBuffer
    const response = await fetch('templates/template.xlsx?v=11');
    if (!response.ok) {
        throw new Error('Fail templat templates/template.xlsx tidak dijumpai.');
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Load workbook
    const workbook = new window.ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    // -------------------------------------------------------------
    // SHEET 1: Jadual 4-Borang 3(JKN) (Pasukan RRT)
    // -------------------------------------------------------------
    const ws4 = workbook.getWorksheet('Jadual 4-Borang 3(JKN)');
    if (ws4) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws4.getCell(`A${row}`).value = d.name;
            ws4.getCell(`D${row}`).value = getDistrictDailySum('J4_Borang3', d.key, selectedDate, 'RRT_Perubatan_Bil', submissions);
            ws4.getCell(`E${row}`).value = getDistrictCumulativeSum('J4_Borang3', d.key, selectedDate, 'RRT_Perubatan_Bil', submissions);
            ws4.getCell(`F${row}`).value = getDistrictDailySum('J4_Borang3', d.key, selectedDate, 'RRT_Kesihatan_Bil', submissions);
            ws4.getCell(`G${row}`).value = getDistrictCumulativeSum('J4_Borang3', d.key, selectedDate, 'RRT_Kesihatan_Bil', submissions);
            ws4.getCell(`H${row}`).value = getDistrictDailySum('J4_Borang3', d.key, selectedDate, 'RRT_MHPSS_Bil', submissions);
            ws4.getCell(`I${row}`).value = getDistrictCumulativeSum('J4_Borang3', d.key, selectedDate, 'RRT_MHPSS_Bil', submissions);
            
            // Re-apply formulas for totals just in case
            ws4.getCell(`B${row}`).value = { formula: `D${row}+F${row}+H${row}` };
            ws4.getCell(`C${row}`).value = { formula: `E${row}+G${row}+I${row}` };
        });
    }

    // -------------------------------------------------------------
    // SHEET 2: Jadual 5.1-Borang 4 (Fasiliti Terjejas Linelist)
    // -------------------------------------------------------------
    const ws51 = workbook.getWorksheet('Jadual 5.1-Borang 4');
    if (ws51) {
        // Clear old rows starting from row 6 down to 100
        for (let r = 6; r <= 100; r++) {
            for (let c = 1; c <= 13; c++) {
                ws51.getCell(r, c).value = null;
            }
        }

        const facSubs = submissions
            .filter(sub => sub.formId === 'J5_1_Fasiliti' && sub.date <= selectedDate)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        facSubs.forEach((sub, idx) => {
            const row = 6 + idx;
            ws51.getCell(`A${row}`).value = idx + 1;
            ws51.getCell(`B${row}`).value = 'KEDAH';
            ws51.getCell(`C${row}`).value = (sub.data.Daerah || undefined).toUpperCase();
            ws51.getCell(`D${row}`).value = sub.data.Nama_Fasiliti || undefined;
            ws51.getCell(`E${row}`).value = sub.data.Status_Operasi_Awal || undefined;
            ws51.getCell(`F${row}`).value = sub.data.Perkhidmatan_Dipindahkan || undefined;
            ws51.getCell(`G${row}`).value = sub.data.Tarikh_Tutup || undefined;
            ws51.getCell(`H${row}`).value = sub.data.Status_Operasi_Semasa || undefined;
            ws51.getCell(`I${row}`).value = sub.data.Tarikh_Buka || undefined;
            ws51.getCell(`J${row}`).value = sub.data.Tahap_Severiti || undefined;
            ws51.getCell(`K${row}`).value = sub.data.Kategori_Fasiliti || undefined;
            ws51.getCell(`L${row}`).value = sub.data.Catatan || undefined;
        });
    }

    // -------------------------------------------------------------
    // SHEET 3: Jadual 5.2 (Ringkasan Fasiliti Terjejas)
    // -------------------------------------------------------------
    const ws52 = workbook.getWorksheet('Jadual 5.2 ');
    if (ws52) {
        // Compute active facility status up to selectedDate
        const allFacSubs = submissions.filter(sub => sub.formId === 'J5_1_Fasiliti' && sub.date <= selectedDate);
        const sortedFacSubs = [...allFacSubs].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        
        // Find latest record per facility
        const latestFacilities = {};
        for (const sub of sortedFacSubs) {
            const facName = (sub.data.Nama_Fasiliti || undefined).trim().toUpperCase();
            if (facName) {
                latestFacilities[facName] = sub;
            }
        }

        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 5 + idx;
            ws52.getCell(`A${row}`).value = d.name;

            let beroperasi = 0;
            let pindah = 0;
            let tutup = 0;

            for (const sub of Object.values(latestFacilities)) {
                if (sub.district === d.key) {
                    const status = sub.data.Status_Operasi_Semasa || sub.data.Status_Operasi_Awal;
                    if (status === 'Telah Operasi di fasiliti asal' || status === 'Beroperasi') {
                        beroperasi++;
                    } else if (status === 'Masih Pindah Operasi' || status === 'Pindah Operasi') {
                        pindah++;
                    } else if (status === 'Masih Tutup Operasi' || status === 'Tidak Operasi') {
                        tutup++;
                    }
                }
            }

            ws52.getCell(`C${row}`).value = beroperasi;
            ws52.getCell(`D${row}`).value = pindah;
            ws52.getCell(`E${row}`).value = tutup;
            ws52.getCell(`B${row}`).value = { formula: `C${row}+D${row}+E${row}` };
        });
    }

    // -------------------------------------------------------------
    // SHEET 4: Jadual 6-Borang 6 (Mangsa & Penyakit)
    // -------------------------------------------------------------
    const ws6 = workbook.getWorksheet('Jadual 6-Borang 6');
    if (ws6) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 6 + idx;
            ws6.getCell(`A${row}`).value = d.name;
            ws6.getCell(`B${row}`).value = getDistrictDailySum('J6_Borang6', d.key, selectedDate, 'Kes_Diperiksa_Bil', submissions);
            ws6.getCell(`C${row}`).value = getDistrictCumulativeSum('J6_Borang6', d.key, selectedDate, 'Kes_Diperiksa_Bil', submissions);
            ws6.getCell(`D${row}`).value = getDistrictDailySum('J6_Borang6', d.key, selectedDate, 'Berjangkit_Bil', submissions);
            ws6.getCell(`E${row}`).value = getDistrictCumulativeSum('J6_Borang6', d.key, selectedDate, 'Berjangkit_Bil', submissions);
            ws6.getCell(`F${row}`).value = getDistrictDailySum('J6_Borang6', d.key, selectedDate, 'NCD_Bil', submissions);
            ws6.getCell(`G${row}`).value = getDistrictCumulativeSum('J6_Borang6', d.key, selectedDate, 'NCD_Bil', submissions);
            ws6.getCell(`H${row}`).value = getDistrictDailySum('J6_Borang6', d.key, selectedDate, 'Kecederaan_Bil', submissions);
            ws6.getCell(`I${row}`).value = getDistrictCumulativeSum('J6_Borang6', d.key, selectedDate, 'Kecederaan_Bil', submissions);
            ws6.getCell(`J${row}`).value = getDistrictDailySum('J6_Borang6', d.key, selectedDate, 'Wabak_Bil', submissions);
            ws6.getCell(`K${row}`).value = getDistrictCumulativeSum('J6_Borang6', d.key, selectedDate, 'Wabak_Bil', submissions);
            
            ws6.getCell(`L${row}`).value = { formula: `D${row}+F${row}+H${row}+J${row}` };
            ws6.getCell(`M${row}`).value = { formula: `E${row}+G${row}+I${row}+K${row}` };
        });
    }

    // -------------------------------------------------------------
    // SHEET 5: Jadual 7-Borang 7 (Penyakit Berjangkit)
    // -------------------------------------------------------------
    const ws7 = workbook.getWorksheet('Jadual 7-Borang 7');
    if (ws7) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws7.getCell(`A${row}`).value = d.name;
            
            const fields = [
                'AGE_Bil', 'ARI_Bil', 'Konjunktivitis_Bil', 'Skin_Infection_Bil', 
                'Demam_Bil', 'HFMD_Bil', 'Tifoid_Bil', 'Chicken_Pox_Bil', 
                'Leptospirosis_Bil', 'Lain_Lain_Bil'
            ];

            fields.forEach((f, fIdx) => {
                const colDaily = 2 + (fIdx * 2); // B, D, F, H, J, L, N, P, R, T
                const colCum = 3 + (fIdx * 2);   // C, E, G, I, K, M, O, Q, S, U
                
                ws7.getCell(row, colDaily).value = getDistrictDailySum('J7_Borang7', d.key, selectedDate, f, submissions);
                ws7.getCell(row, colCum).value = getDistrictCumulativeSum('J7_Borang7', d.key, selectedDate, f, submissions);
            });

            // Formulas for Totals (Col V = 22, Col W = 23)
            ws7.getCell(row, 22).value = { formula: `B${row}+D${row}+F${row}+H${row}+J${row}+L${row}+N${row}+P${row}+R${row}+T${row}` };
            ws7.getCell(row, 23).value = { formula: `C${row}+E${row}+G${row}+I${row}+K${row}+M${row}+O${row}+Q${row}+S${row}+U${row}` };
        });
    }

    // -------------------------------------------------------------
    // SHEET 6: Jadual 8.1-Borang 12 (Hospital)
    // -------------------------------------------------------------
    const ws81 = workbook.worksheets.find(w => w.name && w.name.includes('8.1'));
    if (ws81) {
        ws81.pageSetup = null;
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 6 + idx;
            const a = getDistrictDailySum('J8_1_Borang12', d.key, selectedDate, 'Lelaki_Dewasa_Bil', submissions);
            const b = getDistrictDailySum('J8_1_Borang12', d.key, selectedDate, 'Perempuan_Dewasa_Bil', submissions);
            const c = getDistrictDailySum('J8_1_Borang12', d.key, selectedDate, 'Kanak_Kanak_Bil', submissions);
            const d_cum = getDistrictCumulativeSum('J8_1_Borang12', d.key, selectedDate, 'Lelaki_Dewasa_Bil', submissions);
            const e_cum = getDistrictCumulativeSum('J8_1_Borang12', d.key, selectedDate, 'Perempuan_Dewasa_Bil', submissions);
            const f_cum = getDistrictCumulativeSum('J8_1_Borang12', d.key, selectedDate, 'Kanak_Kanak_Bil', submissions);
            const txt = getDistrictLatestText('J8_1_Borang12', d.key, selectedDate, 'Sebab_Dirujuk', submissions);
            
            if (a || b || c || d_cum || e_cum || f_cum || txt) {
                ws81.getCell(`A${row}`).value = d.name;
                if (a !== undefined) ws81.getCell(`B${row}`).value = a;
                if (b !== undefined) ws81.getCell(`C${row}`).value = b;
                if (c !== undefined) ws81.getCell(`D${row}`).value = c;
                if (d_cum !== undefined) ws81.getCell(`E${row}`).value = d_cum;
                if (e_cum !== undefined) ws81.getCell(`F${row}`).value = e_cum;
                if (f_cum !== undefined) ws81.getCell(`G${row}`).value = f_cum;
                if (txt !== undefined) ws81.getCell(`H${row}`).value = txt;
            }
        });
    }

    // -------------------------------------------------------------
    // SHEET 7: Jadual 8.2-Borang 12 (Kemasukan Khas)
    // -------------------------------------------------------------
    const ws82 = workbook.worksheets.find(w => w.name && w.name.includes('8.2'));
    if (ws82) {
        ws82.pageSetup = null;
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 6 + idx;
            const a = getDistrictDailySum('J8_2_Borang12', d.key, selectedDate, 'Antenatal_Bil', submissions);
            const a_cum = getDistrictCumulativeSum('J8_2_Borang12', d.key, selectedDate, 'Antenatal_Bil', submissions);
            const b = getDistrictDailySum('J8_2_Borang12', d.key, selectedDate, 'Posnatal_Bil', submissions);
            const b_cum = getDistrictCumulativeSum('J8_2_Borang12', d.key, selectedDate, 'Posnatal_Bil', submissions);
            const c = getDistrictDailySum('J8_2_Borang12', d.key, selectedDate, 'Haemodialisis_Bil', submissions);
            const c_cum = getDistrictCumulativeSum('J8_2_Borang12', d.key, selectedDate, 'Haemodialisis_Bil', submissions);
            const d_val = getDistrictDailySum('J8_2_Borang12', d.key, selectedDate, 'Paliatif_Bil', submissions);
            const d_cum = getDistrictCumulativeSum('J8_2_Borang12', d.key, selectedDate, 'Paliatif_Bil', submissions);
            const txt = getDistrictLatestText('J8_2_Borang12', d.key, selectedDate, 'Catatan', submissions);

            if (a || a_cum || b || b_cum || c || c_cum || d_val || d_cum || txt) {
                ws82.getCell(`A${row}`).value = idx + 1;
                ws82.getCell(`B${row}`).value = d.name;
                if (a !== undefined) ws82.getCell(`C${row}`).value = a;
                if (a_cum !== undefined) ws82.getCell(`D${row}`).value = a_cum;
                if (b !== undefined) ws82.getCell(`E${row}`).value = b;
                if (b_cum !== undefined) ws82.getCell(`F${row}`).value = b_cum;
                if (c !== undefined) ws82.getCell(`G${row}`).value = c;
                if (c_cum !== undefined) ws82.getCell(`H${row}`).value = c_cum;
                if (d_val !== undefined) ws82.getCell(`I${row}`).value = d_val;
                if (d_cum !== undefined) ws82.getCell(`J${row}`).value = d_cum;
                if (txt !== undefined) ws82.getCell(`K${row}`).value = txt;
            }
        });
    }

    // -------------------------------------------------------------
    // SHEET 8: Jadual 8.3 - DATA BPP (Dialisis)
    // -------------------------------------------------------------
    const ws83 = workbook.getWorksheet('Jadual 8.3 - DATA BPP');
    if (ws83) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 8 + idx;
            ws83.getCell(`A${row}`).value = idx + 1;
            ws83.getCell(`B${row}`).value = d.name;
            
            ws83.getCell(`D${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Bil_Fasiliti_Terjejas_Pusat_Dialisis', submissions);
            ws83.getCell(`E${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Status_Fasiliti_Tidak_Terjejas', submissions);
            ws83.getCell(`F${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Jenis_Fasiliti_KKM', submissions);
            ws83.getCell(`G${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Jenis_Fasiliti_Swasta', submissions);
            ws83.getCell(`H${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Status_Operasi_Tidak_Operasi', submissions);
            ws83.getCell(`I${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Status_Operasi_Mula', submissions);
            ws83.getCell(`J${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Bil_Pesakit_Rawatan_Pusat_Asal_Fasiliti', submissions);
            ws83.getCell(`K${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Jumlah_Pesakit_Terjejas', submissions);
            ws83.getCell(`L${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Bil_Pesakit_Rawatan_Pusat_Asal_Pesakit', submissions);
            ws83.getCell(`M${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Bil_Pesakit_Pindah_Pusat_Lain', submissions);
            ws83.getCell(`N${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Bil_Pesakit_Masuk_Hospital', submissions);
            ws83.getCell(`O${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Pesakit_Discaj', submissions);
            ws83.getCell(`P${row}`).value = getDistrictDailySum('J8_3_BPP', d.key, selectedDate, 'Pesakit_Masih_Terjejas', submissions);

            ws83.getCell(`C${row}`).value = { formula: `D${row}+E${row}` };
        });
    }

    // -------------------------------------------------------------
    // SHEET 9: Jadual 9-Borang 11 (Bekalan Air)
    // -------------------------------------------------------------
    const ws9 = workbook.getWorksheet('Jadual 9-Borang 11');
    if (ws9) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws9.getCell(`A${row}`).value = idx + 1;
            ws9.getCell(`B${row}`).value = d.name;
            
            const fields = [
                'Sampel_Air_Bil', 'Pelanggaran_pH_Bil', 'Pelanggaran_Baki_Klorin_Bil',
                'Pelanggaran_NTU_Bil', 'Pelanggaran_Ecoli_Bil', 'Telaga_Diperiksa_Bil',
                'Telaga_Diklorin_Bil'
            ];

            fields.forEach((f, fIdx) => {
                const colDaily = 3 + (fIdx * 2); // C, E, G, I, K, M, O
                const colCum = 4 + (fIdx * 2);   // D, F, H, J, L, N, P

                ws9.getCell(row, colDaily).value = getDistrictDailySum('J9_Borang11', d.key, selectedDate, f, submissions);
                ws9.getCell(row, colCum).value = getDistrictCumulativeSum('J9_Borang11', d.key, selectedDate, f, submissions);
            });
        });
    }

    // -------------------------------------------------------------
    // SHEET 10: Jadual 10-Borang 8 (Vector Control)
    // -------------------------------------------------------------
    const ws10 = workbook.getWorksheet('Jadual 10-Borang 8');
    if (ws10) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws10.getCell(`A${row}`).value = idx + 1;
            ws10.getCell(`B${row}`).value = d.name;
            
            // PPS Aktif
            const activePPSCount = ppsList.filter(p => p.district === d.key && p.status === 'active').length;
            ws10.getCell(`C${row}`).value = activePPSCount;

            // Compute unique PPS inspected on selectedDate
            const ppsInspectedSetDaily = new Set();
            submissions.forEach(sub => {
                if (sub.formId === 'J10_1_Vektor' && sub.district === d.key && sub.date === selectedDate && sub.ppsId) {
                    ppsInspectedSetDaily.add(sub.ppsId);
                }
            });
            ws10.getCell(`D${row}`).value = ppsInspectedSetDaily.size;

            // Compute unique PPS inspected up to selectedDate
            const ppsInspectedSetCum = new Set();
            submissions.forEach(sub => {
                if (sub.formId === 'J10_1_Vektor' && sub.district === d.key && sub.date <= selectedDate && sub.ppsId) {
                    ppsInspectedSetCum.add(sub.ppsId);
                }
            });
            ws10.getCell(`E${row}`).value = ppsInspectedSetCum.size;

            // POSITIVE PPS
            ws10.getCell(`F${row}`).value = getDistrictDailySum('J10_1_Vektor', d.key, selectedDate, 'PPS_Positif_Bil', submissions);
            ws10.getCell(`G${row}`).value = getDistrictCumulativeSum('J10_1_Vektor', d.key, selectedDate, 'PPS_Positif_Bil', submissions);

            // BEKAS DIPERIKSA
            ws10.getCell(`H${row}`).value = getDistrictDailySum('J10_1_Vektor', d.key, selectedDate, 'Bekas_Diperiksa_Bil', submissions);
            ws10.getCell(`I${row}`).value = getDistrictCumulativeSum('J10_1_Vektor', d.key, selectedDate, 'Bekas_Diperiksa_Bil', submissions);

            // BEKAS POSITIF
            ws10.getCell(`J${row}`).value = getDistrictDailySum('J10_1_Vektor', d.key, selectedDate, 'Bekas_Positif_Bil', submissions);
            ws10.getCell(`K${row}`).value = getDistrictCumulativeSum('J10_1_Vektor', d.key, selectedDate, 'Bekas_Positif_Bil', submissions);

            // Formulas for AI & BI
            ws10.getCell(`L${row}`).value = { formula: `IF(D${row}>0,(F${row}/D${row})*100,0)` };
            ws10.getCell(`M${row}`).value = { formula: `IF(D${row}>0,(J${row}/D${row})*100,0)` };

            // Fogging
            ws10.getCell(`N${row}`).value = getDistrictDailySum('J10_1_Vektor', d.key, selectedDate, 'Fogging_Bil', submissions);
            ws10.getCell(`O${row}`).value = getDistrictCumulativeSum('J10_1_Vektor', d.key, selectedDate, 'Fogging_Bil', submissions);

            // Larviciding
            ws10.getCell(`P${row}`).value = getDistrictDailySum('J10_1_Vektor', d.key, selectedDate, 'Larviciding_Bil', submissions);
            ws10.getCell(`Q${row}`).value = getDistrictCumulativeSum('J10_1_Vektor', d.key, selectedDate, 'Larviciding_Bil', submissions);
        });
    }

    // -------------------------------------------------------------
    // SHEET 11: Jadual 11-Borang 13 (Keselamatan Makanan)
    // -------------------------------------------------------------
    const ws11 = workbook.getWorksheet('Jadual 11-Borang 13');
    if (ws11) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws11.getCell(`A${row}`).value = idx + 1;
            ws11.getCell(`B${row}`).value = d.name;

            // PPS Dilawati (unique set)
            const ppsVisitedDaily = new Set();
            submissions.forEach(sub => {
                if (sub.formId === 'J11_Borang13' && sub.district === d.key && sub.date === selectedDate && sub.ppsId) {
                    ppsVisitedDaily.add(sub.ppsId);
                }
            });
            ws11.getCell(`C${row}`).value = ppsVisitedDaily.size;

            ws11.getCell(`D${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Premis_Makanan_Memuaskan', submissions);
            ws11.getCell(`E${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Premis_Makanan_Tidak_Memuaskan', submissions);
            ws11.getCell(`F${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Premis_Tindakan_Pembetulan_Ya', submissions);
            ws11.getCell(`G${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Premis_Tindakan_Pembetulan_Tidak', submissions);
            
            ws11.getCell(`H${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Bil_Sesi_Pendidikan_Kesihatan', submissions);
            ws11.getCell(`I${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Bil_Peserta_Pendidikan_Kesihatan', submissions);
            ws11.getCell(`J${row}`).value = getDistrictCumulativeSum('J11_Borang13', d.key, selectedDate, 'Bil_Sesi_Pendidikan_Kesihatan', submissions);
            ws11.getCell(`K${row}`).value = getDistrictCumulativeSum('J11_Borang13', d.key, selectedDate, 'Bil_Peserta_Pendidikan_Kesihatan', submissions);

            ws11.getCell(`L${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Bil_Pengendali', submissions);
            ws11.getCell(`M${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Bil_Terima_Suntikan', submissions);
            
            ws11.getCell(`N${row}`).value = getDistrictDailySum('J11_Borang13', d.key, selectedDate, 'Aduan_Makanan_Bil', submissions);
            ws11.getCell(`O${row}`).value = getDistrictCumulativeSum('J11_Borang13', d.key, selectedDate, 'Aduan_Makanan_Bil', submissions);
            ws11.getCell(`P${row}`).value = getDistrictLatestText('J11_Borang13', d.key, selectedDate, 'Catatan', submissions);
        });
    }

    // -------------------------------------------------------------
    // SHEET 12: Jadual 12.1 - Borang 5.1 (Pendidikan Kesihatan Sesi)
    // -------------------------------------------------------------
    const ws121 = workbook.getWorksheet('Jadual 12.1 - Borang 5.1');
    if (ws121) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 8 + idx;
            ws121.getCell(`A${row}`).value = idx + 1;
            ws121.getCell(`B${row}`).value = d.name;

            const fields = [
                'Ceramah', 'Nasihat_Individu', 'Tunjuk_Cara', 'Perb_Kump_Kecil',
                'Taklimat', 'Pameran', 'Gotong_Royong', 'Risalah', 'Poster',
                'Bunting', 'Banner'
            ];

            fields.forEach((f, fIdx) => {
                const colDaily = 3 + (fIdx * 2); // C, E, G, I, K, M, O, Q, S, U, W
                const colCum = 4 + (fIdx * 2);   // D, F, H, J, L, N, P, R, T, V, X

                ws121.getCell(row, colDaily).value = getDistrictDailySum('J12_1_Borang5_1', d.key, selectedDate, f, submissions);
                ws121.getCell(row, colCum).value = getDistrictCumulativeSum('J12_1_Borang5_1', d.key, selectedDate, f, submissions);
            });
        });
    }

    // -------------------------------------------------------------
    // SHEET 13: Jadual 12.2 - Borang 5.2 (Hebahan Media)
    // -------------------------------------------------------------
    const ws122 = workbook.getWorksheet('Jadual 12.2 - Borang 5.2');
    if (ws122) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws122.getCell(`A${row}`).value = idx + 1;
            ws122.getCell(`B${row}`).value = d.name;

            const fields = [
                'TV_Slot', 'Radio_Slot', 'Unit_Bergerak_Sesi', 'Website_Post',
                'Instagram_Post', 'Facebook_Post', 'Facebook_Reach', 'Youtube_TikTok_Post',
                'X_Post', 'Telegram_Post'
            ];

            fields.forEach((f, fIdx) => {
                const colDaily = 3 + (fIdx * 2); // C, E, G, I, K, M, O, Q, S, U
                const colCum = 4 + (fIdx * 2);   // D, F, H, J, L, N, P, R, T, V

                ws122.getCell(row, colDaily).value = getDistrictDailySum('J12_2_Borang5_2', d.key, selectedDate, f, submissions);
                ws122.getCell(row, colCum).value = getDistrictCumulativeSum('J12_2_Borang5_2', d.key, selectedDate, f, submissions);
            });
        });
    }

    // -------------------------------------------------------------
    // SHEET 14: Jadual 13 - DATA NCEMH (Petugas & Intervensi)
    // -------------------------------------------------------------
    const ws13 = workbook.getWorksheet('Jadual 13 - DATA NCEMH');
    if (ws13) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws13.getCell(`A${row}`).value = idx + 1;
            ws13.getCell(`B${row}`).value = d.name;
            ws13.getCell(`C${row}`).value = 'Banjir';

            const fields = [
                'Lokasi_Dilawati_Bil', 'Petugas_PSY_Bil', 'Petugas_FMS_Bil', 'Petugas_MO_Bil',
                'Petugas_PPSI_Bil', 'Petugas_Paramedik_Bil', 'Petugas_Lain_Bil',
                'Intervensi_Orang_Awam_Bil', 'Intervensi_Petugas_KKM_Bil', 'Intervensi_Petugas_Agensi_Lain_Bil',
                'Sesi_Berkumpulan_Bil', 'Aktiviti_Relaksasi_Bil', 'Aktiviti_Seni_Bil', 'Aktiviti_Psikopendidikan_Bil'
            ];

            fields.forEach((f, fIdx) => {
                const colDaily = 4 + (fIdx * 2); // D, F, H, J, L, N, P, R, T, V, X, Z, AB, AD
                const colCum = 5 + (fIdx * 2);   // E, G, I, K, M, O, Q, S, U, W, Y, AA, AC, AE

                ws13.getCell(row, colDaily).value = getDistrictDailySum('J13_NCEMH', d.key, selectedDate, f, submissions);
                ws13.getCell(row, colCum).value = getDistrictCumulativeSum('J13_NCEMH', d.key, selectedDate, f, submissions);
            });
        });
    }

    // -------------------------------------------------------------
    // SHEET 15: JADUAL 14 - DATA NCEMH (Mental Health Status)
    // -------------------------------------------------------------
    const ws14 = workbook.getWorksheet('JADUAL 14 - DATA NCEMH');
    if (ws14) {
        DISTRICTS_ORDER.forEach((d, idx) => {
            const row = 7 + idx;
            ws14.getCell(`A${row}`).value = idx + 1;
            ws14.getCell(`B${row}`).value = d.name;

            const fields = [
                'Lokasi_Bil', 'Jumlah_Dirujuk_Bil', 'Rujuk_MO_Bil', 'Rujuk_FMS_Bil',
                'Rujuk_PSY_Bil', 'Rujuk_PPSI_Bil', 'Lain_Lain_Bil', 'Abnormal_DASS_GAD_Bil',
                'Disyaki_Gangguan_Emosi_Bil', 'Disyaki_Penyakit_Mental_Bil', 'Risiko_Bunuh_Diri_Bil'
            ];

            fields.forEach((f, fIdx) => {
                const colDaily = 3 + (fIdx * 2); // C, E, G, I, K, M, O, Q, S, U, W
                const colCum = 4 + (fIdx * 2);   // D, F, H, J, L, N, P, R, T, V, X

                ws14.getCell(row, colDaily).value = getDistrictDailySum('J14_NCEMH_Mental', d.key, selectedDate, f, submissions);
                ws14.getCell(row, colCum).value = getDistrictCumulativeSum('J14_NCEMH_Mental', d.key, selectedDate, f, submissions);
            });
        });
    }

    // -------------------------------------------------------------
    // SHEET 16: Borang 15 -BSM (Kehadiran Anggota Linelist)
    // -------------------------------------------------------------
    const ws15 = workbook.getWorksheet('Borang 15 -BSM');
    if (ws15) {
        for (let r = 6; r <= 100; r++) {
            for (let c = 1; c <= 15; c++) {
                ws15.getCell(r, c).value = null;
            }
        }

        const bsmSubs = submissions
            .filter(sub => sub.formId === 'J15_BSM' && sub.date <= selectedDate)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        bsmSubs.forEach((sub, idx) => {
            const row = 6 + idx;
            ws15.getCell(`A${row}`).value = idx + 1;
            ws15.getCell(`B${row}`).value = (sub.district || undefined).toUpperCase().replace(/_/g, ' ');
            ws15.getCell(`C${row}`).value = sub.data.Nama_Anggota || undefined;
            ws15.getCell(`D${row}`).value = sub.data.Jawatan || undefined;
            
            const cat = sub.data.Kategori_Tempat_Bertugas || undefined;
            ws15.getCell(`E${row}`).value = cat === 'Ibu Pejabat' ? 1 : '';
            ws15.getCell(`F${row}`).value = cat === 'JKN' ? 1 : '';
            ws15.getCell(`G${row}`).value = cat === 'Bilik Gerakan Bencana' ? 1 : '';
            ws15.getCell(`H${row}`).value = cat === 'Pergigian' ? 1 : '';
            ws15.getCell(`I${row}`).value = cat === 'Hospital' ? 1 : '';
            ws15.getCell(`J${row}`).value = cat === 'Institusi' ? 1 : '';

            ws15.getCell(`K${row}`).value = sub.data.Nama_Tempat || undefined;
            ws15.getCell(`L${row}`).value = sub.data.Status || undefined;
            ws15.getCell(`M${row}`).value = sub.data.Status?.includes('Hadir_Bekerja') ? 1 : 0;
            ws15.getCell(`N${row}`).value = sub.data.Berada_di_PPS === 'Ya' ? 1 : 0;
            ws15.getCell(`O${row}`).value = sub.data.Catatan || undefined;
        });
    }

    // -------------------------------------------------------------
    // SHEET 17: Linelisting covid
    // -------------------------------------------------------------
    const wsCovid = workbook.getWorksheet('Linelisting covid');
    if (wsCovid) {
        for (let r = 6; r <= 100; r++) {
            for (let c = 1; c <= 22; c++) {
                wsCovid.getCell(r, c).value = null;
            }
        }

        const covSubs = submissions
            .filter(sub => sub.formId === 'Linelisting_Covid' && sub.date <= selectedDate)
            .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

        covSubs.forEach((sub, idx) => {
            const row = 6 + idx;
            wsCovid.getCell(`A${row}`).value = idx + 1;
            wsCovid.getCell(`B${row}`).value = sub.data.Tarikh_Dilaporkan || undefined;
            wsCovid.getCell(`C${row}`).value = sub.data.Nama || undefined;
            wsCovid.getCell(`D${row}`).value = sub.data.No_KP || undefined;
            wsCovid.getCell(`E${row}`).value = sub.data.Negara_Jika_Warga_Asing || undefined;
            wsCovid.getCell(`F${row}`).value = sub.data.Umur || undefined;
            wsCovid.getCell(`G${row}`).value = sub.data.Alamat || undefined;
            wsCovid.getCell(`H${row}`).value = (sub.data.Daerah || undefined).toUpperCase();
            wsCovid.getCell(`I${row}`).value = sub.data.Negeri || 'KEDAH';
            
            const detectType = sub.data.Cara_Covid19_Dikesan || undefined;
            wsCovid.getCell(`J${row}`).value = detectType === 'Saringan Kemasukan ke PPS' ? 1 : '';
            wsCovid.getCell(`K${row}`).value = (detectType === 'Klinik Kesihatan' || detectType.includes('LUAR')) ? 1 : '';
            wsCovid.getCell(`L${row}`).value = (detectType === 'Saringan RTK-Ag di PPS' || detectType.includes('SEMASA')) ? 1 : '';

            wsCovid.getCell(`M${row}`).value = sub.data.Tarikh_Positif || undefined;
            wsCovid.getCell(`N${row}`).value = sub.data.Tarikh_Onset || undefined;
            wsCovid.getCell(`O${row}`).value = 'RTK-Ag';
            wsCovid.getCell(`P${row}`).value = sub.data.Komorbid || undefined;
            wsCovid.getCell(`Q${row}`).value = ''; // Category left empty
            wsCovid.getCell(`R${row}`).value = sub.data.Tindakan || undefined;
            wsCovid.getCell(`S${row}`).value = sub.data.Tempat_Kuarantin || undefined;
            wsCovid.getCell(`T${row}`).value = sub.data.Status_Vaksin || undefined;
            wsCovid.getCell(`U${row}`).value = sub.data.Tarikh_HSO || undefined;
            wsCovid.getCell(`V${row}`).value = sub.data.Status_HSO || undefined;
        });
    }

    // 3. Write and return Excel file blob
    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
