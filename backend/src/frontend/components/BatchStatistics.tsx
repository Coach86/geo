import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import authApi from '../utils/auth';

interface BatchStatistic {
  date: string;
  cron: number;
  manual: number;
  project_creation: number;
  total: number;
}

export const BatchStatistics: React.FC = () => {
  const [statistics, setStatistics] = useState<BatchStatistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<number>(30); // Default to last 30 days

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const response = await authApi.get('/batch-executions/statistics/by-day', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      setStatistics(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch statistics';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, [dateRange]);

  if (loading) {
    return (
      <Paper sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Batch Executions by Day
        </Typography>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Date Range</InputLabel>
          <Select
            value={dateRange}
            label="Date Range"
            onChange={(e) => setDateRange(Number(e.target.value))}
          >
            <MenuItem value={7}>Last 7 days</MenuItem>
            <MenuItem value={14}>Last 14 days</MenuItem>
            <MenuItem value={30}>Last 30 days</MenuItem>
            <MenuItem value={60}>Last 60 days</MenuItem>
            <MenuItem value={90}>Last 90 days</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {statistics.length === 0 ? (
        <Alert severity="info">No batch executions found for the selected date range.</Alert>
      ) : (
        <>
          {/* Summary Statistics */}
          <Box sx={{ mb: 3, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6" color="primary">
                {statistics.reduce((sum, stat) => sum + stat.total, 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Batches
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6" sx={{ color: '#8884d8' }}>
                {statistics.reduce((sum, stat) => sum + stat.cron, 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Scheduled (Cron)
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6" sx={{ color: '#82ca9d' }}>
                {statistics.reduce((sum, stat) => sum + stat.manual, 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Manual
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: '#f5f5f5' }}>
              <Typography variant="h6" sx={{ color: '#ffc658' }}>
                {statistics.reduce((sum, stat) => sum + stat.project_creation, 0)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Project Creation
              </Typography>
            </Paper>
          </Box>

          {/* Data Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Scheduled (Cron)</TableCell>
                  <TableCell align="center">Manual</TableCell>
                  <TableCell align="center">Project Creation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statistics.map((stat) => (
                  <TableRow key={stat.date}>
                    <TableCell>
                      {new Date(stat.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={stat.total} size="small" color="primary" />
                    </TableCell>
                    <TableCell align="center">
                      {stat.cron > 0 && <Chip label={stat.cron} size="small" sx={{ bgcolor: '#8884d8', color: 'white' }} />}
                      {stat.cron === 0 && '-'}
                    </TableCell>
                    <TableCell align="center">
                      {stat.manual > 0 && <Chip label={stat.manual} size="small" sx={{ bgcolor: '#82ca9d', color: 'white' }} />}
                      {stat.manual === 0 && '-'}
                    </TableCell>
                    <TableCell align="center">
                      {stat.project_creation > 0 && <Chip label={stat.project_creation} size="small" sx={{ bgcolor: '#ffc658', color: 'white' }} />}
                      {stat.project_creation === 0 && '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
};