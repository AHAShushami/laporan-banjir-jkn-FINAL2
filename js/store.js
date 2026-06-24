/**
 * @fileoverview IndexedDB-backed data persistence layer for the Kedah Flood Reporting Application.
 *
 * Object stores:
 *   - submissions – form submissions keyed by auto-increment id
 *   - pps         – Pusat Pemindahan Sementara (temporary relocation centres)
 *   - events      – flood event metadata
 *
 * All public methods return Promises and use proper IndexedDB transactions.
 *
 * @module store
 */

import { DISTRICTS } from './config/districts.js?v=26';
import { SETTINGS } from './config/settings.js?v=26';

/* ------------------------------------------------------------------ */
/*  Google Sheets Sync Logic                                          */
/* ------------------------------------------------------------------ */

function showSyncProgress(title = "Menyinkron data...") {
    let panel = document.getElementById('sync-progress-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'sync-progress-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: rgba(13, 20, 38, 0.95);
            border: 1px solid #ff8f00;
            color: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            z-index: 10000;
            width: 280px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5), 0 0 15px rgba(245, 158, 11, 0.2);
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        document.body.appendChild(panel);
    }
    
    panel.style.opacity = '1';
    panel.style.transform = 'translateY(0)';
    
    panel.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600;">
            <span style="display: flex; align-items: center; gap: 6px;">🔄 ${title}</span>
            <span id="sync-pct-text" style="color: #fbbf24; font-weight: 700;">0%</span>
        </div>
        <div style="background: rgba(255,255,255,0.08); height: 6px; border-radius: 50px; overflow: hidden; margin-top: 4px;">
            <div id="sync-progress-bar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #ff8f00, #fbbf24); border-radius: 50px; transition: width 0.2s ease;"></div>
        </div>
    `;
    
    let pct = 0;
    const interval = setInterval(() => {
        if (pct < 95) {
            pct += Math.random() * (pct < 60 ? 12 : 4);
            pct = Math.min(95, pct);
            const bar = document.getElementById('sync-progress-bar');
            const txt = document.getElementById('sync-pct-text');
            if (bar) bar.style.width = pct + "%";
            if (txt) txt.innerText = Math.floor(pct) + "%";
        }
    }, 150);
    
    return {
        complete: () => {
            clearInterval(interval);
            const bar = document.getElementById('sync-progress-bar');
            const txt = document.getElementById('sync-pct-text');
            if (bar) bar.style.width = "100%";
            if (txt) txt.innerText = "100%";
            
            setTimeout(() => {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(100px)';
                setTimeout(() => panel.remove(), 300);
            }, 800);
        },
        fail: () => {
            clearInterval(interval);
            panel.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 600; color: #ef4444;">
                    <span style="display: flex; align-items: center; gap: 6px;">❌ Gagal Sinkronisasi</span>
                </div>
                <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">Backend sibuk atau tiada talian. Disimpan secara offline.</div>
            `;
            setTimeout(() => {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(100px)';
                setTimeout(() => panel.remove(), 300);
            }, 3500);
        }
    };
}

async function pushToGoogleSheets(action, payload) {
    if (!SETTINGS.GOOGLE_SHEETS_API_URL) return; // Skip if not configured
    
    const progress = showSyncProgress("Menghantar data ke Google Sheets...");
    try {
        await fetch(SETTINGS.GOOGLE_SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors', // Avoids CORS preflight issues for simple posts
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, data: payload })
        });
        console.log(`[Google Sheets] Synced ${action}`);
        progress.complete();
    } catch (err) {
        console.error(`[Google Sheets] Sync failed for ${action}:`, err);
        progress.fail();
    }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/**
 * Return today's date as an ISO date string (YYYY-MM-DD).
 * @returns {string}
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Generate a short unique id (for PPS / event records).
 * @returns {string}
 */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Wrap an IDBRequest in a Promise.
 * @param {IDBRequest} request
 * @returns {Promise<*>}
 */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Wrap an IDBTransaction's completion in a Promise.
 * @param {IDBTransaction} tx
 * @returns {Promise<void>}
 */
function txComplete(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted'));
  });
}

/* ------------------------------------------------------------------ */
/*  DataStore Class                                                   */
/* ------------------------------------------------------------------ */

/**
 * Central IndexedDB wrapper for all application data.
 */
export class DataStore {
  constructor() {
    /** @type {IDBDatabase|null} */
    this.db = null;
    /** @type {string} */
    this.DB_NAME = 'FloodReportingDB';
    /** @type {number} */
    this.DB_VERSION = 1;
  }

