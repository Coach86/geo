import React from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
  Chip,
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
  Grid,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { SpontaneousResults } from '../../utils/types';

interface SpontaneousTabProps {
  results: SpontaneousResults;
}

const SpontaneousTab: React.FC<SpontaneousTabProps> = ({ results }) => {
  const { summary, results: detailedResults, webSearchSummary } = results;
  
  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <ShowChartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Spontaneous Mentions Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This analysis shows how often your brand is spontaneously mentioned across different LLMs.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mention Rate
              </Typography>
              <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                {(summary.mentionRate * 100).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This represents the percentage of times your brand was mentioned without prompting across all LLMs and prompts.
              </Typography>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={summary.mentionRate * 100}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SearchIcon sx={{ mr: 1 }} />
                Web Search Activity
              </Typography>
              {webSearchSummary ? (
                <>
                  <Typography variant="h3" color="primary" sx={{ mb: 2 }}>
                    {webSearchSummary.webSearchCount}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Number of responses that used web search
                  </Typography>
                  
                  {/* Top Search Queries section has been removed */}
                  <Divider sx={{ mt: 3, mb: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Consulted Websites:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {webSearchSummary.consultedWebsites.length > 0 ? (
                      <>
                        {/* Display only the top 5 websites */}
                        {webSearchSummary.consultedWebsites.slice(0, 5).map((website, index) => (
                          <Chip
                            key={index}
                            label={website}
                            color={index < 3 ? "secondary" : "default"}
                            variant={index < 3 ? "filled" : "outlined"}
                            size="small"
                            icon={<LinkIcon />}
                          />
                        ))}
                        
                        {/* Show a "+X more" chip if there are more than 5 websites */}
                        {webSearchSummary.consultedWebsites.length > 5 && (
                          <Chip
                            label={`+${webSearchSummary.consultedWebsites.length - 5} more`}
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                        )}
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No websites consulted
                      </Typography>
                    )}
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No web search data available
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Mentions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {summary.topMentions.length > 0 ? (
                  summary.topMentions.map((mention, index) => (
                    <Chip
                      key={index}
                      label={mention}
                      color={index < 3 ? "primary" : "default"}
                      variant={index < 3 ? "filled" : "outlined"}
                    />
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No top mentions found.
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                These are the brands most frequently mentioned in responses.
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
                <Table sx={{ minWidth: 650 }} aria-label="spontaneous results table">
                  <TableHead>
                    <TableRow>
                      <TableCell>LLM</TableCell>
                      <TableCell>Prompt #</TableCell>
                      <TableCell align="center">Mentioned</TableCell>
                      <TableCell>Top-of-Mind Brands</TableCell>
                      <TableCell align="center">Web Search</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailedResults.map((result, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{result.llmProvider}</TableCell>
                        <TableCell>{result.promptIndex + 1}</TableCell>
                        <TableCell align="center">
                          {result.mentioned ?
                            <CheckCircleIcon color="success" /> :
                            <CancelIcon color="error" />
                          }
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {result.topOfMind.slice(0, 5).map((brand, idx) => (
                              <Chip
                                key={idx}
                                label={brand}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5 }}
                              />
                            ))}
                            {result.topOfMind.length > 5 && (
                              <Chip
                                label={`+${result.topOfMind.length - 5} more`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {result.usedWebSearch ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                              <Chip
                                icon={<SearchIcon />}
                                label={result.citations?.length || 0}
                                size="small"
                                color="primary"
                                sx={{ mb: 0.5 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                {result.citations && result.citations.length > 0 
                                  ? `${Array.from(new Set(result.citations.map(c => {
                                    try {
                                      const url = new URL(c.url);
                                      return url.hostname;
                                    } catch (e) {
                                      return c.url;
                                    }
                                  }))).length} sites` 
                                  : 'No sites'}
                              </Typography>
                            </Box>
                          ) : 
                          <CancelIcon color="disabled" fontSize="small" />
                          }
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
            Raw Responses
          </Typography>
          {detailedResults.map((result, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography>
                    <strong>{result.llmProvider}</strong> - Prompt #{result.promptIndex + 1}
                    {result.mentioned && <CheckCircleIcon color="success" fontSize="small" sx={{ ml: 1 }} />}
                  </Typography>
                  <Box>
                    {result.usedWebSearch && (
                      <Chip
                        icon={<SearchIcon />}
                        label="Web Search"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ mr: 1 }}
                      />
                    )}
                    {result.citations && result.citations.length > 0 && (
                      <Chip
                        icon={<LinkIcon />}
                        label={`${result.citations.length} Citations`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Question:
                </Typography>
                <Typography variant="body2" paragraph sx={{ mb: 2, whiteSpace: 'pre-wrap', maxHeight: 'none', overflow: 'visible' }}>
                  {result.originalPrompt || 'No original prompt available.'}
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Answer:
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 'none', overflow: 'visible' }}>
                  {result.llmResponse || 'No response available.'}
                </Typography>
                
                {/* Web Search Queries Section */}
                {result.usedWebSearch && result.toolUsage && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      <SearchIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Web Search Queries
                    </Typography>
                    <Card variant="outlined" sx={{ mb: 2 }}>
                      <List dense disablePadding>
                        {(() => {
                          try {
                            const toolUsageData = Array.isArray(result.toolUsage) 
                              ? result.toolUsage
                              : JSON.parse(typeof result.toolUsage === 'string' ? result.toolUsage : '[]');
                            
                            const webSearchTools = toolUsageData.filter((tool: any) => 
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
                            
                            return webSearchTools.map((tool: any, i: number) => (
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
                {result.usedWebSearch && result.citations && result.citations.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      <LinkIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                      Citations
                    </Typography>
                    <Card variant="outlined">
                      <List dense disablePadding>
                        {result.citations.map((citation, i) => (
                          <ListItem key={i} divider={i < result.citations!.length - 1}>
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

export default SpontaneousTab;