import React from 'react';
import Calendar from '../components/Calendar/Calendar';

export default function Dashboard() {
  return (
    <div className="page">
      <h1>Le mie Prenotazioni</h1>
      <Calendar />
    </div>
  );
}
