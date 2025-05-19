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
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { getAllCompanyReports, sendReportEmail, generateReportToken } from '../../utils/api';

interface ReportsTabProps {
  companyId: string;
  userEmail?: string | null; // Optional email for the company's owner
}

interface Report {
  id: string;
  weekStart: Date;
  generatedAt: Date;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ companyId, userEmail }) => {
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

  // Fetch all reports for the company
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const result = await getAllCompanyReports(companyId);
        setReports(result.reports);
        setError(null);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load reports. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [companyId]);

  // Handle sending email to owner
  const handleSendToOwner = async (report: Report) => {
    if (!userEmail) {
      setSnackbarMessage('No owner email available for this company');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    try {
      setSendingEmail(true);
      const result = await sendReportEmail(
        report.id,
        companyId,
        userEmail
      );

      setSnackbarMessage(`Email sent successfully to ${userEmail}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setSnackbarMessage(`Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
        companyId,
        emailInput,
        subjectInput || undefined // Only send subject if not empty
      );

      setDialogOpen(false);
      setSnackbarMessage(`Email sent successfully to ${emailInput}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setEmailError(`Failed to send email: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
      setSnackbarMessage(`Failed to generate report access: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
        This company doesn't have any reports yet. Run a batch analysis to generate a report.
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
    <>
      <Typography variant="h6" gutterBottom>
        Reports
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Report Date</TableCell>
              <TableCell>Generated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{formatDate(report.weekStart)}</TableCell>
                <TableCell>{formatDate(report.generatedAt)}</TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewReport(report)}
                      disabled={generatingToken}
                      color="secondary"
                    >
                      {generatingToken ? 'Loading...' : 'View Report'}
                    </Button>
                    {userEmail && (
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PersonIcon />}
                        onClick={() => handleSendToOwner(report)}
                        disabled={sendingEmail || generatingToken}
                      >
                        {sendingEmail ? 'Sending...' : 'Send to Owner'}
                      </Button>
                    )}
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      startIcon={<EmailIcon />}
                      onClick={() => handleOpenEmailDialog(report)}
                      disabled={sendingEmail || generatingToken}
                    >
                      Send Email
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Email Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Send Report Email</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Enter an email address to send the report access link to. The report will be accessible for 24 hours after the email is sent.
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
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Subject (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={sendingEmail}>
            Cancel
          </Button>
          <Button
            onClick={handleSendCustomEmail}
            variant="contained"
            color="primary"
            disabled={sendingEmail}
            startIcon={sendingEmail ? <CircularProgress size={20} /> : null}
          >
            {sendingEmail ? 'Sending...' : 'Send'}
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
    </>
  );
};

export default ReportsTab;