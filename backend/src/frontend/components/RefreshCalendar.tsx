import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import authApi from '../utils/auth';

interface ProjectRefreshInfo {
  projectId: string;
  brandName: string;
  organizationName: string;
  planName: string;
  refreshFrequency: string;
  createdAt: string;
}

interface DayRefreshData {
  day: string;
  dayIndex: number;
  projects: ProjectRefreshInfo[];
  count: number;
}

export const RefreshCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [calendarData, setCalendarData] = useState<DayRefreshData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await authApi.get('/batch-executions/refresh-calendar');
      setCalendarData(response.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch refresh calendar';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const getTodayIndex = () => {
    return new Date().getDay();
  };

  const getRefreshBadgeColor = (frequency: string): 'primary' | 'secondary' | 'success' => {
    switch (frequency) {
      case 'daily':
      case 'unlimited':
        return 'success';
      case 'weekly':
        return 'primary';
      default:
        return 'secondary';
    }
  };

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

  const todayIndex = getTodayIndex();

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Project Refresh Calendar
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Shows which projects are scheduled for automatic refresh on each day of the week.
          Free plans do not have automatic refresh.
        </Typography>
      </Box>

      {/* Summary */}
      <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total Projects with Auto-Refresh
            </Typography>
            <Typography variant="h4">
              {calendarData.reduce((sum, day) => sum + day.count, 0)}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Today's Refreshes
            </Typography>
            <Typography variant="h4">
              {calendarData.find(d => d.dayIndex === todayIndex)?.count || 0}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Calendar Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {calendarData.map((dayData) => (
          <Card
            key={dayData.dayIndex}
            sx={{
              border: dayData.dayIndex === todayIndex ? '2px solid' : '1px solid',
              borderColor: dayData.dayIndex === todayIndex ? 'primary.main' : 'divider',
              backgroundColor: dayData.dayIndex === todayIndex ? 'action.hover' : 'background.paper',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h3">
                  {dayData.day}
                </Typography>
                {dayData.dayIndex === todayIndex && (
                  <Chip label="Today" color="primary" size="small" />
                )}
                <Chip label={`${dayData.count} projects`} size="small" />
              </Box>

              {dayData.projects.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No projects scheduled
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {dayData.projects.map((project, index) => (
                    <React.Fragment key={project.projectId}>
                      {index > 0 && <Divider />}
                      <ListItem
                        onClick={() => handleProjectClick(project.projectId)}
                        sx={{
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                                {project.brandName}
                              </Typography>
                              <Chip
                                label={project.refreshFrequency}
                                size="small"
                                color={getRefreshBadgeColor(project.refreshFrequency)}
                                sx={{ height: 20 }}
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {project.organizationName} • {project.planName}
                            </Typography>
                          }
                        />
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ mt: 4, p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          Refresh Frequency Legend:
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="daily" size="small" color="success" sx={{ height: 20 }} />
            <Typography variant="caption">Refreshes every day</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="weekly" size="small" color="primary" sx={{ height: 20 }} />
            <Typography variant="caption">Refreshes on anniversary day</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};