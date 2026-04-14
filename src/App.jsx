import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// ─── IMPORTS ───
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import UserDashboard from './pages/user/UserDashboard';
import MyVaults from './pages/user/MyVaults';
import VaultForm from './pages/utilities/VaultForm'; 
import ViewVault from './pages/user/ViewVault'; 

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ─── PUBLIC ROUTES ─── */}
        {/* Ito na ang bubuksan ng Vercel link mo by default */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* ─── USER PROTECTED ROUTES ─── */}
        <Route path="/dashboard" element={<UserDashboard />} />
        <Route path="/my-vaults" element={<MyVaults />} />
        <Route path="/seal-vault" element={<VaultForm />} />
        <Route path="/vault/:id" element={<ViewVault />} />
      </Routes>
    </BrowserRouter>
  );
}