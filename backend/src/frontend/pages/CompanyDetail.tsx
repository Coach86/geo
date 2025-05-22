import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip,
  styled,
  Snackbar,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import GroupIcon from '@mui/icons-material/Group';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CompareIcon from '@mui/icons-material/Compare';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import DeleteIcon from '@mui/icons-material/Delete';
import EmailIcon from '@mui/icons-material/Email';
import FullWidthTabs from '../components/FullWidthTabs';

import {
  getCompanyById,
  getPromptSet,
  deleteCompany,
  runBatchWithEmailNotification,
  getBatchExecution,
} from '../utils/api';
import {
  runSpontaneousPipeline,
  runSentimentPipeline,
  runComparisonPipeline,
  runAccuracyPipeline,
  runFullBatchAnalysis,
} from '../utils/api-batch';
import authApi from '../utils/auth';
import {
  BatchType,
  CompanyIdentityCard,
  PromptSet,
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  AccuracyResults,
} from '../utils/types';
import { socketManager, BatchEvent } from '../utils/socket';
import { useBatchEvents } from '../hooks/useBatchEvents';
import { showBatchStartNotification } from '../utils/notifications';

// Components for each tab
import OverviewTab from '../components/company-detail/OverviewTab';
import PromptsTab from '../components/company-detail/PromptsTab';
import SpontaneousTab from '../components/company-detail/tabs/SpontaneousTab';
import SentimentTab from '../components/company-detail/tabs/SentimentTab';
import ComparisonTab from '../components/company-detail/tabs/ComparisonTab';
import AccuracyTab from '../components/company-detail/tabs/AccuracyTab';
import BatchesTab from '../components/company-detail/BatchesTab';
import ReportsTab from '../components/company-detail/ReportsTab';

enum TabValue {
  OVERVIEW = 'overview',
  PROMPTS = 'prompts',
  BATCHES = 'batches',
  REPORTS = 'reports',
  SPONTANEOUS = 'spontaneous',
  SENTIMENT = 'sentiment',
  COMPARISON = 'comparison',
  ACCURACY = 'accuracy',
}

const CompanyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<CompanyIdentityCard | null>(null);
  const [promptSet, setPromptSet] = useState<PromptSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.OVERVIEW);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Batch events hook for notifications and UI updates
  const { subscribeToBatch } = useBatchEvents();

  // Batch results
  const [spontaneousResults, setSpontaneousResults] = useState<SpontaneousResults | null>(null);
  const [sentimentResults, setSentimentResults] = useState<SentimentResults | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null);
  const [accuracyResults, setAccuracyResults] = useState<AccuracyResults | null>(null);

  // Initialize tab from URL search params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && Object.values(TabValue).includes(tab as TabValue)) {
      setCurrentTab(tab as TabValue);
    }
  }, [searchParams]);

  // Fetch company data and prompt set
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const companyData = await getCompanyById(id);
        setCompany(companyData);

        // Try to fetch prompt set
        try {
          const promptSetData = await getPromptSet(id);
          setPromptSet(promptSetData);
        } catch (err) {
          console.log('No prompt set available yet');
        }

        setError(null);
      } catch (err) {
        console.error('Failed to fetch company data:', err);
        setError('Failed to load company data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setCurrentTab(newValue);
    setSearchParams({ tab: newValue });
  };

  const showSnackbarNotification = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleRunBatchAnalysis = async () => {
    if (!id) return;

    try {
      // Show start notifications
      if (company) {
        showBatchStartNotification(company.brandName, 'full batch');
        showSnackbarNotification(`Starting full batch analysis for ${company.brandName}...`);
      }

      const { batchExecutionId } = await runFullBatchAnalysis(id);

      // Subscribe to batch events for UI updates and notifications
      subscribeToBatch(batchExecutionId);

      // Subscribe to specific events for navigation
      socketManager.subscribeToBatchEvents(batchExecutionId, (event: BatchEvent) => {
        if (event.eventType === 'batch_completed') {
          // Switch to batches tab after completion
          setCurrentTab(TabValue.BATCHES);
          setSearchParams({ tab: TabValue.BATCHES });
        }
      });
    } catch (error) {
      console.error('Failed to run batch analysis:', error);
    }
  };

  const handleRunBatchWithEmail = async () => {
    if (!id) return;

    try {
      // Show start notifications
      if (company) {
        showBatchStartNotification(company.brandName, 'full batch with email');
        showSnackbarNotification(`Starting full batch analysis with email for ${company.brandName}...`);
      }

      const result = await runBatchWithEmailNotification(id);

      if (!result.success) {
        throw new Error(result.message || 'Failed to complete the batch process');
      }

      // Note: The email batch doesn't return a batchExecutionId directly
      // The batch events will be picked up by the global event listener

      // Switch to batches tab after completion
      setCurrentTab(TabValue.BATCHES);
      setSearchParams({ tab: TabValue.BATCHES });
    } catch (error) {
      console.error('Failed to run batch with email notification:', error);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;

    try {
      setIsDeleting(true);
      await deleteCompany(id);
      setDeleteDialogOpen(false);
      // Navigate back to company list after successful deletion
      navigate('/companies');
    } catch (error) {
      console.error('Error deleting company:', error);
      setError('Failed to delete company. Please try again later.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRunSingleBatch = async (type: BatchType) => {
    if (!id) return;

    try {
      // Show start notifications
      if (company) {
        showBatchStartNotification(company.brandName, type);
        showSnackbarNotification(`Starting ${type} analysis for ${company.brandName}...`);
      }

      let result;

      // Run the appropriate pipeline and get results with batch execution ID
      switch (type) {
        case BatchType.SPONTANEOUS:
          result = await runSpontaneousPipeline(id);
          setSpontaneousResults(result);
          break;
        case BatchType.SENTIMENT:
          result = await runSentimentPipeline(id);
          setSentimentResults(result);
          break;
        case BatchType.COMPARISON:
          result = await runComparisonPipeline(id);
          setComparisonResults(result);
          break;
        case BatchType.ACCURACY:
          result = await runAccuracyPipeline(id);
          setAccuracyResults(result);
          break;
      }

      // Note: Single pipeline results don't return batchExecutionId directly
      // The batch events will be picked up by the global event listener

      // Switch to batches tab after completion
      setCurrentTab(TabValue.BATCHES);
      setSearchParams({ tab: TabValue.BATCHES });
    } catch (error) {
      console.error(`Failed to run ${type} batch:`, error);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
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

  if (!company) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <AlertTitle>Company Not Found</AlertTitle>
        The company you're looking for doesn't exist or has been removed.
      </Alert>
    );
  }

  // Render analysis button or prompt status message
  const renderAnalysisButtons = () => {
    if (!promptSet) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>Generating Prompts</AlertTitle>
          Waiting for prompt generation to complete before analysis can be run...
        </Alert>
      );
    }

    // If we already have all analysis results
    const hasAllResults = spontaneousResults && sentimentResults && comparisonResults;

    // Render a single unified analysis card
    return (
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Card sx={{ maxWidth: 600, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Brand Analysis
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" paragraph>
                Run a comprehensive analysis of how {company.brandName} is perceived across LLM
                models. This will analyze spontaneous mentions, sentiment, and competitive
                positioning.
              </Typography>

              {hasAllResults ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <AlertTitle>Analysis Complete</AlertTitle>
                  All analysis processes have been completed. You can view the results in the tabs
                  above.
                </Alert>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  This process will run all analyses in sequence and may take a few minutes to
                  complete.
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={handleRunBatchAnalysis}
                size="large"
              >
                {hasAllResults ? 'Refresh Analysis' : 'Run Analysis'}
              </Button>

              <Button
                variant="contained"
                color="secondary"
                startIcon={<EmailIcon />}
                onClick={handleRunBatchWithEmail}
                size="large"
              >
                Analysis + Email Report
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <>
      <Box
        sx={{
          width: '100%',
          marginBottom: 2,
        }}
      >
        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={(event, reason) => setDeleteDialogOpen(false)}
          aria-labelledby="delete-company-dialog-title"
        >
          <DialogTitle id="delete-company-dialog-title">Delete {company.brandName}?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete {company.brandName}? This action cannot be undone and
              will remove all associated data including batch results, reports, and prompt sets.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              color="primary"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              color="error"
              variant="contained"
              startIcon={<DeleteIcon />}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>

        <Box
          sx={{
            mb: 4,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            {company.brandName}
          </Typography>

          <Tooltip title="Delete company">
            <IconButton color="error" onClick={handleDeleteClick} aria-label="delete company">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            icon={<CategoryIcon />}
            label={company.industry}
            color="primary"
            variant="outlined"
          />
          {company.competitors.length > 0 && (
            <Chip
              icon={<GroupIcon />}
              label={`${company.competitors.length} Competitors`}
              color="secondary"
              variant="outlined"
            />
          )}
          {company.url && (
            <Chip
              icon={<BusinessIcon />}
              label="Website"
              component="a"
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              clickable
            />
          )}
        </Box>

        {/* Full width styled tabs */}
        <Tabs
          variant="fullWidth"
          value={currentTab}
          onChange={handleTabChange}
          aria-label="company tabs"
          TabIndicatorProps={{
            style: {
              height: 3,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            },
          }}
        >
          <Tab
            label="Overview"
            value={TabValue.OVERVIEW}
            icon={<BusinessIcon />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            label="Prompts"
            value={TabValue.PROMPTS}
            icon={<FactCheckIcon />}
            iconPosition="start"
            disabled={!promptSet}
            sx={{ textTransform: 'none' }}
          />
          <Tab
            label="Analysis"
            value={TabValue.BATCHES}
            icon={<HistoryIcon />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            label="Reports"
            value={TabValue.REPORTS}
            icon={<EmailIcon />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>

        <Box style={{ paddingTop: '12px', paddingBottom: '12px' }}>
          {currentTab === TabValue.OVERVIEW && company && <OverviewTab company={company} />}

          {currentTab === TabValue.PROMPTS && promptSet && <PromptsTab promptSet={promptSet} />}

          {currentTab === TabValue.BATCHES && id && (
            <BatchesTab
              companyId={id}
              onRunNewBatch={handleRunBatchAnalysis}
              onRunSingleBatch={handleRunSingleBatch}
            />
          )}

          {currentTab === TabValue.REPORTS && id && (
            <ReportsTab companyId={id} userEmail={company?.userEmail} />
          )}

          {currentTab === TabValue.SPONTANEOUS &&
            (spontaneousResults ? (
              <SpontaneousTab results={spontaneousResults} />
            ) : (
              renderAnalysisButtons()
            ))}

          {currentTab === TabValue.SENTIMENT &&
            (sentimentResults ? (
              <SentimentTab results={sentimentResults} />
            ) : (
              renderAnalysisButtons()
            ))}

          {currentTab === TabValue.COMPARISON &&
            (comparisonResults ? (
              <ComparisonTab results={comparisonResults} company={company} />
            ) : (
              renderAnalysisButtons()
            ))}

          {currentTab === TabValue.ACCURACY &&
            (accuracyResults ? <AccuracyTab results={accuracyResults} /> : renderAnalysisButtons())}

          {currentTab === TabValue.OVERVIEW && renderAnalysisButtons()}
        </Box>
      </Box>

      {/* Snackbar for in-app notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default CompanyDetail;
