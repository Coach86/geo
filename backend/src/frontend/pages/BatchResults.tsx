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
import {
  getBatchExecution,
  getBatchExecutionRawResponses
} from '../utils/api-batch';
import SpontaneousTab from '../components/company-detail/SpontaneousTab';
import SentimentTab from '../components/company-detail/SentimentTab';
import ComparisonTab from '../components/company-detail/ComparisonTab';
import {
  BatchExecution,
  BatchResult,
  RawResponse,
  SpontaneousResults,
  SentimentResults,
  ComparisonResults,
  SourceCitation,
  ToolUseInfo
} from '../utils/types';

enum TabValue {
  SUMMARY = 'summary',
  SPONTANEOUS = 'spontaneous',
  SENTIMENT = 'sentiment',
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
  const [comparisonResults, setComparisonResults] = useState<ComparisonResults | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        setLoading(true);

        // Fetch batch execution details
        const batchExecutionData = await getBatchExecution(id);
        setBatchExecution(batchExecutionData);

        // Parse results
        const spontaneousResult = batchExecutionData.finalResults.find(
          (r: BatchResult) => r.resultType === 'spontaneous'
        );
        const sentimentResult = batchExecutionData.finalResults.find(
          (r: BatchResult) => r.resultType === 'sentiment'
        );
        const comparisonResult = batchExecutionData.finalResults.find(
          (r: BatchResult) => r.resultType === 'comparison'
        );

        if (spontaneousResult) {
          // Handle result that could be either an object or a JSON string
          const parsedResult = typeof spontaneousResult.result === 'string'
            ? JSON.parse(spontaneousResult.result)
            : spontaneousResult.result;
          setSpontaneousResults(parsedResult);
        }

        if (sentimentResult) {
          // Handle result that could be either an object or a JSON string
          const parsedResult = typeof sentimentResult.result === 'string'
            ? JSON.parse(sentimentResult.result)
            : sentimentResult.result;
          setSentimentResults(parsedResult);
        }

