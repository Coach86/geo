import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
} from '@mui/material';
import { getBatchExecutions, generateReportFromBatch } from '../../utils/api';
import { BatchExecution, BatchType } from '../../utils/types';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import ModeCommentIcon from '@mui/icons-material/ModeComment';
import SentimentSatisfiedIcon from '@mui/icons-material/SentimentSatisfied';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArticleIcon from '@mui/icons-material/Article';

interface BatchesTabProps {
  companyId: string;
  onRunNewBatch: () => void;
  onRunSingleBatch: (batchType: BatchType) => void;
}

const BatchesTab: React.FC<BatchesTabProps> = ({ companyId, onRunNewBatch, onRunSingleBatch }) => {
  const navigate = useNavigate();
  const [batchExecutions, setBatchExecutions] = useState<BatchExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(menuAnchorEl);

  // States for report generation
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportSnackbarOpen, setReportSnackbarOpen] = useState(false);
  const [reportSnackbarMessage, setReportSnackbarMessage] = useState('');

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleRunSingleBatchType = (type: BatchType) => {
    onRunSingleBatch(type);
    handleMenuClose();
  };

  useEffect(() => {
    const fetchBatchExecutions = async () => {
      try {
        setLoading(true);
        const data = await getBatchExecutions(companyId);
        setBatchExecutions(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch batch executions:', err);
        setError('Failed to load batch history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchBatchExecutions();
  }, [companyId]);

  const handleViewDetails = (batchId: string) => {
    navigate(`/batch-results/${batchId}`);
  };

  // Handle generation of report from batch execution without sending an email
  const handleGenerateReport = async (batchId: string) => {
    try {
      setIsGeneratingReport(true);
      const result = await generateReportFromBatch(batchId);

      // Create a simple success message
      const successMessage = `Report generated successfully! Report ID: ${result.id}`;

      setReportSnackbarMessage(successMessage);
      setReportSnackbarOpen(true);
    } catch (error) {
      console.error('Failed to generate report:', error);
      setReportSnackbarMessage('Failed to generate report. Please try again.');
      setReportSnackbarOpen(true);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'running':
        return <PendingIcon color="warning" />;
      default:
        return <PendingIcon />;
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="Completed" color="success" size="small" />;
      case 'failed':
        return <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />;
      case 'running':
        return (
          <Chip
            icon={<CircularProgress size={12} />}
            label="Running"
            color="warning"
            size="small"
          />
        );
      default:
        return <Chip label={status} size="small" />;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Batch Analysis History</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={onRunNewBatch}
          >
            Run Full Analysis
          </Button>
          <Button
            color="secondary"
            variant="contained"
            endIcon={<ArrowDropDownIcon />}
            onClick={handleMenuClick}
            aria-controls={open ? 'single-batch-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={open ? 'true' : undefined}
          >
            Run Single Analysis
          </Button>
          <Menu
            id="single-batch-menu"
            anchorEl={menuAnchorEl}
            open={open}
            onClose={handleMenuClose}
            MenuListProps={{
              'aria-labelledby': 'single-batch-button',
            }}
          >
            <MenuItem onClick={() => handleRunSingleBatchType(BatchType.SPONTANEOUS)}>
              <ListItemIcon>
                <ModeCommentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Spontaneous Mentions</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType(BatchType.SENTIMENT)}>
              <ListItemIcon>
                <SentimentSatisfiedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sentiment Analysis</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType(BatchType.ACCURACY)}>
              <ListItemIcon>
                <FactCheckIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Accuracy Analysis</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType(BatchType.COMPARISON)}>
              <ListItemIcon>
                <CompareArrowsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Competitive Comparison</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {batchExecutions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            No batch analyses have been run for this company yet.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={onRunNewBatch}
            >
              Run Full Analysis
            </Button>
            <Button
              color="secondary"
              variant="outlined"
              endIcon={<ArrowDropDownIcon />}
              onClick={handleMenuClick}
            >
              Run Single Analysis
            </Button>
          </Box>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Executed At</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Results</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batchExecutions.map((batch) => {
                // Count result types
                const resultTypes = batch.finalResults.reduce(
                  (acc, result) => {
                    acc[result.resultType] = (acc[result.resultType] || 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                );

                return (
                  <TableRow key={batch.id} hover>
                    <TableCell>{new Date(batch.executedAt).toLocaleString()}</TableCell>
                    <TableCell>{getStatusChip(batch.status)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {resultTypes[BatchType.SPONTANEOUS] && (
                          <Chip
                            size="small"
                            label={`Spontaneous: ${resultTypes[BatchType.SPONTANEOUS]}`}
                            variant="outlined"
                            color="info"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {resultTypes[BatchType.SENTIMENT] && (
                          <Chip
                            size="small"
                            label={`Sentiment: ${resultTypes[BatchType.SENTIMENT]}`}
                            variant="outlined"
                            color="success"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {resultTypes[BatchType.ACCURACY] && (
                          <Chip
                            size="small"
                            label={`Accuracy: ${resultTypes[BatchType.ACCURACY]}`}
                            variant="outlined"
                            color="secondary"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {resultTypes[BatchType.COMPARISON] && (
                          <Chip
                            size="small"
                            label={`Comparison: ${resultTypes[BatchType.COMPARISON]}`}
                            variant="outlined"
                            color="warning"
                            sx={{ mr: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        {batch.status === 'completed' && (
                          <Tooltip title="Generate report without email">
                            <Button
                              variant="outlined"
                              size="small"
                              color="secondary"
                              startIcon={<ArticleIcon />}
                              onClick={() => handleGenerateReport(batch.id)}
                              disabled={isGeneratingReport}
                            >
                              {isGeneratingReport ? (
                                <CircularProgress size={20} />
                              ) : (
                                'Generate Report'
                              )}
                            </Button>
                          </Tooltip>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          endIcon={<ChevronRightIcon />}
                          onClick={() => handleViewDetails(batch.id)}
                        >
                          Details
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Snackbar for report generation notifications */}
      <Snackbar
        open={reportSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setReportSnackbarOpen(false)}
        message={reportSnackbarMessage}
      />
    </Box>
  );
};

export default BatchesTab;
