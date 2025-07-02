import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import { BatchStatistics } from '../components/BatchStatistics';

const BatchStatisticsPage: React.FC = () => {
  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Batch Execution Statistics
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor batch executions across all projects by their trigger source
        </Typography>
      </Box>
      
      <BatchStatistics />
    </Container>
  );
};

export default BatchStatisticsPage;