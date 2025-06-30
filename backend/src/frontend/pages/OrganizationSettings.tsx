import React, { useState, useEffect } from 'react';
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
  Alert,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Stack,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import EmailIcon from '@mui/icons-material/Email';
import FolderIcon from '@mui/icons-material/Folder';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import FilterListIcon from '@mui/icons-material/FilterList';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getAllOrganizations,
  getOrganization,
  getOrganizationUsers,
  createOrganizationUser,
  deleteOrganizationUser,
  updateOrganization,
  updateOrganizationPlanSettings,
  deleteOrganization,
} from '../utils/api-organization';
import { EditOrganizationPlanDialog } from '../components/EditOrganizationPlanDialog';

interface User {
  id: string;
  email: string;
  language: string;
  phoneNumber?: string;
  createdAt: string;
  projectIds?: string[];
}

interface Organization {
  id: string;
  name?: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts: number;
    maxUrls: number;
    maxUsers: number;
    maxCompetitors?: number;
  };
  selectedModels: string[];
  currentUsers?: number;
  currentProjects?: number;
  projects?: Array<{ id: string; brandName: string }>;
  createdAt: string;
  updatedAt: string;
}

const OrganizationSettings: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPlanSettingsOpen, setIsPlanSettingsOpen] = useState(false);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', language: 'en', phoneNumber: '' });
  const [magicLinkDialog, setMagicLinkDialog] = useState({
    open: false,
    loading: false,
    magicLink: '',
    reason: '',
  });
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get filter from URL parameters
  const urlParams = new URLSearchParams(location.search);
  const filterOrgId = urlParams.get('filter');

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    if (selectedOrganization) {
      loadOrganizationUsers(selectedOrganization.id);
    }
  }, [selectedOrganization]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgsData = await getAllOrganizations(true); // Include projects
      // Sort organizations by createdAt (newest to oldest)
      const sortedOrgs = orgsData.sort((a: Organization, b: Organization) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrganizations(sortedOrgs);

      // If filter is provided, select that organization
      if (filterOrgId) {
        const filteredOrg = sortedOrgs.find((org: Organization) => org.id === filterOrgId);
        if (filteredOrg) {
          setSelectedOrganization(filteredOrg);
        }
      } else if (sortedOrgs.length > 0 && !selectedOrganization) {
        // Select first organization by default if none selected
        setSelectedOrganization(sortedOrgs[0]);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError('Failed to load organizations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationUsers = async (orgId: string) => {
    try {
      const usersData = await getOrganizationUsers(orgId);
      // Sort users by createdAt (newest to oldest)
      const sortedUsers = usersData.sort((a: User, b: User) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setUsers(sortedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    }
  };

  const handleSelectOrganization = async (org: Organization) => {
    setSelectedOrganization(org);
    await loadOrganizationUsers(org.id);
  };

  const handleCreateOrganization = async () => {
    try {
      // Note: You'll need to add createOrganization to api-organization.ts
      const response = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to create organization');
      }

      const newOrg = await response.json();
      setIsCreateOrgOpen(false);
      await loadOrganizations();
      setSelectedOrganization(newOrg);
    } catch (err: any) {
      alert(err.message || 'Failed to create organization');
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !selectedOrganization) {
      alert('Please enter an email address');
      return;
    }

    try {
      const createdUser = await createOrganizationUser({
        email: newUser.email,
        language: newUser.language,
        phoneNumber: newUser.phoneNumber || undefined,
        organizationId: selectedOrganization.id,
      });
      setUsers([...users, createdUser]);
      setIsAddUserOpen(false);
      setNewUser({ email: '', language: 'en', phoneNumber: '' });

      // Reload organization to update user count
      await loadOrganizations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      await deleteOrganizationUser(userId);
      setUsers(users.filter(u => u.id !== userId));

      // Reload organizations to update user count
      await loadOrganizations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove user');
    }
  };

  const handleGenerateMagicLink = async () => {
    if (!selectedOrganization) return;
    
    setMagicLinkDialog(prev => ({ ...prev, loading: true }));
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/organizations/${selectedOrganization.id}/magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: magicLinkDialog.reason || undefined,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate magic link');
      }
      
      const data = await response.json();
      setMagicLinkDialog(prev => ({ 
        ...prev, 
        loading: false,
        magicLink: data.magicLink 
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to generate magic link');
      setMagicLinkDialog(prev => ({ ...prev, loading: false }));
    }
  };
  
  const handleCopyMagicLink = () => {
    if (magicLinkDialog.magicLink) {
      navigator.clipboard.writeText(magicLinkDialog.magicLink);
    }
  };
  
  const handleCloseMagicLinkDialog = () => {
    setMagicLinkDialog({
      open: false,
      loading: false,
      magicLink: '',
      reason: '',
    });
  };

  const handleDeleteOrganization = async (orgId: string) => {
    if (!window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    // Double confirmation for safety
    if (!window.confirm('This will permanently delete the organization. Are you absolutely sure?')) {
      return;
    }

    try {
      await deleteOrganization(orgId);
      
      // Clear selected organization if it was the one deleted
      if (selectedOrganization?.id === orgId) {
        setSelectedOrganization(null);
      }
      
      // Reload organizations
      await loadOrganizations();
      
      alert('Organization deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete organization');
    }
  };


  const canAddMoreUsers = () => {
    if (!selectedOrganization) return false;
    return selectedOrganization.planSettings.maxUsers === -1 ||
           (selectedOrganization.currentUsers || 0) < selectedOrganization.planSettings.maxUsers;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600, mb: 4 }}>
          Organization Management
        </Typography>

        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
          {/* Organizations List */}
          <Box sx={{ flex: '0 0 400px', maxWidth: { xs: '100%', md: '400px' } }}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="h6">Organizations</Typography>
                    <Badge badgeContent={organizations.length} color="primary">
                      <BusinessIcon />
                    </Badge>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreateOrgOpen(true)}
                    variant="outlined"
                  >
                    New
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <List sx={{ maxHeight: '600px', overflow: 'auto' }}>
                  {organizations.map((org) => (
                    <ListItem key={org.id} disablePadding sx={{ mb: 1 }}>
                      <ListItemButton
                        selected={selectedOrganization?.id === org.id}
                        onClick={() => handleSelectOrganization(org)}
                        sx={{
                          borderRadius: 1,
                          '&.Mui-selected': {
                            backgroundColor: 'action.selected',
                          },
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box>
                              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                                {org.id}
                              </Typography>
                              {org.projects && org.projects.length > 0 && (
                                <Typography variant="body1" sx={{ mt: 0.5 }}>
                                  {org.projects.map(p => p.brandName).join(', ')}
                                </Typography>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box component="span" display="flex" gap={1} mt={0.5}>
                              <Chip
                                size="small"
                                icon={<PeopleIcon />}
                                label={`${org.currentUsers || 0} users`}
                              />
                              <Chip
                                size="small"
                                icon={<FolderIcon />}
                                label={`${org.currentProjects || 0} projects`}
                              />
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Box>

          {/* Organization Details */}
          <Box sx={{ flex: 1 }}>
            {selectedOrganization ? (
              <Stack spacing={3}>
                {/* Organization Info */}
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center">
                        <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Organization Details</Typography>
                      </Box>
                      <Box display="flex" gap={1}>
                        <Button
                          startIcon={<LinkIcon />}
                          onClick={() => setMagicLinkDialog({ ...magicLinkDialog, open: true })}
                          variant="outlined"
                          size="small"
                        >
                          Generate Magic Link
                        </Button>
                        <Button
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteOrganization(selectedOrganization.id)}
                          variant="outlined"
                          color="error"
                          size="small"
                          disabled={users.length > 0}
                        >
                          Delete Organization
                        </Button>
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Organization ID
                        </Typography>
                        <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {selectedOrganization.id}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Created
                        </Typography>
                        <Typography variant="body1">
                          {new Date(selectedOrganization.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    {users.length > 0 && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Organization cannot be deleted while it has active users. Please remove all users first.
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Plan Settings */}
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center">
                        <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Org Settings</Typography>
                      </Box>
                      <Button
                        startIcon={<EditIcon />}
                        onClick={() => setIsPlanSettingsOpen(true)}
                        variant="outlined"
                        size="small"
                      >
                        Edit Settings
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'space-around' }}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Box sx={{ position: 'relative', display: 'inline-block' }}>
                          <FolderIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                          <Tooltip title="View projects for this organization">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/projects?organizationId=${selectedOrganization.id}`)}
                              sx={{
                                position: 'absolute',
                                top: -8,
                                right: -12,
                                backgroundColor: 'background.paper',
                                boxShadow: 1,
                                width: 24,
                                height: 24,
                                '&:hover': {
                                  backgroundColor: 'primary.light',
                                  color: 'primary.contrastText',
                                },
                              }}
                            >
                              <FilterListIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                          {selectedOrganization.currentProjects || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          of {selectedOrganization.planSettings.maxProjects === -1 ? '∞' : selectedOrganization.planSettings.maxProjects} projects
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                          {selectedOrganization.currentUsers || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          of {selectedOrganization.planSettings.maxUsers === -1 ? '∞' : selectedOrganization.planSettings.maxUsers} users
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <ModelTrainingIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                          {selectedOrganization.selectedModels.length}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          of {selectedOrganization.planSettings.maxAIModels === -1 ? '∞' : selectedOrganization.planSettings.maxAIModels} AI models
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Users */}
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center">
                        <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Users</Typography>
                      </Box>
                      <Button
                        startIcon={<AddIcon />}
                        onClick={() => setIsAddUserOpen(true)}
                        variant="contained"
                        size="small"
                        disabled={!canAddMoreUsers()}
                      >
                        Add User
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {users.length === 0 ? (
                      <Typography color="text.secondary">No users in this organization yet.</Typography>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Email</TableCell>
                              <TableCell>Language</TableCell>
                              <TableCell>Phone</TableCell>
                              <TableCell>Projects</TableCell>
                              <TableCell>Created</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {users.map((user) => (
                              <TableRow key={user.id}>
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    <EmailIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                                    {user.email}
                                  </Box>
                                </TableCell>
                                <TableCell>{user.language}</TableCell>
                                <TableCell>{user.phoneNumber || '-'}</TableCell>
                                <TableCell>{user.projectIds?.length || 0}</TableCell>
                                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
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

                {/* Projects */}
                <Card>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box display="flex" alignItems="center">
                        <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
                        <Typography variant="h6">Projects</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {!selectedOrganization.projects || selectedOrganization.projects.length === 0 ? (
                      <Typography color="text.secondary">No projects in this organization yet.</Typography>
                    ) : (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>Brand Name</TableCell>
                              <TableCell>Project ID</TableCell>
                              <TableCell align="right">Actions</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedOrganization.projects.map((project) => (
                              <TableRow 
                                key={project.id}
                                hover
                                sx={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/projects/${project.id}`)}
                              >
                                <TableCell>
                                  <Box display="flex" alignItems="center">
                                    <FolderIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                                    {project.brandName}
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                    {project.id}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Tooltip title="View Project">
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/projects/${project.id}`);
                                      }}
                                      color="primary"
                                    >
                                      <EditIcon />
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
              </Stack>
            ) : (
              <Card>
                <CardContent>
                  <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="400px">
                    <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      Select an organization to view details
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>

        {/* Create Organization Dialog */}
        <Dialog open={isCreateOrgOpen} onClose={() => setIsCreateOrgOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Organization</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Click Create to generate a new organization with default settings.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsCreateOrgOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrganization} variant="contained">Create</Button>
          </DialogActions>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New User</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Language</InputLabel>
              <Select
                value={newUser.language}
                label="Language"
                onChange={(e) => setNewUser({ ...newUser, language: e.target.value })}
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
              value={newUser.phoneNumber}
              onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser} variant="contained">Add User</Button>
          </DialogActions>
        </Dialog>


        {/* Edit Plan Settings Dialog */}
        {selectedOrganization && (
          <EditOrganizationPlanDialog
            open={isPlanSettingsOpen}
            onClose={() => setIsPlanSettingsOpen(false)}
            organization={selectedOrganization}
            onUpdate={() => loadOrganizations()}
          />
        )}
        
        {/* Magic Link Dialog */}
        <Dialog 
          open={magicLinkDialog.open} 
          onClose={handleCloseMagicLinkDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Generate Magic Link - {selectedOrganization?.name || selectedOrganization?.id}
          </DialogTitle>
          <DialogContent>
            {!magicLinkDialog.magicLink ? (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Generate a temporary access link to log into this organization.
                </Alert>
                <TextField
                  fullWidth
                  label="Reason (optional)"
                  placeholder="Why are you accessing this organization?"
                  value={magicLinkDialog.reason}
                  onChange={(e) => setMagicLinkDialog(prev => ({ ...prev, reason: e.target.value }))}
                  multiline
                  rows={2}
                />
              </>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  Magic link generated successfully!
                </Alert>
                <TextField
                  fullWidth
                  label="Magic Link"
                  value={magicLinkDialog.magicLink}
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <IconButton onClick={handleCopyMagicLink}>
                        <ContentCopyIcon />
                      </IconButton>
                    ),
                  }}
                  sx={{ fontFamily: 'monospace' }}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseMagicLinkDialog}>
              {magicLinkDialog.magicLink ? 'Close' : 'Cancel'}
            </Button>
            {!magicLinkDialog.magicLink && (
              <Button 
                onClick={handleGenerateMagicLink} 
                variant="contained"
                disabled={magicLinkDialog.loading}
              >
                {magicLinkDialog.loading ? 'Generating...' : 'Generate Link'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default OrganizationSettings;
