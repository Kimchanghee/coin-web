import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminPage from './pages/AdminPage';
import SubscriptionPage from './pages/SubscriptionPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import { ArbitragePage, CurrencyCalculatorPage, PremiumGuidePage } from './pages/FeaturePage';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/" element={<HomePage />} />
                <Route path="/premium" element={<SubscriptionPage />} />
                <Route path="/arbitrage" element={<ArbitragePage />} />
                <Route path="/currency-calculator" element={<CurrencyCalculatorPage />} />
                <Route path="/premium-guide" element={<PremiumGuidePage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/admin" element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                } />
                <Route path="/subscribe" element={
                  <ProtectedRoute>
                    <SubscriptionPage />
                  </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