  /* ================================================================ */
  /*  Initialisation                                                  */
  /* ================================================================ */

  /**
   * Open (or create) the IndexedDB database and set up object stores.
   * Safe to call multiple times – subsequent calls are no-ops.
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        /** @type {IDBDatabase} */
        const db = event.target.result;

        /* ---------- submissions ---------- */
        if (!db.objectStoreNames.contains('submissions')) {
          const sub = db.createObjectStore('submissions', {
            keyPath: 'id',
            autoIncrement: true,
          });
          sub.createIndex('by_formId', 'formId', { unique: false });
          sub.createIndex('by_district', 'district', { unique: false });
          sub.createIndex('by_timestamp', 'timestamp', { unique: false });
          sub.createIndex('by_formId_district', ['formId', 'district'], { unique: false });
          sub.createIndex('by_formId_district_date', ['formId', 'district', 'date'], { unique: false });
        }

        /* ---------- pps ---------- */
        if (!db.objectStoreNames.contains('pps')) {
          const pps = db.createObjectStore('pps', { keyPath: 'id' });
          pps.createIndex('by_district', 'district', { unique: false });
          pps.createIndex('by_status', 'status', { unique: false });
        }

        /* ---------- events ---------- */
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ensure the database is initialised before any operation.
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  async _ensureDB() {
    if (!this.db) await this.init();
    return this.db;
  }

  /**
   * Synchronises submissions and PPS data from the Google Sheets Web App backend
   * into the local IndexedDB database.
   *
   * @returns {Promise<boolean>} Resolves to true if successful.
   */
  async syncStateDataFromServer() {
    if (!SETTINGS.GOOGLE_SHEETS_API_URL) {
      console.warn('[DataStore] Google Sheets API URL is not configured. Sync skipped.');
      return false;
    }

    const progress = showSyncProgress("Memuat turun data...");
    try {
      const url = `${SETTINGS.GOOGLE_SHEETS_API_URL}?action=getStateData`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      const { submissions, pps } = result;
      if (!submissions || !pps) {
        throw new Error('Invalid payload format returned by server');
      }

      const db = await this._ensureDB();
      const tx = db.transaction(['submissions', 'pps'], 'readwrite');
      const subStore = tx.objectStore('submissions');
      const ppsStore = tx.objectStore('pps');

      // Clear existing records to ensure perfect state parity with Google Sheets
      subStore.clear();
      ppsStore.clear();

      // Add downloaded submissions
      for (const sub of submissions) {
        // IDs from Sheets can be string formats, which is fine
        subStore.add(sub);
      }

      // Add downloaded PPS
      for (const p of pps) {
        ppsStore.add(p);
      }

      await txComplete(tx);
      console.log(`[DataStore] Synced down ${submissions.length} submissions and ${pps.length} PPS entries from Google Sheets.`);
      progress.complete();
      return true;
    } catch (err) {
      console.error('[DataStore] Failed to sync data from Google Sheets backend:', err);
      progress.fail();
      throw err;
    }
  }

  /* ================================================================ */
  /*  Submissions                                                     */
  /* ================================================================ */

  /**
   * Add a new form submission.
   *
   * @param {string}      formId   - Identifier of the form (e.g. 'J4', 'J6').
   * @param {string}      district - District id (e.g. 'kulim').
   * @param {Object}      data     - Key/value map of form field values.
   * @param {string|null} [ppsId=null] - Optional PPS id this submission relates to.
   * @param {string|null} [ppsName=null] - Optional PPS name.
   * @param {string}      [status='draft'] - Submission status (e.g., 'draft', 'verified').
   * @returns {Promise<number>} The auto-generated submission id.
   */
  async addSubmission(formId, district, data, ppsId = null, ppsName = null, status = 'draft') {
    const db = await this._ensureDB();
    const now = new Date();
    const record = {
      formId,
      district,
      data,
      ppsId,
      ppsName,
      status,
      timestamp: now.toISOString(),
      date: now.toISOString().slice(0, 10),
    };

    const tx = db.transaction('submissions', 'readwrite');
    const store = tx.objectStore('submissions');
    const id = await promisify(store.add(record));
    await txComplete(tx);
    
    // Push to Google Sheets (Fire and forget)
    pushToGoogleSheets('addSubmission', { ...record, id });
    
    return id;
  }

