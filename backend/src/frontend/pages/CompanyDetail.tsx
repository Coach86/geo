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
import BatchProcessingOverlay, { BatchProcessStage } from '../components/BatchProcessingOverlay';
import {
  BatchType,
  CompanyIdentityCard,
  PromptSet,
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  AccuracyResults,
} from '../utils/types';

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

  // Batch results
  const [spontaneousResults, setSpontaneousResults] = useState<SpontaneousResults | null>(null);
  const [sentimentResults, setSentimentResults] = useState<SentimentResults | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null);
  const [accuracyResults, setAccuracyResults] = useState<AccuracyResults | null>(null);

  // Batch processing states
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchStage, setBatchStage] = useState<BatchProcessStage>('initializing');
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchError, setBatchError] = useState<string | undefined>(undefined);

  // Add batchType state
  const [batchType, setBatchType] = useState<'full' | BatchType>('full');

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

  const handleRunBatchAnalysis = async () => {
    if (!id) return;
    setBatchType('full'); // Set batch type

    try {
      // Initialize batch processing
      setBatchProcessing(true);
      setBatchStage('initializing');
      setBatchProgress(10);
      setBatchError(undefined);

      try {
        // Run full batch analysis with all pipelines in parallel
        setBatchStage('processing');
        setBatchProgress(20);

        // Use the runFullBatchAnalysis utility function instead of direct API call
        // This avoids potential duplicate requests
        const { batchExecutionId, alreadyRunning } = await runFullBatchAnalysis(id);

        // If a batch is already running, update the UI to reflect this
        if (alreadyRunning) {
          setBatchStage('processing');
          setBatchProgress(40); // Set higher progress since it's already running
        }

        // Set progress to show we're polling
        setBatchProgress(30);

        // Poll for completion with progress updates
        let pollCount = 0;
        const maxPolls = 30; // 5 minutes with 10-second interval
        const pollInterval = 10000; // 10 seconds

        const pollForResults = async () => {
          const intervalId = setInterval(async () => {
            try {
              // Update progress to show polling activity
              setBatchProgress(30 + Math.min(50 * (pollCount / maxPolls), 50)); // Progress from 30% to 80%

              // Get batch execution status
              const batchExecution = await getBatchExecution(batchExecutionId);

              // If completed or failed, clear interval and proceed
              if (batchExecution.status === 'completed' || batchExecution.status === 'failed') {
                clearInterval(intervalId);

                if (batchExecution.status === 'failed') {
                  throw new Error('Batch execution failed');
                }

                // Parse the results
                const spontaneousResult = batchExecution.finalResults.find(
                  (r: any) => r.resultType === BatchType.SPONTANEOUS,
                );
                const sentimentResult = batchExecution.finalResults.find(
                  (r: any) => r.resultType === BatchType.SENTIMENT,
                );
                const comparisonResult = batchExecution.finalResults.find(
                  (r: any) => r.resultType === BatchType.COMPARISON,
                );

                if (batchType === 'full') {
                  if (!spontaneousResult || !sentimentResult || !comparisonResult) {
                    throw new Error(
                      'Missing batch results. Not all pipeline results are available.',
                    );
                  }
                } else if (batchType === BatchType.SPONTANEOUS && !spontaneousResult) {
                  throw new Error('Spontaneous analysis failed.');
                } else if (batchType === BatchType.SENTIMENT && !sentimentResult) {
                  throw new Error('Sentiment analysis failed.');
                } else if (batchType === BatchType.COMPARISON && !comparisonResult) {
                  throw new Error('Comparison analysis failed.');
                } else if (batchType === BatchType.ACCURACY) {
                  const accuracyResult = batchExecution.finalResults.find(
                    (r: any) => r.resultType === BatchType.ACCURACY,
                  );
                  if (!accuracyResult) {
                    throw new Error('Accuracy analysis failed.');
                  }
                }

                // Only parse and set results if present
                if (spontaneousResult) {
                  setSpontaneousResults(JSON.parse(spontaneousResult.result));
                }
                if (sentimentResult) {
                  setSentimentResults(JSON.parse(sentimentResult.result));
                }
                if (comparisonResult) {
                  setComparisonResults(JSON.parse(comparisonResult.result));
                }
                // Add the accuracy result handling
                const accuracyResult = batchExecution.finalResults.find(
                  (r: any) => r.resultType === BatchType.ACCURACY,
                );
                if (accuracyResult) {
                  setAccuracyResults(JSON.parse(accuracyResult.result));
                }

                // Finalize
                setBatchStage('finalizing');
                setBatchProgress(90);

                // Complete
                setTimeout(() => {
                  setBatchStage('completed');
                  setBatchProgress(100);

                  // Switch to batches tab after completion
                  setCurrentTab(TabValue.BATCHES);
                  setSearchParams({ tab: TabValue.BATCHES });
                }, 500);
              }

              pollCount++;
              if (pollCount >= maxPolls) {
                clearInterval(intervalId);
                throw new Error('Batch execution timed out');
              }
            } catch (error) {
              clearInterval(intervalId);
              console.error('Polling error:', error);
              setBatchStage('error');
              setBatchError(
                'Failed to complete the batch analysis. Please check the batch status later.',
              );
            }
          }, pollInterval);
        };

        // Start polling
        pollForResults();
      } catch (error) {
        console.error('Failed to run batch analysis:', error);
        setBatchStage('error');
        setBatchError('Failed to complete the batch analysis. Please try again later.');
      }
    } catch (err) {
      console.error('Failed to run batch analysis:', err);
      setBatchStage('error');
      setBatchError('Failed to complete the batch analysis. Please try again later.');
    }
  };

  const handleRunBatchWithEmail = async () => {
    if (!id) return;
    setBatchType('full'); // Set batch type

    try {
      // Initialize batch processing
      setBatchProcessing(true);
      setBatchStage('initializing');
      setBatchProgress(10);
      setBatchError(undefined);

      try {
        // Run orchestrated batch with email notification
        setBatchStage('email-notification');
        setBatchProgress(30);

        // This call runs all pipelines, creates a report, and sends an email notification
        const result = await runBatchWithEmailNotification(id);

        if (!result.success) {
          throw new Error(result.message || 'Failed to complete the batch process');
        }

        // Update UI state with results - we don't have direct access to the results here
        // so we'll show a message that the email has been sent

        // Finalize
        setBatchStage('finalizing');
        setBatchProgress(90);

        // Complete
        setTimeout(() => {
          setBatchStage('completed');
          setBatchProgress(100);

          // Switch to batches tab after completion
          setCurrentTab(TabValue.BATCHES);
          setSearchParams({ tab: TabValue.BATCHES });
        }, 500);
      } catch (error) {
        console.error('Failed to run batch with email notification:', error);
        setBatchStage('error');
        setBatchError('Failed to complete the process. Please try again later.');
      }
    } catch (err) {
      console.error('Failed to run batch with email notification:', err);
      setBatchStage('error');
      setBatchError('Failed to complete the process. Please try again later.');
    }
  };

  const handleBatchCompleted = () => {
    setBatchProcessing(false);

    // Switch to batches tab
    setCurrentTab(TabValue.BATCHES);
    setSearchParams({ tab: TabValue.BATCHES });
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
    setBatchType(type); // Set batch type

    try {
      // Initialize batch processing
      setBatchProcessing(true);
      setBatchStage('initializing');
      setBatchProgress(10);
      setBatchError(undefined);

      try {
        // Indicate we're starting the pipeline
        setBatchStage('processing');
        setBatchProgress(20);

        // Start the appropriate pipeline (will poll internally)
        // The frontend API functions now handle the polling internally
        let result;

        // Show polling progress while waiting
        // Create a progress interval for visual feedback
        const progressInterval = setInterval(() => {
          setBatchProgress((prev) => {
            // Progress from 20% to 80% during polling
            return prev < 80 ? prev + 1 : prev;
          });
        }, 1000); // Update every second

        try {
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

          // Clear the progress interval
          clearInterval(progressInterval);

          // Finalize
          setBatchStage('finalizing');
          setBatchProgress(90);

          // Complete
          setTimeout(() => {
            setBatchStage('completed');
            setBatchProgress(100);

            // Switch to batches tab after completion
            setCurrentTab(TabValue.BATCHES);
            setSearchParams({ tab: TabValue.BATCHES });
          }, 500);
        } catch (error) {
          // Clear the progress interval if there's an error
          clearInterval(progressInterval);
          throw error;
        }
      } catch (error) {
        console.error(`Failed to run ${type} batch:`, error);
        setBatchStage('error');
        setBatchError(`Failed to complete the ${type} analysis. Please try again later.`);
      }
    } catch (err) {
      console.error(`Failed to run ${type} batch:`, err);
      setBatchStage('error');
      setBatchError(`Failed to complete the ${type} analysis. Please try again later.`);
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
                disabled={batchProcessing}
                size="large"
              >
                {hasAllResults ? 'Refresh Analysis' : 'Run Analysis'}
              </Button>

              <Button
                variant="contained"
                color="secondary"
                startIcon={<EmailIcon />}
                onClick={handleRunBatchWithEmail}
                disabled={batchProcessing}
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
      {/* Batch Processing Overlay */}
      <BatchProcessingOverlay
        open={batchProcessing}
        currentStage={batchStage}
        progress={batchProgress}
        error={batchError}
        onClose={handleBatchCompleted}
      />
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
            label="Batches"
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
    </>
  );
};

export default CompanyDetail;
