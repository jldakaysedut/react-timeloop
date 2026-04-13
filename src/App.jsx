import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import UserDashboard from './pages/user/UserDashboard'; // IMPORT MO ITO

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PALITAN NATIN ITO TEMPORARILY PARA MAKITA MO AGAD YUNG DASHBOARD */}
        <Route path="/" element={<UserDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}