  /**
   * Retrieve submissions filtered by formId and optional criteria.
   *
   * @param {string} formId              - Form identifier.
   * @param {Object} [filters={}]
   * @param {string} [filters.district]  - Filter by district id.
   * @param {string} [filters.dateFrom]  - Inclusive start date (YYYY-MM-DD).
   * @param {string} [filters.dateTo]    - Inclusive end date (YYYY-MM-DD).
   * @param {string} [filters.ppsId]     - Filter by PPS id.
   * @returns {Promise<Object[]>}
   */
  async getSubmissions(formId, filters = {}) {
    const db = await this._ensureDB();
    const tx = db.transaction('submissions', 'readonly');
    const objectStore = tx.objectStore('submissions');

    let results;

    if (filters.district) {
      // Use compound index for formId + district
      const index = objectStore.index('by_formId_district');
      const range = IDBKeyRange.only([formId, filters.district]);
      results = await promisify(index.getAll(range));
    } else {
      const index = objectStore.index('by_formId');
      results = await promisify(index.getAll(formId));
    }

    // Apply remaining in-memory filters
    if (filters.dateFrom) {
      results = results.filter((r) => r.date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      results = results.filter((r) => r.date <= filters.dateTo);
    }
    if (filters.ppsId) {
      results = results.filter((r) => r.ppsId === filters.ppsId);
    }

    // Dynamically resolve ppsName if missing but ppsId is present
    try {
      const ppsTx = db.transaction('pps', 'readonly');
      const ppsStore = ppsTx.objectStore('pps');
      const allPPS = await promisify(ppsStore.getAll());
      const ppsMap = {};
      for (const p of allPPS) {
        ppsMap[p.id] = p.name;
      }
      for (const r of results) {
        if (r.ppsId && !r.ppsName) {
          r.ppsName = ppsMap[r.ppsId] || 'PPS Tidak Dikenali';
        }
      }
    } catch (err) {
      console.warn('[DataStore] Failed to resolve PPS names for submissions:', err);
    }

    // Sort newest first
    results.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1));
    return results;
  }

  /**
   * Get the most recent submission for a specific form + district combination.
   * Useful for loading the latest state or computing cumulative values.
   *
   * @param {string} formId   - Form identifier.
   * @param {string} district - District id.
   * @returns {Promise<Object|null>}
   */
  async getLatestSubmission(formId, district) {
    const db = await this._ensureDB();
    const tx = db.transaction('submissions', 'readonly');
    const index = tx.objectStore('submissions').index('by_formId_district');
    const range = IDBKeyRange.only([formId, district]);

    return new Promise((resolve, reject) => {
      const request = index.openCursor(range, 'prev');
      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all submissions for a form on a specific date string (YYYY-MM-DD).
   * Used for state-level daily dashboard aggregation.
   *
   * @param {string} formId - Form identifier.
   * @param {string} date   - ISO date string.
   * @returns {Promise<Object[]>}
   */
  async getSubmissionsByDate(formId, date) {
    const db = await this._ensureDB();
    const tx = db.transaction('submissions', 'readonly');
    const index = tx.objectStore('submissions').index('by_formId');
    const all = await promisify(index.getAll(formId));

    return all.filter((r) => r.date === date && r.status === 'verified');
  }

  /**
   * Delete a submission by its auto-increment id.
   *
   * @param {number} id - Submission id.
   * @returns {Promise<void>}
   */
  async deleteSubmission(id) {
    const db = await this._ensureDB();
    const tx = db.transaction('submissions', 'readwrite');
    await promisify(tx.objectStore('submissions').delete(id));
    await txComplete(tx);
    
    pushToGoogleSheets('deleteSubmission', { id });
  }

  /**
   * Update an existing submission's data or status.
   *
   * @param {number} id   - Submission id.
   * @param {Object} data - Key/value map of form field values to update/merge.
   * @param {string} [status] - Optional new status ('draft', 'verified').
   * @returns {Promise<void>}
   */
  async updateSubmission(id, data, status) {
    const db = await this._ensureDB();
    const tx = db.transaction('submissions', 'readwrite');
    const store = tx.objectStore('submissions');
    const record = await promisify(store.get(id));
    if (!record) {
      throw new Error(`Record with id ${id} not found`);
    }
    
    // Merge new data
    if (data && Object.keys(data).length > 0) {
        record.data = { ...record.data, ...data };
    }
    if (status) {
        record.status = status;
    }
    record.updatedAt = new Date().toISOString();
    
    await promisify(store.put(record));
    await txComplete(tx);
    
    pushToGoogleSheets('updateSubmission', record);
  }

  /**
   * Aggregate data across all districts for a given form.
   *
   * For every district that has at least one submission, the *latest* submission
   * (optionally restricted to `date`) is picked. Numeric fields in `data` are
   * summed across districts to produce state-level totals.
   *
   * @param {string}      formId       - Form identifier.
   * @param {string|null} [date=null]  - Optional ISO date to restrict to.
   * @returns {Promise<{ districts: Object, totals: Object }>}
   */
  async getAggregatedData(formId, date = null) {
    const db = await this._ensureDB();
    const tx = db.transaction('submissions', 'readonly');
    const objectStore = tx.objectStore('submissions');
    const index = objectStore.index('by_formId');

    let all = await promisify(index.getAll(formId));

    // Optionally restrict to a single date
    if (date) {
      all = all.filter((r) => r.date === date);
    }

    // Filter out drafts for state level
    all = all.filter(r => r.status === 'verified');

    // Pick the latest submission per district
    /** @type {Record<string, Object>} */
    const latestByDistrict = {};
    for (const sub of all) {
      const prev = latestByDistrict[sub.district];
      if (!prev || sub.timestamp > prev.timestamp) {
        latestByDistrict[sub.district] = sub;
      }
    }

    // Build per-district data map and compute totals
    const districts = {};
    const totals = {};

    for (const [distId, sub] of Object.entries(latestByDistrict)) {
      districts[distId] = { ...sub.data };

      // Sum numeric fields
      for (const [key, value] of Object.entries(sub.data)) {
        if (typeof value === 'number') {
          totals[key] = (totals[key] || 0) + value;
        }
      }
    }

    return { districts, totals };
  }

  /**
   * Compute the cumulative total for a specific "_Bil" field across all
   * historical submissions for a form + district.
   *
   * @param {string} formId  - Form identifier.
   * @param {string} district - District id.
   * @param {string} fieldId  - The field key to sum (e.g. 'mangsa_Bil').
   * @returns {Promise<number>}
   */
  async getCumulativeTotal(formId, district, fieldId) {
    const db = await this._ensureDB();
    const tx = db.transaction('submissions', 'readonly');
    const index = tx.objectStore('submissions').index('by_formId_district');
    const range = IDBKeyRange.only([formId, district]);
    let records = await promisify(index.getAll(range));
    
    records = records.filter(r => r.status === 'verified');

    let total = 0;
    for (const rec of records) {
      const val = rec.data?.[fieldId];
      if (typeof val === 'number') {
        total += val;
      }
    }
    return total;
  }

  /* ================================================================ */
  /*  PPS Management                                                  */
  /* ================================================================ */

  /**
   * Add a new PPS (Pusat Pemindahan Sementara).
   *
   * @param {Object} ppsData
   * @param {string} ppsData.district   - District id.
   * @param {string} ppsData.name       - Name of the centre.
   * @param {string} ppsData.location   - Address / location description.
   * @param {number} ppsData.capacity   - Maximum occupancy.
   * @returns {Promise<string>} Generated PPS id.
   */
  async addPPS(ppsData) {
    const db = await this._ensureDB();
    const record = {
      id: uid(),
      district: ppsData.district,
      name: ppsData.name,
      location: ppsData.location || '',
      capacity: ppsData.capacity || 0,
      status: 'active',
      dateOpened: ppsData.dateOpened ? new Date(ppsData.dateOpened).toISOString() : new Date().toISOString(),
      dateClosed: null,
    };

    const tx = db.transaction('pps', 'readwrite');
    await promisify(tx.objectStore('pps').add(record));
    await txComplete(tx);
    
    pushToGoogleSheets('addPPS', record);
    
    return record.id;
  }

  /**
   * Get all PPS entries for a district (active and closed).
   *
   * @param {string} district - District id.
   * @returns {Promise<Object[]>}
   */
  async getPPSByDistrict(district) {
    const db = await this._ensureDB();
    const tx = db.transaction('pps', 'readonly');
    const index = tx.objectStore('pps').index('by_district');
    return promisify(index.getAll(district));
  }

  /**
   * Get only active PPS entries for a district.
   *
   * @param {string} district - District id.
   * @returns {Promise<Object[]>}
   */
  async getActivePPS(district) {
    const all = await this.getPPSByDistrict(district);
    return all.filter((p) => p.status === 'active');
  }

  /**
   * Update fields on an existing PPS.
   *
   * @param {string} id      - PPS id.
   * @param {Object} updates - Key/value pairs to merge.
   * @returns {Promise<void>}
   */
  async updatePPS(id, updates) {
    const db = await this._ensureDB();
    const tx = db.transaction('pps', 'readwrite');
    const objectStore = tx.objectStore('pps');
    const existing = await promisify(objectStore.get(id));

    if (!existing) {
      throw new Error(`PPS with id "${id}" not found.`);
    }

    const updated = { ...existing, ...updates };
    await promisify(objectStore.put(updated));
    await txComplete(tx);
  }

  /**
   * Close a PPS (set status to 'closed' and record the closing timestamp).
   *
   * @param {string} id - PPS id.
   * @returns {Promise<void>}
   */
  async closePPS(id) {
    await this.updatePPS(id, {
      status: 'closed',
      dateClosed: new Date().toISOString(),
    });
    
    pushToGoogleSheets('closePPS', { id });
  }

  /* ================================================================ */
  /*  Events                                                          */
  /* ================================================================ */

  /**
   * Create a new flood event.
   *
   * @param {Object}   eventData
   * @param {string}   eventData.name              - Descriptive event name.
   * @param {string}   eventData.startDate          - ISO date string.
   * @param {string[]} eventData.affectedDistricts  - Array of district ids.
   * @returns {Promise<string>} Generated event id.
   */
  async createEvent(eventData) {
    const db = await this._ensureDB();
    const record = {
      id: uid(),
      name: eventData.name,
      startDate: eventData.startDate || todayISO(),
      endDate: null,
      status: 'active',
      affectedDistricts: eventData.affectedDistricts || [],
    };

    const tx = db.transaction('events', 'readwrite');
    await promisify(tx.objectStore('events').add(record));
    await txComplete(tx);
    return record.id;
  }

  /**
   * Get the currently active flood event (if any).
   *
   * @returns {Promise<Object|null>}
   */
  async getActiveEvent() {
    const db = await this._ensureDB();
    const tx = db.transaction('events', 'readonly');
    const all = await promisify(tx.objectStore('events').getAll());
    return all.find((e) => e.status === 'active') ?? null;
  }

  /**
   * End a flood event.
   *
   * @param {string} id - Event id.
   * @returns {Promise<void>}
   */
  async endEvent(id) {
    const db = await this._ensureDB();
    const tx = db.transaction('events', 'readwrite');
    const objectStore = tx.objectStore('events');
    const existing = await promisify(objectStore.get(id));

    if (!existing) {
      throw new Error(`Event with id "${id}" not found.`);
    }

    existing.status = 'ended';
    existing.endDate = todayISO();
    await promisify(objectStore.put(existing));
    await txComplete(tx);
  }

  /* ================================================================ */
  /*  Export                                                          */
  /* ================================================================ */

  /**
   * Export all submissions for a form as JSON or CSV.
   *
   * @param {string} formId            - Form identifier.
   * @param {'json'|'csv'} [format='json'] - Output format.
   * @returns {Promise<Object[]|string>}
   */
  async exportFormData(formId, format = 'json') {
    const submissions = await this.getSubmissions(formId);

    if (format === 'json') {
      return submissions;
    }

    // CSV ────────────────────────────────
    if (submissions.length === 0) return '';

    // Collect all unique data-field keys across submissions
    const fieldKeys = new Set();
    for (const sub of submissions) {
      if (sub.data) Object.keys(sub.data).forEach((k) => fieldKeys.add(k));
    }
    const sortedFields = [...fieldKeys].sort();
    const headers = ['id', 'formId', 'district', 'date', 'timestamp', 'ppsId', ...sortedFields];

    const escape = (val) => {
      if (val == null) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    };

    const rows = [headers.join(',')];
    for (const sub of submissions) {
      const row = [
        sub.id,
        sub.formId,
        sub.district,
        sub.date,
        sub.timestamp,
        sub.ppsId ?? '',
        ...sortedFields.map((k) => escape(sub.data?.[k])),
      ];
      rows.push(row.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Export every object store as a structured JSON object.
   *
   * @returns {Promise<{ submissions: Object[], pps: Object[], events: Object[], exportedAt: string }>}
   */
  async exportAllData() {
    const db = await this._ensureDB();
    const tx = db.transaction(['submissions', 'pps', 'events'], 'readonly');

    const [submissions, pps, events] = await Promise.all([
      promisify(tx.objectStore('submissions').getAll()),
      promisify(tx.objectStore('pps').getAll()),
      promisify(tx.objectStore('events').getAll()),
    ]);

    return {
      submissions,
      pps,
      events,
      exportedAt: new Date().toISOString(),
    };
  }

  /* ================================================================ */
  /*  Utility                                                         */
  /* ================================================================ */

  /**
   * Clear all data from every object store. Intended for testing / reset.
   *
   * @returns {Promise<void>}
   */
  async clearAllData() {
    const db = await this._ensureDB();
    const tx = db.transaction(['submissions', 'pps', 'events'], 'readwrite');
    tx.objectStore('submissions').clear();
    tx.objectStore('pps').clear();
    tx.objectStore('events').clear();
    await txComplete(tx);
  }

  /**
   * Insert realistic sample / demo data.
   *
   * Creates:
   *   - 1 active flood event covering several districts.
   *   - 4 PPS across different districts.
   *   - 3 days × 4 forms (J4, J6, J7, J9) of submissions for selected districts.
   *
   * @returns {Promise<void>}
   */
  async seedSampleData() {
    await this._ensureDB();

    // ── Flood Event ─────────────────────────────────────────────────
    const eventId = await this.createEvent({
      name: 'Banjir Kedah Mei 2026',
      startDate: '2026-05-20',
      affectedDistricts: ['kulim', 'kuala_muda', 'kota_setar', 'baling', 'pendang'],
    });

    // ── PPS ─────────────────────────────────────────────────────────
    const ppsIds = [];

    ppsIds.push(
      await this.addPPS({
        district: 'kulim',
        name: 'SK Taman Selasih',
        location: 'Jalan Selasih, Kulim',
        capacity: 250,
      })
    );

    ppsIds.push(
      await this.addPPS({
        district: 'kuala_muda',
        name: 'Dewan Serbaguna Sg Petani',
        location: 'Jalan Ibrahim, Sungai Petani',
        capacity: 400,
      })
    );

    ppsIds.push(
      await this.addPPS({
        district: 'kota_setar',
        name: 'Masjid Al-Hidayah Alor Setar',
        location: 'Jalan Putra, Alor Setar',
        capacity: 300,
      })
    );

    ppsIds.push(
      await this.addPPS({
        district: 'baling',
        name: 'Dewan MPKB Baling',
        location: 'Pekan Baling',
        capacity: 200,
      })
    );

    // ── Submissions ─────────────────────────────────────────────────
    const dates = ['2026-05-21', '2026-05-22', '2026-05-23'];
    const formDistricts = ['kulim', 'kuala_muda', 'kota_setar', 'baling', 'pendang'];

    // Mapping of formId -> sample data generator per district
    const sampleGenerators = {
      'J4_Borang3': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        RRT_Perubatan_Bil: 2 + dayIdx,
        RRT_Kesihatan_Bil: 1 + (distIdx % 2),
        RRT_MHPSS_Bil: dayIdx,
        Jumlah_Bil: 3 + dayIdx + (distIdx % 2),
      }),
      'J5_1_Fasiliti': (districtName, distIdx, dayIdx) => ({
        Negeri: 'KEDAH',
        Daerah: districtName,
        Nama_Fasiliti: `Klinik Desa Kampung Baru ${distIdx + 1}`,
        Kategori_Fasiliti: 'Klinik Desa',
        Tahap_Severiti: '2',
        Status_Operasi_Awal: 'Beroperasi',
        Status_Operasi_Semasa: dayIdx === 2 ? 'Telah Operasi di fasiliti asal' : 'Masih Pindah Operasi',
        Perkhidmatan_Dipindahkan: 'Dewan Serbaguna',
        Tarikh_Tutup: '2026-05-20',
        Tarikh_Buka: dayIdx === 2 ? '2026-05-23' : '',
        Catatan: 'Terjejas banjir kilat',
      }),
      'J6_Borang6': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Kes_Diperiksa_Bil: 15 + distIdx * 5 + dayIdx * 3,
        Berjangkit_Bil: 3 + dayIdx,
        NCD_Bil: 2 + (distIdx % 2),
        Kecederaan_Bil: dayIdx % 2,
        Wabak_Bil: 0,
        Jumlah_Penyakit_Bil: 5 + dayIdx + (distIdx % 2) + (dayIdx % 2),
      }),
      'J7_Borang7': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        AGE_Bil: 1 + (distIdx % 2),
        ARI_Bil: 3 + dayIdx,
        Konjunktivitis_Bil: dayIdx % 2,
        Skin_Infection_Bil: 1,
        Demam_Bil: 2,
        HFMD_Bil: 0,
        Tifoid_Bil: 0,
        Chicken_Pox_Bil: 0,
        Leptospirosis_Bil: 0,
        Lain_Lain_Bil: 0,
        Jumlah_Keseluruhan: 7 + (distIdx % 2) + dayIdx + (dayIdx % 2),
      }),
      'J8_1_Borang12': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Lelaki_Dewasa_Bil: 3 + dayIdx,
        Perempuan_Dewasa_Bil: 2 + (distIdx % 2),
        Kanak_Kanak_Bil: 1 + (dayIdx % 2),
        Sebab_Dirujuk: dayIdx % 2 === 0 ? 'Demam panas berpanjangan' : 'Dehidrasi dan muntah'
      }),
      'J8_2_Borang12': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Antenatal_Bil: dayIdx % 2,
        Posnatal_Bil: (distIdx % 2),
        Haemodialisis_Bil: 1 + dayIdx,
        Paliatif_Bil: dayIdx % 2,
        Catatan: 'Pesakit dipantau rapi'
      }),
      'J8_3_BPP': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Bil_Fasiliti_Terjejas_Pusat_Dialisis: dayIdx % 2,
        Status_Fasiliti_Tidak_Terjejas: 2,
        Jenis_Fasiliti_KKM: 1,
        Jenis_Fasiliti_Swasta: 1,
        Status_Operasi_Tidak_Operasi: dayIdx % 2,
        Status_Operasi_Mula: 1,
        Jumlah_Pesakit_Terjejas: 5 + dayIdx * 2,
        Pesakit_Masih_Terjejas: 2,
        Bil_Pesakit_Rawatan_Pusat_Asal_Fasiliti: 3,
        Bil_Pesakit_Rawatan_Pusat_Asal_Pesakit: 2,
        Bil_Pesakit_Pindah_Pusat_Lain: 1,
        Bil_Pesakit_Masuk_Hospital: 1,
        Pesakit_Discaj: 1
      }),
      'J9_Borang11': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Sampel_Air_Bil: 6 + dayIdx * 2,
        Pelanggaran_pH_Bil: 0,
        Pelanggaran_Baki_Klorin_Bil: dayIdx % 2,
        Pelanggaran_NTU_Bil: 1,
        Pelanggaran_Ecoli_Bil: 0,
        Telaga_Diperiksa_Bil: 3,
        Telaga_Diklorin_Bil: 1,
      }),
      'J10_1_Vektor': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        PPS_Aktif: 2,
        PPS_Positif_Bil: dayIdx % 2,
        Bekas_Diperiksa_Bil: 10 + dayIdx * 5,
        Bekas_Positif_Bil: dayIdx % 2,
        AI_Aedes: 1.5,
        BI_Aedes: 2.0,
        Fogging_Bil: 1,
        Larviciding_Bil: 1
      }),
      'J11_Borang13': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        PPS_Dilawati: 1,
        Premis_Makanan_Memuaskan: 2,
        Premis_Makanan_Tidak_Memuaskan: 0,
        Premis_Tindakan_Pembetulan_Ya: 0,
        Premis_Tindakan_Pembetulan_Tidak: 0,
        Bil_Sesi_Pendidikan_Kesihatan: 2,
        Bil_Peserta_Pendidikan_Kesihatan: 15,
        Bil_Pengendali: 5,
        Bil_Terima_Suntikan: 4,
        Aduan_Makanan_Bil: 0,
        Catatan: 'Keadaan premis bersih'
      }),
      'J12_1_Borang5_1': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Ceramah: 2,
        Nasihat_Individu: 10,
        Tunjuk_Cara: 1,
        Perb_Kump_Kecil: 2,
        Taklimat: 1,
        Pameran: 0,
        Gotong_Royong: 0,
        Risalah: 50,
        Poster: 5,
        Bunting: 2,
        Banner: 1
      }),
      'J12_2_Borang5_2': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        TV_Slot: 0,
        Radio_Slot: 1,
        Unit_Bergerak_Sesi: 2,
        Website_Post: 1,
        Instagram_Post: 2,
        Facebook_Post: 3,
        Facebook_Reach: 500,
        Youtube_TikTok_Post: 1,
        X_Post: 0,
        Telegram_Post: 2
      }),
      'J13_NCEMH': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Jenis_Bencana: 'Banjir',
        Lokasi_Dilawati_Bil: 1,
        Petugas_PSY_Bil: 1,
        Petugas_FMS_Bil: 0,
        Petugas_MO_Bil: 1,
        Petugas_PPSI_Bil: 1,
        Petugas_Paramedik_Bil: 2,
        Petugas_Lain_Bil: 0,
        Intervensi_Orang_Awam_Bil: 10,
        Intervensi_Petugas_KKM_Bil: 2,
        Intervensi_Petugas_Agensi_Lain_Bil: 1,
        Sesi_Berkumpulan_Bil: 1,
        Aktiviti_Relaksasi_Bil: 5,
        Aktiviti_Seni_Bil: 4,
        Aktiviti_Psikopendidikan_Bil: 8
      }),
      'J14_NCEMH_Mental': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Lokasi_Bil: 1,
        Jumlah_Dirujuk_Bil: 2,
        Rujuk_MO_Bil: 1,
        Rujuk_FMS_Bil: 0,
        Rujuk_PSY_Bil: 0,
        Rujuk_PPSI_Bil: 1,
        Lain_Lain_Bil: 0,
        Abnormal_DASS_GAD_Bil: 3,
        Disyaki_Gangguan_Emosi_Bil: 2,
        Disyaki_Penyakit_Mental_Bil: 0,
        Risiko_Bunuh_Diri_Bil: 0
      }),
      'J15_BSM': (districtName, distIdx, dayIdx) => ({
        Daerah: districtName,
        Nama_Anggota: `Staff BSM ${distIdx+1}`,
        Jawatan: 'Penolong Pegawai Kesihatan Persekitaran',
        Kategori_Tempat_Bertugas: 'Bilik Gerakan Bencana',
        Nama_Tempat: `Bilik Gerakan Bencana ${districtName}`,
        Status: 'Hadir_Bekerja (1)',
        Berada_di_PPS: 'Ya',
        Catatan: 'Bertugas di PPS'
      }),
      'Linelisting_Covid': (districtName, distIdx, dayIdx) => ({
        Tarikh_Dilaporkan: dates[dayIdx],
        Nama: `Pesakit Covid ${distIdx+1}`,
        No_KP: `900101-02-500${distIdx}`,
        Negara_Jika_Warga_Asing: '',
        Umur: 35,
        Alamat: `Kampung Baru, ${districtName}`,
        Daerah: districtName,
        Negeri: 'KEDAH',
        Cara_Covid19_Dikesan: 'Saringan Kemasukan ke PPS',
        Tarikh_Positif: dates[dayIdx],
        Tarikh_Onset: dates[dayIdx],
        Komorbid: 'Tiada',
        Tindakan: 'Kuarantin di PPS',
        Tempat_Kuarantin: 'Bilik Isolasi PPS',
        Status_Vaksin: 'Lengkap',
        Tarikh_HSO: dates[dayIdx],
        Status_HSO: 'Aktif'
      })
    };

    const ppsMap = {
      'kulim': 'SK Taman Selasih',
      'kuala_muda': 'Dewan Serbaguna Sg Petani',
      'kota_setar': 'Masjid Al-Hidayah Alor Setar',
      'baling': 'Dewan MPKB Baling',
    };

    for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
      for (let distIdx = 0; distIdx < formDistricts.length; distIdx++) {
        const district = formDistricts[distIdx];
        const districtName = district.toUpperCase().replace(/_/g, ' ');

        for (const formId of [
          'J4_Borang3',
          'J5_1_Fasiliti',
          'J6_Borang6',
          'J7_Borang7',
          'J8_1_Borang12',
          'J8_2_Borang12',
          'J8_3_BPP',
          'J9_Borang11',
          'J10_1_Vektor',
          'J11_Borang13',
          'J12_1_Borang5_1',
          'J12_2_Borang5_2',
          'J13_NCEMH',
          'J14_NCEMH_Mental',
          'J15_BSM',
          'Linelisting_Covid'
        ]) {
          const data = sampleGenerators[formId](districtName, distIdx, dayIdx);
          const db = this.db;
          const ts = new Date(`${dates[dayIdx]}T${String(8 + dayIdx).padStart(2, '0')}:00:00+08:00`);
          
          const ppsId = ['J6_Borang6', 'J7_Borang7', 'J10_1_Vektor', 'J11_Borang13'].includes(formId) ? ppsIds[distIdx] ?? null : null;
          const ppsName = ppsId ? (ppsMap[district] || '') : null;

          const record = {
            formId,
            district,
            data,
            ppsId,
            ppsName,
            timestamp: ts.toISOString(),
            date: dates[dayIdx],
          };
          const tx = db.transaction('submissions', 'readwrite');
          tx.objectStore('submissions').add(record);
          await txComplete(tx);
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton instance                                                */
/* ------------------------------------------------------------------ */

/** Default shared DataStore instance. */
export const store = new DataStore();
