import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { logout } from '../utils/auth';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogout = () => {
    logout();
    // Navigation will be handled by the logout function which redirects to login
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ height: 64 }}>
          <BusinessIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography
            variant="h6"
            noWrap
            component={NavLink}
            to="/"
            sx={{
              mr: 2,
              fontWeight: 700,
              color: theme.palette.text.primary,
              textDecoration: 'none',
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            YOMA
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title="Users">
              <IconButton color="primary" sx={{ mr: 2 }} component={NavLink} to="/users">
                <PeopleIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Companies">
              <IconButton color="primary" sx={{ mr: 2 }} component={NavLink} to="/companies">
                <BusinessIcon />
              </IconButton>
            </Tooltip>

            <Button
              color="primary"
              component={NavLink}
              to="/companies"
              sx={{
                textDecoration: 'none',
                mx: 1,
                '&.active': {
                  fontWeight: 'bold',
                  borderBottom: `2px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              Companies
            </Button>

            <Button
              color="primary"
              component={NavLink}
              to="/users"
              sx={{
                textDecoration: 'none',
                mx: 1,
                '&.active': {
                  fontWeight: 'bold',
                  borderBottom: `2px solid ${theme.palette.primary.main}`,
                },
              }}
            >
              Users
            </Button>

            <Button
              color="primary"
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/companies/new')}
              sx={{
                ml: 1,
                px: 2,
                boxShadow: 2,
              }}
            >
              New Company
            </Button>

            {/* Email Preview Button */}
            <Button
              color="secondary"
              variant="contained"
              startIcon={<EmailIcon />}
              component={NavLink}
              to="/email-preview"
              sx={{
                ml: 2,
                px: 2,
                boxShadow: 2,
              }}
            >
              Email Preview
            </Button>

            {/* Config Button */}
            <Button
              color="info"
              variant="outlined"
              startIcon={<SettingsIcon />}
              component={NavLink}
              to="/config"
              sx={{
                ml: 2,
                px: 2,
              }}
            >
              Config
            </Button>

            {/* Logout Button */}
            <Button
              color="error"
              variant="outlined"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                ml: 2,
                px: 2,
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
