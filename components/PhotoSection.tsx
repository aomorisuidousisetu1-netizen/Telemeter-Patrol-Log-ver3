import React, { useState } from 'react';
import { Camera, Trash2, MapPin, Calendar, Image as ImageIcon, Mountain } from 'lucide-react';
import { PhotoData } from '../types';
import { processImage } from '../services/imageService';
import { Card } from './FormComponents';

interface PhotoSectionProps {
  photos: PhotoData[];
  onAdd: (photo: PhotoData) => void;
  onRemove: (index: number) => void;
}

export const PhotoSection: React.FC<PhotoSectionProps> = ({ photos = [], onAdd, onRemove }) => {
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    if (photos && photos.length >= 3) {
      alert("写真は最大3枚までです");
      return;
    }

    setLoading(true);
    try {
      const file = e.target.files[0];
      const processed = await processImage(file);
      onAdd(processed);
    } catch (err) {
      alert("写真処理エラー: " + err);
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  // Ensure photos is an array
  const safePhotos = Array.isArray(photos) ? photos : [];

  return (
    <Card title={`写真・位置情報 (${safePhotos.length}/3)`}>
      <div className="space-y-4">
        {/* Upload Button */}
        {safePhotos.length < 3 && (
          <label className={`w-full h-14 bg-blue-600 text-white rounded-lg font-bold text-lg shadow flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-transform hover:bg-blue-700 ${loading ? 'opacity-70 pointer-events-none' : ''}`}>
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
            ) : (
              <Camera size={24} />
            )}
            <span>{loading ? '処理中...' : '写真を追加 (EXIF自動)'}</span>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        )}

        {/* Photo List */}
        <div className="grid gap-4">
          {safePhotos.map((p, i) => {
            // Null check for safety
            if (!p) return null;

            // Check for valid URL or Base64
            let src = String(p.url || p.data || '');
            
            // Handle Google Drive URLs to make them displayable in <img> tag
            // Supports both 'id=...' and '/file/d/...' formats
            if (src.startsWith('http') && src.includes('drive.google.com')) {
               try {
                   let id = '';
                   // Pattern 1: /file/d/ID/view
                   const matchD = src.match(/\/d\/([a-zA-Z0-9_-]+)/);
                   // Pattern 2: id=ID
                   const matchId = src.match(/id=([a-zA-Z0-9_-]+)/);
                   
                   if (matchD) {
                       id = matchD[1];
                   } else if (matchId) {
                       id = matchId[1];
                   }

                   if (id) {
                       // Use thumbnail endpoint for display which works well for <img> tags
                       src = `https://drive.google.com/thumbnail?id=${id}&sz=w800`;
                   }
               } catch (e) {
                   console.warn("Failed to parse drive URL", e);
               }
            }

            return (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <div className="relative aspect-video bg-slate-200 group">
                  {src ? (
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="absolute top-2 right-2 bg-red-500/90 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                    No. {i + 1}
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-3 text-xs text-slate-600 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span className="font-mono truncate">
                      撮影日時: {p.date || '不明'}
                    </span>
                  </div>
                   <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400 shrink-0" />
                    <span className="font-mono truncate">
                      緯度, 経度: {p.lat ? `${Number(p.lat).toFixed(4)}, ${Number(p.lon).toFixed(4)}` : '不明'}
                    </span>
                  </div>
                   <div className="flex items-center gap-2">
                     <Mountain size={14} className="text-slate-400 shrink-0" />
                     <span className="font-mono">
                       高度: {p.alt ? `${Number(p.alt).toFixed(1)}m` : '-'}
                     </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};