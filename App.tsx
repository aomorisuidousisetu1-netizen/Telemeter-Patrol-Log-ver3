import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, RefreshCw, PlusCircle, 
  BookOpen, Save
} from 'lucide-react';

import { InspectionRecord } from './types';
import { INITIAL_RECORD_STATE } from './constants';
import { storageService } from './services/storageService';
import { apiService } from './services/apiService';
import { FormInput, Toggle, Card } from './components/FormComponents';
import { PhotoSection } from './components/PhotoSection';
import { ManualModal } from './components/ManualModal';

const App = () => {
  const [locations, setLocations] = useState<string[]>([]);
  const [location, setLocation] = useState<string>("");
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [showManual, setShowManual] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  
  // Current Form State
  const [formData, setFormData] = useState<InspectionRecord>({ ...INITIAL_RECORD_STATE, id: '', inspectionDate: '', createdAt: 0 });
  const [saving, setSaving] = useState(false);

  // Initialize Today's Date
  const getToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${y}-${m}-${day}`;
  };

  // --- 1. Load Locations (Sheet Names) ---
  useEffect(() => {
    const initLocations = async () => {
      try {
        setLoadingLocations(true);
        // 1. Try Cache
        const cached = storageService.getLocations();
        if (cached.length > 0) {
          setLocations(cached);
          setLocation(cached[0]); // Default to first
        }

        // 2. Try Fetch
        if (navigator.onLine) {
            const fetched = await apiService.fetchSheetNames();
            if (fetched && fetched.length > 0) {
              setLocations(fetched);
              storageService.setLocations(fetched);
              // If we didn't have cache, or if we want to ensure we select something valid
              if (cached.length === 0) {
                setLocation(fetched[0]);
              }
            }
        }
      } catch (e) {
        console.error("Failed to fetch locations", e);
      } finally {
        setLoadingLocations(false);
      }
    };

    initLocations();
  }, []);

  // --- 2. Load Records for Selected Location ---
  useEffect(() => {
    if (!location) return;

    let mounted = true;
    
    const load = async () => {
      try {
        setLoadingData(true);
        
        // 1. Load Local
        const localData = storageService.getRecords(location);
        const pending = storageService.getPending().filter(r => r.sheetName === location);
        
        // Update pending count global
        setPendingCount(storageService.getPending().length);

        if (mounted) {
          // Merge pending into local view temporarily so user sees them
          const mergedLocal = [...localData];
          pending.forEach(p => {
            // Extra safety check for p and mergedLocal contents
            if (p && p.id && !mergedLocal.find(r => r && r.id === p.id)) {
              mergedLocal.push(p);
            }
          });
          mergedLocal.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

          setRecords(mergedLocal);
          // Default to LAST record (Initial screen = data of the last row)
          // If empty, index is 0 (which triggers New Mode if records.length is 0)
          setViewIndex(mergedLocal.length > 0 ? mergedLocal.length - 1 : 0);
          setLoadingData(false);
        }

        // 2. Sync Cloud (Background)
        if (navigator.onLine) {
          setSyncing(true);
          try {
            const cloudData = await apiService.fetchRecords(location);
            if (mounted) {
              // Re-merge pending
              const currentPending = storageService.getPending().filter(r => r.sheetName === location);
              const map = new Map<string, InspectionRecord>();
              
              // Using Map to deduplicate by ID, handling potential duplicates
              cloudData.forEach(r => { if(r && r.id) map.set(r.id, r); });
              currentPending.forEach(r => { if(r && r.id) map.set(r.id, r); });
              
              const finalMerged = Array.from(map.values()).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
              
              storageService.setRecords(location, finalMerged);
              setRecords(finalMerged);
              
              // Requirement: Always jump to the last record (latest data) when loading/syncing
              setViewIndex(finalMerged.length > 0 ? finalMerged.length - 1 : 0);
            }
          } catch (e) {
            console.error("Cloud fetch failed", e);
          } finally {
            if (mounted) setSyncing(false);
          }
        }
      } catch (err) {
        console.error("Load records error", err);
      }
    };

    setRecords([]);
    load();

    return () => { mounted = false; };
  }, [location]);

  // --- Form Logic ---
  const isNewMode = records.length > 0 && viewIndex >= records.length;
  // If records is empty, viewIndex 0 is effectively "New Mode" but we need to handle it carefully
  const isEmptyStart = records.length === 0;
  
  const currentRecord = (!isEmptyStart && !isNewMode) ? records[viewIndex] : null;
  
  // Initialize Form Data when switching views
  useEffect(() => {
    if (currentRecord) {
      // Data Sanitization: Ensure photos is always a valid array of objects
      const safePhotos = Array.isArray(currentRecord.photos) 
        ? currentRecord.photos.filter(p => p !== null && typeof p === 'object')
        : [];

      setFormData({
        ...currentRecord,
        photos: safePhotos
      });
    } else {
      // New Mode (or empty start)
      
      // Create readable ID: rec_{Location}_{YYYYMMDD}_{random}
      const today = getToday();
      const datePart = today.replace(/-/g, '');
      const locPart = location ? location.replace(/\s+/g, '_') : 'temp';
      const randomPart = Math.random().toString(36).substr(2, 5);
      const newId = `rec_${locPart}_${datePart}_${randomPart}`;

      setFormData({
        ...INITIAL_RECORD_STATE,
        id: newId,
        createdAt: Date.now(),
        inspectionDate: today,
        sheetName: location
      });
    }
  }, [viewIndex, records, location, currentRecord]);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      alert("オフラインです。通信環境の良い場所で試してください。");
      return;
    }
    setSyncing(true);
    try {
      // 1. Sync Pending
      const allPending = storageService.getPending();
      let count = 0;
      for (const r of allPending) {
        await apiService.saveRecord(r, r.sheetName || location);
        storageService.removePending(r.id);
        count++;
      }
      
      // 2. Refresh Locations (Sheet Names might have changed)
      const fetchedLocs = await apiService.fetchSheetNames();
      if (fetchedLocs.length > 0) {
        setLocations(fetchedLocs);
        storageService.setLocations(fetchedLocs);
      }

      // 3. Refresh current records
      const cloud = await apiService.fetchRecords(location);
      storageService.setRecords(location, cloud);
      setRecords(cloud);
      setPendingCount(0);
      
      // Jump to last record after manual sync
      if (cloud.length > 0) setViewIndex(cloud.length - 1);

      alert(`同期完了: ${count}件送信, ${cloud.length}件受信`);
    } catch (e: any) {
      alert("エラー: " + (e.message || String(e)));
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      alert("場所（シート）が選択されていません");
      return;
    }
    setSaving(true);
    try {
      // 1. Save Local First
      const recordToSave = { ...formData, sheetName: location };
      
      const newRecords = [...records];
      const existingIdx = newRecords.findIndex(r => r.id === recordToSave.id);
      
      if (existingIdx >= 0) {
        newRecords[existingIdx] = recordToSave;
      } else {
        newRecords.push(recordToSave);
      }
      
      setRecords(newRecords);
      storageService.setRecords(location, newRecords);
      storageService.addPending(recordToSave, location);
      setPendingCount(storageService.getPending().length);
      
      // If new, update view index so we aren't stuck on "New" form
      if (existingIdx === -1) {
        setViewIndex(newRecords.length - 1); 
      }

      // 2. Try Network
      if (navigator.onLine) {
        await apiService.saveRecord(recordToSave, location);
        storageService.removePending(recordToSave.id);
        setPendingCount(storageService.getPending().length);
        alert("保存しました");
      } else {
        alert("端末に保存しました（未送信）\n通信環境の良い場所で同期ボタンを押してください。");
      }
    } catch (e: any) {
      alert("保存エラー: " + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (key: keyof InspectionRecord, val: any) => {
    setFormData(prev => ({ ...prev, [key]: val }));
  };

  // Previous record for comparison
  const prevRecord = (isNewMode || isEmptyStart)
    ? (records.length > 0 ? records[records.length - 1] : null)
    : (viewIndex > 0 ? records[viewIndex - 1] : null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-10">
      {/* Header */}
      <header className="bg-[#1e3a8a] text-white p-4 sticky top-0 z-40 shadow-md safe-area-top">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div>
            <div className="text-[10px] text-blue-200 uppercase font-bold tracking-wider mb-0.5">Location (Sheet)</div>
            <div className="relative">
              {loadingLocations ? (
                <div className="h-8 w-32 bg-blue-800/50 rounded animate-pulse"/>
              ) : (
                <>
                  <select 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)}
                    className="appearance-none bg-blue-800/50 border border-blue-400/30 text-white py-1 pl-3 pr-8 rounded-md font-bold text-lg focus:outline-none focus:ring-2 focus:ring-white/50 w-full max-w-[200px]"
                  >
                    {locations.map(l => <option key={l} value={l} className="text-slate-900">{l}</option>)}
                    {locations.length === 0 && <option value="">読込中またはデータなし</option>}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-200">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            {!isNewMode && !loadingData && locations.length > 0 && (
              <button 
                onClick={() => setViewIndex(records.length)} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 shadow-sm transition-colors"
              >
                <PlusCircle size={18} />
                <span className="hidden sm:inline">新規</span>
              </button>
            )}
            
            <button 
              onClick={handleManualSync}
              disabled={syncing}
              className={`p-2 rounded-full bg-white/10 hover:bg-white/20 relative transition-all ${pendingCount > 0 ? 'ring-2 ring-amber-400' : ''}`}
            >
              {syncing ? <RefreshCw size={24} className="animate-spin text-blue-200"/> : <RefreshCw size={24}/>}
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#1e3a8a]">
                  {pendingCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={() => setShowManual(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <BookOpen size={24}/>
            </button>
          </div>
        </div>
      </header>

      {/* Manual Modal */}
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}

      <div className="max-w-2xl mx-auto">
        {(loadingData || !location) ? (
          <div className="flex flex-col items-center justify-center pt-32 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold animate-pulse">
              {!location ? "場所情報を取得中..." : "データを読み込み中..."}
            </p>
          </div>
        ) : (
          <>
            {/* Navigator */}
            <div className="bg-white border-b border-slate-200 p-2 sticky top-[72px] z-30 shadow-sm flex justify-between items-center">
              <button 
                disabled={viewIndex <= 0} 
                onClick={() => setViewIndex(v => v - 1)}
                className="p-3 text-blue-600 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-blue-50 rounded-full transition-colors"
              >
                <ChevronLeft size={32} strokeWidth={2.5}/>
              </button>
              
              <div className="flex flex-col items-center">
                {isNewMode || isEmptyStart ? (
                  <div className="flex items-center gap-2 text-emerald-600 font-bold px-4 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                    <PlusCircle size={20} />
                    <span>新しい記録を作成</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-2xl font-black text-slate-700 leading-none">
                      {viewIndex + 1} <span className="text-sm font-medium text-slate-400">/ {records.length}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold mt-1">
                       {records[viewIndex]?.inspectionDate}
                    </div>
                  </div>
                )}
              </div>

              <button 
                disabled={viewIndex >= records.length} 
                onClick={() => setViewIndex(v => v + 1)}
                className="p-3 text-blue-600 disabled:text-slate-300 disabled:cursor-not-allowed hover:bg-blue-50 rounded-full transition-colors"
              >
                <ChevronRight size={32} strokeWidth={2.5}/>
              </button>
            </div>

            {/* Main Form */}
            <form onSubmit={handleSave} className="p-4 space-y-6 pb-24 animate-in fade-in duration-300">
              
              {/* Basic Info */}
              <Card title="基本情報">
                <div className="space-y-6">
                  <FormInput 
                    label="巡回日" 
                    type="date"
                    value={formData.inspectionDate} 
                    onChange={v => updateForm('inspectionDate', v)} 
                  />
                  {/* Changed layout from grid to vertical stack to match other items */}
                  <FormInput label="圧力 (MPa)" type="number" step="0.01" value={formData.pressureMpa} onChange={v => updateForm('pressureMpa', v)} prevValue={prevRecord?.pressureMpa} />
                  <FormInput label="水温 (℃)" type="number" step="0.1" value={formData.waterTemp} onChange={v => updateForm('waterTemp', v)} prevValue={prevRecord?.waterTemp} />
                  
                  <div className="space-y-4 pt-2">
                    <FormInput label="計器残塩 (校正前) (mg/L)" type="number" step="0.01" value={formData.chlorineBefore} onChange={v => updateForm('chlorineBefore', v)} prevValue={prevRecord?.chlorineBefore} />
                    <FormInput label="計器残塩 (校正後) (mg/L)" type="number" step="0.01" value={formData.chlorineAfter} onChange={v => updateForm('chlorineAfter', v)} prevValue={prevRecord?.chlorineAfter} />
                    <FormInput label="実測残塩 (mg/L)" type="number" step="0.01" value={formData.chlorineMeasured} onChange={v => updateForm('chlorineMeasured', v)} prevValue={prevRecord?.chlorineMeasured} />
                    <FormInput label="導電率 (μS/cm)" type="number" step="0.1" value={formData.conductivity} onChange={v => updateForm('conductivity', v)} prevValue={prevRecord?.conductivity} />
                    <FormInput label="濁度 (度)" type="number" step="0.01" value={formData.turbidity} onChange={v => updateForm('turbidity', v)} prevValue={prevRecord?.turbidity} />
                    <FormInput label="色度 (度)" type="number" step="0.01" value={formData.color} onChange={v => updateForm('color', v)} prevValue={prevRecord?.color} />
                  </div>
                </div>
              </Card>

              {/* Equipment */}
              <Card title="設備状態">
                <Toggle label="換気扇" value={formData.fanStatus} onChange={v => updateForm('fanStatus', v)}/>
                <Toggle label="テープヒータ" value={formData.tapeHeaterStatus} onChange={v => updateForm('tapeHeaterStatus', v)}/>
                <Toggle label="パネルヒータ" value={formData.panelHeaterStatus} onChange={v => updateForm('panelHeaterStatus', v)}/>
                <Toggle label="ロードヒータ" value={formData.roadHeaterStatus} onChange={v => updateForm('roadHeaterStatus', v)}/>
                {/* Removed extra horizontal line (border-t) here */}
                <Toggle label="施設状況" value={formData.facilityStatus} onChange={v => updateForm('facilityStatus', v)} options={['良', '不可']}/>
              </Card>

              {/* Power */}
              <Card title="電力">
                 <FormInput label="100V電力" type="number" value={formData.power100V} onChange={v => updateForm('power100V', v)} prevValue={prevRecord?.power100V} className="mb-0"/>
              </Card>

              {/* Photos */}
              <PhotoSection 
                photos={formData.photos}
                onAdd={(photo) => updateForm('photos', [...formData.photos, photo])}
                onRemove={(index) => updateForm('photos', formData.photos.filter((_, i) => i !== index))}
              />

              {/* Remarks */}
              <Card title="備考">
                <textarea 
                  className="w-full p-4 border border-slate-200 rounded-lg h-32 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none text-lg bg-white text-slate-800 placeholder-slate-300" 
                  value={formData.remarks} 
                  onChange={e => updateForm('remarks', e.target.value)}
                  placeholder="特記事項があれば入力してください"
                ></textarea>
              </Card>

              {/* Submit Button */}
              <button 
                disabled={saving} 
                className={`w-full py-4 rounded-xl font-bold text-xl shadow-lg flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] ${
                  saving ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#ea580c] hover:bg-orange-600 text-white'
                }`}
              >
                {saving ? (
                  <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"/>
                ) : (
                  <>
                    <Save size={24}/>
                    <span>{(isNewMode || isEmptyStart) ? '保存する' : '更新する'}</span>
                  </>
                )}
              </button>

            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default App;