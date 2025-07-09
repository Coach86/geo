import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Button,
  IconButton,
} from '@mui/material';
import { ArrowBack, Visibility } from '@mui/icons-material';
import authApi from '../utils/auth';

interface BatchExecution {
  id: string;
  projectId: string;
  executedAt: string;
  triggerSource: string;
  status: string;
  executionMode: string;
  finalResults?: any[];
}

const BatchExecutions: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<BatchExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');

  // Get project ID from query parameters
  const queryParams = new URLSearchParams(location.search);
  const projectId = queryParams.get('projectId') || '';

  useEffect(() => {
    const fetchExecutions = async () => {
      if (!projectId) {
        setError('No project ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch batch executions for the project
        const response = await authApi.get('/batch-executions', {
          params: { projectId },
        });
        
        // Sort by execution date descending
        const sortedExecutions = response.data.sort((a: BatchExecution, b: BatchExecution) => 
          new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
        );
        setExecutions(sortedExecutions);

        // Try to get project name from the first execution
        if (sortedExecutions.length > 0 && sortedExecutions[0].project) {
          setProjectName(sortedExecutions[0].project.name);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch executions';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchExecutions();
  }, [projectId]);

  const getTriggerSourceColor = (source: string) => {
    switch (source) {
      case 'cron':
        return '#8884d8';
      case 'manual':
        return '#82ca9d';
      case 'project_creation':
        return '#ffc658';
      default:
        return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatTriggerSource = (source: string) => {
    switch (source) {
      case 'cron':
        return 'Scheduled';
      case 'manual':
        return 'Manual';
      case 'project_creation':
        return 'Creation';
      default:
        return source;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Paper sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Paper sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
          <Button 
            sx={{ mt: 2 }} 
            variant="contained" 
            onClick={() => navigate(-1)}
          >
            Go Back
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} color="primary">
            <ArrowBack />
          </IconButton>
          <Box>
            <Typography variant="h4" component="h1">
              Batch Executions
            </Typography>
            {projectName && (
              <Typography variant="subtitle1" color="text.secondary">
                Project: {projectName}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {executions.length === 0 ? (
        <Alert severity="info">No batch executions found for this project.</Alert>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Total Executions: {executions.length}
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Execution Date</TableCell>
                  <TableCell align="center">Trigger Source</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Mode</TableCell>
                  <TableCell align="center">Results</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {executions.map((execution) => (
                  <TableRow key={execution.id}>
                    <TableCell>
                      {new Date(execution.executedAt).toLocaleString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={formatTriggerSource(execution.triggerSource)}
                        size="small"
                        sx={{
                          bgcolor: getTriggerSourceColor(execution.triggerSource),
                          color: 'white',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={execution.status}
                        size="small"
                        color={getStatusColor(execution.status) as any}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color="text.secondary">
                        {execution.executionMode || 'standard'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {execution.finalResults && (
                        <Typography variant="body2">
                          {execution.finalResults.length} results
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/batch-results/${execution.id}`)}
                      >
                        View Results
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default BatchExecutions;