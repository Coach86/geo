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
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { AccuracyResults, ToolUseInfo, SourceCitation } from '../../utils/types';

interface AccuracyTabProps {
  results: AccuracyResults;
}

const AccuracyTab: React.FC<AccuracyTabProps> = ({ results }) => {
  const { summary, results: detailedResults } = results;

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <FactCheckIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Accuracy Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This analysis evaluates the factual accuracy of information about your brand across different LLMs.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Overall Accuracy
              </Typography>
              <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                {(summary.averageAccuracy * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This represents the average accuracy of information about your brand across all LLMs.
              </Typography>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={summary.averageAccuracy * 100} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Accuracy Results by LLM
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table sx={{ minWidth: 650 }} aria-label="accuracy results table">
                  <TableHead>
                    <TableRow>
                      <TableCell>LLM</TableCell>
                      <TableCell>Prompt #</TableCell>
                      <TableCell align="center">Accuracy</TableCell>
                      <TableCell>Key Facts</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailedResults.map((result, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{result.llmProvider}</TableCell>
                        <TableCell>{result.promptIndex + 1}</TableCell>
                        <TableCell align="center">
                          {(result.accuracy * 100).toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {result.factualInformation.slice(0, 3).map((fact, idx) => (
                              <Chip 
                                key={idx} 
                                label={fact.length > 40 ? `${fact.substring(0, 40)}...` : fact} 
                                size="small" 
                                sx={{ mr: 0.5, mb: 0.5 }} 
                              />
                            ))}
                            {result.factualInformation.length > 3 && (
                              <Chip 
                                label={`+${result.factualInformation.length - 3} more`} 
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
                  <strong>{result.llmProvider}</strong> - Prompt #{result.promptIndex + 1} - 
                  <strong> Accuracy: {(result.accuracy * 100).toFixed(1)}%</strong>
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Extracted Facts:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {result.factualInformation.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {result.factualInformation.map((fact, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{fact}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No facts extracted.
                    </Typography>
                  )}
                </Box>
                
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

export default AccuracyTab;