import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Switch,
  useTheme,
  Stack,
  alpha,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AppIcon from '@mui/icons-material/Apps';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import { useThemeContext } from '../utils/ThemeContext';
import logo from '../assets/logo-small.png';

const DRAWER_WIDTH = 280;

// Simplified navigation configuration with only companies and users
const navConfig = [
  {
    title: 'Companies',
    path: '/companies',
    icon: <AppIcon />,
  },
];

const managementItems = [
  {
    title: 'Users',
    path: '/users',
    icon: <PeopleIcon />,
  },
  {
    title: 'Plans',
    path: '/plans',
    icon: <CardMembershipIcon />,
  },
];

const Sidebar: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();
  const { mode, toggleTheme } = useThemeContext();

  const renderContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo & Brand */}
      <Box
        sx={{
          px: 2.5,
          py: 3,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img src={logo} alt="Logo" style={{ width: '50%' }} />
      </Box>

      {/* Navigation */}
      <Box sx={{ px: 2, mt: 3 }}>
        <Typography
          variant="body2"
          sx={{
            px: 1.5,
            mb: 1.5,
            color: 'text.secondary',
            textTransform: 'uppercase',
            fontSize: 11,
            fontWeight: 'fontWeightBold',
            lineHeight: '22px',
            letterSpacing: '1px',
          }}
        >
          Overview
        </Typography>

        <List disablePadding sx={{ mb: 2 }}>
          {navConfig.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <ListItemButton
                key={item.title}
                component={NavLink}
                to={item.path}
                disableRipple
                sx={{
                  minHeight: 44,
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                    color: 'text.primary',
                  },
                  '&.active': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    fontWeight: 'fontWeightMedium',
                  },
                  fontSize: 14,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: 24,
                    mr: 1,
                    '& svg': { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 'medium' : 'regular',
                    textTransform: 'capitalize',
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Typography
          variant="body2"
          sx={{
            px: 1.5,
            mt: 3,
            mb: 1.5,
            color: 'text.secondary',
            textTransform: 'uppercase',
            fontSize: 11,
            fontWeight: 'fontWeightBold',
            lineHeight: '22px',
            letterSpacing: '1px',
          }}
        >
          Management
        </Typography>

        <List disablePadding>
          {managementItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <ListItemButton
                key={item.title}
                component={NavLink}
                to={item.path}
                disableRipple
                sx={{
                  minHeight: 44,
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  color: isActive ? 'primary.main' : 'text.secondary',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                    color: 'text.primary',
                  },
                  '&.active': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    fontWeight: 'fontWeightMedium',
                  },
                  fontSize: 14,
                }}
              >
                <ListItemIcon
                  sx={{
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: 24,
                    mr: 1,
                    '& svg': { fontSize: 20 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isActive ? 'medium' : 'regular',
                    textTransform: 'capitalize',
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* Dark/Light Mode Toggle */}
      <Box sx={{ px: 2.5, pb: 3 }}>
        <Stack
          spacing={3}
          sx={{
            p: 1.5,
            borderRadius: 1.5,
            position: 'relative',
            bgcolor: alpha(theme.palette.grey[500], 0.08),
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {mode === 'dark' ? (
                <DarkModeIcon fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} />
              ) : (
                <LightModeIcon fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} />
              )}
              <Typography variant="subtitle2" sx={{ fontSize: 14 }}>
                {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </Typography>
            </Box>
            <Switch
              checked={mode === 'light'}
              onChange={toggleTheme}
              color="primary"
              size="small"
            />
          </Stack>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{
        flexShrink: { lg: 0 },
        width: { lg: DRAWER_WIDTH },
      }}
    >
      <Drawer
        variant="permanent"
        PaperProps={{
          sx: {
            width: DRAWER_WIDTH,
            borderRightStyle: 'dashed',
            borderRightWidth: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            boxSizing: 'border-box',
          },
        }}
      >
        {renderContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
