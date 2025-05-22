import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  useTheme,
  Avatar,
  Tooltip,
  alpha,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';
import BatchNotificationDot from './BatchNotificationDot';

const APPBAR_HEIGHT = 64;

const TopBar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    // Navigation will be handled by the logout function which redirects to login
  };

  const handleSettings = () => {
    navigate('/config');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        boxShadow: 'none',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)', // Safari
        backgroundColor: alpha(theme.palette.background.default, 0.8),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        [theme.breakpoints.up('lg')]: {
          width: `calc(100% - 280px)`,
        },
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar
        sx={{
          height: APPBAR_HEIGHT,
          minHeight: APPBAR_HEIGHT,
          px: { xs: 2, lg: 3 },
          justifyContent: 'flex-end',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Batch Notification Dot */}
          <BatchNotificationDot />

          <Tooltip title="Settings">
            <IconButton 
              onClick={handleSettings} 
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
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Logout">
            <IconButton 
              onClick={handleLogout} 
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
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Avatar 
            alt="User"
            src="https://minimal-kit-react.vercel.app/assets/images/avatars/avatar_25.jpg"
            sx={{ 
              width: 40, 
              height: 40,
              ml: 1,
              border: `2px solid ${alpha(theme.palette.background.paper, 0.24)}`,
            }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;