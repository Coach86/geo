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
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Link,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getOrganization,
  getOrganizationUsers,
  createOrganizationUser,
  deleteOrganizationUser,
  updateOrganization,
  updateOrganizationPlanSettings,
  deleteOrganization,
} from '../utils/api-organization';
import { EditOrganizationPlanDialog } from '../components/EditOrganizationPlanDialog';
import { getShortRefreshSchedule } from '../utils/refresh-schedule';

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
  stripePlanId?: string;
  stripeSubscriptionId?: string;
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

const OrganizationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPlanSettingsOpen, setIsPlanSettingsOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', language: 'en', phoneNumber: '' });
  const [magicLinkDialog, setMagicLinkDialog] = useState({
    open: false,
    loading: false,
    magicLink: '',
    reason: '',
  });
  const [planName, setPlanName] = useState<string | null>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [projects, setProjects] = useState<Array<{ id: string; brandName: string; createdAt: string }>>([]);

  useEffect(() => {
    if (id) {
      loadOrganization();
    }
  }, [id]);

  useEffect(() => {
    if (organization) {
      loadOrganizationUsers();
      loadOrganizationProjects();
      // Fetch plan data if stripePlanId exists
      if (organization.stripePlanId) {
        fetchPlanData(organization.stripePlanId);
      }
    }
  }, [organization]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const orgData = await getOrganization(id!);
      setOrganization(orgData);
    } catch (err) {
      console.error('Failed to load organization:', err);
      setError('Failed to load organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationUsers = async () => {
    try {
      const response = await getOrganizationUsers(id!);
      // Handle both paginated and non-paginated responses
      const usersData = response.data || response;
      const usersList = Array.isArray(usersData) ? usersData : [];
      
      // Sort users by createdAt (newest to oldest)
      const sortedUsers = usersList.sort((a: User, b: User) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setUsers(sortedUsers);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users. Please try again.');
    }
  };

  const fetchPlanData = async (planId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/plans/${planId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlanData(data);
        setPlanName(data.name);
      } else {
        console.error('Failed to fetch plan data, status:', response.status);
        setPlanName('Unknown Plan');
      }
    } catch (err) {
      console.error('Error fetching plan data:', err);
      setPlanName('Unknown Plan');
    }
  };

  const loadOrganizationProjects = async () => {
    try {
      // Create a custom API call with organizationId as query parameter
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/project?organizationId=${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Projects API response:', data);
        // Handle paginated response
        if (data && data.data && Array.isArray(data.data)) {
          setProjects(data.data);
          console.log('Projects set to state:', data.data);
        } else if (Array.isArray(data)) {
          // Handle non-paginated response (backward compatibility)
          setProjects(data);
          console.log('Projects set to state:', data);
        } else {
          console.log('Unexpected response format:', data);
        }
      } else {
        console.error('Failed to fetch projects, status:', response.status);
      }
    } catch (err) {
      console.error('Failed to load organization projects:', err);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !organization) {
      alert('Please enter an email address');
      return;
    }

    try {
      const createdUser = await createOrganizationUser({
        email: newUser.email,
        language: newUser.language,
        phoneNumber: newUser.phoneNumber || undefined,
        organizationId: organization.id,
      });
      setUsers([...users, createdUser]);
      setIsAddUserOpen(false);
      setNewUser({ email: '', language: 'en', phoneNumber: '' });

      // Reload organization to update user count
      await loadOrganization();
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

      // Reload organization to update user count
      await loadOrganization();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove user');
    }
  };

  const handleGenerateMagicLink = async () => {
    if (!organization) return;
    
    setMagicLinkDialog(prev => ({ ...prev, loading: true }));
    
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/admin/organizations/${organization.id}/magic-link`, {
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

  const handleDeleteOrganization = async () => {
    if (!organization) return;

    if (!window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    // Double confirmation for safety
    if (!window.confirm('This will permanently delete the organization. Are you absolutely sure?')) {
      return;
    }

    try {
      await deleteOrganization(organization.id);
      navigate('/organization');
      alert('Organization deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete organization');
    }
  };

  const canAddMoreUsers = () => {
    if (!organization) return false;
    return organization.planSettings.maxUsers === -1 ||
           (organization.currentUsers || 0) < organization.planSettings.maxUsers;
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

  if (!organization) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>Organization not found</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton onClick={() => navigate('/organization')} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Organization Details
          </Typography>
        </Box>

        <Stack spacing={3}>
          {/* Organization Info */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Organization Information</Typography>
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
                    onClick={handleDeleteOrganization}
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
                    {organization.id}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Created
                  </Typography>
                  <Typography variant="body1">
                    {new Date(organization.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                {organization.stripePlanId && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Stripe Plan
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {organization.stripePlanId}
                      </Typography>
                      {planName && (
                        <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                          {planName}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
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
                  <Typography variant="h6">Plan Settings</Typography>
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
                        onClick={() => navigate(`/projects?organizationId=${organization.id}`)}
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
                    {organization.currentProjects || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {organization.planSettings.maxProjects === -1 ? '∞' : organization.planSettings.maxProjects} projects
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {organization.currentUsers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {organization.planSettings.maxUsers === -1 ? '∞' : organization.planSettings.maxUsers} users
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <ModelTrainingIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {organization.selectedModels.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {organization.planSettings.maxAIModels === -1 ? '∞' : organization.planSettings.maxAIModels} AI models
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

              {projects.length === 0 ? (
                <Typography color="text.secondary">No projects in this organization yet.</Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Brand Name</TableCell>
                        <TableCell>Project ID</TableCell>
                        <TableCell>Auto Refresh</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {projects.map((project) => (
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
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                              {(() => {
                                const schedule = getShortRefreshSchedule(
                                  planName,
                                  planData?.refreshFrequency,
                                  project.createdAt,
                                  !!organization.stripeSubscriptionId
                                );
                                return schedule === 'None' ? '-' : schedule;
                              })()}
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
        {organization && (
          <EditOrganizationPlanDialog
            open={isPlanSettingsOpen}
            onClose={() => setIsPlanSettingsOpen(false)}
            organization={organization}
            onUpdate={() => loadOrganization()}
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
            Generate Magic Link - {organization?.name || organization?.id}
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

export default OrganizationDetails;