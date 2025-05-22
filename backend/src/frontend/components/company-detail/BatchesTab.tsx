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
  Card,
  CardContent,
  useTheme,
  alpha,
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
  const theme = useTheme();
  const [batchExecutions, setBatchExecutions] = useState<BatchExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(menuAnchorEl);

  // States for report generation
  const [generatingReportIds, setGeneratingReportIds] = useState<string[]>([]);
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
      // Add this batch ID to the list of batches that are generating reports
      setGeneratingReportIds((prevIds) => [...prevIds, batchId]);

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
      // Remove this batch ID from the list when done
      setGeneratingReportIds((prevIds) => prevIds.filter((id) => id !== batchId));
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
    <>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2,
          minWidth: '100%',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: '1rem',
            color: theme.palette.text.primary,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <PlayArrowIcon
            sx={{
              fontSize: '1.1rem',
              color: theme.palette.primary.main,
              mr: 1,
            }}
          />
          Analysis History
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PlayArrowIcon />}
            onClick={onRunNewBatch}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              boxShadow: 1,
              px: { xs: 1.5, sm: 2 },
            }}
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
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              boxShadow: 1,
              px: { xs: 1.5, sm: 2 },
            }}
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
              <ListItemText>Pulse</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType(BatchType.SENTIMENT)}>
              <ListItemIcon>
                <SentimentSatisfiedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Tone</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType(BatchType.ACCURACY)}>
              <ListItemIcon>
                <FactCheckIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Accord</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType(BatchType.COMPARISON)}>
              <ListItemIcon>
                <CompareArrowsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Battle</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {batchExecutions.length === 0 ? (
        <Card
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 1.5,
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          }}
        >
          <Typography variant="body1" sx={{ mb: 2, color: alpha(theme.palette.text.primary, 0.7) }}>
            No batch analyses have been run for this company yet.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={onRunNewBatch}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Run Full Analysis
            </Button>
            <Button
              color="secondary"
              variant="outlined"
              endIcon={<ArrowDropDownIcon />}
              onClick={handleMenuClick}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Run Single Analysis
            </Button>
          </Box>
        </Card>
      ) : (
        <Box
          sx={{
            mb: 4,
            borderRadius: 1.5,
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <Box
            sx={{
              width: '100%',
              p: 2,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Execution History
            </Typography>

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
                <Box
                  key={batch.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    py: 1.5,
                    px: 1,
                    borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                    '&:last-child': {
                      borderBottom: 'none',
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.grey[500], 0.05),
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                        {new Date(batch.executedAt).toLocaleString()}
                      </Typography>
                      {getStatusChip(batch.status)}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {batch.status === 'completed' && (
                        <Tooltip title="Generate report">
                          <IconButton
                            size="small"
                            color="secondary"
                            onClick={() => handleGenerateReport(batch.id)}
                            disabled={generatingReportIds.includes(batch.id)}
                            sx={{
                              p: 1,
                              border: `1px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
                            }}
                          >
                            {generatingReportIds.includes(batch.id) ? (
                              <CircularProgress size={16} />
                            ) : (
                              <ArticleIcon sx={{ fontSize: '1rem' }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(batch.id)}
                          sx={{
                            p: 1,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                          }}
                        >
                          <ChevronRightIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 0.5 }}>
                    {resultTypes[BatchType.SPONTANEOUS] && (
                      <Chip
                        size="small"
                        label={`Spontaneous: ${resultTypes[BatchType.SPONTANEOUS]}`}
                        variant="outlined"
                        color="info"
                        sx={{ mr: 1, mb: 0.5 }}
                      />
                    )}
                    {resultTypes[BatchType.SENTIMENT] && (
                      <Chip
                        size="small"
                        label={`Sentiment: ${resultTypes[BatchType.SENTIMENT]}`}
                        variant="outlined"
                        color="success"
                        sx={{ mr: 1, mb: 0.5 }}
                      />
                    )}
                    {resultTypes[BatchType.ACCURACY] && (
                      <Chip
                        size="small"
                        label={`Accuracy: ${resultTypes[BatchType.ACCURACY]}`}
                        variant="outlined"
                        color="secondary"
                        sx={{ mr: 1, mb: 0.5 }}
                      />
                    )}
                    {resultTypes[BatchType.COMPARISON] && (
                      <Chip
                        size="small"
                        label={`Comparison: ${resultTypes[BatchType.COMPARISON]}`}
                        variant="outlined"
                        color="warning"
                        sx={{ mr: 1, mb: 0.5 }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* Snackbar for report generation notifications */}
      <Snackbar
        open={reportSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setReportSnackbarOpen(false)}
        message={reportSnackbarMessage}
      />
    </>
  );
};

export default BatchesTab;
