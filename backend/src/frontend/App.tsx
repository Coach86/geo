import React from 'react';
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

const App: React.FC = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
  );
};

export default App;