        if (comparisonResult) {
          // Handle result that could be either an object or a JSON string
          const parsedResult = typeof comparisonResult.result === 'string'
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
  
  const navigateToCompany = () => {
    if (batchExecution?.identityCard?.id) {
      navigate(`/companies/${batchExecution.identityCard.id}`);
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
  
  // Group raw responses by type and provider
  const groupedResponses: Record<string, Record<string, RawResponse[]>> = {};

  rawResponses.forEach(response => {
    if (!groupedResponses[response.promptType]) {
      groupedResponses[response.promptType] = {};
    }

    if (!groupedResponses[response.promptType][response.llmProvider]) {
      groupedResponses[response.promptType][response.llmProvider] = [];
    }

    groupedResponses[response.promptType][response.llmProvider].push(response);
  });
  
  const getPromptTypeIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <ChatBubbleOutlineIcon />;
      case 'spontaneous':
        return <QuestionAnswerIcon />;
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

  return (
    <>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Batch Analysis Results
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            icon={<ShoppingBasketIcon />}
            label={batchExecution.identityCard?.brandName || 'Unknown Company'}
            color="primary"
            onClick={navigateToCompany}
            clickable
          />
          <Chip 
            icon={<SettingsIcon />} 
            label={`Status: ${batchExecution.status}`}
            color={batchExecution.status === 'completed' ? 'success' : 'warning'}
            variant="outlined" 
          />
          <Chip 
            label={`Executed: ${formatDate(batchExecution.executedAt)}`}
            variant="outlined" 
          />
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
              label="Spontaneous" 
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
              label="Comparison" 
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
                    This batch analysis for <strong>{batchExecution.identityCard?.brandName || 'Unknown Company'}</strong> was executed on {formatDate(batchExecution.executedAt)}.
                    The analysis status is <strong>{batchExecution.status}</strong>.
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Analysis Components:
                    </Typography>
                    <List dense>
                      {spontaneousResults && (
                        <ListItem>
                          <ListItemText 
                            primary="Spontaneous Mentions Analysis" 
                            secondary={`Mention rate: ${(spontaneousResults.summary.mentionRate * 100).toFixed(1)}%`} 
                          />
                        </ListItem>
                      )}
                      {sentimentResults && (
                        <ListItem>
                          <ListItemText 
                            primary="Sentiment Analysis" 
                            secondary={`Overall sentiment: ${sentimentResults.summary.overallSentiment}, Accuracy: ${(sentimentResults.summary.averageAccuracy * 100).toFixed(1)}%`} 
                          />
                        </ListItem>
                      )}
                      {comparisonResults && (
                        <ListItem>
                          <ListItemText 
                            primary="Competitor Comparison Analysis" 
                            secondary={`Win rate: ${(comparisonResults.summary.winRate * 100).toFixed(1)}%`} 
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
                      {Object.keys(groupedResponses).map(promptType => (
                        <ListItem key={promptType}>
                          <ListItemText 
                            primary={`${promptType.charAt(0).toUpperCase() + promptType.slice(1)} Type`} 
                            secondary={`${Object.values(groupedResponses[promptType])
                              .reduce((acc, curr) => acc + curr.length, 0)} responses`} 
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
          
          {currentTab === TabValue.COMPARISON && comparisonResults && batchExecution?.identityCard && (
            <ComparisonTab results={comparisonResults} company={batchExecution.identityCard} />
          )}
          
          {currentTab === TabValue.RAW_RESPONSES && (
            <Grid container spacing={3}>
              {Object.keys(groupedResponses).map(promptType => (
                <Grid key={promptType} size={{ xs: 12 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        {getPromptTypeIcon(promptType)}
                        <Box component="span" sx={{ ml: 1 }}>
                          {promptType.charAt(0).toUpperCase() + promptType.slice(1)} Responses
                        </Box>
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      {Object.keys(groupedResponses[promptType]).map(provider => (
                        <Box key={provider} sx={{ mb: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            {provider}
                          </Typography>
                          
                          {groupedResponses[promptType][provider].map((response, index) => (
                            <Accordion key={response.id} sx={{ mb: 1 }}>
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <Typography>
                                    Prompt #{response.promptIndex + 1}
                                  </Typography>
                                  <Box>
                                    {response.usedWebSearch && (
                                      <Chip
                                        icon={<SearchIcon />}
                                        label="Web Search"
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ mr: 1 }}
                                      />
                                    )}
                                    {response.citations && (
                                      <Chip
                                        icon={<LinkIcon />}
                                        label={`${Array.isArray(response.citations) 
                                          ? response.citations.length 
                                          : JSON.parse(typeof response.citations === 'string' ? response.citations : '[]').length} Citations`}
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                <Box>
                                  {/* Question/Answer Section */}
                                  <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                      Question:
                                    </Typography>
                                    <Typography 
                                      variant="body1" 
                                      sx={{ 
                                        backgroundColor: 'background.paper',
                                        p: 2,
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        mb: 2
                                      }}
                                    >
                                      {/* We need to create a display for the question without accessing promptSet directly */}
                                      {response.promptType === 'spontaneous' ? 
                                        `Spontaneous prompt #${response.promptIndex + 1}` : 
                                        response.promptType === 'direct' ?
                                          `Direct sentiment prompt #${response.promptIndex + 1}` :
                                          `Comparison prompt #${response.promptIndex + 1}`
                                      }
                                    </Typography>
                                    
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                      Answer:
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
                                        overflow: 'visible'
                                      }}
                                    >
                                      {response.response}
                                    </Typography>
                                  </Box>
                                  
                                  {/* Citations Section - Now displayed immediately after Answer */}
                                  {response.citations && (
                                    <Box sx={{ mb: 3 }}>
                                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                        <LinkIcon fontSize="small" sx={{ mr: 1 }} />
                                        Citations:
                                      </Typography>
                                      <Card variant="outlined">
                                        <List dense disablePadding>
                                          {(Array.isArray(response.citations) 
                                            ? response.citations
                                            : JSON.parse(typeof response.citations === 'string' ? response.citations : '[]'))
                                            .map((citation: SourceCitation, i: number) => (
                                              <ListItem key={i} divider={i < (Array.isArray(response.citations) 
                                                ? response.citations.length 
                                                : JSON.parse(typeof response.citations === 'string' ? response.citations : '[]').length) - 1}>
                                                <ListItemText
                                                  primary={citation.title || 'Untitled Source'}
                                                  secondary={
                                                    <>
                                                      <a
                                                        href={citation.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: 'inherit', wordBreak: 'break-all' }}
                                                      >
                                                        {citation.url}
                                                      </a>
                                                      {citation.text && (
                                                        <Box sx={{ mt: 1, fontSize: '0.85rem', fontStyle: 'italic', color: 'text.secondary' }}>
                                                          "{citation.text}"
                                                        </Box>
                                                      )}
                                                    </>
                                                  }
                                                />
                                              </ListItem>
                                            ))
                                          }
                                          
                                        </List>
                                      </Card>
                                    </Box>
                                  )}

                                  {/* Web Search Queries Section - Show if either flag or tool usage data exists */}
                                  {response.toolUsage && (
                                    <Box sx={{ mb: 3 }}>
                                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                        <SearchIcon fontSize="small" sx={{ mr: 1 }} />
                                        Web Search Queries:
                                      </Typography>
                                      {/* Web search queries information */}
                                      
                                      <Card variant="outlined">
                                        <List dense disablePadding>
                                          {(() => {
                                            try {
                                              const toolUsageData = Array.isArray(response.toolUsage) 
                                                ? response.toolUsage
                                                : JSON.parse(typeof response.toolUsage === 'string' ? response.toolUsage : '[]');
                                              
                                              const webSearchTools = toolUsageData.filter((tool: ToolUseInfo) => 
                                                tool.type === 'web_search' || 
                                                tool.type === 'search' || 
                                                tool.type?.includes('search'));
                                              
                                              if (webSearchTools.length === 0) {
                                                return (
                                                  <ListItem>
                                                    <ListItemText primary="No web search queries found" />
                                                  </ListItem>
                                                );
                                              }
                                              
                                              return webSearchTools.map((tool: ToolUseInfo, i: number) => (
                                                <ListItem key={i} divider={i < webSearchTools.length - 1}>
                                                  <ListItemText
                                                    primary={`Query: ${tool.parameters?.query || tool.parameters?.q || 'Unknown query'}`}
                                                    secondary={`Status: ${tool.execution_details?.status || 'Unknown status'}`}
                                                  />
                                                </ListItem>
                                              ));
                                            } catch (err: any) {
                                              const errorMessage = err?.message || 'Unknown error';
                                              return (
                                                <ListItem>
                                                  <ListItemText primary={`Error parsing tool usage data: ${errorMessage}`} />
                                                </ListItem>
                                              );
                                            }
                                          })()}
                                        </List>
                                      </Card>
                                    </Box>
                                  )}
                                </Box>
                              </AccordionDetails>
                            </Accordion>
                          ))}
                        </Box>
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