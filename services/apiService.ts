import { GOOGLE_SCRIPT_URL } from '../constants';
import { InspectionRecord } from '../types';

// Helper to safely parse JSON response
const fetchJson = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    if (!text) return null; // Handle empty response
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("API Response was not JSON:", text.substring(0, 500)); // Log first 500 chars
      throw new Error("サーバーからの応答が不正です (JSON Parse Error)");
    }
  } catch (err: any) {
    // Re-throw with clear message to be caught by App.tsx
    throw new Error(err.message || "Network Error");
  }
};

export const apiService = {
  // シート名一覧（場所）を取得
  fetchSheetNames: async (): Promise<string[]> => {
    const url = `${GOOGLE_SCRIPT_URL}?action=getSheetNames&t=${Date.now()}`;
    const data = await fetchJson(url);
    
    if (data && data.result === 'error') {
      throw new Error(data.error);
    }
    return Array.isArray(data) ? data : [];
  },

  fetchRecords: async (location: string): Promise<InspectionRecord[]> => {
    const url = `${GOOGLE_SCRIPT_URL}?action=read&sheetName=${encodeURIComponent(location)}&t=${Date.now()}`;
    const data = await fetchJson(url);

    if (data && data.result === 'error') {
      throw new Error(data.error);
    }
    // Filter out invalid items
    return Array.isArray(data) 
      ? data.filter((r: any) => r && typeof r === 'object' && r.id) 
      : [];
  },

  saveRecord: async (record: InspectionRecord, location: string): Promise<any> => {
    // We send sheetName as part of the payload
    const payload = { ...record, sheetName: location };
    
    const data = await fetchJson(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    return data;
  }
};