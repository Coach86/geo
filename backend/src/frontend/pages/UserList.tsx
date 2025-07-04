import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Link,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneIcon from '@mui/icons-material/Phone';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { getUsers, deleteUser, updateUser } from '../utils/api';
import { getAllOrganizations } from '../utils/api-organization';
import { User } from '../utils/types';

interface Organization {
  id: string;
  createdAt: string;
}

const UserList: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    email: '',
    language: '',
    phoneNumber: '',
    organizationId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Filter users based on search term
  useEffect(() => {
    if (userSearchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const searchLower = userSearchTerm.toLowerCase();
      const filtered = users.filter(user => 
        user.email.toLowerCase().includes(searchLower)
      );
      setFilteredUsers(filtered);
    }
  }, [userSearchTerm, users]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, orgsData] = await Promise.all([
        getUsers(),
        getAllOrganizations(),
      ]);
      // Sort users by createdAt (newest to oldest)
      const sortedUsers = usersData.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
      // Sort organizations by createdAt (newest to oldest)
      const sortedOrgs = orgsData.sort((a: Organization, b: Organization) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrganizations(sortedOrgs);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      setFilteredUsers(filteredUsers.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      language: user.language,
      phoneNumber: user.phoneNumber || '',
      organizationId: user.organizationId || '',
    });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingUser) return;

    try {
      const updatedUser = await updateUser(editingUser.id, {
        email: editFormData.email,
        language: editFormData.language,
        phoneNumber: editFormData.phoneNumber || undefined,
        organizationId: editFormData.organizationId,
      });
      
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      setFilteredUsers(filteredUsers.map(u => u.id === editingUser.id ? updatedUser : u));
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      console.error('Failed to update user:', err);
      alert(err.response?.data?.message || 'Failed to update user. Please try again.');
    }
  };

  const getOrganizationId = (orgId: string | undefined) => {
    if (!orgId) return '-';
    return orgId;
  };

  const handleOrganizationClick = (organizationId: string) => {
    navigate(`/organization?filter=${organizationId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
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
              Manage all user accounts across organizations
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
        <CardContent>
          {/* Search Bar */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search users by email..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: userSearchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setUserSearchTerm('')}
                    >
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
        
        <CardContent sx={{ p: 0 }}>
          {filteredUsers.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1">
                {userSearchTerm ? 'No users found matching your search.' : 'No users found.'}
              </Typography>
              {!userSearchTerm && (
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
              )}
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Organization</TableCell>
                    <TableCell>Language</TableCell>
                    <TableCell>Phone Number</TableCell>
                    <TableCell>Projects</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          <Typography variant="body2">{user.email}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <BusinessIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          {user.organizationId ? (
                            <Link
                              component="button"
                              variant="body2"
                              onClick={() => handleOrganizationClick(user.organizationId!)}
                              sx={{
                                textDecoration: 'none',
                                color: 'primary.main',
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              {getOrganizationId(user.organizationId)}
                            </Link>
                          ) : (
                            <Typography variant="body2">-</Typography>
                          )}
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
                          {user.phoneNumber && (
                            <PhoneIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                          )}
                          <Typography variant="body2">{user.phoneNumber || '-'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${user.projectIds?.length || 0} projects`}
                          size="small"
                          color="default"
                        />
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit User">
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(user)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete User">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteUser(user.id)}
                            color="error"
                          >
                            <DeleteIcon />
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

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={editFormData.email}
            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            margin="normal"
            required
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>Organization</InputLabel>
            <Select
              value={editFormData.organizationId}
              label="Organization"
              onChange={(e) => setEditFormData({ ...editFormData, organizationId: e.target.value })}
            >
              <MenuItem value="">
                <em>No Organization</em>
              </MenuItem>
              {organizations.map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Language</InputLabel>
            <Select
              value={editFormData.language}
              label="Language"
              onChange={(e) => setEditFormData({ ...editFormData, language: e.target.value })}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="es">Spanish</MenuItem>
              <MenuItem value="fr">French</MenuItem>
              <MenuItem value="de">German</MenuItem>
              <MenuItem value="it">Italian</MenuItem>
              <MenuItem value="pt">Portuguese</MenuItem>
              <MenuItem value="nl">Dutch</MenuItem>
              <MenuItem value="pl">Polish</MenuItem>
              <MenuItem value="ja">Japanese</MenuItem>
              <MenuItem value="ko">Korean</MenuItem>
              <MenuItem value="zh">Chinese</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Phone Number (optional)"
            value={editFormData.phoneNumber}
            onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UserList;