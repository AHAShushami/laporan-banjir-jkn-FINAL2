/**
 * @fileoverview District and state configuration for the Kedah Flood Reporting Application.
 * Defines all 12 districts of Kedah state, Malaysia, with their identifiers and codes.
 * @module config/districts
 */

/**
 * @typedef {Object} District
 * @property {string} id   - Unique snake_case identifier used as keys throughout the app.
 * @property {string} name - Official uppercase display name of the district.
 * @property {string} code - Short code used in report references and CSV exports.
 */

/**
 * All 12 districts in Kedah state.
 * @type {District[]}
 */
export const DISTRICTS = [
  { id: 'kulim', name: 'KULIM', code: 'KLM' },
  { id: 'kubang_pasu', name: 'KUBANG PASU', code: 'KBP' },
  { id: 'kota_setar', name: 'KOTA SETAR', code: 'KS' },
  { id: 'padang_terap', name: 'PADANG TERAP', code: 'PT' },
  { id: 'sik', name: 'SIK', code: 'SIK' },
  { id: 'baling', name: 'BALING', code: 'BLG' },
  { id: 'bandar_baharu', name: 'BANDAR BAHARU', code: 'BB' },
  { id: 'kuala_muda', name: 'KUALA MUDA', code: 'KM' },
  { id: 'pendang', name: 'PENDANG', code: 'PDG' },
  { id: 'yan', name: 'YAN', code: 'YAN' },
  { id: 'langkawi', name: 'LANGKAWI', code: 'LGK' }
];

/**
 * State-level information for Kedah.
 * @type {{ name: string, fullName: string, code: string }}
 */
export const STATE_INFO = {
  name: 'KEDAH',
  fullName: 'Jabatan Kesihatan Negeri Kedah',
  code: 'KDH'
};
