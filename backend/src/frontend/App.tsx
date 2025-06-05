import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import ProjectList from './pages/ProjectList';
import ProjectDetail from './pages/ProjectDetail';
import ProjectCreation from './pages/ProjectCreation';
import BatchResults from './pages/BatchResults';
import UserList from './pages/UserList';
import UserCreation from './pages/UserCreation';
import EmailPreview from './pages/email-preview';
import Config from './pages/Config';
import PlanManagement from './pages/PlanManagement';
import OrganizationSettings from './pages/OrganizationSettings';
import { ThemeProvider } from './utils/ThemeContext';
import { socketManager } from './utils/socket';
import { requestNotificationPermission } from './utils/notifications';

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

  // Initialize socket connection and notification permissions
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize socket connection (always required)
      try {
        await socketManager.connect();
        console.log('Socket connection established');
      } catch (error) {
        console.error('Failed to establish socket connection:', error);
      }

      // Request notification permission (optional, for batch completion alerts only)
      try {
        await requestNotificationPermission();
        console.log('Notification permission requested');
      } catch (error) {
        console.warn(
          'Notification permission not granted, browser notifications will be disabled:',
          error,
        );
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      socketManager.disconnect();
    };
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
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="projects" element={<ProjectList />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="projects/new" element={<ProjectCreation />} />
            <Route path="batch-results/:id" element={<BatchResults />} />
            <Route path="users" element={<UserList />} />
            <Route path="users/new" element={<UserCreation />} />
            <Route path="email-preview" element={<EmailPreview />} />
            <Route path="config" element={<Config />} />
            <Route path="plans" element={<PlanManagement />} />
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="*" element={<Navigate to="/projects" replace />} />
          </Route>
        </Routes>
      </Box>
    </ThemeProvider>
  );
};

export default App;
