import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Card,
  CardContent,
  useTheme,
  alpha,
  Tooltip,
  IconButton,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getAllProjectReports, sendReportEmail, generateReportToken } from '../../utils/api';

interface ReportsTabProps {
  projectId: string;
  userEmail?: string | null; // Optional email for the project's owner
}

interface Report {
  id: string;
  generatedAt: Date;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ projectId, userEmail }) => {
  const theme = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Fetch all reports for the project
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const result = await getAllProjectReports(projectId);
        setReports(
          result.reports?.sort(
            (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
          ) || [],
        );
        setError(null);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [projectId]);

  // Handle sending email to owner
  const handleSendToOwner = async (report: Report) => {
    if (!userEmail) {
      setSnackbarMessage('No owner email available for this project');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setSendingEmail(true);
      const result = await sendReportEmail(report.id, projectId, userEmail);

      setSnackbarMessage(`Email sent successfully to ${userEmail}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setSnackbarMessage(
        `Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle opening custom email dialog
  const handleOpenEmailDialog = (report: Report) => {
    setSelectedReport(report);
    setEmailInput('');
    setSubjectInput('');
    setEmailError(null);
    setDialogOpen(true);
  };

  // Handle sending custom email
  const handleSendCustomEmail = async () => {
    // Simple email validation
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (!selectedReport) return;

    try {
      setSendingEmail(true);
      const result = await sendReportEmail(
        selectedReport.id,
        projectId,
        emailInput,
        subjectInput || undefined, // Only send subject if not empty
      );

      setDialogOpen(false);
      setSnackbarMessage(`Email sent successfully to ${emailInput}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setEmailError(
        `Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle viewing report with admin token
  const handleViewReport = async (report: Report) => {
    try {
      setGeneratingToken(true);

      // Call our new API endpoint that generates a token for this specific report
      // It will automatically look up the company and find the owner
      const response = await generateReportToken(report.id);

      if (response.accessUrl) {
        // Open the report in a new tab
        window.open(response.accessUrl, '_blank');

        setSnackbarMessage('Opening report in a new tab');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        throw new Error('Failed to generate token or access URL');
      }
    } catch (err) {
      console.error('Error generating report token:', err);
      setSnackbarMessage(
        `Failed to generate report access: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setGeneratingToken(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error</AlertTitle>
        {error}
      </Alert>
    );
  }

  if (reports.length === 0) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <AlertTitle>No Reports</AlertTitle>
        This project doesn't have any reports yet. Run a batch analysis to generate a report.
      </Alert>
    );
  }

  // Format date to human-readable format
  const formatDate = (dateString: Date) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Box
      style={{ width: '100%' }}
      sx={{
        maxWidth: '100%',
      }}
    >
      <Typography
        variant="h6"
        gutterBottom
        sx={{
          fontWeight: 600,
          fontSize: '1rem',
          color: theme.palette.text.primary,
          display: 'flex',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <EmailIcon
          sx={{
            fontSize: '1.1rem',
            color: theme.palette.primary.main,
            mr: 1,
          }}
        />
        Generated Reports
      </Typography>
      <Box
        sx={{
          mb: 3,
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
            Report History
          </Typography>

          {reports.map((report) => (
            <Box
              key={report.id}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.5,
                borderBottom: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
                '&:last-child': {
                  borderBottom: 'none',
                },
              }}
            >
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                {formatDate(report.generatedAt)}
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="View Report">
                  <IconButton
                    size="small"
                    onClick={() => handleViewReport(report)}
                    disabled={generatingToken}
                    color="secondary"
                    sx={{
                      p: 1,
                      border: `1px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
                    }}
                  >
                    <VisibilityIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>

                {userEmail && (
                  <Tooltip title="Send to Owner">
                    <IconButton
                      size="small"
                      onClick={() => handleSendToOwner(report)}
                      disabled={sendingEmail || generatingToken}
                      sx={{
                        p: 1,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                      }}
                    >
                      <PersonIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title="Send Email">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenEmailDialog(report)}
                    disabled={sendingEmail || generatingToken}
                    sx={{
                      p: 1,
                      backgroundColor: theme.palette.primary.main,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: theme.palette.primary.dark,
                      },
                    }}
                  >
                    <EmailIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Email Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 1,
            pt: 2,
            fontWeight: 600,
            fontSize: '1.1rem',
          }}
        >
          Send Report Email
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <DialogContentText sx={{ fontSize: '0.875rem', mb: 2 }}>
            Enter an email address to send the report access link to. The report will be accessible
            for 24 hours after the email is sent.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            error={!!emailError}
            helperText={emailError}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                fontSize: '0.875rem',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                  },
                },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 1,
                  },
                },
              },
            }}
          />
          <TextField
            margin="dense"
            label="Subject (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
                fontSize: '0.875rem',
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: alpha(theme.palette.primary.main, 0.5),
                  },
                },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                    borderWidth: 1,
                  },
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDialogOpen(false)}
            disabled={sendingEmail}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: theme.palette.text.secondary,
              px: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendCustomEmail}
            variant="contained"
            color="primary"
            disabled={sendingEmail}
            startIcon={
              sendingEmail ? (
                <CircularProgress size={16} />
              ) : (
                <EmailIcon sx={{ fontSize: '1rem' }} />
              )
            }
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: 1,
              borderRadius: 1,
              px: 2,
            }}
          >
            {sendingEmail ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReportsTab;
