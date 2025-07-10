import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  CircularProgress,
  InputAdornment,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import PublicIcon from '@mui/icons-material/Public';
import CategoryIcon from '@mui/icons-material/Category';
import { getProjects, deleteProject, PaginatedResponse } from '../utils/api';
import { getAllOrganizations } from '../utils/api-organization';
import { Project } from '../utils/types';
import Pagination from '../components/shared/Pagination';
import { usePagination } from '../hooks/usePagination';

interface Organization {
  id: string;
  name?: string;
  currentProjects?: number;
  createdAt: string;
}

const ProjectListTable: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projectsData, setProjectsData] = useState<PaginatedResponse<Project> | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const isInitialMount = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Use pagination hook
  const pagination = usePagination();

  // Helper function to get favicon URL from project URL
  const getFaviconUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    
    try {
      // Ensure URL has protocol
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      const domain = new URL(fullUrl).hostname;
      
      // Use Google's favicon service as fallback
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch (error) {
      return null;
    }
  };

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

      // Fetch projects and organizations
      const [projectData, orgData] = await Promise.all([
        getProjects(queryParams),
        getAllOrganizations(),
      ]);

      setProjectsData(projectData);
      setOrganizations(orgData.data || orgData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError('Failed to load projects. Please try again.');
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

  const handleOrganizationFilterChange = (event: SelectChangeEvent<string>) => {
    setOrganizationFilter(event.target.value);
  };

  const clearOrganizationFilter = () => {
    setOrganizationFilter('');
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProject(projectId);
      // Refresh the data
      fetchData();
      alert('Project deleted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleViewProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleViewOrganization = (organizationId: string) => {
    navigate(`/organization/${organizationId}`);
  };

  // Memoize the table content to prevent re-renders during search
  const tableContent = useMemo(() => {
    if (dataLoading) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={40} />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading projects...</Typography>
        </Box>
      );
    }

    if (!projectsData || projectsData.data.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1">
            {localSearch || pagination.search || organizationFilter ? 'No projects found matching your filters.' : 'No projects found.'}
          </Typography>
          {!localSearch && !pagination.search && !organizationFilter && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/projects/new')}
              sx={{ mt: 2 }}
            >
              Create Your First Project
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
              <TableCell sx={{ maxWidth: 200 }}>Brand Name</TableCell>
              <TableCell sx={{ maxWidth: 300 }}>Organization ID</TableCell>
              <TableCell sx={{ width: 80 }}>Industry</TableCell>
              <TableCell sx={{ width: 100 }}>Market</TableCell>
              <TableCell sx={{ width: 120 }}>Website</TableCell>
              <TableCell sx={{ width: 100 }}>Created</TableCell>
              <TableCell align="center" sx={{ width: 120 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {projectsData.data.map((project) => (
              <TableRow 
                key={project.id} 
                hover 
                sx={{ 
                  '& td': { py: 1 },
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  }
                }}
                onClick={() => handleViewProject(project.id)}
              >
                <TableCell sx={{ maxWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    {getFaviconUrl(project.url) ? (
                      <>
                        <img 
                          src={getFaviconUrl(project.url)!} 
                          alt={`${project.brandName} favicon`}
                          style={{ 
                            width: 16, 
                            height: 16, 
                            marginRight: 4, 
                            flexShrink: 0,
                            borderRadius: 2
                          }}
                          onError={(e) => {
                            // Fallback to generic business icon if favicon fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallbackIcon = target.nextElementSibling as HTMLElement;
                            if (fallbackIcon) {
                              fallbackIcon.style.display = 'inline-block';
                            }
                          }}
                        />
                        <BusinessIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16, flexShrink: 0, display: 'none' }} />
                      </>
                    ) : (
                      <BusinessIcon sx={{ mr: 0.5, color: 'text.secondary', fontSize: 16, flexShrink: 0 }} />
                    )}
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                      title={project.brandName}
                    >
                      {project.brandName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Tooltip title="View Organization">
                    <Chip
                      label={project.organizationId}
                      size="small"
                      clickable
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewOrganization(project.organizationId || '');
                      }}
                      sx={{ 
                        height: 20,
                        fontSize: '0.7rem',
                        minWidth: 35,
                        maxWidth: 250,
                        cursor: 'pointer',
                        fontFamily: 'monospace',
                        '& .MuiChip-label': { 
                          px: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }
                      }}
                    />
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Chip
                    label={project.industry}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ 
                      height: 20,
                      fontSize: '0.7rem',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {project.market}
                  </Typography>
                </TableCell>
                <TableCell>
                  {project.url ? (
                    <Tooltip title={project.url}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(project.url, '_blank');
                        }}
                        sx={{ p: 0.5 }}
                      >
                        <PublicIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {new Date(project.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProject(project.id);
                        }}
                        color="primary"
                        sx={{ p: 0.5 }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Project">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
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
  }, [dataLoading, projectsData, localSearch, pagination.search, organizationFilter]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
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
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1">
              Projects
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Manage all projects and their brand analysis
            </Typography>
          </Box>
          <Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/projects/new')}
            >
              Create Project
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Search and Filter Bar */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search projects by brand name, description, or industry..."
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
          key="project-search-input"
        />
        <FormControl size="small" sx={{ minWidth: 300 }}>
          <InputLabel>Filter by Organization</InputLabel>
          <Select
            value={organizationFilter}
            onChange={handleOrganizationFilterChange}
            label="Filter by Organization"
            endAdornment={
              organizationFilter && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={clearOrganizationFilter}
                    edge="end"
                  >
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              )
            }
          >
            <MenuItem value="">All Organizations</MenuItem>
            {organizations.map((org) => (
              <MenuItem key={org.id} value={org.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                  <BusinessIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                    {org.id}
                  </Typography>
                  <Chip 
                    label={`${org.currentProjects || 0} projects`} 
                    size="small" 
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {tableContent}
          {projectsData && projectsData.totalPages > 1 && (
            <Box sx={{ p: 2 }}>
              <Pagination
                page={pagination.page}
                totalPages={projectsData.totalPages}
                total={projectsData.total}
                limit={pagination.limit}
                onPageChange={pagination.setPage}
                onLimitChange={pagination.setLimit}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default ProjectListTable;