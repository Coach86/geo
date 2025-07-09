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
  executedAt: string;
  triggerSource: string;
  status: string;
}

interface Project {
  _id?: string;
  id?: string;
  name: string;
  website: string;
  createdAt: string;
  batchExecutions: BatchExecution[];
}

const BatchProjectsList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get query parameters from URL
  const queryParams = new URLSearchParams(location.search);
  const triggerSource = queryParams.get('triggerSource') || '';
  const date = queryParams.get('date') || '';
  const startDate = queryParams.get('startDate') || '';
  const endDate = queryParams.get('endDate') || '';

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {};
        if (triggerSource) params.triggerSource = triggerSource;
        if (date) params.date = date;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await authApi.get('/batch-executions/projects-by-trigger', { params });
        setProjects(response.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [triggerSource, date, startDate, endDate]);

  const getTriggerSourceColor = (source: string) => {
    switch (source) {
      case 'cron':
        return '#8884d8';
      case 'manual':
        return '#82ca9d';
      case 'project_creation':
        return '#ffc658';
      default:
        return 'primary';
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
      default:
        return 'default';
    }
  };

  const formatTriggerSource = (source: string) => {
    switch (source) {
      case 'cron':
        return 'Scheduled (Cron)';
      case 'manual':
        return 'Manual';
      case 'project_creation':
        return 'Project Creation';
      case 'total':
        return 'All Sources';
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
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton onClick={() => navigate('/batch-statistics')} color="primary">
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            Projects by Trigger Type
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {triggerSource && (
            <Chip
              label={`Source: ${formatTriggerSource(triggerSource)}`}
              color="primary"
              sx={{ bgcolor: triggerSource !== 'total' ? getTriggerSourceColor(triggerSource) : undefined }}
            />
          )}
          {date && (
            <Chip label={`Date: ${new Date(date).toLocaleDateString()}`} color="secondary" />
          )}
          {startDate && endDate && (
            <Chip
              label={`Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`}
              color="secondary"
            />
          )}
        </Box>
      </Box>

      {projects.length === 0 ? (
        <Alert severity="info">No projects found for the selected criteria.</Alert>
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Found {projects.length} project{projects.length !== 1 ? 's' : ''}
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Project Name</TableCell>
                  <TableCell>Website</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Batch Executions</TableCell>
                  <TableCell align="center">Latest Execution</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.map((project) => {
                  const latestExecution = project.batchExecutions
                    .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())[0];
                  
                  return (
                    <TableRow key={project._id || project.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {project.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {project.website}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(project.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {project.batchExecutions.map((batch) => (
                            <Chip
                              key={batch.id}
                              label={batch.triggerSource}
                              size="small"
                              sx={{
                                bgcolor: getTriggerSourceColor(batch.triggerSource),
                                color: 'white',
                                fontSize: '0.75rem',
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {latestExecution && (
                          <Box>
                            <Typography variant="caption" display="block">
                              {new Date(latestExecution.executedAt).toLocaleString()}
                            </Typography>
                            <Chip
                              label={latestExecution.status}
                              size="small"
                              color={getStatusColor(latestExecution.status) as any}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() => navigate(`/batch-executions?projectId=${project.id || project._id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default BatchProjectsList;