import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { getCompanies, getUsers } from '../utils/api';
import { CompanyIdentityCard } from '../utils/types';
import CompanyCard from '../components/CompanyCard';
import { User } from '../utils/types';

const CompanyList: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyIdentityCard[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyIdentityCard[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<number>(0);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadingUsers(true);

      // Fetch companies
      const companyData = await getCompanies();
      setCompanies(companyData);
      setFilteredCompanies(companyData);

      // Fetch users
      const userData = await getUsers();
      setUsers(userData);

      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle company deletion
  const handleCompanyDeleted = () => {
    fetchData(); // Refresh data
  };

  const handleUserFilterChange = (e: SelectChangeEvent<string>) => {
    setSelectedUserId(e.target.value);
  };

  useEffect(() => {
    // Start with all companies
    let filtered = [...companies];

    // Apply user filter if selected
    if (selectedUserId) {
      filtered = filtered.filter((company) => company.userId === selectedUserId);
    }

    // Apply search term filter
    if (searchTerm.trim() !== '') {
      const searchTermLower = searchTerm.toLowerCase();
      filtered = filtered.filter((company) => {
        return (
          company.brandName.toLowerCase().includes(searchTermLower) ||
          company.industry.toLowerCase().includes(searchTermLower) ||
          company.shortDescription.toLowerCase().includes(searchTermLower) ||
          (company.userEmail && company.userEmail.toLowerCase().includes(searchTermLower)) ||
          company.keyBrandAttributes?.some((feature) =>
            feature.toLowerCase().includes(searchTermLower),
          ) ||
          company.competitors?.some((competitor) =>
            competitor.toLowerCase().includes(searchTermLower),
          )
        );
      });
    }

    setFilteredCompanies(filtered);
  }, [searchTerm, companies, selectedUserId]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleViewChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentView(newValue);
  };

  const countCompaniesByIndustry = () => {
    const industries: Record<string, number> = {};
    companies.forEach((company) => {
      industries[company.industry] = (industries[company.industry] || 0) + 1;
    });
    return industries;
  };

  const industryStats = countCompaniesByIndustry();

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
                Companies
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  opacity: 0.85,
                  fontSize: '0.875rem',
                }}
              >
                Analyze and manage your branded companies
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/companies/new')}
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
              Add New Company
            </Button>
          </Box>

          {/* Dashboard Stats */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(4, 1fr)',
              },
              gap: 3,
              mb: 3,
            }}
          >
            <Card
              sx={{
                boxShadow: 'none',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                borderRadius: 1.5,
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  backgroundColor: theme.palette.primary.main,
                  opacity: 0.7,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600,
                        opacity: 0.8,
                      }}
                    >
                      Total Companies
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        mt: 1,
                        fontWeight: 700,
                        fontSize: { xs: '1.75rem', sm: '2.2rem' },
                      }}
                    >
                      {companies.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 0.8,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                    }}
                  >
                    <CompaniesIcon sx={{ fontSize: '1.3rem' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                boxShadow: 'none',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                borderRadius: 1.5,
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  backgroundColor: theme.palette.info.main,
                  opacity: 0.7,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600,
                        opacity: 0.8,
                      }}
                    >
                      Total Users
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        mt: 1,
                        fontWeight: 700,
                        fontSize: { xs: '1.75rem', sm: '2.2rem' },
                      }}
                    >
                      {users.length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 0.8,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.info.main, 0.12),
                      color: theme.palette.info.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                    }}
                  >
                    <PersonIcon sx={{ fontSize: '1.3rem' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                boxShadow: 'none',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                borderRadius: 1.5,
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  backgroundColor: theme.palette.success.main,
                  opacity: 0.7,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600,
                        opacity: 0.8,
                      }}
                    >
                      Industries
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        mt: 1,
                        fontWeight: 700,
                        fontSize: { xs: '1.75rem', sm: '2.2rem' },
                      }}
                    >
                      {Object.keys(industryStats).length}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 0.8,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.success.main, 0.12),
                      color: theme.palette.success.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: '1.3rem' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card
              sx={{
                boxShadow: 'none',
                border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                borderRadius: 1.5,
                overflow: 'hidden',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '4px',
                  backgroundColor: theme.palette.warning.main,
                  opacity: 0.7,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: 600,
                        opacity: 0.8,
                      }}
                    >
                      Competitors
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{
                        mt: 1,
                        fontWeight: 700,
                        fontSize: { xs: '1.75rem', sm: '2.2rem' },
                      }}
                    >
                      {companies.reduce((acc, company) => acc + company.competitors.length, 0)}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      p: 0.8,
                      borderRadius: 1.5,
                      bgcolor: alpha(theme.palette.warning.main, 0.12),
                      color: theme.palette.warning.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                    }}
                  >
                    <PeopleAltIcon sx={{ fontSize: '1.3rem' }} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
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
                    Companies
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
                      ({filteredCompanies.length})
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
                placeholder="Search companies..."
                size="small"
                value={searchTerm}
                onChange={handleSearchChange}
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
                  endAdornment: searchTerm ? (
                    <InputAdornment position="end">
                      <IconButton onClick={clearSearch} edge="end" size="small">
                        <ClearIcon sx={{ fontSize: '0.9rem' }} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />

              <FormControl
                size="small"
                sx={{
                  minWidth: 180,
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
                disabled={loadingUsers}
              >
                <InputLabel id="user-filter-label">Filter by User</InputLabel>
                <Select
                  labelId="user-filter-label"
                  value={selectedUserId}
                  onChange={handleUserFilterChange}
                  label="Filter by User"
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>All Users</em>
                  </MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.email} ({user.language})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

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

            {filteredCompanies.length === 0 ? (
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
                  No companies found
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
                  {searchTerm
                    ? 'No companies match your search criteria. Try using different keywords or clearing your filters.'
                    : 'There are no companies in the portfolio yet. Add your first company to get started.'}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/companies/new')}
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
                  Add Your First Company
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
                  {filteredCompanies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onDelete={handleCompanyDeleted}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default CompanyList;
