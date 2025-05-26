import React from 'react';
import { Box, Typography, Container, Link, useTheme, Divider, Grid } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const Footer: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        mt: 'auto',
        backgroundColor: theme.palette.background.paper,
        borderTop: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.secondary,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">
          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              YOMA
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Advanced brand insight analytics platform powered by multiple LLM providers.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Link href="#" color="inherit" aria-label="GitHub">
                <GitHubIcon />
              </Link>
              <Link href="#" color="inherit" aria-label="Twitter">
                <TwitterIcon />
              </Link>
              <Link href="#" color="inherit" aria-label="LinkedIn">
                <LinkedInIcon />
              </Link>
            </Box>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Resources
            </Typography>
            <Link href="#" color="inherit" underline="hover" display="block" sx={{ mb: 1 }}>
              Documentation
            </Link>
            <Link href="#" color="inherit" underline="hover" display="block" sx={{ mb: 1 }}>
              API Reference
            </Link>
            <Link href="#" color="inherit" underline="hover" display="block">
              Help Center
            </Link>
          </Grid>

          <Grid size={{ xs: 6, md: 2 }}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Company
            </Typography>
            <Link href="#" color="inherit" underline="hover" display="block" sx={{ mb: 1 }}>
              About
            </Link>
            <Link href="#" color="inherit" underline="hover" display="block" sx={{ mb: 1 }}>
              Contact
            </Link>
            <Link href="#" color="inherit" underline="hover" display="block">
              Privacy
            </Link>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} Mint. All rights reserved.
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, mt: { xs: 2, sm: 0 } }}>
            <Link href="#" color="inherit" underline="hover" variant="body2">
              Terms
            </Link>
            <Link href="#" color="inherit" underline="hover" variant="body2">
              Privacy
            </Link>
            <Link href="#" color="inherit" underline="hover" variant="body2">
              Cookies
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
