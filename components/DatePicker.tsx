import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { Calendar } from './Calendar';
import { cn } from '../utils/classNames';

interface DatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  selectedDate, 
  onChange,
  className,
  placeholder = "Select Date"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (date: Date) => {
    onChange(date);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  // Format: yyyy/MM/dd (eee) using enUS locale
  const formattedValue = selectedDate 
    ? format(selectedDate, 'yyyy/MM/dd (eee)', { locale: enUS }) 
    : "";

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative group">
        <input
          type="text"
          readOnly
          value={formattedValue}
          onClick={toggleOpen}
          placeholder={placeholder}
          className={cn(
            "w-full h-12 pl-4 pr-12 rounded-lg border bg-white text-lg text-slate-800 shadow-sm outline-none transition-all placeholder-slate-300 cursor-pointer",
            isOpen ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-200 hover:border-slate-400"
          )}
        />
          
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedDate && (
            <button 
              onClick={handleClear}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              aria-label="Clear"
              type="button"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleOpen();
            }}
            className={cn(
              "p-1.5 rounded-full transition-colors hover:bg-slate-100",
              isOpen ? "text-blue-500 bg-blue-50" : "text-slate-500"
            )}
            aria-label="Open Calendar"
          >
            <CalendarIcon size={20} />
          </button>
        </div>

        {/* Popover */}
        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 z-50 animate-in fade-in zoom-in-95 duration-200">
            <Calendar 
              selected={selectedDate} 
              onSelect={handleSelect} 
            />
          </div>
        )}
      </div>
    </div>
  );
};