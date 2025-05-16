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
} from '@mui/material';
import { getBatchExecutions } from '../../utils/api';
import { BatchExecution } from '../../utils/types';
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

interface BatchesTabProps {
  companyId: string;
  onRunNewBatch: () => void;
  onRunSingleBatch: (batchType: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison') => void;
}

const BatchesTab: React.FC<BatchesTabProps> = ({ companyId, onRunNewBatch, onRunSingleBatch }) => {
  const navigate = useNavigate();
  const [batchExecutions, setBatchExecutions] = useState<BatchExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(menuAnchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleRunSingleBatchType = (type: 'spontaneous' | 'sentiment' | 'accuracy' | 'comparison') => {
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
            aria-controls={open ? "single-batch-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
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
            <MenuItem onClick={() => handleRunSingleBatchType('spontaneous')}>
              <ListItemIcon>
                <ModeCommentIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Spontaneous Mentions</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType('sentiment')}>
              <ListItemIcon>
                <SentimentSatisfiedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Sentiment Analysis</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType('accuracy')}>
              <ListItemIcon>
                <FactCheckIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Accuracy Analysis</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleRunSingleBatchType('comparison')}>
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
                const resultTypes = batch.finalResults.reduce((acc, result) => {
                  acc[result.resultType] = (acc[result.resultType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                return (
                  <TableRow key={batch.id} hover>
                    <TableCell>
                      {new Date(batch.executedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusChip(batch.status)}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {resultTypes.spontaneous && (
                          <Chip
                            size="small"
                            label={`Spontaneous: ${resultTypes.spontaneous}`}
                            variant="outlined"
                            color="info"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {resultTypes.sentiment && (
                          <Chip
                            size="small"
                            label={`Sentiment: ${resultTypes.sentiment}`}
                            variant="outlined"
                            color="success"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {resultTypes.accuracy && (
                          <Chip
                            size="small"
                            label={`Accuracy: ${resultTypes.accuracy}`}
                            variant="outlined"
                            color="secondary"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {resultTypes.comparison && (
                          <Chip
                            size="small"
                            label={`Comparison: ${resultTypes.comparison}`}
                            variant="outlined"
                            color="warning"
                            sx={{ mr: 1 }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        variant="outlined"
                        size="small"
                        endIcon={<ChevronRightIcon />}
                        onClick={() => handleViewDetails(batch.id)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default BatchesTab;