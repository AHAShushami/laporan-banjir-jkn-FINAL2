/**
 * Form Configurations for Flood Reporting
 */

export const FORM_CATEGORIES = {
    medical: { label: 'Perubatan & Kesihatan', icon: '🏥' },
    disease: { label: 'Penyakit & Wabak', icon: '🦠' },
    environment: { label: 'Alam Sekitar', icon: '🌿' },
    education: { label: 'Pendidikan Kesihatan', icon: '📚' },
    mental_health: { label: 'Kesihatan Mental', icon: '🧠' },
    admin: { label: 'Pentadbiran', icon: '📋' }
};

export const FORM_ORDER = [
    'J4_Borang3',
    'J5_1_Fasiliti',
    'J5_2_Fasiliti',
    'J6_Borang6',
    'J7_Borang7',
    'J8_1_Borang12',
    'J8_2_Borang12',
    'J8_3_BPP',
    'J9_Borang11',
    'J10_1_Vektor',
    'J10_2_Vektor',
    'J11_Borang13',
    'J12_1_Borang5_1',
    'J12_2_Borang5_2',
    'J13_NCEMH',
    'J14_NCEMH_Mental',
    'J15_BSM',
    'Linelisting_Covid'
];

export const FORM_CONFIGS = {
    'J4_Borang3': {
        id: 'J4_Borang3',
        title: 'Jadual 4 - Pasukan RRT Perubatan & Kesihatan Harian',
        shortTitle: 'Pasukan RRT',
        icon: '🏥',
        description: 'Laporan harian pasukan perubatan dan kesihatan',
        type: 'daily',
        category: 'medical',
        hasPPS: false,
        sections: [
            {
                title: 'Data Harian',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'RRT_Perubatan_Bil', label: 'RRT Perubatan (Bil)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'RRT_Kesihatan_Bil', label: 'RRT Kesihatan (Bil)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'RRT_MHPSS_Bil', label: 'RRT MHPSS (Bil)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Jumlah_Bil', label: 'Jumlah (Bil)', type: 'number', autoCalc: { type: 'sum', sources: ['RRT_Perubatan_Bil', 'RRT_Kesihatan_Bil', 'RRT_MHPSS_Bil'] }, gridColumn: 'full' }
                ]
            }
        ]
    },
    'J5_1_Fasiliti': {
        id: 'J5_1_Fasiliti',
        title: 'Jadual 5.1 - Senarai Fasiliti Kesihatan Terjejas Banjir',
        shortTitle: 'Fasiliti Terjejas (Senarai)',
        icon: '🏥',
        description: 'Senarai fasiliti kesihatan yang terjejas',
        type: 'linelist',
        category: 'medical',
        hasPPS: false,
        sections: [
            {
                title: 'Maklumat Fasiliti',
                fields: [
                    { id: 'Negeri', label: 'Negeri', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Nama_Fasiliti', label: 'Nama Fasiliti', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'Kategori_Fasiliti', label: 'Kategori Fasiliti', type: 'select', required: true, options: ['Klinik Kesihatan', 'Klinik Desa', 'Klinik Pergigian', 'Pejabat Kesihatan', 'Jabatan Kesihatan Negeri', 'Hospital'], gridColumn: 'half' },
                    { id: 'Tahap_Severiti', label: 'Tahap Severiti', type: 'select', required: true, options: ['1', '2', '3', '4', '5', '6', '7'], gridColumn: 'half' }
                ]
            },
            {
                title: 'Status Operasi',
                fields: [
                    { id: 'Status_Operasi_Awal', label: 'Status Operasi Awal', type: 'select', required: true, options: ['Beroperasi', 'Pindah Operasi', 'Tidak Operasi'], gridColumn: 'half' },
                    { id: 'Status_Operasi_Semasa', label: 'Status Operasi Semasa', type: 'select', required: true, options: ['Masih Pindah Operasi', 'Masih Tutup Operasi', 'Telah Operasi di fasiliti asal'], gridColumn: 'half' },
                    { id: 'Perkhidmatan_Dipindahkan', label: 'Perkhidmatan Dipindahkan (Tempat)', type: 'text', gridColumn: 'full' },
                    { id: 'Tarikh_Tutup', label: 'Tarikh Tutup', type: 'date', gridColumn: 'half' },
                    { id: 'Tarikh_Buka', label: 'Tarikh Buka', type: 'date', gridColumn: 'half' },
                    { id: 'Catatan', label: 'Catatan', type: 'textarea', gridColumn: 'full' }
                ]
            }
        ]
    },
    'J5_2_Fasiliti': {
        id: 'J5_2_Fasiliti',
        title: 'Jadual 5.2 - Ringkasan Status Fasiliti Terjejas',
        shortTitle: 'Ringkasan Fasiliti',
        icon: '📊',
        description: 'Ringkasan bilangan fasiliti mengikut status operasi (Auto-dikira)',
        type: 'summary',
        isAutoReport: true,
        category: 'medical',
        hasPPS: false,
        sections: [
            {
                title: 'Ringkasan Status',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'Beroperasi', label: 'Beroperasi', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Pindah_Operasi', label: 'Pindah Operasi', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Tidak_Beroperasi', label: 'Tidak Beroperasi', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Fasiliti_Terjejas', label: 'Jumlah Fasiliti Terjejas', type: 'number', autoCalc: { type: 'sum', sources: ['Beroperasi', 'Pindah_Operasi', 'Tidak_Beroperasi'] }, gridColumn: 'full' }
                ]
            }
        ]
    },
    'J6_Borang6': {
        id: 'J6_Borang6',
        title: 'Jadual 6 - Mangsa Banjir Diperiksa & Penyakit di PPS',
        shortTitle: 'Penyakit di PPS',
        icon: '🩺',
        description: 'Laporan kesihatan mangsa di PPS',
        type: 'daily',
        category: 'disease',
        hasPPS: true,
        sections: [
            {
                title: 'Saringan & Kes',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Kes_Diperiksa_Bil', label: 'Kes Diperiksa (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Berjangkit_Bil', label: 'Penyakit Berjangkit (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'NCD_Bil', label: 'NCD (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Kecederaan_Bil', label: 'Kecederaan (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Wabak_Bil', label: 'Wabak (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Jumlah_Penyakit_Bil', label: 'Jumlah Keseluruhan Penyakit', type: 'number', autoCalc: { type: 'sum', sources: ['Berjangkit_Bil', 'NCD_Bil', 'Kecederaan_Bil', 'Wabak_Bil'] }, gridColumn: 'full' }
                ]
            }
        ]
    },
    'J7_Borang7': {
        id: 'J7_Borang7',
        title: 'Jadual 7 - Kejadian Penyakit Berjangkit di Kalangan Mangsa',
        shortTitle: 'Penyakit Berjangkit',
        icon: '🦠',
        description: 'Pecahan kes penyakit berjangkit',
        type: 'daily',
        category: 'disease',
        hasPPS: true,
        sections: [
            {
                title: 'Jenis Penyakit (Bilangan Harian)',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'AGE_Bil', label: 'AGE', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'ARI_Bil', label: 'ARI', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Konjunktivitis_Bil', label: 'Konjunktivitis', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Skin_Infection_Bil', label: 'Skin Infection', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Demam_Bil', label: 'Demam (Tiada Simptom Lain)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'HFMD_Bil', label: 'HFMD', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Tifoid_Bil', label: 'Tifoid', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Chicken_Pox_Bil', label: 'Chicken Pox', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Leptospirosis_Bil', label: 'Leptospirosis', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Lain_Lain_Bil', label: 'Lain-lain', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Jumlah_Keseluruhan', label: 'Jumlah Keseluruhan', type: 'number', autoCalc: { type: 'sum', sources: ['AGE_Bil', 'ARI_Bil', 'Konjunktivitis_Bil', 'Skin_Infection_Bil', 'Demam_Bil', 'HFMD_Bil', 'Tifoid_Bil', 'Chicken_Pox_Bil', 'Leptospirosis_Bil', 'Lain_Lain_Bil'] }, gridColumn: 'full' }
                ]
            }
        ]
    },
    'J8_1_Borang12': {
        id: 'J8_1_Borang12',
        title: 'Jadual 8.1 - Kemasukan Mangsa Banjir ke Hospital',
        shortTitle: 'Kemasukan Hospital',
        icon: '🚑',
        description: 'Kemasukan wad mengikut kategori jantina/umur',
        type: 'daily',
        category: 'medical',
        hasPPS: false,
        sections: [
            {
                title: 'Data Kemasukan',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'Lelaki_Dewasa_Bil', label: 'Lelaki Dewasa (Bil)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Perempuan_Dewasa_Bil', label: 'Perempuan Dewasa (Bil)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Kanak_Kanak_Bil', label: 'Kanak-Kanak (Bil)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Sebab_Dirujuk', label: 'Sebab Dirujuk (Keterangan)', type: 'textarea', gridColumn: 'full' }
                ]
            }
        ]
    },
    'J8_2_Borang12': {
        id: 'J8_2_Borang12',
        title: 'Jadual 8.2 - Kemasukan Hospital (Kategori Khas)',
        shortTitle: 'Rujukan Khas',
        icon: '🏥',
        description: 'Kemasukan untuk kategori khas',
        type: 'daily',
        category: 'medical',
        hasPPS: false,
        sections: [
            {
                title: 'Kategori Khas',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'Antenatal_Bil', label: 'Antenatal (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Posnatal_Bil', label: 'Posnatal (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Haemodialisis_Bil', label: 'Haemodialisis (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Paliatif_Bil', label: 'Paliatif (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Catatan', label: 'Catatan', type: 'textarea', gridColumn: 'full' }
                ]
            }
        ]
    },
    'J8_3_BPP': {
        id: 'J8_3_BPP',
        title: 'Jadual 8.3 - Status Pusat Dialisis & Pesakit',
        shortTitle: 'Status Dialisis',
        icon: '🩸',
        description: 'Laporan operasi pusat dialisis',
        type: 'daily',
        category: 'medical',
        hasPPS: false,
        sections: [
            {
                title: 'Status Fasiliti',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'Bil_Fasiliti_Terjejas_Pusat_Dialisis', label: 'Pusat Dialisis Terjejas Banjir', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Status_Fasiliti_Tidak_Terjejas', label: 'Fasiliti Tidak Terjejas', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Jenis_Fasiliti_KKM', label: 'Jenis Fasiliti (KKM)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Jenis_Fasiliti_Swasta', label: 'Jenis Fasiliti (Swasta)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Status_Operasi_Tidak_Operasi', label: 'Masih Tidak Beroperasi', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Status_Operasi_Mula', label: 'Telah Mula Beroperasi', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            },
            {
                title: 'Status Pesakit',
                fields: [
                    { id: 'Jumlah_Pesakit_Terjejas', label: 'Jumlah Pesakit Terjejas', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Pesakit_Masih_Terjejas', label: 'Pesakit Masih Terjejas', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bil_Pesakit_Rawatan_Pusat_Asal_Fasiliti', label: 'Rawatan Pusat Asal (Fasiliti)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Bil_Pesakit_Rawatan_Pusat_Asal_Pesakit', label: 'Rawatan Pusat Asal (Pesakit)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Bil_Pesakit_Pindah_Pusat_Lain', label: 'Pindah Pusat Lain', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Bil_Pesakit_Masuk_Hospital', label: 'Masuk Hospital', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Pesakit_Discaj', label: 'Pesakit Discaj', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            }
        ]
    },
    'J9_Borang11': {
        id: 'J9_Borang11',
        title: 'Jadual 9 - Keselamatan Bekalan Air Minum',
        shortTitle: 'Bekalan Air',
        icon: '🚰',
        description: 'Aktiviti keselamatan bekalan air minum kawasan banjir',
        type: 'daily',
        category: 'environment',
        hasPPS: false,
        sections: [
            {
                title: 'Persampelan & Pelanggaran',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'Sampel_Air_Bil', label: 'Sampel Air Diambil (Bil)', type: 'number', required: true, min: 0, gridColumn: 'full' },
                    { id: 'Pelanggaran_pH_Bil', label: 'Pelanggaran pH (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Pelanggaran_Baki_Klorin_Bil', label: 'Pelanggaran Baki Klorin (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Pelanggaran_NTU_Bil', label: 'Pelanggaran NTU (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Pelanggaran_Ecoli_Bil', label: 'Pelanggaran E.coli (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            },
            {
                title: 'Pemeriksaan Telaga',
                fields: [
                    { id: 'Telaga_Diperiksa_Bil', label: 'Telaga Diperiksa (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Telaga_Diklorin_Bil', label: 'Telaga Diklorin (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            }
        ]
    },
    'J10_1_Vektor': {
        id: 'J10_1_Vektor',
        title: 'Jadual 10.1 - Kawalan Vektor Denggi di PPS (Pemeriksaan)',
        shortTitle: 'Vektor (Pemeriksaan)',
        icon: '🦟',
        description: 'Laporan harian pemeriksaan pembiakan Aedes di PPS',
        type: 'daily',
        category: 'environment',
        hasPPS: true,
        sections: [
            {
                title: 'Pemeriksaan Pembiakan',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'PPS_Positif_Bil', label: 'PPS Positif (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bekas_Diperiksa_Bil', label: 'Bekas Diperiksa (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bekas_Positif_Bil', label: 'Bekas Positif (Bil)', type: 'number', required: true, min: 0, gridColumn: 'full' }
                ]
            },
            {
                title: 'Aktiviti Kawalan',
                fields: [
                    { id: 'Fogging_Bil', label: 'Semburan Kabus (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Larviciding_Bil', label: 'Larviciding (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Catatan', label: 'Catatan', type: 'textarea', gridColumn: 'full' }
                ]
            }
        ]
    },
    'J10_2_Vektor': {
        id: 'J10_2_Vektor',
        title: 'Jadual 10.2 - Ringkasan Kawalan Vektor Denggi',
        shortTitle: 'Ringkasan Vektor',
        icon: '📊',
        description: 'Ringkasan bilangan pemeriksaan vektor (Auto-dikira)',
        type: 'summary',
        isAutoReport: true,
        category: 'environment',
        hasPPS: false,
        sections: [
            {
                title: 'Ringkasan Aktiviti',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'PPS_Aktif', label: 'PPS Aktif', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'PPS_Diperiksa', label: 'PPS Diperiksa', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'PPS_Positif', label: 'PPS Positif', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bekas_Diperiksa', label: 'Bekas Diperiksa', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bekas_Positif', label: 'Bekas Positif', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'AI_Aedes', label: 'Aedes Index (AI %)', type: 'number', gridColumn: 'half' },
                    { id: 'BI_Aedes', label: 'Breteau Index (BI)', type: 'number', gridColumn: 'half' },
                    { id: 'Fogging', label: 'Semburan Kabus', type: 'number', gridColumn: 'half' },
                    { id: 'Larviciding', label: 'Larviciding', type: 'number', gridColumn: 'half' }
                ]
            }
        ]
    },
    'J11_Borang13': {
        id: 'J11_Borang13',
        title: 'Jadual 11 - Kawalan Keselamatan Makanan di PPS',
        shortTitle: 'Keselamatan Makanan',
        icon: '🍲',
        description: 'Laporan harian aktiviti kawalan keselamatan makanan',
        type: 'daily',
        category: 'environment',
        hasPPS: true,
        sections: [
            {
                title: 'Premis Makanan',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'PPS_Dilawati', label: 'PPS Dilawati', type: 'number', required: true, min: 0, gridColumn: 'full' },
                    { id: 'Premis_Makanan_Memuaskan', label: 'Premis Makanan Memuaskan', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Premis_Makanan_Tidak_Memuaskan', label: 'Premis Makanan Tidak Memuaskan', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Premis_Tindakan_Pembetulan_Ya', label: 'Tindakan Pembetulan Diambil (Ya)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Premis_Tindakan_Pembetulan_Tidak', label: 'Tindakan Pembetulan Diambil (Tidak)', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            },
            {
                title: 'Pengendali & Aduan',
                fields: [
                    { id: 'Bil_Sesi_Pendidikan_Kesihatan', label: 'Sesi Pendidikan Kesihatan (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bil_Peserta_Pendidikan_Kesihatan', label: 'Peserta Pendidikan Kesihatan (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bil_Pengendali', label: 'Pengendali Makanan Diperiksa', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Bil_Terima_Suntikan', label: 'Pengendali Menerima Suntikan', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Aduan_Makanan_Bil', label: 'Aduan Makanan Diterima (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Catatan', label: 'Catatan', type: 'textarea', gridColumn: 'full' }
                ]
            }
        ]
    },
    'J12_1_Borang5_1': {
        id: 'J12_1_Borang5_1',
        title: 'Jadual 12.1 - Aktiviti Pendidikan Kesihatan (Sesi)',
        shortTitle: 'Pendidikan Kesihatan (Sesi)',
        icon: '🗣️',
        description: 'Aktiviti pendidikan kesihatan secara bersemuka',
        type: 'daily',
        category: 'education',
        hasPPS: false,
        sections: [
            {
                title: 'Sesi Bersemuka (Bilangan)',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'Ceramah', label: 'Ceramah', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Nasihat_Individu', label: 'Nasihat Individu', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Tunjuk_Cara', label: 'Tunjuk Cara', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Perb_Kump_Kecil', label: 'Perbincangan Kumpulan Kecil', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Taklimat', label: 'Taklimat', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Pameran', label: 'Pameran', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Gotong_Royong', label: 'Gotong Royong', type: 'number', required: true, min: 0, gridColumn: 'full' }
                ]
            },
            {
                title: 'Edaran & Pameran (Bilangan)',
                fields: [
                    { id: 'Risalah', label: 'Risalah', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Poster', label: 'Poster', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Bunting', label: 'Bunting', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Banner', label: 'Banner', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            }
        ]
    },
    'J12_2_Borang5_2': {
        id: 'J12_2_Borang5_2',
        title: 'Jadual 12.2 - Aktiviti Pendidikan Kesihatan (Media & Hebahan)',
        shortTitle: 'Pendidikan Kesihatan (Media)',
        icon: '📱',
        description: 'Aktiviti promosi melalui media cetak, massa dan sosial',
        type: 'daily',
        category: 'education',
        hasPPS: false,
        sections: [
            {
                title: 'Hebahan Awam (Bilangan)',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'full' },
                    { id: 'TV_Slot', label: 'TV (Slot)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Radio_Slot', label: 'Radio (Slot)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Unit_Bergerak_Sesi', label: 'Unit Bergerak (Sesi)', type: 'number', required: true, min: 0, gridColumn: 'third' }
                ]
            },
            {
                title: 'Media Sosial (Bilangan Post)',
                fields: [
                    { id: 'Website_Post', label: 'Website (Post)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Instagram_Post', label: 'Instagram (Post)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Facebook_Post', label: 'Facebook (Post)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Facebook_Reach', label: 'Facebook (Reach)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Youtube_TikTok_Post', label: 'Youtube/TikTok (Post)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'X_Post', label: 'X (Post)', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Telegram_Post', label: 'Telegram (Post)', type: 'number', required: true, min: 0, gridColumn: 'third' }
                ]
            }
        ]
    },
    'J13_NCEMH': {
        id: 'J13_NCEMH',
        title: 'Jadual 13 - Perkhidmatan Kesihatan Mental & Sokongan Psikologi',
        shortTitle: 'Aktiviti MHPSS',
        icon: '🤝',
        description: 'Petugas, Intervensi, dan Aktiviti Sokongan',
        type: 'daily',
        category: 'mental_health',
        hasPPS: true,
        sections: [
            {
                title: 'Maklumat Lawatan & Petugas',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Jenis_Bencana', label: 'Jenis Bencana', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Lokasi_Dilawati_Bil', label: 'Lokasi Dilawati (Bil)', type: 'number', required: true, min: 0, gridColumn: 'full' },
                    { id: 'Petugas_PSY_Bil', label: 'Petugas PSY', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Petugas_FMS_Bil', label: 'Petugas FMS', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Petugas_MO_Bil', label: 'Petugas MO', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Petugas_PPSI_Bil', label: 'Petugas PPSI', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Petugas_Paramedik_Bil', label: 'Petugas Paramedik', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Petugas_Lain_Bil', label: 'Petugas Lain-lain', type: 'number', required: true, min: 0, gridColumn: 'third' }
                ]
            },
            {
                title: 'Intervensi & Aktiviti',
                fields: [
                    { id: 'Intervensi_Orang_Awam_Bil', label: 'Intervensi Orang Awam', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Intervensi_Petugas_KKM_Bil', label: 'Intervensi Petugas KKM', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Intervensi_Petugas_Agensi_Lain_Bil', label: 'Intervensi Petugas Agensi Lain', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Sesi_Berkumpulan_Bil', label: 'Sesi Berkumpulan (Bil)', type: 'number', required: true, min: 0, gridColumn: 'full' },
                    { id: 'Aktiviti_Relaksasi_Bil', label: 'Aktiviti Relaksasi', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Aktiviti_Seni_Bil', label: 'Aktiviti Seni', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Aktiviti_Psikopendidikan_Bil', label: 'Aktiviti Psikopendidikan', type: 'number', required: true, min: 0, gridColumn: 'third' }
                ]
            }
        ]
    },
    'J14_NCEMH_Mental': {
        id: 'J14_NCEMH_Mental',
        title: 'Jadual 14 - Penilaian Status Kesihatan Mental di PPS',
        shortTitle: 'Status Kesihatan Mental',
        icon: '🧠',
        description: 'Penilaian status dan rujukan kesihatan mental',
        type: 'daily',
        category: 'mental_health',
        hasPPS: true,
        sections: [
            {
                title: 'Jumlah Rujukan',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Lokasi_Bil', label: 'Lokasi Dinilai (Bil)', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Jumlah_Dirujuk_Bil', label: 'Jumlah Dirujuk (Bil)', type: 'number', required: true, min: 0, gridColumn: 'full' },
                    { id: 'Rujuk_MO_Bil', label: 'Dirujuk Ke MO', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Rujuk_FMS_Bil', label: 'Dirujuk Ke FMS', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Rujuk_PSY_Bil', label: 'Dirujuk Ke PSY', type: 'number', required: true, min: 0, gridColumn: 'third' },
                    { id: 'Rujuk_PPSI_Bil', label: 'Dirujuk Ke PPSI', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Lain_Lain_Bil', label: 'Lain-lain', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            },
            {
                title: 'Kategori Rujukan',
                fields: [
                    { id: 'Abnormal_DASS_GAD_Bil', label: 'DASS/GAD Abnormal', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Disyaki_Gangguan_Emosi_Bil', label: 'Disyaki Gangguan Emosi', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Disyaki_Penyakit_Mental_Bil', label: 'Disyaki Penyakit Mental', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Risiko_Bunuh_Diri_Bil', label: 'Risiko Bunuh Diri', type: 'number', required: true, min: 0, gridColumn: 'half' }
                ]
            }
        ]
    },
    'J15_BSM': {
        id: 'J15_BSM',
        title: 'Borang 15 - Laporan Kehadiran Anggota (BSM)',
        shortTitle: 'Kehadiran Anggota',
        icon: '👥',
        description: 'Senarai nama anggota dan status kehadiran',
        type: 'linelist',
        category: 'admin',
        hasPPS: false,
        sections: [
            {
                title: 'Maklumat Anggota',
                fields: [
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Nama_Anggota', label: 'Nama Anggota', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Jawatan', label: 'Jawatan', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Kategori_Tempat_Bertugas', label: 'Kategori Tempat Bertugas', type: 'select', required: true, options: ['Ibu Pejabat', 'JKN', 'Bilik Gerakan Bencana', 'Pergigian', 'Hospital', 'Institusi'], gridColumn: 'half' },
                    { id: 'Nama_Tempat', label: 'Nama Tempat', type: 'text', required: true, gridColumn: 'full' }
                ]
            },
            {
                title: 'Status Kehadiran',
                fields: [
                    { id: 'Status', label: 'Status Hadir', type: 'select', required: true, options: ['Hadir_Bekerja (1)', 'Tidak_Hadir_Bekerja (0)'], gridColumn: 'half' },
                    { id: 'Berada_di_PPS', label: 'Berada di PPS', type: 'select', required: true, options: ['Ya', 'Tidak'], gridColumn: 'half' },
                    { id: 'Catatan', label: 'Catatan', type: 'textarea', gridColumn: 'full' }
                ]
            }
        ]
    },
    'Linelisting_Covid': {
        id: 'Linelisting_Covid',
        title: 'Senarai Kes Positif COVID-19 Kawasan Banjir',
        shortTitle: 'Linelisting COVID-19',
        icon: '🦠',
        description: 'Senarai kes positif COVID-19 yang berkaitan',
        type: 'linelist',
        category: 'disease',
        hasPPS: false,
        sections: [
            {
                title: 'Maklumat Pesakit',
                fields: [
                    { id: 'Tarikh_Dilaporkan', label: 'Tarikh Dilaporkan', type: 'date', required: true, gridColumn: 'half' },
                    { id: 'Nama', label: 'Nama', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'No_KP', label: 'No. KP', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Negara_Jika_Warga_Asing', label: 'Negara (Jika Warga Asing)', type: 'text', gridColumn: 'half' },
                    { id: 'Umur', label: 'Umur', type: 'number', required: true, min: 0, gridColumn: 'half' },
                    { id: 'Negeri', label: 'Negeri', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Daerah', label: 'Daerah', type: 'text', required: true, gridColumn: 'half' },
                    { id: 'Alamat', label: 'Alamat', type: 'textarea', required: true, gridColumn: 'full' }
                ]
            },
            {
                title: 'Maklumat Klinikal & Tindakan',
                fields: [
                    { id: 'Cara_Covid19_Dikesan', label: 'Cara Dikesan', type: 'select', required: true, options: ['Saringan Kemasukan ke PPS', 'Saringan RTK-Ag di PPS', 'Klinik Kesihatan', 'Lain-lain'], gridColumn: 'full' },
                    { id: 'Tarikh_Positif', label: 'Tarikh Positif', type: 'date', required: true, gridColumn: 'half' },
                    { id: 'Tarikh_Onset', label: 'Tarikh Onset', type: 'date', gridColumn: 'half' },
                    { id: 'Komorbid', label: 'Komorbiditi', type: 'text', gridColumn: 'half' },
                    { id: 'Status_Vaksin', label: 'Status Vaksin', type: 'select', options: ['Lengkap', 'Tidak Lengkap', 'Belum Divaksin', 'Tidak Pasti'], gridColumn: 'half' },
                    { id: 'Tindakan', label: 'Tindakan', type: 'text', gridColumn: 'half' },
                    { id: 'Tempat_Kuarantin', label: 'Tempat Kuarantin', type: 'text', gridColumn: 'half' },
                    { id: 'Tarikh_HSO', label: 'Tarikh HSO (Home Surveillance Order)', type: 'date', gridColumn: 'half' },
                    { id: 'Status_HSO', label: 'Status HSO', type: 'select', options: ['Sedang Berlangsung', 'Selesai'], gridColumn: 'half' }
                ]
            }
        ]
    }
};
