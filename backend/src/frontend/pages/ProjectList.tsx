import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography,
  Button,
  Box,
  TextField,
  CircularProgress,
  Alert,
  AlertTitle,
  Card,
  Container,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
  Stack,
  useTheme,
  alpha,
  Tooltip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  CardHeader,
  CardContent,
  Autocomplete,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import RefreshIcon from '@mui/icons-material/Refresh';
import CompaniesIcon from '@mui/icons-material/Business';
import BusinessIcon from '@mui/icons-material/Business';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import { getProjects, getUsers, PaginatedResponse } from '../utils/api';
import { getAllOrganizations } from '../utils/api-organization';
import { Project, User } from '../utils/types';
import ProjectCard from '../components/ProjectCard';
import Pagination from '../components/shared/Pagination';
import { usePagination } from '../hooks/usePagination';

interface Organization {
  id: string;
  createdAt: string;
  currentProjects?: number;
}

const ProjectList: React.FC = () => {
  const [projectsData, setProjectsData] = useState<PaginatedResponse<Project> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<number>(0);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [localSearch, setLocalSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  
  // Use pagination hook
  const pagination = usePagination();

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadingOrganizations(true);

      // Fetch projects with pagination
      const projectData = await getProjects(pagination.queryParams);
      setProjectsData(projectData);

      // Fetch organizations (without pagination for now)
      const orgData = await getAllOrganizations();
      setOrganizations(orgData.data || orgData); // Handle both paginated and non-paginated response

      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingOrganizations(false);
      // Restore focus to search input after data loads
      if (searchInputRef.current && document.activeElement !== searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  };

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

  // Set organization filter from URL params on mount
  useEffect(() => {
    const orgId = searchParams.get('organizationId');
    if (orgId) {
      setSelectedOrganizationId(orgId);
    }
  }, [searchParams]);

  // Handle project deletion
  const handleProjectDeleted = () => {
    fetchData(); // Refresh data
  };

  const handleOrganizationFilterChange = (e: SelectChangeEvent<string>) => {
    setSelectedOrganizationId(e.target.value);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const clearSearch = () => {
    setLocalSearch('');
    pagination.setSearch('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const handleViewChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentView(newValue);
  };

  const countProjectsByIndustry = () => {
    const industries: Record<string, number> = {};
    if (projectsData) {
      projectsData.data.forEach((project) => {
        industries[project.industry] = (industries[project.industry] || 0) + 1;
      });
    }
    return industries;
  };

  const industryStats = countProjectsByIndustry();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress size={50} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <Container maxWidth={false} disableGutters>
      <Box sx={{ py: 2, px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  mb: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                Projects
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  opacity: 0.85,
                  fontSize: '0.875rem',
                }}
              >
                Analyze and manage your branded projects
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/projects/new')}
              sx={{
                mt: { xs: 2, sm: 0 },
                px: 2.5,
                py: 1,
                borderRadius: 1,
                textTransform: 'none',
                boxShadow: '0 2px 4px 0 rgba(0,0,0,0.05)',
                fontWeight: 600,
                fontSize: '0.875rem',
                '&:hover': {
                  boxShadow: '0 4px 8px 0 rgba(0,0,0,0.1)',
                },
              }}
            >
              Add New Project
            </Button>
          </Box>


          <Card
            sx={{
              boxShadow: 'none',
              border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
              borderRadius: 1.5,
              overflow: 'hidden',
            }}
          >
            <CardHeader
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <BusinessIcon
                      sx={{
                        mr: 1,
                        color: theme.palette.primary.main,
                        fontSize: '1.1rem',
                      }}
                    />
                    Projects
                    <Typography
                      component="span"
                      variant="subtitle2"
                      sx={{
                        color: 'text.secondary',
                        ml: 0.75,
                        opacity: 0.7,
                        fontWeight: 500,
                      }}
                    >
                      ({projectsData?.total || 0})
                    </Typography>
                  </Typography>
                </Box>
              }
              sx={{ px: 3, pt: 2.5, pb: 2 }}
            />

            <Box
              sx={{
                px: 3,
                py: 2,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
                borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                backgroundColor: alpha(theme.palette.grey[50], 0.5),
              }}
            >
              <TextField
                placeholder="Search projects..."
                size="small"
                value={localSearch}
                onChange={handleSearchChange}
                inputRef={searchInputRef}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: theme.palette.background.paper,
                    borderColor: alpha(theme.palette.grey[500], 0.2),
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                    },
                    '&.Mui-focused': {
                      borderColor: theme.palette.primary.main,
                      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon
                        sx={{ fontSize: '1rem', color: alpha(theme.palette.text.secondary, 0.6) }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: localSearch ? (
                    <InputAdornment position="end">
                      <IconButton onClick={clearSearch} edge="end" size="small">
                        <ClearIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />

              <Autocomplete
                size="small"
                freeSolo
                options={organizations}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.id}
                value={organizations.find(org => org.id === selectedOrganizationId) || selectedOrganizationId}
                onChange={(event, newValue) => {
                  if (typeof newValue === 'string') {
                    setSelectedOrganizationId(newValue);
                  } else if (newValue) {
                    setSelectedOrganizationId(newValue.id);
                  } else {
                    setSelectedOrganizationId('');
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  if (event && event.type === 'change') {
                    setSelectedOrganizationId(newInputValue);
                  }
                }}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <BusinessIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                        {option.id}
                      </Typography>
                      <Chip 
                        label={`${option.currentProjects || 0} projects`} 
                        size="small" 
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    </Box>
                  </Box>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filter by Organization"
                    placeholder="Select or type organization ID"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {selectedOrganizationId && (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedOrganizationId('')}
                                edge="end"
                              >
                                <ClearIcon sx={{ fontSize: '0.9rem' }} />
                              </IconButton>
                            </InputAdornment>
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      minWidth: 300,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        backgroundColor: theme.palette.background.paper,
                        borderColor: alpha(theme.palette.grey[500], 0.2),
                        '&:hover': {
                          borderColor: alpha(theme.palette.primary.main, 0.5),
                        },
                        '&.Mui-focused': {
                          borderColor: theme.palette.primary.main,
                          boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                )}
                disabled={loadingOrganizations}
                sx={{ flex: 'none' }}
              />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  justifyContent: { xs: 'flex-end', sm: 'flex-end' },
                  width: { xs: '100%', sm: 'auto' },
                }}
              >
                <Tooltip title="Refresh">
                  <IconButton
                    size="small"
                    onClick={fetchData}
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                      borderRadius: 1,
                      width: 32,
                      height: 32,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                      },
                    }}
                  >
                    <RefreshIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Filter">
                  <IconButton
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                      borderRadius: 1,
                      width: 32,
                      height: 32,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                      },
                    }}
                  >
                    <FilterListIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Sort">
                  <IconButton
                    size="small"
                    sx={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${alpha(theme.palette.grey[500], 0.2)}`,
                      borderRadius: 1,
                      width: 32,
                      height: 32,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04),
                        borderColor: alpha(theme.palette.primary.main, 0.4),
                      },
                    }}
                  >
                    <SortIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>

                <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24 }} />

                <Tabs
                  value={currentView}
                  onChange={handleViewChange}
                  sx={{
                    minHeight: 32,
                    '& .MuiTabs-indicator': { display: 'none' },
                  }}
                >
                  <Tooltip title="Grid view">
                    <Tab
                      icon={<ViewModuleIcon sx={{ fontSize: '1rem' }} />}
                      sx={{
                        minWidth: 32,
                        minHeight: 32,
                        p: 0,
                        borderRadius: 1,
                        mr: 0.5,
                        backgroundColor:
                          currentView === 0
                            ? alpha(theme.palette.primary.main, 0.08)
                            : theme.palette.background.paper,
                        border: `1px solid ${currentView === 0 ? alpha(theme.palette.primary.main, 0.5) : alpha(theme.palette.grey[500], 0.2)}`,
                        color:
                          currentView === 0
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                        width: 32,
                        height: 32,
                        '&:hover': {
                          backgroundColor:
                            currentView === 0
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.primary.main, 0.04),
                          borderColor:
                            currentView === 0
                              ? theme.palette.primary.main
                              : alpha(theme.palette.primary.main, 0.4),
                        },
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="List view">
                    <Tab
                      icon={<ViewListIcon sx={{ fontSize: '1rem' }} />}
                      sx={{
                        minWidth: 32,
                        minHeight: 32,
                        p: 0,
                        borderRadius: 1,
                        backgroundColor:
                          currentView === 1
                            ? alpha(theme.palette.primary.main, 0.08)
                            : theme.palette.background.paper,
                        border: `1px solid ${currentView === 1 ? alpha(theme.palette.primary.main, 0.5) : alpha(theme.palette.grey[500], 0.2)}`,
                        color:
                          currentView === 1
                            ? theme.palette.primary.main
                            : theme.palette.text.secondary,
                        width: 32,
                        height: 32,
                        '&:hover': {
                          backgroundColor:
                            currentView === 1
                              ? alpha(theme.palette.primary.main, 0.12)
                              : alpha(theme.palette.primary.main, 0.04),
                          borderColor:
                            currentView === 1
                              ? theme.palette.primary.main
                              : alpha(theme.palette.primary.main, 0.4),
                        },
                      }}
                    />
                  </Tooltip>
                </Tabs>
              </Box>
            </Box>

            {/* Industry filters */}
            <Divider />
            <Box
              sx={{
                px: 3,
                py: 1.5,
                overflowX: 'auto',
                backgroundColor: alpha(theme.palette.grey[50], 0.3),
                borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  minWidth: { xs: 'max-content', md: '100%' },
                }}
              >
                <Chip
                  label="All Industries"
                  color="primary"
                  variant="filled"
                  size="small"
                  sx={{
                    borderRadius: 1,
                    height: 26,
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
                {Object.entries(industryStats)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 7)
                  .map(([industry, count]) => (
                    <Chip
                      key={industry}
                      label={`${industry} (${count})`}
                      variant="outlined"
                      size="small"
                      sx={{
                        borderRadius: 1,
                        height: 26,
                        fontSize: '0.75rem',
                        borderColor: alpha(theme.palette.grey[500], 0.24),
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                  ))}
              </Stack>
            </Box>

            <Divider />

            {!projectsData || projectsData.data.length === 0 ? (
              <Box
                sx={{
                  p: 5,
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 300,
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: alpha(theme.palette.primary.light, 0.12),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                  }}
                >
                  <SearchIcon
                    sx={{
                      fontSize: 32,
                      color: theme.palette.primary.main,
                      opacity: 0.7,
                    }}
                  />
                </Box>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 1,
                    fontWeight: 600,
                    fontSize: '1.1rem',
                  }}
                >
                  No projects found
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 3,
                    maxWidth: 400,
                    fontSize: '0.875rem',
                    lineHeight: 1.5,
                  }}
                >
                  {pagination.search
                    ? 'No projects match your search criteria. Try using different keywords or clearing your filters.'
                    : 'There are no projects in the portfolio yet. Add your first project to get started.'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/projects/new')}
                  sx={{
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 2px 4px 0 rgba(0,0,0,0.05)',
                    px: 2.5,
                    py: 1,
                    '&:hover': {
                      boxShadow: '0 4px 8px 0 rgba(0,0,0,0.1)',
                    },
                  }}
                >
                  Add Your First Project
                </Button>
              </Box>
            ) : (
              <Box sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: '1fr',
                      sm: 'repeat(2, 1fr)',
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(4, 1fr)',
                    },
                    gap: 2.5,
                  }}
                >
                  {projectsData.data.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onDelete={handleProjectDeleted}
                    />
                  ))}
                </Box>
                {projectsData && projectsData.totalPages > 1 && (
                  <Pagination
                    page={pagination.page}
                    totalPages={projectsData.totalPages}
                    total={projectsData.total}
                    limit={pagination.limit}
                    onPageChange={pagination.setPage}
                    onLimitChange={pagination.setLimit}
                  />
                )}
              </Box>
            )}
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default ProjectList;
