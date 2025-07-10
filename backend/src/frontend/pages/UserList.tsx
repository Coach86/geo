import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
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
  SelectChangeEvent,
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
import { getUsers, deleteUser, updateUser, PaginatedResponse } from '../utils/api';
import { getAllOrganizations } from '../utils/api-organization';
import { User } from '../utils/types';
import Pagination from '../components/shared/Pagination';
import { usePagination } from '../hooks/usePagination';

interface Organization {
  id: string;
  createdAt: string;
}


const UserList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [usersData, setUsersData] = useState<PaginatedResponse<User> | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const isInitialMount = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    email: '',
    language: '',
    phoneNumber: '',
    organizationId: '',
  });
  const [localSearch, setLocalSearch] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Use pagination hook
  const pagination = usePagination();

  // Initialize local search with pagination search and organization filter from URL
  useEffect(() => {
    setLocalSearch(pagination.search);
    const orgId = searchParams.get('organizationId');
    if (orgId) {
      setOrganizationFilter(orgId);
    }
  }, [pagination.search, searchParams]);

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.limit, pagination.search, organizationFilter]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      // Only show loading on initial mount
      if (isInitialMount.current) {
        setLoading(true);
      } else {
        setDataLoading(true);
      }
      
      // Build query parameters
      const queryParams = {
        ...pagination.queryParams,
      };
      
      // Add organization filter if present
      if (organizationFilter) {
        (queryParams as any).organizationId = organizationFilter;
      }

      const [userData, orgsData] = await Promise.all([
        getUsers(queryParams),
        getAllOrganizations(),
      ]);
      setUsersData(userData);
      setOrganizations(orgsData.data || orgsData); // Handle both paginated and non-paginated response
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      if (isInitialMount.current) {
        setLoading(false);
        isInitialMount.current = false;
      }
      setDataLoading(false);
      // Restore focus to search input after data loads
      setTimeout(() => {
        if (searchInputRef.current && localSearch) {
          searchInputRef.current.focus();
          // Restore cursor position to end
          const length = searchInputRef.current.value.length;
          searchInputRef.current.setSelectionRange(length, length);
        }
      }, 0);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteUser(userId);
      // Refresh the data
      fetchData();
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
      await updateUser(editingUser.id, {
        email: editFormData.email,
        language: editFormData.language,
        phoneNumber: editFormData.phoneNumber || undefined,
        organizationId: editFormData.organizationId,
      });
      
      // Refresh data
      fetchData();
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      console.error('Failed to update user:', err);
      alert(err.response?.data?.message || 'Failed to update user. Please try again.');
    }
  };

  const getOrganizationId = (orgId: string | undefined) => {
    if (!orgId) return '-';
    // For very long IDs, truncate but keep enough to be recognizable
    if (orgId.length > 30) {
      return `${orgId.slice(0, 20)}...`;
    }
    return orgId;
  };

  const handleOrganizationClick = (organizationId: string) => {
    navigate(`/organization?filter=${organizationId}`);
  };

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setLocalSearch(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      pagination.setSearch(value);
    }, 500); // 500ms debounce
  }, [pagination]);

  const clearSearch = useCallback(() => {
    setLocalSearch('');
    pagination.setSearch('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, [pagination]);

  const handleOrganizationFilterChange = (event: SelectChangeEvent<string>) => {
    setOrganizationFilter(event.target.value);
  };

  const clearOrganizationFilter = () => {
    setOrganizationFilter('');
  };

  // Memoize the table content to prevent re-renders during search
  const tableContent = useMemo(() => {
    if (dataLoading) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading users...</Typography>
        </Box>
      );
    }

    if (!usersData || usersData.data.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1">
            {localSearch || pagination.search ? 'No users found matching your search.' : 'No users found.'}
          </Typography>
          {!localSearch && !pagination.search && (
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
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ maxWidth: 250 }}>Email</TableCell>
              <TableCell sx={{ maxWidth: 200 }}>Organization</TableCell>
              <TableCell sx={{ width: 100 }}>Language</TableCell>
              <TableCell sx={{ width: 120 }}>Phone</TableCell>
              <TableCell sx={{ width: 80 }}>Projects</TableCell>
              <TableCell sx={{ width: 100 }}>Created</TableCell>
              <TableCell align="center" sx={{ width: 100 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usersData.data.map((user) => (
              <TableRow key={user.id} hover sx={{ '& td': { py: 1 } }}>
                <TableCell sx={{ maxWidth: 250 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <EmailIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16, flexShrink: 0 }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={user.email}
                    >
                      {user.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Box sx={{ minWidth: 0 }}>
                    {user.organizationId ? (
                      <Link
                        component="button"
                        variant="body2"
                        onClick={() => handleOrganizationClick(user.organizationId!)}
                        sx={{
                          textDecoration: 'none',
                          color: 'primary.main',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          textAlign: 'left',
                          maxWidth: '100%',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                        title={user.organizationId}
                      >
                        {getOrganizationId(user.organizationId)}
                      </Link>
                    ) : (
                      <Typography variant="body2">-</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.language.toUpperCase()}
                    size="small"
                    sx={{ 
                      height: 20,
                      fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {user.phoneNumber || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {user.projectIds?.length || 0}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title="Edit User">
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(user)}
                        color="primary"
                        sx={{ p: 0.5 }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                        sx={{ p: 0.5 }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }, [dataLoading, usersData, localSearch, pagination.search]);

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

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search users by email..."
          value={localSearch}
          onChange={handleSearchChange}
          inputRef={searchInputRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
            endAdornment: localSearch && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={clearSearch}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          key="user-search-input"
        />
        <FormControl size="small" sx={{ minWidth: 300 }}>
          <InputLabel>Filter by Organization</InputLabel>
          <Select
            value={organizationFilter}
            onChange={handleOrganizationFilterChange}
            label="Filter by Organization"
          >
            <MenuItem value="">All Organizations</MenuItem>
            {organizations.map((org) => (
              <MenuItem key={org.id} value={org.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <BusinessIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                    {org.id}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {organizationFilter && (
          <IconButton
            size="small"
            onClick={clearOrganizationFilter}
            title="Clear organization filter"
          >
            <ClearIcon />
          </IconButton>
        )}
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {tableContent}
          {usersData && usersData.totalPages > 1 && (
            <Box sx={{ p: 2 }}>
              <Pagination
                page={pagination.page}
                totalPages={usersData.totalPages}
                total={usersData.total}
                limit={pagination.limit}
                onPageChange={pagination.setPage}
                onLimitChange={pagination.setLimit}
              />
            </Box>
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