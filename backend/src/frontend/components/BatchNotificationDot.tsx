/**
 * Batch notification dot component for the navbar
 */
import React, { useState } from 'react';
import {
  Badge,
  IconButton,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Button,
  Tooltip,
  alpha,
  useTheme,
  styled,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PendingIcon from '@mui/icons-material/Pending';
import { useBatchEvents, BatchStatus } from '../hooks/useBatchEvents';

// Styled component for the dot icon (when active - orange and pulsating)
const PulsatingDotIcon = styled(Box)(({ theme }) => ({
  width: 16, // 2x bigger (8px -> 16px)
  height: 16,
  backgroundColor: '#ff6f00', // Dark orange color
  borderRadius: '50%',
  animation: 'pulse 2s infinite',
  '@keyframes pulse': {
    '0%': {
      transform: 'scale(1)',
      opacity: 1,
    },
    '50%': {
      transform: 'scale(1.2)',
      opacity: 0.7,
    },
    '100%': {
      transform: 'scale(1)',
      opacity: 1,
    },
  },
}));

// Styled component for the dot icon (when inactive - gray and static)
const StaticDotIcon = styled(Box)(({ theme }) => ({
  width: 16, // 2x bigger (8px -> 16px)
  height: 16,
  backgroundColor: theme.palette.text.secondary,
  borderRadius: '50%',
}));

const BatchNotificationDot: React.FC = () => {
  const theme = useTheme();
  const { activeBatches, hasActiveBatches, clearBatch } = useBatchEvents();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const getStatusIcon = (status: BatchStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'failed':
        return <ErrorIcon color="error" fontSize="small" />;
      case 'processing':
      case 'started':
        return <PendingIcon color="primary" fontSize="small" />;
      default:
        return <PendingIcon fontSize="small" />;
    }
  };

  const getStatusColor = (status: BatchStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'primary';
      case 'started':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const batchArray = Array.from(activeBatches.values());
  
  // Debug: log the actual batch statuses
  const batchStatuses = batchArray.map(batch => ({ id: batch.batchExecutionId.slice(-4), status: batch.status }));
  console.log('BatchNotificationDot - Batch statuses received:', batchStatuses);

  // Choose dot icon style based on whether there are active batches
  const DotIcon = hasActiveBatches ? PulsatingDotIcon : StaticDotIcon;

  console.log('BatchNotificationDot - RENDER: hasActiveBatches:', hasActiveBatches, 'batchArray.length:', batchArray.length);
  console.log('BatchNotificationDot - RENDER: DotIcon is PulsatingDotIcon:', DotIcon === PulsatingDotIcon);

  return (
    <>
      <Tooltip title="Batch Notifications">
        <IconButton
          onClick={handleClick}
          aria-label="batch notifications"
          sx={{
            color: 'text.secondary',
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            borderRadius: 1,
            width: 40,
            height: 40,
            '&:hover': {
              backgroundColor: alpha(theme.palette.grey[500], 0.12),
            },
          }}
        >
          <DotIcon />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Active Batch Operations
          </Typography>

          <List dense>
            {batchArray.map((batch) => (
              <ListItem key={batch.batchExecutionId} divider>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {getStatusIcon(batch.status)}
                    <Typography variant="subtitle2" sx={{ ml: 1, flexGrow: 1 }}>
                      {batch.companyName} - {batch.pipelineType}
                    </Typography>
                    <Chip
                      label={batch.status}
                      size="small"
                      color={getStatusColor(batch.status) as any}
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {batch.status !== 'completed' && batch.status !== 'failed' && (
                    <Box sx={{ mb: 1 }}>
                      <LinearProgress variant="indeterminate" sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                  )}

                  {batch.lastEvent && (
                    <Typography variant="caption" color="text.secondary">
                      {batch.lastEvent.message}
                    </Typography>
                  )}

                  {batch.error && (
                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                      Error: {batch.error}
                    </Typography>
                  )}

                  {batch.lastEvent && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mt: 0.5 }}
                    >
                      {formatTimestamp(batch.lastEvent.timestamp)}
                    </Typography>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
};

export default BatchNotificationDot;
