import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { SentimentResults, ToolUseInfo, SourceCitation } from '../../utils/types';

interface SentimentTabProps {
  results: SentimentResults;
}

const SentimentTab: React.FC<SentimentTabProps> = ({ results }) => {
  const { summary, results: detailedResults } = results;

  // Function to render sentiment icon
  const renderSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <SentimentSatisfiedAltIcon color="success" />;
      case 'neutral':
        return <SentimentNeutralIcon color="info" />;
      case 'negative':
        return <SentimentVeryDissatisfiedIcon color="error" />;
      default:
        return <SentimentNeutralIcon color="info" />;
    }
  };

  // Function to get color based on sentiment
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'success.main';
      case 'neutral':
        return 'info.main';
      case 'negative':
        return 'error.main';
      default:
        return 'info.main';
    }
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <SentimentSatisfiedAltIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Sentiment Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This analysis examines how your brand is perceived across different LLMs.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Sentiment
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ mr: 2, fontSize: '3rem' }}>
                  {renderSentimentIcon(summary.overallSentiment)}
                </Box>
                <Typography
                  variant="h3"
                  sx={{
                    textTransform: 'capitalize',
                    color: getSentimentColor(summary.overallSentiment),
                  }}
                >
                  {summary.overallSentiment}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                This represents the overall sentiment toward your brand from all LLM responses.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Results by LLM
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table sx={{ minWidth: 650 }} aria-label="sentiment results table">
                  <TableHead>
                    <TableRow>
                      <TableCell>LLM</TableCell>
                      <TableCell>Prompt #</TableCell>
                      <TableCell align="center">Sentiment</TableCell>
                      <TableCell>Key Facts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailedResults.map((result, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{result.llmProvider}</TableCell>
                        <TableCell>{result.promptIndex + 1}</TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            {renderSentimentIcon(result.sentiment)}
                            <Typography
                              sx={{
                                ml: 1,
                                textTransform: 'capitalize',
                                color: getSentimentColor(result.sentiment),
                              }}
                            >
                              {result.sentiment}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {result.extractedPositiveKeywords.slice(0, 3).map((fact, idx) => (
                              <Chip
                                key={idx}
                                label={fact.length > 40 ? `${fact.substring(0, 40)}...` : fact}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                            {result.extractedPositiveKeywords.length > 3 && (
                              <Chip
                                label={`+${result.extractedPositiveKeywords.length - 3} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Extracted Facts & Raw Responses
          </Typography>
          {detailedResults.map((result, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  <strong>{result.llmProvider}</strong> - Prompt #{result.promptIndex + 1}
                  <Box component="span" sx={{ ml: 1 }}>
                    {renderSentimentIcon(result.sentiment)}
                  </Box>
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Extracted Positive Keywords:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {result.extractedPositiveKeywords.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {result.extractedPositiveKeywords.map((fact, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{fact}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No positive keywords extracted.
                    </Typography>
                  )}
                </Box>
                <Typography variant="subtitle2" gutterBottom>
                  Extracted Negative Keywords:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {result.extractedNegativeKeywords.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {result.extractedNegativeKeywords.map((fact, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{fact}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No negative keywords extracted.
                    </Typography>
                  )}
                </Box>
                <Typography variant="subtitle2" gutterBottom>
                  Question:
                </Typography>
                <Typography
                  variant="body2"
                  paragraph
                  sx={{ mb: 2, whiteSpace: 'pre-wrap', maxHeight: 'none', overflow: 'visible' }}
                >
                  {result.originalPrompt || 'No original prompt available.'}
                </Typography>

                <Typography variant="subtitle2" gutterBottom>
                  Answer:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', mb: 3, maxHeight: 'none', overflow: 'visible' }}
                >
                  {result.llmResponse || 'No response available.'}
                </Typography>

                {/* Web Search Queries Section */}
                {result.toolUsage && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <SearchIcon fontSize="small" sx={{ mr: 1 }} />
                      Web Search Queries:
                    </Typography>
                    <Card variant="outlined">
                      <List dense disablePadding>
                        {(() => {
                          try {
                            const toolUsageData = Array.isArray(result.toolUsage)
                              ? result.toolUsage
                              : JSON.parse(
                                  typeof result.toolUsage === 'string' ? result.toolUsage : '[]',
                                );

                            const webSearchTools = toolUsageData.filter(
                              (tool: ToolUseInfo) =>
                                tool.type === 'web_search' ||
                                tool.type === 'search' ||
                                tool.type?.includes('search'),
                            );

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
                                <ListItemText
                                  primary={`Error parsing tool usage data: ${errorMessage}`}
                                />
                              </ListItem>
                            );
                          }
                        })()}
                      </List>
                    </Card>
                  </Box>
                )}

                {/* Display Web Search Queries from the result object directly if available */}
                {result.webSearchQueries &&
                  result.webSearchQueries.length > 0 &&
                  !result.toolUsage && (
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        gutterBottom
                        sx={{ display: 'flex', alignItems: 'center' }}
                      >
                        <SearchIcon fontSize="small" sx={{ mr: 1 }} />
                        Web Search Queries:
                      </Typography>
                      <Card variant="outlined">
                        <List dense disablePadding>
                          {result.webSearchQueries.map((query, i) => (
                            <ListItem key={i} divider={i < result.webSearchQueries!.length - 1}>
                              <ListItemText
                                primary={`Query: ${query.query}`}
                                secondary={`Status: ${query.status} (${query.provider})`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Card>
                    </Box>
                  )}

                {/* Citations Section */}
                {result.citations && result.citations.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      gutterBottom
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <LinkIcon fontSize="small" sx={{ mr: 1 }} />
                      Citations:
                    </Typography>
                    <Card variant="outlined">
                      <List dense disablePadding>
                        {(Array.isArray(result.citations)
                          ? result.citations
                          : JSON.parse(
                              typeof result.citations === 'string' ? result.citations : '[]',
                            )
                        ).map((citation: SourceCitation, i: number) => (
                          <ListItem
                            key={i}
                            divider={
                              i <
                              (Array.isArray(result.citations)
                                ? result.citations.length
                                : JSON.parse(
                                    typeof result.citations === 'string' ? result.citations : '[]',
                                  ).length) -
                                1
                            }
                          >
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
                                    <Box
                                      sx={{
                                        mt: 1,
                                        fontSize: '0.85rem',
                                        fontStyle: 'italic',
                                        color: 'text.secondary',
                                      }}
                                    >
                                      "{citation.text}"
                                    </Box>
                                  )}
                                </>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Card>
                  </Box>
                )}

                {result.error && (
                  <>
                    <Typography variant="subtitle2" color="error" gutterBottom sx={{ mt: 2 }}>
                      Error:
                    </Typography>
                    <Typography variant="body2" color="error">
                      {result.error}
                    </Typography>
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Grid>
      </Grid>
    </>
  );
};

export default SentimentTab;
