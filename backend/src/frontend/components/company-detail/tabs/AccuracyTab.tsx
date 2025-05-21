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
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SearchIcon from '@mui/icons-material/Search';
import LinkIcon from '@mui/icons-material/Link';
import { AccuracyResults, ToolUseInfo, SourceCitation } from '../../../utils/types';

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
          This analysis evaluates the factual accuracy of information about your brand across
          different LLMs.
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
                {(() => {
                  const scores = Object.values(summary.averageAttributeScores);
                  if (scores.length > 0) {
                    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
                    return (avg * 100).toFixed(1) + '%';
                  }
                  return 'N/A';
                })()}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                This represents the average accuracy of information about your brand across all
                LLMs.
              </Typography>
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={(() => {
                    const scores = Object.values(summary.averageAttributeScores);
                    if (scores.length > 0) {
                      return (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100;
                    }
                    return 0;
                  })()}
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
                Attribute Scores by Model
              </Typography>
              {(() => {
                // Get all unique attributes
                const attributes = Object.keys(summary.averageAttributeScores);
                
                // Get all unique models
                const modelSet = new Set<string>();
                detailedResults.forEach(result => {
                  modelSet.add(result.llmProvider);
                });
                const models = Array.from(modelSet);
                
                // Create a model-to-attribute score mapping
                const modelAttributeScores: Record<string, Record<string, number>> = {};
                
                // Initialize scores
                models.forEach(model => {
                  modelAttributeScores[model] = {};
                  attributes.forEach(attr => {
                    modelAttributeScores[model][attr] = 0;
                  });
                });
                
                // Fill in scores from results
                detailedResults.forEach(result => {
                  const model = result.llmProvider;
                  if (result.attributeScores) {
                    result.attributeScores.forEach(attrScore => {
                      const attr = attrScore.attribute;
                      if (!modelAttributeScores[model][attr]) {
                        modelAttributeScores[model][attr] = 0;
                      }
                      // Add the score, we'll calculate the average later
                      modelAttributeScores[model][attr] = attrScore.score;
                    });
                  }
                });
                
                if (attributes.length === 0 || models.length === 0) {
                  return (
                    <Typography variant="body2" color="text.secondary">
                      No attribute scores available
                    </Typography>
                  );
                }
                
                // Render the attribute scores matrix
                return (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>Attribute</TableCell>
                          {models.map((model, idx) => (
                            <TableCell key={idx} align="center" sx={{ fontWeight: 'bold' }}>
                              {model}
                            </TableCell>
                          ))}
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Average</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attributes.map((attr, attrIdx) => (
                          <TableRow key={attrIdx} hover>
                            <TableCell sx={{ fontWeight: 'medium' }}>{attr}</TableCell>
                            {models.map((model, modelIdx) => {
                              const score = modelAttributeScores[model][attr] || 0;
                              return (
                                <TableCell key={modelIdx} align="center">
                                  <Box 
                                    sx={{ 
                                      display: 'inline-block',
                                      backgroundColor: (() => {
                                        // Color scale from red to green
                                        if (score >= 0.8) return '#4caf50'; // Good
                                        if (score >= 0.6) return '#8bc34a'; // Acceptable
                                        if (score >= 0.4) return '#ffeb3b'; // Warning
                                        if (score >= 0.2) return '#ff9800'; // Poor
                                        return '#f44336'; // Bad
                                      })(),
                                      color: score > 0.5 ? 'white' : 'black',
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      minWidth: '40px',
                                    }}
                                  >
                                    {(score * 100).toFixed(0)}%
                                  </Box>
                                </TableCell>
                              );
                            })}
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                              <Box 
                                sx={{ 
                                  display: 'inline-block',
                                  backgroundColor: (() => {
                                    const avgScore = summary.averageAttributeScores[attr] || 0;
                                    // Color scale from red to green
                                    if (avgScore >= 0.8) return '#4caf50'; // Good
                                    if (avgScore >= 0.6) return '#8bc34a'; // Acceptable
                                    if (avgScore >= 0.4) return '#ffeb3b'; // Warning
                                    if (avgScore >= 0.2) return '#ff9800'; // Poor
                                    return '#f44336'; // Bad
                                  })(),
                                  color: summary.averageAttributeScores[attr] > 0.5 ? 'white' : 'black',
                                  borderRadius: '4px',
                                  padding: '2px 6px',
                                  minWidth: '40px',
                                }}
                              >
                                {((summary.averageAttributeScores[attr] || 0) * 100).toFixed(0)}%
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                );
              })()}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Detailed Results
          </Typography>
          {detailedResults.map((result, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <Typography>
                    <strong>{result.llmProvider}</strong> - Prompt #{result.promptIndex + 1}
                  </Typography>
                  <Typography sx={{ ml: 2 }}>
                    Accuracy:{' '}
                    <strong>
                      {(() => {
                        if (result.attributeScores && result.attributeScores.length > 0) {
                          const avgScore =
                            result.attributeScores.reduce((sum, attr) => sum + attr.score, 0) /
                            result.attributeScores.length;
                          return (avgScore * 100).toFixed(1) + '%';
                        }
                        return 'N/A';
                      })()}
                    </strong>
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>
                  Attribute Evaluations:
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {(() => {
                    if (result.attributeScores && result.attributeScores.length > 0) {
                      return (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Attribute</TableCell>
                                <TableCell align="center">Score</TableCell>
                                <TableCell>Evaluation</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {result.attributeScores.map((attr, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <strong>{attr.attribute}</strong>
                                  </TableCell>
                                  <TableCell align="center">
                                    {(attr.score * 100).toFixed(0)}%
                                  </TableCell>
                                  <TableCell>{attr.evaluation}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      );
                    }

                    return (
                      <Typography variant="body2" color="text.secondary">
                        No attribute evaluations available.
                      </Typography>
                    );
                  })()}
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

export default AccuracyTab;