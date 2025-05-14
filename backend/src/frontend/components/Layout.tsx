import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, useTheme, Backdrop, CircularProgress } from '@mui/material';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = React.useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      <Navbar />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 4,
          px: { xs: 2, sm: 3 },
        }}
      >
        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
          }}
        >
          <Outlet />
        </Container>
      </Box>
      <Backdrop sx={{ color: '#fff', zIndex: theme.zIndex.drawer + 1 }} open={loading}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default Layout;
