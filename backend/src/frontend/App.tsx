import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import CompanyList from './pages/CompanyList';
import CompanyDetail from './pages/CompanyDetail';
import CompanyCreation from './pages/CompanyCreation';
import BatchResults from './pages/BatchResults';
import UserList from './pages/UserList';
import UserCreation from './pages/UserCreation';
import EmailPreview from './pages/email-preview';
import Config from './pages/Config';
import { ThemeProvider } from './utils/ThemeContext';

const App: React.FC = () => {
  // Load Public Sans font
  useEffect(() => {
    // Check if the Public Sans font link already exists
    const existingLink = document.querySelector('link[href*="Public+Sans"]');

    if (!existingLink) {
      // Create a new link element for Public Sans font
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap';

      // Append it to the head
      document.head.appendChild(link);
    }
  }, []);

  return (
    <ThemeProvider>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/companies" replace />} />
            <Route path="companies" element={<CompanyList />} />
            <Route path="companies/:id" element={<CompanyDetail />} />
            <Route path="companies/new" element={<CompanyCreation />} />
            <Route path="batch-results/:id" element={<BatchResults />} />
            <Route path="users" element={<UserList />} />
            <Route path="users/new" element={<UserCreation />} />
            <Route path="email-preview" element={<EmailPreview />} />
            <Route path="config" element={<Config />} />
            <Route path="*" element={<Navigate to="/companies" replace />} />
          </Route>
        </Routes>
      </Box>
    </ThemeProvider>
  );
};

export default App;
