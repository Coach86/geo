import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
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
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { ComparisonResults, Project, ToolUseInfo, SourceCitation, BrandBattleAnalysis } from '../../../utils/types';

interface ComparisonTabProps {
  results: ComparisonResults;
  project: Project;
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({ results, project }) => {
  const { summary, results: detailedResults } = results;
  
  // Function to check if we have results for a specific competitor
  const hasCompetitorResults = (competitor: string): boolean => {
    return detailedResults.some(r => r.competitor === competitor);
  };
  
  // Get unique competitors from the results
  const competitorsSet = new Set<string>();
  detailedResults.forEach(r => competitorsSet.add(r.competitor));
  const competitors = Array.from(competitorsSet);

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <CompareArrowsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Competitor Comparison
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This analysis compares your brand against competitors across different LLMs.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Common Strengths
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {summary.commonStrengths && summary.commonStrengths.length > 0 ? (
                  summary.commonStrengths.map((strength, index) => (
                    <Chip
                      key={index}
                      label={strength}
                      color="primary"
                      variant={index < 3 ? "filled" : "outlined"}
                      icon={index < 3 ? <ArrowUpwardIcon /> : undefined}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No common strengths found.
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                These are the strengths that appear across multiple competitors.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Common Weaknesses
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {summary.commonWeaknesses && summary.commonWeaknesses.length > 0 ? (
                  summary.commonWeaknesses.map((weakness, index) => (
                    <Chip
                      key={index}
                      label={weakness}
                      color="error"
                      variant={index < 3 ? "filled" : "outlined"}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No common weaknesses found.
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                These are the weaknesses that appear across multiple competitors.
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Detailed Results
          </Typography>
          {detailedResults.map((result, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography>
                    <strong>{result.llmProvider}/{result.llmModel}</strong> - Competitor: {result.competitor}
                  </Typography>
                  <Typography variant="body2" sx={{ ml: 2, display: 'flex', gap: 1 }}>
                    <Chip 
                      size="small" 
                      color="primary" 
                      label={`${result.brandStrengths?.length || 0} strengths`}
                    />
                    <Chip 
                      size="small" 
                      color="error" 
                      label={`${result.brandWeaknesses?.length || 0} weaknesses`}
                    />
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Competitor:
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: 2
                  }}
                >
                  {result.competitor}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Brand Strengths vs {result.competitor}:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {result.brandStrengths && result.brandStrengths.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {result.brandStrengths.map((strength, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{strength}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No strengths specified.
                    </Typography>
                  )}
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Brand Weaknesses vs {result.competitor}:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {result.brandWeaknesses && result.brandWeaknesses.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {result.brandWeaknesses.map((weakness, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{weakness}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No weaknesses specified.
                    </Typography>
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>
                  Question:
                </Typography>
                <Typography variant="body2" paragraph sx={{ mb: 2, whiteSpace: 'pre-wrap', maxHeight: 'none', overflow: 'visible' }}>
                  {result.originalPrompt || 'No original prompt available.'}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Answer:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 3, maxHeight: 'none', overflow: 'visible' }}>
                  {result.llmResponse || 'No response available.'}
                </Typography>
                
                {/* Web Search Queries Section */}
                {result.toolUsage && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <SearchIcon fontSize="small" sx={{ mr: 1 }} />
                      Web Search Queries:
                    </Typography>
                    <Card variant="outlined">
                      <List dense disablePadding>
                        {(() => {
                          try {
                            const toolUsageData = Array.isArray(result.toolUsage) 
                              ? result.toolUsage
                              : JSON.parse(typeof result.toolUsage === 'string' ? result.toolUsage : '[]');
                            
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
                
                {/* Display Web Search Queries from the result object directly if available */}
                {result.webSearchQueries && result.webSearchQueries.length > 0 && !result.toolUsage && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
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
                    <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <LinkIcon fontSize="small" sx={{ mr: 1 }} />
                      Citations:
                    </Typography>
                    <Card variant="outlined">
                      <List dense disablePadding>
                        {(Array.isArray(result.citations) 
                          ? result.citations
                          : JSON.parse(typeof result.citations === 'string' ? result.citations : '[]'))
                          .map((citation: SourceCitation, i: number) => (
                            <ListItem key={i} divider={i < (Array.isArray(result.citations) 
                              ? result.citations.length 
                              : JSON.parse(typeof result.citations === 'string' ? result.citations : '[]').length) - 1}>
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

export default ComparisonTab;