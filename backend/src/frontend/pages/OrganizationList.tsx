import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import SettingsIcon from '@mui/icons-material/Settings';
import { getAllOrganizations, deleteOrganization } from '../utils/api-organization';
import { PaginatedResponse } from '../utils/api';
import Pagination from '../components/shared/Pagination';
import { usePagination } from '../hooks/usePagination';

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

const OrganizationList: React.FC = () => {
  const navigate = useNavigate();
  const [organizationsData, setOrganizationsData] = useState<PaginatedResponse<Organization> | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const isInitialMount = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Use pagination hook
  const pagination = usePagination();

  useEffect(() => {
    fetchData();
  }, [pagination.page, pagination.limit, pagination.search]);

  // Initialize local search with pagination search
  useEffect(() => {
    setLocalSearch(pagination.search);
  }, []);

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
      
      // For now, we'll get all organizations and handle pagination client-side
      // TODO: Update API to support server-side pagination
      const allOrgs = await getAllOrganizations({ includeProjects: true });
      const orgsList = allOrgs.data || allOrgs;
      
      // Apply search filter if provided
      let filteredOrgs = Array.isArray(orgsList) ? orgsList : [];
      if (pagination.search) {
        const searchLower = pagination.search.toLowerCase();
        filteredOrgs = filteredOrgs.filter(org => 
          org.id.toLowerCase().includes(searchLower) ||
          org.name?.toLowerCase().includes(searchLower) ||
          org.projects?.some((p: any) => p.brandName.toLowerCase().includes(searchLower))
        );
      }

      // Sort organizations by createdAt (newest to oldest)
      const sortedOrgs = filteredOrgs.sort((a: Organization, b: Organization) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Calculate pagination
      const total = sortedOrgs.length;
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedOrgs = sortedOrgs.slice(startIndex, endIndex);

      // Create paginated response
      const response: PaginatedResponse<Organization> = {
        data: paginatedOrgs,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(total / pagination.limit),
        hasNext: pagination.page < Math.ceil(total / pagination.limit),
        hasPrev: pagination.page > 1
      };

      setOrganizationsData(response);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to load organizations. Please try again.');
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

  const handleDeleteOrganization = async (orgId: string) => {
    if (!window.confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
      return;
    }

    // Double confirmation for safety
    if (!window.confirm('This will permanently delete the organization and all associated data. Are you absolutely sure?')) {
      return;
    }

    try {
      await deleteOrganization(orgId);
      // Refresh the data
      fetchData();
      alert('Organization deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete organization');
    }
  };

  const handleCreateOrganization = async () => {
    try {
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
      await fetchData();
      // Navigate to the new organization details
      navigate(`/organization/${newOrg.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to create organization');
    }
  };

  const handleViewOrganization = (orgId: string) => {
    navigate(`/organization/${orgId}`);
  };

  const handleViewUsers = (orgId: string) => {
    navigate(`/users?organizationId=${orgId}`);
  };

  const handleViewProjects = (orgId: string) => {
    navigate(`/projects?organizationId=${orgId}`);
  };

  // Memoize the table content to prevent re-renders during search
  const tableContent = useMemo(() => {
    if (dataLoading) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading organizations...</Typography>
        </Box>
      );
    }

    if (!organizationsData || organizationsData.data.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1">
            {localSearch || pagination.search ? 'No organizations found matching your search.' : 'No organizations found.'}
          </Typography>
          {!localSearch && !pagination.search && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateOrgOpen(true)}
              sx={{ mt: 2 }}
            >
              Create Your First Organization
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
              <TableCell sx={{ maxWidth: 300 }}>Organization ID</TableCell>
              <TableCell sx={{ width: 100 }}>Users</TableCell>
              <TableCell sx={{ width: 100 }}>Projects</TableCell>
              <TableCell sx={{ width: 100 }}>Max Users</TableCell>
              <TableCell sx={{ width: 100 }}>Max Projects</TableCell>
              <TableCell sx={{ width: 100 }}>Max Models</TableCell>
              <TableCell sx={{ width: 100 }}>Created</TableCell>
              <TableCell align="center" sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organizationsData.data.map((org) => (
              <TableRow 
                key={org.id} 
                hover 
                sx={{ 
                  '& td': { py: 1 },
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
                onClick={() => handleViewOrganization(org.id)}
              >
                <TableCell sx={{ maxWidth: 300 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    <BusinessIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16, flexShrink: 0 }} />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem'
                        }}
                        title={org.id}
                      >
                        {org.id}
                      </Typography>
                      {org.projects && org.projects.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          {org.projects.map(p => p.brandName).join(', ')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={org.currentUsers || 0}
                    size="small"
                    color={org.currentUsers ? 'primary' : 'default'}
                    sx={{ 
                      height: 20,
                      fontSize: '0.7rem',
                      minWidth: 35,
                      cursor: 'pointer',
                      '& .MuiChip-label': { px: 1 }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewUsers(org.id);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={org.currentProjects || 0}
                    size="small"
                    color={org.currentProjects ? 'primary' : 'default'}
                    sx={{ 
                      height: 20,
                      fontSize: '0.7rem',
                      minWidth: 35,
                      cursor: 'pointer',
                      '& .MuiChip-label': { px: 1 }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewProjects(org.id);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {org.planSettings.maxUsers === -1 ? '∞' : org.planSettings.maxUsers}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {org.planSettings.maxProjects === -1 ? '∞' : org.planSettings.maxProjects}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {org.planSettings.maxAIModels === -1 ? '∞' : org.planSettings.maxAIModels}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOrganization(org.id);
                        }}
                        color="primary"
                        sx={{ p: 0.5 }}
                      >
                        <SettingsIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Organization">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOrganization(org.id);
                        }}
                        color="error"
                        sx={{ p: 0.5 }}
                        disabled={Boolean(org.currentUsers && org.currentUsers > 0)}
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
  }, [dataLoading, organizationsData, localSearch, pagination.search]);

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
              Organizations
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage all organizations and their settings
            </Typography>
          </Box>
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateOrgOpen(true)}
            >
              Create Organization
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Search Bar - Keep outside Card to prevent re-render issues */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search organizations by ID, name, or project..."
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
          key="organization-search-input"
        />
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {tableContent}
          {organizationsData && organizationsData.totalPages > 1 && (
            <Box sx={{ p: 2 }}>
              <Pagination
                page={pagination.page}
                totalPages={organizationsData.totalPages}
                total={organizationsData.total}
                limit={pagination.limit}
                onPageChange={pagination.setPage}
                onLimitChange={pagination.setLimit}
              />
            </Box>
          )}
        </CardContent>
      </Card>

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
    </Container>
  );
};

export default OrganizationList;