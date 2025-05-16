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
  Paper,
  InputAdornment,
  IconButton,
  Grid,
  Card,
  CardContent,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import RefreshIcon from '@mui/icons-material/Refresh';
import CompaniesIcon from '@mui/icons-material/Business';
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
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          mb: 4,
        }}
      >
        <Box sx={{ mb: { xs: 2, md: 0 } }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <CompaniesIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
            Companies
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your brand analysis portfolio
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/companies/new')}
          sx={{
            px: 3,
            py: 1,
            boxShadow: 2,
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          Add Company
        </Button>
      </Box>

      {/* Dashboard Stats */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
          gap: 3,
          mb: 4,
        }}
      >
        <Card
          sx={{
            borderRadius: 2,
            p: 1,
            height: '100%',
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.dark, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <CompaniesIcon sx={{ color: theme.palette.primary.main, mb: 1, fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {companies.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Companies
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 2,
            p: 1,
            height: '100%',
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.dark, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <PersonIcon sx={{ color: theme.palette.secondary.main, mb: 1, fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {users.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Users
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 2,
            p: 1,
            height: '100%',
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.dark, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <TrendingUpIcon sx={{ color: theme.palette.info.main, mb: 1, fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {Object.keys(industryStats).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Industries
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 2,
            p: 1,
            height: '100%',
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.dark, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <PeopleAltIcon sx={{ color: theme.palette.success.main, mb: 1, fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {companies.reduce((acc, company) => acc + company.competitors.length, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tracked Competitors
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            borderRadius: 2,
            p: 1,
            height: '100%',
            backgroundImage: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.dark, 0.1)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <AssessmentIcon sx={{ color: theme.palette.warning.main, mb: 1, fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {companies.reduce((acc, company) => acc + company.keyBrandAttributes.length, 0)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Key Brand Attributes
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
          }}
        >
          <TextField
            placeholder="Search companies..."
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: searchTerm ? (
                <InputAdornment position="end">
                  <IconButton onClick={clearSearch} edge="end" size="small">
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />

          <FormControl size="small" sx={{ minWidth: 180 }} disabled={loadingUsers}>
            <InputLabel id="user-filter-label">
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                Filter by User
              </Box>
            </InputLabel>
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
              gap: 1,
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={fetchData}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Filter">
              <IconButton size="small">
                <FilterListIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title="Sort">
              <IconButton size="small">
                <SortIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }}
            />

            <Tabs
              value={currentView}
              onChange={handleViewChange}
              sx={{ minHeight: 36 }}
              TabIndicatorProps={{ style: { display: 'none' } }}
            >
              <Tooltip title="Grid view">
                <Tab
                  icon={<ViewModuleIcon fontSize="small" />}
                  sx={{
                    minWidth: 40,
                    minHeight: 36,
                    p: 1,
                    borderRadius: 1,
                    mr: 0.5,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                />
              </Tooltip>
              <Tooltip title="List view">
                <Tab
                  icon={<ViewListIcon fontSize="small" />}
                  sx={{
                    minWidth: 40,
                    minHeight: 36,
                    p: 1,
                    borderRadius: 1,
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    },
                  }}
                />
              </Tooltip>
            </Tabs>
          </Box>
        </Box>

        {/* Industry filters */}
        <Divider />
        <Box sx={{ px: 2, py: 1, overflowX: 'auto' }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              minWidth: { xs: 'max-content', md: '100%' },
            }}
          >
            <Chip label="All Industries" color="primary" variant="filled" size="small" />
            {Object.entries(industryStats)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 7)
              .map(([industry, count]) => (
                <Chip
                  key={industry}
                  label={`${industry} (${count})`}
                  variant="outlined"
                  size="small"
                />
              ))}
          </Stack>
        </Box>
      </Paper>

      {filteredCompanies.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
          <Typography variant="h6">No companies found</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm
              ? 'No companies match your search criteria. Try using different keywords.'
              : 'There are no companies in the system yet.'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/companies/new')}
          >
            Add Your First Company
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
            gap: 3,
          }}
        >
          {filteredCompanies.map((company) => (
            <Box key={company.id}>
              <CompanyCard company={company} onDelete={handleCompanyDeleted} />
            </Box>
          ))}
        </Box>
      )}
    </>
  );
};

export default CompanyList;
