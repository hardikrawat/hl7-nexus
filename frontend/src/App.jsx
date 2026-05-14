import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HelixAppWithErrorBoundary from './HelixApp.jsx';
import LoginPage from './pages/LoginPage.jsx';
import { useAuthStore } from './store/authStore';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <HelixAppWithErrorBoundary />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
