import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button, Container, Paper } from '@mui/material';

const Unauthorized: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Unauthorized Access
          </Typography>
          
          <Typography variant="body1" paragraph>
            You don't have permission to access this area. Please log in with an admin account.
          </Typography>
          
          <Button 
            component={Link} 
            to="/login" 
            variant="contained" 
            color="primary"
            sx={{ mt: 2 }}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default Unauthorized;