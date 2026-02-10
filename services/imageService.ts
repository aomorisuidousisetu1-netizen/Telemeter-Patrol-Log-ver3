import { PhotoData } from '../types';

export const processImage = async (file: File): Promise<PhotoData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) {
        reject("Failed to read file");
        return;
      }

      const img = new Image();
      img.src = e.target.result as string;
      
      img.onload = () => {
        // 1. Resize/Compress Logic
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height *= MAX_DIMENSION / width;
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width *= MAX_DIMENSION / height;
            height = MAX_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject("Canvas context unavailable");
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to optimized JPEG
        const base64 = canvas.toDataURL('image/jpeg', 0.9);

        // 2. EXIF Extraction Logic
        const exifData: Partial<PhotoData> = { lat: "", lon: "", alt: "", date: "" };

        if (window.EXIF) {
          window.EXIF.getData(file as any, function(this: any) {
            const lat = window.EXIF.getTag(this, "GPSLatitude");
            const latRef = window.EXIF.getTag(this, "GPSLatitudeRef");
            const lon = window.EXIF.getTag(this, "GPSLongitude");
            const lonRef = window.EXIF.getTag(this, "GPSLongitudeRef");
            const alt = window.EXIF.getTag(this, "GPSAltitude");
            const dateOriginal = window.EXIF.getTag(this, "DateTimeOriginal");
            const dateDigitized = window.EXIF.getTag(this, "DateTimeDigitized");
            const dateMod = window.EXIF.getTag(this, "DateTime");
            
            // Priority: Original > Digitized > Modified
            const dateRaw = dateOriginal || dateDigitized || dateMod;

            const toDecimal = (coord: number[], ref: string) => {
              if (!coord || coord.length < 3) return "";
              let d = coord[0] + coord[1] / 60 + coord[2] / 3600;
              return (ref === 'S' || ref === 'W') ? -d : d;
            };

            if (lat && lon) {
              exifData.lat = toDecimal(lat, latRef);
              exifData.lon = toDecimal(lon, lonRef);
            }

            if (alt !== undefined && alt !== null) {
              exifData.alt = typeof alt === 'number' ? alt : parseFloat(alt);
            }

            if (dateRaw) {
              // Format "YYYY:MM:DD HH:MM:SS" to "YYYY-MM-DD HH:MM:SS"
              exifData.date = dateRaw.toString().replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
            }

            resolve({ data: base64, ...exifData });
          });
        } else {
          // Fallback if EXIF lib is missing
          console.warn("EXIF-js not found");
          resolve({ data: base64, ...exifData });
        }
      };

      img.onerror = () => reject("Image load error");
    };

    reader.onerror = () => reject("File read error");
    reader.readAsDataURL(file);
  });
};