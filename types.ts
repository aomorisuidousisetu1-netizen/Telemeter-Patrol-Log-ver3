export interface PhotoData {
  data?: string; // Base64 string
  url?: string;  // Cloud URL
  lat?: number | string;
  lon?: number | string;
  alt?: number | string;
  date?: string;
}

export interface InspectionRecord {
  id: string;
  sheetName?: string;
  inspectionDate: string;
  createdAt: number;
  
  // Measurements
  pressureMpa: string;
  waterTemp: string;
  chlorineBefore: string;
  chlorineAfter: string;
  chlorineMeasured: string;
  conductivity: string; // Added: 導電率
  turbidity: string;
  color: string; // Added: 色度
  
  // Equipment Status
  fanStatus: 'ON' | 'OFF';
  tapeHeaterStatus: 'ON' | 'OFF';
  panelHeaterStatus: 'ON' | 'OFF';
  roadHeaterStatus: 'ON' | 'OFF';
  facilityStatus: '良' | '不可';
  
  // Power
  power100V: string;
  
  // Media & Notes
  photos: PhotoData[];
  remarks: string;
}

// Global declaration for exif-js loaded via CDN
declare global {
  interface Window {
    EXIF: any;
  }
}