import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicGenerator from './pages/PublicGenerator';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import RedirectPage from './pages/RedirectPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicGenerator />} />
      <Route path="/r/:id" element={<RedirectPage />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
    </Routes>
  );
}
