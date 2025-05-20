import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme, Backdrop, CircularProgress, alpha } from '@mui/material';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const APP_BAR_MOBILE = 64;
const APP_BAR_DESKTOP = 64;
const DRAWER_WIDTH = 280;

const Layout: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = React.useState(false);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: alpha(theme.palette.background.default, 0.96),
      }}
    >
      <TopBar />
      
      <Sidebar />

      <Box 
        component="main" 
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          minHeight: '100%',
          paddingTop: {
            xs: `${APP_BAR_MOBILE + 16}px`,
            lg: `${APP_BAR_DESKTOP + 24}px`,
          },
          paddingBottom: 0,
          paddingLeft: 0,
          paddingRight: 0,
          [theme.breakpoints.up('lg')]: {
            paddingLeft: 2,
            paddingRight: 2,
            width: `calc(100% - ${DRAWER_WIDTH}px)`,
          },
        }}
      >
        <Outlet />
      </Box>
      
      <Backdrop sx={{ color: '#fff', zIndex: theme.zIndex.drawer + 1 }} open={loading}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Box>
  );
};

export default Layout;
