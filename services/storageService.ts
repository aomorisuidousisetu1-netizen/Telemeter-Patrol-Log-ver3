import { InspectionRecord } from '../types';
import { STORAGE_KEYS } from '../constants';

const safeParse = <T>(data: string | null, fallback: T): T => {
  if (!data) return fallback;
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error("JSON Parse Error", e);
    return fallback;
  }
};

export const storageService = {
  getRecords: (location: string): InspectionRecord[] => {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.RECORDS_PREFIX}${location}`);
      const parsed = safeParse<InspectionRecord[]>(data, []);
      if (!Array.isArray(parsed)) return [];
      
      // Filter out null/undefined records to prevent "Uncaught TypeError"
      return parsed
        .filter(r => r && typeof r === 'object' && r.id)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } catch (e) {
      console.error("Storage Read Error", e);
      return [];
    }
  },

  setRecords: (location: string, data: InspectionRecord[]) => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.RECORDS_PREFIX}${location}`, JSON.stringify(data));
    } catch (e) {
      console.error("Storage Write Error", e);
    }
  },

  getPending: (): InspectionRecord[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      const parsed = safeParse<InspectionRecord[]>(data, []);
      if (!Array.isArray(parsed)) return [];
      
      return parsed.filter(r => r && typeof r === 'object' && r.id);
    } catch (e) {
      return [];
    }
  },

  addPending: (record: InspectionRecord, location: string) => {
    try {
      const pending = storageService.getPending();
      // Remove existing version of this record if present, then add new one
      const newPending = [
        ...pending.filter(x => x.id !== record.id),
        { ...record, sheetName: location }
      ];
      localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(newPending));
    } catch (e) {
      console.error("Storage Add Pending Error", e);
      alert("保存に失敗しました。端末の保存容量が不足している可能性があります。不要なデータを削除してください。");
    }
  },

  removePending: (id: string) => {
    try {
      const pending = storageService.getPending().filter(x => x.id !== id);
      localStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pending));
    } catch (e) {
      console.error("Storage Remove Pending Error", e);
    }
  },

  // Locations (Sheet Names) Caching
  getLocations: (): string[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS_CACHE);
      const parsed = safeParse<string[]>(data, []);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  setLocations: (locations: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS_CACHE, JSON.stringify(locations));
    } catch (e) {
      console.error("Storage Location Write Error", e);
    }
  }
};