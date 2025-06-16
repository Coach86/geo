import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Paper,
  LinearProgress,
  Backdrop,
  Alert,
  Button,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

// Define stage types for batch processing
export type BatchProcessStage =
  | 'initializing'
  | 'processing'
  | 'finalizing'
  | 'completed'
  | 'error'
  | 'email-notification';

// Props for the overlay component
interface BatchProcessingOverlayProps {
  open: boolean;
  currentStage: BatchProcessStage;
  progress: number; // 0-100
  error?: string;
  onClose: () => void;
}

// Styled components
const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  backdropFilter: 'blur(4px)',
}));

const ProcessingCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  maxWidth: 500,
  width: '100%',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: (theme.shape.borderRadius as number) * 2,
}));

const StageText = styled(Typography)(({ theme }) => ({
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(1),
  fontWeight: 500,
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

// Helper function to get stage information
const getStageInfo = (stage: BatchProcessStage): { label: string; description: string } => {
  switch (stage) {
    case 'initializing':
      return {
        label: 'Initializing Batch Process',
        description: 'Setting up the analysis environment...',
      };
    case 'processing':
      return {
        label: 'Running Batch Analysis',
        description:
          'Analyzing brand mentions, sentiment, and competitive positioning in parallel...',
      };
    case 'email-notification':
      return {
        label: 'Sending Email Notification',
        description: 'Generating the report and sending email notification with access link...',
      };
    case 'finalizing':
      return {
        label: 'Finalizing Results',
        description: 'Compiling all analysis data and preparing reports...',
      };
    case 'completed':
      return {
        label: 'Analysis Complete',
        description: 'All batch processes have completed successfully.',
      };
    case 'error':
      return {
        label: 'Analysis Error',
        description: 'An error occurred during the batch process.',
      };
    default:
      return {
        label: 'Processing',
        description: 'Running batch analysis...',
      };
  }
};

const BatchProcessingOverlay: React.FC<BatchProcessingOverlayProps> = ({
  open,
  currentStage,
  progress,
  error,
  onClose,
}) => {
  const stageInfo = getStageInfo(currentStage);
  const isCompleteOrError = currentStage === 'completed' || currentStage === 'error';

  // Calculate which stages are complete
  const stageOrder: BatchProcessStage[] = ['initializing', 'processing', 'email-notification', 'finalizing', 'completed'];

  const currentStageIndex = stageOrder.indexOf(currentStage);

  const renderStageIndicator = (stage: BatchProcessStage, index: number) => {
    const isCurrentStage = stage === currentStage;
    const isCompleted = index < currentStageIndex;
    const isError = currentStage === 'error' && isCurrentStage;

    return (
      <Box
        key={stage}
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1,
          color: isCurrentStage ? 'primary.main' : isCompleted ? 'success.main' : 'text.secondary',
          opacity: isCurrentStage || isCompleted ? 1 : 0.6,
        }}
      >
        {isError ? (
          <ErrorIcon color="error" />
        ) : isCompleted ? (
          <CheckCircleIcon color="success" />
        ) : isCurrentStage ? (
          <AutorenewIcon
            color="primary"
            sx={{ animation: 'spin 2s linear infinite', display: 'inline-block' }}
          />
        ) : (
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: '2px solid',
              ml: '3px',
              mr: '3px',
            }}
          />
        )}
        <Typography
          variant="body2"
          sx={{
            ml: 1,
            fontWeight: isCurrentStage ? 'bold' : 'regular',
          }}
        >
          {getStageInfo(stage).label}
        </Typography>
      </Box>
    );
  };

  return (
    <StyledBackdrop open={open}>
      <ProcessingCard elevation={4}>
        {/* Header */}
        <Typography variant="h5" component="h2" gutterBottom>
          {isCompleteOrError ? stageInfo.label : 'Batch Analysis In Progress'}
        </Typography>

        {!isCompleteOrError && (
          <>
            <CircularProgress size={80} thickness={4} sx={{ mt: 2, mb: 2 }} />
            <StageText variant="h6">{stageInfo.label}</StageText>
            <Typography variant="body1" color="text.secondary">
              {stageInfo.description}
            </Typography>
          </>
        )}

        {currentStage === 'completed' && (
          <CheckCircleIcon color="success" sx={{ fontSize: 80, my: 2 }} />
        )}

        {currentStage === 'error' && <ErrorIcon color="error" sx={{ fontSize: 80, my: 2 }} />}

        {/* Progress bar */}
        {!isCompleteOrError && (
          <ProgressContainer>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" sx={{ mt: 1 }}>
              {Math.round(progress)}% Complete
            </Typography>
          </ProgressContainer>
        )}

        {/* Stage list */}
        <Box sx={{ textAlign: 'left', mt: 3, mb: 3 }}>
          {stageOrder.slice(0, stageOrder.indexOf('completed') + 1).map(renderStageIndicator)}
        </Box>

        {/* Error message */}
        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Close button (only enabled when complete or error) */}
        <Button
          variant="contained"
          onClick={onClose}
          disabled={!isCompleteOrError}
          sx={{ mt: 2 }}
          fullWidth
        >
          {isCompleteOrError ? 'Close & View Batch History' : 'Please Wait...'}
        </Button>
      </ProcessingCard>

      {/* Global styles for animations */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </StyledBackdrop>
  );
};

export default BatchProcessingOverlay;
