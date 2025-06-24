import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Box,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsIcon from '@mui/icons-material/Settings';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { getBatchExecution, getBatchExecutionRawResponses } from '../utils/api-batch';
import SpontaneousTab from '../components/project-detail/tabs/SpontaneousTab';
import SentimentTab from '../components/project-detail/tabs/SentimentTab';
import AccuracyTab from '../components/project-detail/tabs/AccuracyTab';
import ComparisonTab from '../components/project-detail/tabs/ComparisonTab';
import {
  BatchExecution,
  BatchResult,
  RawResponse,
  SpontaneousResults,
  SentimentResults,
  AccuracyResults,
  ComparisonResults,
  SourceCitation,
  ToolUseInfo,
} from '../utils/types';

enum TabValue {
  SUMMARY = 'summary',
  SPONTANEOUS = 'spontaneous',
  SENTIMENT = 'sentiment',
  ACCURACY = 'accuracy',
  COMPARISON = 'comparison',
  RAW_RESPONSES = 'raw-responses',
}

const BatchResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState<TabValue>(TabValue.SUMMARY);
  const [batchExecution, setBatchExecution] = useState<BatchExecution | null>(null);
  const [rawResponses, setRawResponses] = useState<RawResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [spontaneousResults, setSpontaneousResults] = useState<SpontaneousResults | null>(null);
  const [sentimentResults, setSentimentResults] = useState<SentimentResults | null>(null);
  const [accuracyResults, setAccuracyResults] = useState<AccuracyResults | null>(null);
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch batch execution details
        const batchExecutionData = await getBatchExecution(id);
        setBatchExecution(batchExecutionData);

        // Parse results - map database resultType to frontend expectations
        const spontaneousResult = batchExecutionData.finalResults.find(
          (r: BatchResult) => r.resultType === 'visibility',
        );
        const sentimentResult = batchExecutionData.finalResults.find(
          (r: BatchResult) => r.resultType === 'sentiment',
        );
        const accuracyResult = batchExecutionData.finalResults.find(
          (r: BatchResult) => r.resultType === 'alignment',
        );
        const comparisonResult = batchExecutionData.finalResults.find(
          (r: BatchResult) => r.resultType === 'competition',
        );

        if (spontaneousResult) {
          // Handle result that could be either an object or a JSON string
          const parsedResult =
            typeof spontaneousResult.result === 'string'
              ? JSON.parse(spontaneousResult.result)
              : spontaneousResult.result;
          setSpontaneousResults(parsedResult);
        }

        if (sentimentResult) {
          // Handle result that could be either an object or a JSON string
          const parsedResult =
            typeof sentimentResult.result === 'string'
              ? JSON.parse(sentimentResult.result)
              : sentimentResult.result;
          setSentimentResults(parsedResult);
        }

        if (accuracyResult) {
          // Handle result that could be either an object or a JSON string
          const parsedResult =
            typeof accuracyResult.result === 'string'
              ? JSON.parse(accuracyResult.result)
              : accuracyResult.result;
          setAccuracyResults(parsedResult);
        }

        if (comparisonResult) {
          // Handle result that could be either an object or a JSON string
          const parsedResult =
            typeof comparisonResult.result === 'string'
              ? JSON.parse(comparisonResult.result)
              : comparisonResult.result;
          setComparisonResults(parsedResult);
        }

        // Fetch raw responses
        const rawResponsesData = await getBatchExecutionRawResponses(id);
        setRawResponses(rawResponsesData);

        setError(null);
      } catch (err) {
        console.error('Failed to fetch batch results:', err);
        setError('Failed to load batch results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setCurrentTab(newValue);
  };

  const navigateToProject = () => {
    if (batchExecution?.project?.id) {
      navigate(`/projects/${batchExecution.project.id}`);
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

  if (!batchExecution) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <AlertTitle>Batch Execution Not Found</AlertTitle>
        The batch execution you're looking for doesn't exist or has been removed.
      </Alert>
    );
  }

  // Group raw responses by type only
  const groupedResponses: Record<string, RawResponse[]> = {};

  rawResponses.forEach((response) => {
    if (!groupedResponses[response.promptType]) {
      groupedResponses[response.promptType] = [];
    }

    groupedResponses[response.promptType].push(response);
  });

  const getPromptTypeIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <ChatBubbleOutlineIcon />;
      case 'spontaneous':
        return <QuestionAnswerIcon />;
      case 'accuracy':
        return <FactCheckIcon />;
      case 'comparison':
        return <CompareArrowsIcon />;
      default:
        return <DescriptionIcon />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getPromptTypeDisplayName = (type: string) => {
    switch (type) {
      case 'spontaneous':
      case 'visibility':
        return 'Visibility';
      case 'direct':
      case 'sentiment':
        return 'Sentiment';
      case 'accuracy':
      case 'alignment':
        return 'Alignment';
      case 'comparison':
      case 'competition':
        return 'Competition';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Batch Analysis Results
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            icon={<ShoppingBasketIcon />}
            label={batchExecution.project?.brandName || 'Unknown Project'}
            color="primary"
            onClick={navigateToProject}
            clickable
          />
          <Chip
            icon={<SettingsIcon />}
            label={`Status: ${batchExecution.status}`}
            color={batchExecution.status === 'completed' ? 'success' : 'warning'}
            variant="outlined"
          />
          <Chip label={`Executed: ${formatDate(batchExecution.executedAt)}`} variant="outlined" />
        </Box>
      </Box>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="batch results tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              label="Summary"
              value={TabValue.SUMMARY}
              icon={<DescriptionIcon />}
              iconPosition="start"
            />
            <Tab
              label="Visibility"
              value={TabValue.SPONTANEOUS}
              icon={<QuestionAnswerIcon />}
              iconPosition="start"
              disabled={!spontaneousResults}
            />
            <Tab
              label="Sentiment"
              value={TabValue.SENTIMENT}
              icon={<ChatBubbleOutlineIcon />}
              iconPosition="start"
              disabled={!sentimentResults}
            />
            <Tab
              label="Alignment"
              value={TabValue.ACCURACY}
              icon={<FactCheckIcon />}
              iconPosition="start"
              disabled={!accuracyResults}
            />
            <Tab
              label="Competition"
              value={TabValue.COMPARISON}
              icon={<CompareArrowsIcon />}
              iconPosition="start"
              disabled={!comparisonResults}
            />
            <Tab
              label="Raw Responses"
              value={TabValue.RAW_RESPONSES}
              icon={<DescriptionIcon />}
              iconPosition="start"
              disabled={rawResponses.length === 0}
            />
          </Tabs>
        </Box>

        <Box sx={{ py: 3 }}>
          {currentTab === TabValue.SUMMARY && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Batch Analysis Summary
                  </Typography>
                  <Typography variant="body1" paragraph>
                    This batch analysis for{' '}
                    <strong>{batchExecution.project?.brandName || 'Unknown Company'}</strong> was
                    executed on {formatDate(batchExecution.executedAt)}. The analysis status is{' '}
                    <strong>{batchExecution.status}</strong>.
                  </Typography>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Analysis Components:
                    </Typography>
                    <List dense>
                      {spontaneousResults && (
                        <ListItem>
                          <ListItemText
                            primary="Visibility Analysis"
                            secondary={`Mention rate: ${(spontaneousResults.summary.mentionRate * 100).toFixed(1)}%`}
                          />
                        </ListItem>
                      )}
                      {sentimentResults && (
                        <ListItem>
                          <ListItemText
                            primary="Sentiment Analysis"
                            secondary={`Overall sentiment: ${sentimentResults.summary.overallSentiment}`}
                          />
                        </ListItem>
                      )}
                      {accuracyResults && accuracyResults.summary && (
                        <ListItem>
                          <ListItemText
                            primary="Alignment — Brand Compliance"
                            secondary={(() => {
                              if (accuracyResults.summary.averageAttributeScores) {
                                const scores = Object.values(
                                  accuracyResults.summary.averageAttributeScores,
                                );
                                if (scores.length > 0) {
                                  const avg =
                                    scores.reduce((sum, score) => sum + score, 0) / scores.length;
                                  return `Average alignment: ${(avg * 100).toFixed(1)}%`;
                                }
                              }
                              return 'Attribute-based alignment analysis';
                            })()}
                          />
                        </ListItem>
                      )}
                      {comparisonResults && (
                        <ListItem>
                          <ListItemText
                            primary="Competitor Comparison Analysis"
                            secondary={`${comparisonResults.summary.competitorAnalyses.length} competitors analyzed`}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Raw Response Stats:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Total Raw Responses"
                          secondary={`${rawResponses.length} responses collected`}
                        />
                      </ListItem>
                      {Object.keys(groupedResponses).map((promptType) => (
                        <ListItem key={promptType}>
                          <ListItemText
                            primary={`${getPromptTypeDisplayName(promptType)} Type`}
                            secondary={`${groupedResponses[promptType].length} responses`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          )}

          {currentTab === TabValue.SPONTANEOUS && spontaneousResults && (
            <SpontaneousTab results={spontaneousResults} />
          )}

          {currentTab === TabValue.SENTIMENT && sentimentResults && (
            <SentimentTab results={sentimentResults} />
          )}

          {currentTab === TabValue.ACCURACY && accuracyResults && (
            <AccuracyTab results={accuracyResults} />
          )}

          {currentTab === TabValue.COMPARISON && comparisonResults && batchExecution?.project && (
            <ComparisonTab results={comparisonResults} project={batchExecution.project} />
          )}

          {currentTab === TabValue.RAW_RESPONSES && (
            <Grid container spacing={3}>
              {Object.keys(groupedResponses).map((promptType) => (
                <Grid key={promptType} size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant="h6"
                        gutterBottom
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        {getPromptTypeIcon(promptType)}
                        <Box component="span" sx={{ ml: 1 }}>
                          {getPromptTypeDisplayName(promptType)} Responses
                        </Box>
                      </Typography>
                      <Divider sx={{ mb: 2 }} />

                      {groupedResponses[promptType].map((response, index) => (
                        <Accordion key={response.id} sx={{ mb: 1 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                              }}
                            >
                              <Typography>Prompt #{response.promptIndex + 1}</Typography>
                              <Box>
                                {response.analyzerResponse && (
                                  <Chip
                                    icon={<FactCheckIcon />}
                                    label="Analysis Complete"
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    sx={{ mr: 1 }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box>
                              {/* Original Prompt Section */}
                              <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                  Original Prompt:
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    whiteSpace: 'pre-wrap',
                                    backgroundColor: 'background.paper',
                                    p: 2,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    mb: 2,
                                  }}
                                >
                                  {response.originalPrompt}
                                </Typography>

                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                  LLM Response ({response.llmResponseModel || 'Unknown Model'}):
                                </Typography>
                                <Typography
                                  variant="body1"
                                  sx={{
                                    whiteSpace: 'pre-wrap',
                                    backgroundColor: 'background.paper',
                                    p: 2,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    mb: 2,
                                    maxHeight: 'none',
                                    overflow: 'visible',
                                  }}
                                >
                                  {response.llmResponse}
                                </Typography>
                              </Box>

                              {/* Analyzer Section */}
                              {response.analyzerPrompt && (
                                <Box sx={{ mb: 3 }}>
                                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Analyzer Prompt
                                    {response.analyzerResponseModel
                                      ? ` (for ${response.analyzerResponseModel})`
                                      : ''}
                                    :
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      whiteSpace: 'pre-wrap',
                                      backgroundColor: 'background.paper',
                                      p: 2,
                                      borderRadius: 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      mb: 2,
                                    }}
                                  >
                                    {response.analyzerPrompt}
                                  </Typography>
                                </Box>
                              )}

                              {/* Show warning if analyzer data is missing */}
                              {!response.analyzerPrompt && !response.analyzerResponse && (
                                <Box sx={{ mb: 3 }}>
                                  <Alert severity="info">
                                    No analyzer data available for this response. This could be
                                    because the response was generated before the analyzer feature
                                    was added.
                                  </Alert>
                                </Box>
                              )}

                              {/* Analyzer Response Section */}
                              {response.analyzerResponse && (
                                <Box sx={{ mb: 3 }}>
                                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Analyzer Response (
                                    {response.analyzerResponseModel || 'Structured'}):
                                  </Typography>
                                  <Typography
                                    variant="body1"
                                    sx={{
                                      whiteSpace: 'pre-wrap',
                                      backgroundColor: 'background.paper',
                                      p: 2,
                                      borderRadius: 1,
                                      border: '1px solid',
                                      borderColor: 'divider',
                                      mb: 2,
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {JSON.stringify(response.analyzerResponse, null, 2)}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Box>
    </>
  );
};

export default BatchResults;
