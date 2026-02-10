// 重要: Google Apps Scriptをデプロイして発行されたウェブアプリURLをここに設定してください
// 手順は README.md を参照してください
export const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfXY5K76FvR6X8VBE_sTirt1Pd1XCf8evM6GkwT0gHzzribHNLxQA6nA9H3GFIZ4qj/exec';

// 初期状態では空にしておき、APIから取得します
export const DEFAULT_LOCATIONS: string[] = [];

export const STORAGE_KEYS = {
  RECORDS_PREFIX: 'tm_records_',
  PENDING_SYNC: 'tm_pending_sync',
  LOCATIONS_CACHE: 'tm_locations_cache' // シート名のキャッシュ用キー
};

export const INITIAL_RECORD_STATE = {
  pressureMpa: '', 
  waterTemp: '',
  fanStatus: 'OFF' as const, 
  tapeHeaterStatus: 'OFF' as const, 
  panelHeaterStatus: 'OFF' as const, 
  roadHeaterStatus: 'OFF' as const,
  chlorineBefore: '', 
  chlorineAfter: '', 
  chlorineMeasured: '', 
  conductivity: '', // Added: 導電率
  turbidity: '',
  color: '', // Added: 色度
  facilityStatus: '良' as const, 
  power100V: '',
  photos: [], 
  remarks: ''
};