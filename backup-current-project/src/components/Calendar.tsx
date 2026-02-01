import React, { useState } from 'react';

interface CalendarProps {
  onDateSelect?: (date: Date) => void;
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getDayNames = () => {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    onDateSelect?.(date);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="calendar-container">
      <style>{`
        .calendar-container {
          background: var(--dk-dark-bg);
          border-radius: 12px;
          padding: 1.5rem;
          color: var(--dk-gray-300);
          font-family: 'Inter', sans-serif;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .calendar-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--dk-gray-200);
        }

        .calendar-controls {
          display: flex;
          gap: 0.5rem;
        }

        .calendar-btn {
          background: var(--dk-gray-700);
          border: none;
          color: var(--dk-gray-300);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .calendar-btn:hover {
          background: var(--dk-gray-600);
          color: var(--dk-gray-200);
        }

        .calendar-btn:active {
          transform: scale(0.95);
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
        }

        .calendar-day-header {
          text-align: center;
          font-weight: 600;
          color: var(--dk-gray-400);
          padding: 0.5rem;
          font-size: 0.875rem;
        }

        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
        }

        .calendar-day:hover {
          background: var(--dk-gray-700);
          color: var(--dk-gray-200);
        }

        .calendar-day.today {
          background: var(--dk-gray-600);
          color: var(--dk-gray-200);
          font-weight: 600;
        }

        .calendar-day.selected {
          background: #0d6efd;
          color: white;
          font-weight: 600;
        }

        .calendar-day.selected:hover {
          background: #0b5ed7;
        }

        .calendar-day.other-month {
          color: var(--dk-gray-500);
          opacity: 0.5;
        }

        .calendar-day.has-event::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: #dc3545;
          border-radius: 50%;
        }

        .calendar-events {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--dk-gray-600);
        }

        .calendar-events-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--dk-gray-200);
          margin-bottom: 1rem;
        }

        .calendar-event {
          background: var(--dk-gray-700);
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          border-left: 3px solid #0d6efd;
        }

        .calendar-event-title {
          font-weight: 500;
          color: var(--dk-gray-200);
          margin-bottom: 0.25rem;
        }

        .calendar-event-time {
          font-size: 0.875rem;
          color: var(--dk-gray-400);
        }

        @media (max-width: 768px) {
          .calendar-container {
            padding: 1rem;
          }
          
          .calendar-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          
          .calendar-controls {
            justify-content: center;
          }
        }
      `}</style>

      <div className="calendar-header">
        <h2 className="calendar-title">{getMonthName(currentDate)}</h2>
        <div className="calendar-controls">
          <button className="calendar-btn" onClick={goToPreviousMonth}>
            ←
          </button>
          <button className="calendar-btn" onClick={goToToday}>
            Today
          </button>
          <button className="calendar-btn" onClick={goToNextMonth}>
            →
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {getDayNames().map(day => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        
        {days.map((day, index) => (
          <div
            key={index}
            className={`calendar-day ${
              day ? (isToday(day) ? 'today' : '') : 'other-month'
            } ${
              day && isSelected(day) ? 'selected' : ''
            } ${
              day && day.getDate() === 15 ? 'has-event' : ''
            }`}
            onClick={() => day && handleDateClick(day)}
          >
            {day ? day.getDate() : ''}
          </div>
        ))}
      </div>

      {selectedDate && (
        <div className="calendar-events">
          <h3 className="calendar-events-title">Events for {selectedDate.toLocaleDateString()}</h3>
          <div className="calendar-event">
            <div className="calendar-event-title">Study Session</div>
            <div className="calendar-event-time">10:00 AM - 12:00 PM</div>
          </div>
          <div className="calendar-event">
            <div className="calendar-event-title">Project Review</div>
            <div className="calendar-event-time">2:00 PM - 3:30 PM</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar; 