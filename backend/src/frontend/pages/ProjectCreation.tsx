import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  TextField,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import PersonIcon from '@mui/icons-material/Person';
import { createProjectFromUrl, waitForPromptSet } from '../utils/api';
import { Project, PromptSet, User } from '../utils/types';
import { MARKETS, getFormattedMarket, LANGUAGES, getFormattedLanguage } from '../utils/constants';
import { getUsers } from '../utils/api';

const steps = ['Enter URL', 'Generate Project Card', 'Generate Prompts', 'Complete'];

const ProjectCreation: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [url, setUrl] = useState('');
  const [market, setMarket] = useState('');
  const [marketError, setMarketError] = useState<string | null>(null);
  const [language, setLanguage] = useState('');
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userError, setUserError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Helper function to get flag emoji for market
  const getMarketWithFlag = (market: string): string => {
    const marketFlags: Record<string, string> = {
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      Canada: '🇨🇦',
      Australia: '🇦🇺',
      France: '🇫🇷',
      Germany: '🇩🇪',
      Japan: '🇯🇵',
      China: '🇨🇳',
      India: '🇮🇳',
      Brazil: '🇧🇷',
      Mexico: '🇲🇽',
      Spain: '🇪🇸',
      Italy: '🇮🇹',
      Netherlands: '🇳🇱',
      Sweden: '🇸🇪',
      Switzerland: '🇨🇭',
      Singapore: '🇸🇬',
      'South Korea': '🇰🇷',
      Russia: '🇷🇺',
      'South Africa': '🇿🇦',
    };

    const flag = marketFlags[market] || '🇺🇸';
    return `${flag} ${market}`;
  };

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const data = await getUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError(
          'Failed to load users. You might not be able to associate this project with a user.',
        );
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
    setUrlError(null);
  };

  const validateUrl = (): boolean => {
    if (!url.trim()) {
      setUrlError('URL is required');
      return false;
    }

    try {
      // If no protocol, add https:// for validation
      const urlToValidate =
        !url.startsWith('http://') && !url.startsWith('https://') ? `https://${url}` : url;

      new URL(urlToValidate);
      return true;
    } catch (e) {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const validateUser = (): boolean => {
    if (!selectedUserId) {
      setUserError('Please select a user');
      return false;
    }
    return true;
  };

  const validateMarket = (): boolean => {
    if (!market) {
      setMarketError('Please select a market');
      return false;
    }
    return true;
  };

  const validateLanguage = (): boolean => {
    if (!language) {
      setLanguageError('Please select a language');
      return false;
    }
    return true;
  };

  const handleCreateProject = async () => {
    if (!validateUrl()) return;
    if (!validateUser()) return;
    if (!validateMarket()) return;
    if (!validateLanguage()) return;

    try {
      setLoading(true);
      setError(null);
      setActiveStep(1);

      // Step 1: Create the project card
      const newProject = await createProjectFromUrl(url, selectedUserId, market, language);
      setProject(newProject);
      setActiveStep(2);

      // Step 2: Wait for prompt set generation
      const newPromptSet = await waitForPromptSet(newProject.id, 60000);
      if (newPromptSet) {
        setPromptSet(newPromptSet);
        setActiveStep(3);
      } else {
        setError(
          'Prompt generation timed out. You can still view the project details but may need to wait for prompt generation to complete.',
        );
        setActiveStep(3);
      }
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project. Please try again.');
      setActiveStep(0);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              Enter project information
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              We'll analyze the website to create a project card for the brand.
            </Typography>

            <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
              1. Select a user to associate with this project
            </Typography>
            <FormControl
              fullWidth
              error={!!userError}
              disabled={loading || loadingUsers}
              sx={{ mb: 3 }}
            >
              <InputLabel id="user-select-label">User</InputLabel>
              <Select
                labelId="user-select-label"
                id="user-select"
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setUserError(null);
                }}
                label="User"
              >
                {loadingUsers ? (
                  <MenuItem value="" disabled>
                    Loading users...
                  </MenuItem>
                ) : users.length === 0 ? (
                  <MenuItem value="" disabled>
                    No users available
                  </MenuItem>
                ) : (
                  users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.email} ({user.language})
                    </MenuItem>
                  ))
                )}
              </Select>
              {userError && <FormHelperText>{userError}</FormHelperText>}
            </FormControl>

            <Typography variant="subtitle2" gutterBottom>
              2. Enter the project website URL, market, and language
            </Typography>
            <TextField
              fullWidth
              label="Project URL"
              placeholder="https://example.com"
              variant="outlined"
              value={url}
              onChange={handleUrlChange}
              error={!!urlError}
              helperText={urlError || 'Enter the project website URL (e.g., example.com)'}
              sx={{ mb: 2 }}
              disabled={loading}
            />
            <FormControl fullWidth sx={{ mb: 3 }} error={!!marketError} required>
              <InputLabel id="market-select-label">Market</InputLabel>
              <Select
                labelId="market-select-label"
                id="market-select"
                value={market}
                onChange={(e) => {
                  setMarket(e.target.value);
                  setMarketError(null);
                }}
                label="Market"
                disabled={loading}
              >
                {Object.keys(MARKETS).map((marketName) => (
                  <MenuItem key={marketName} value={marketName}>
                    {getFormattedMarket(marketName)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {marketError || 'Select the primary geographical market for this project'}
              </FormHelperText>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 3 }} error={!!languageError} required>
              <InputLabel id="language-select-label">Language</InputLabel>
              <Select
                labelId="language-select-label"
                id="language-select"
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setLanguageError(null);
                }}
                label="Language"
                disabled={loading}
              >
                {Object.keys(LANGUAGES).map((languageCode) => (
                  <MenuItem key={languageCode} value={languageCode}>
                    {getFormattedLanguage(languageCode)}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                {languageError ||
                  'Select the language for identity card, prompts and analysis generation'}
              </FormHelperText>
            </FormControl>

            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                component="a"
                href="/users/new"
                target="_blank"
                rel="noopener"
                startIcon={<PersonIcon />}
              >
                Create New User
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateProject}
                disabled={loading || loadingUsers || users.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : <BusinessIcon />}
              >
                {loading ? 'Processing...' : 'Create Project Card'}
              </Button>
            </Box>
          </Box>
        );

      case 1:
      case 2:
        return (
          <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              {activeStep === 1 ? 'Creating Project Card...' : 'Generating Prompt Set...'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {activeStep === 1
                ? 'Analyzing the website and extracting project information...'
                : 'Creating specialized prompts for brand analysis...'}
            </Typography>
            {activeStep === 2 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
                This may take a minute or two. Please wait...
              </Typography>
            )}
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 3 }}>
            <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success" sx={{ mb: 3 }}>
              Project card has been created successfully!
            </Alert>

            {error && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {project && (
              <Card sx={{ mb: 4 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    {project.brandName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Industry: {project.industry}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Market: {getMarketWithFlag(project.market)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Language: {project.language ? getFormattedLanguage(project.language) : '🌐 (?)'}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1" paragraph>
                    {project.shortDescription}
                  </Typography>

                  <Typography variant="subtitle2" gutterBottom>
                    Key Brand Attributes:
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {project.keyBrandAttributes?.map((feature, idx) => (
                      <Typography component="li" key={idx} variant="body2">
                        {feature}
                      </Typography>
                    ))}
                  </Box>

                  {project.competitors.length > 0 && (
                    <>
                      <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                        Competitors:
                      </Typography>
                      <Box component="ul" sx={{ pl: 2 }}>
                        {project.competitors?.map((competitor, idx) => (
                          <Typography component="li" key={idx} variant="body2">
                            {competitor}
                          </Typography>
                        ))}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/projects')}>
                Back to Projects
              </Button>

              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate(`/projects/${project?.id}`)}
                disabled={!project}
              >
                View Project Details
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Create New Project
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStep()}
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          How it works:
        </Typography>
        <Typography variant="body2" paragraph>
          1. Select a user to associate with this project.
        </Typography>
        <Typography variant="body2" paragraph>
          2. Enter the URL of the project's website.
        </Typography>
        <Typography variant="body2" paragraph>
          3. Our system will analyze the website to create a project card with key information.
        </Typography>
        <Typography variant="body2" paragraph>
          4. Specialized prompts are generated for brand analysis across multiple LLMs.
        </Typography>
        <Typography variant="body2">
          5. You can then run various analyses to understand how the brand is perceived.
        </Typography>
      </Box>
    </>
  );
};

export default ProjectCreation;
