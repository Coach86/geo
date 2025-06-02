import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { getUsers } from '../utils/api';
import { User } from '../utils/types';
import { EditPlanSettingsDialog } from '../components/EditPlanSettingsDialog';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isPlanSettingsOpen, setIsPlanSettingsOpen] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load users. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEditPlanSettings = (user: User) => {
    setSelectedUser(user);
    setIsPlanSettingsOpen(true);
  };

  const handlePlanSettingsUpdate = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const getPlanBadge = (user: User) => {
    if (!user.stripePlanId) {
      return <Chip label="Free" size="small" color="default" />;
    }
    return <Chip label="Pro" size="small" color="primary" />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading users...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1">
              Users
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage user accounts
            </Typography>
          </Box>
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              component={RouterLink}
              to="/users/new"
            >
              Add User
            </Button>
          </Box>
        </Box>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {users.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1">No users found.</Typography>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon />}
                component={RouterLink}
                to="/users/new"
                sx={{ mt: 2 }}
              >
                Add Your First User
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Brands</TableCell>
                    <TableCell>AI Models</TableCell>
                    <TableCell>Spontaneous Prompts</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          <Typography variant="body2">{user.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LanguageIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          <Chip 
                            label={user.language} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CreditCardIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          {getPlanBadge(user)}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<BusinessIcon />}
                          label={`${user.projectIds?.length || 0} / ${user.planSettings?.maxProjects || 1}`}
                          size="small"
                          color={
                            (user.projectIds?.length || 0) >= (user.planSettings?.maxProjects || 1) 
                              ? "warning" 
                              : "success"
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2">
                            {user.selectedModels?.length || 0} / {user.planSettings?.maxAIModels || 3}
                          </Typography>
                          {user.selectedModels?.length > 0 && (
                            <Chip
                              label={`${user.selectedModels.length} selected`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {user.planSettings?.maxSpontaneousPrompts || 12}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit Plan Settings">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditPlanSettings(user)}
                            color="primary"
                          >
                            <SettingsIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Plan Settings Dialog */}
      <EditPlanSettingsDialog
        open={isPlanSettingsOpen}
        onClose={() => setIsPlanSettingsOpen(false)}
        user={selectedUser}
        onUpdate={handlePlanSettingsUpdate}
      />
    </Container>
  );
};

export default UserList;