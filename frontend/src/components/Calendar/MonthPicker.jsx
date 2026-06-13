import React, { useState } from 'react';
import { getYear, getMonth } from 'date-fns';

const MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const STATO_COLORS = {
  in_validazione:     '#f59e0b',
  approvato:          '#22c55e',
  non_approvato:      '#ef4444',
  in_attesa_conferma: '#f59e0b',
};

export default function MonthPicker({ current, monthStati = {}, onSelect, onClose }) {
  const [year, setYear] = useState(getYear(current));

  const handleSelect = (monthIndex) => {
    onSelect(new Date(year, monthIndex, 1));
  };

  return (
    <div className="month-picker-overlay" onClick={onClose}>
      <div className="month-picker" onClick={e => e.stopPropagation()}>
        <div className="month-picker-header">
          <button onClick={() => setYear(y => y - 1)}>&#8249;</button>
          <span>{year}</span>
          <button onClick={() => setYear(y => y + 1)}>&#8250;</button>
        </div>
        <div className="month-picker-grid">
          {MONTHS.map((m, i) => {
            const key = `${year}-${String(i + 1).padStart(2, '0')}`;
            const stati = monthStati[key] || [];
            const isActive = i === getMonth(current) && year === getYear(current);
            return (
              <button
                key={i}
                className={isActive ? 'active' : ''}
                onClick={() => handleSelect(i)}
              >
                <span>{m}</span>
                <div className="month-stati">
                  {stati.map(s => (
                    <span
                      key={s}
                      className="month-stato-line"
                      style={{ backgroundColor: STATO_COLORS[s] }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
