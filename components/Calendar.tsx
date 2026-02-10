import React, { useState, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  endOfMonth, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay, 
  isToday 
} from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils/classNames';

// Helpers to replace missing named exports
const startOfMonth = (date: Date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

interface CalendarProps {
  selected?: Date | null;
  onSelect: (date: Date) => void;
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ selected, onSelect, className }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Reset calendar view when selected date changes significantly
  useEffect(() => {
    if (selected) {
      setCurrentMonth(selected);
    }
  }, [selected]);

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(addMonths(currentMonth, -1));
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4 px-2">
        <button
          onClick={prevMonth}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="font-bold text-slate-800 text-lg">
          {format(currentMonth, 'MMMM yyyy', { locale: enUS })}
        </div>
        <button
          onClick={nextMonth}
          className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Render weekday headers
    const headers = weekdays.map((day, index) => (
      <div 
        key={day} 
        className={cn(
          "text-xs font-medium text-center py-2",
          index === 0 ? "text-red-500" : index === 6 ? "text-blue-500" : "text-slate-500"
        )}
      >
        {day}
      </div>
    ));

    // Calculate grid days
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let daysInRow = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isSelected = selected ? isSameDay(day, selected) : false;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isCurrentDay = isToday(day);

        daysInRow.push(
          <button
            key={day.toString()}
            onClick={(e) => {
                e.preventDefault(); // Prevent form submission
                onSelect(cloneDay);
            }}
            type="button"
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 mx-auto",
              !isCurrentMonth && "text-slate-300",
              isCurrentMonth && !isSelected && "text-slate-700 hover:bg-slate-100",
              isSelected && "bg-blue-600 text-white shadow-md hover:bg-blue-700 font-semibold",
              !isSelected && isCurrentDay && "bg-blue-50 text-blue-600 font-bold border border-blue-200"
            )}
          >
            {format(day, 'd')}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-y-2 mb-1" key={day.toString()}>
          {daysInRow}
        </div>
      );
      daysInRow = [];
    }

    return (
      <div>
        <div className="grid grid-cols-7 mb-2 border-b border-slate-100 pb-2">{headers}</div>
        {rows}
      </div>
    );
  };

  return (
    <div className={cn("bg-white p-4 rounded-xl shadow-xl border border-slate-200 w-[320px]", className)}>
      {renderHeader()}
      {renderDays()}
    </div>
  );
};