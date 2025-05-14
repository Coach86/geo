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
  LinearProgress,
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
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { ComparisonResults, CompanyIdentityCard, ToolUseInfo, SourceCitation } from '../../utils/types';

interface ComparisonTabProps {
  results: ComparisonResults;
  company: CompanyIdentityCard;
}

const ComparisonTab: React.FC<ComparisonTabProps> = ({ results, company }) => {
  const { summary, results: detailedResults } = results;
  
  // Function to check if the company is the winner in a comparison
  const isCompanyWinner = (winner: string): boolean => {
    const companyName = company.brandName.toLowerCase();
    return winner.toLowerCase().includes(companyName);
  };

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
                Win Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmojiEventsIcon 
                  color={summary.winRate > 0.5 ? "primary" : "action"} 
                  sx={{ fontSize: '3rem', mr: 2 }}
                />
                <Typography variant="h3" color="primary">
                  {(summary.winRate * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                This represents how often your brand comes out ahead in comparisons.
              </Typography>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={summary.winRate * 100} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Differentiators
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {summary.keyDifferentiators.length > 0 ? (
                  summary.keyDifferentiators.map((diff, index) => (
                    <Chip
                      key={index}
                      label={diff}
                      color={index < 3 ? "primary" : "default"}
                      variant={index < 3 ? "filled" : "outlined"}
                      icon={index < 3 ? <ArrowUpwardIcon /> : undefined}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No key differentiators found.
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                These are the most frequently mentioned differentiating factors for your brand.
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
                <Table sx={{ minWidth: 650 }} aria-label="comparison results table">
                  <TableHead>
                    <TableRow>
                      <TableCell>LLM</TableCell>
                      <TableCell>Prompt #</TableCell>
                      <TableCell>Winner</TableCell>
                      <TableCell>Differentiators</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailedResults.map((result, index) => (
                      <TableRow 
                        key={index} 
                        hover
                        sx={{ 
                          backgroundColor: isCompanyWinner(result.winner) ? 'success.light' : undefined 
                        }}
                      >
                        <TableCell>{result.llmProvider}</TableCell>
                        <TableCell>{result.promptIndex + 1}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {isCompanyWinner(result.winner) && (
                              <EmojiEventsIcon color="primary" sx={{ mr: 1 }} />
                            )}
                            <Typography 
                              sx={{ 
                                fontWeight: isCompanyWinner(result.winner) ? 'bold' : 'normal',
                                color: isCompanyWinner(result.winner) ? 'primary.main' : 'text.primary'
                              }}
                            >
                              {result.winner}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {result.differentiators.slice(0, 3).map((diff, idx) => (
                              <Chip 
                                key={idx} 
                                label={diff.length > 40 ? `${diff.substring(0, 40)}...` : diff} 
                                size="small" 
                                sx={{ mr: 0.5, mb: 0.5 }} 
                              />
                            ))}
                            {result.differentiators.length > 3 && (
                              <Chip 
                                label={`+${result.differentiators.length - 3} more`} 
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
            Detailed Comparisons & Raw Responses
          </Typography>
          {detailedResults.map((result, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                sx={{ 
                  backgroundColor: isCompanyWinner(result.winner) ? 'success.light' : undefined 
                }}
              >
                <Typography>
                  <strong>{result.llmProvider}</strong> - Prompt #{result.promptIndex + 1}
                  {isCompanyWinner(result.winner) && (
                    <EmojiEventsIcon color="primary" fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                  )}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Winner:
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: 2, 
                    color: isCompanyWinner(result.winner) ? 'primary.main' : 'text.primary' 
                  }}
                >
                  {result.winner}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Differentiators:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {result.differentiators.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                      {result.differentiators.map((diff, idx) => (
                        <li key={idx}>
                          <Typography variant="body2">{diff}</Typography>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No differentiators specified.
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