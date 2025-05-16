import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Chip,
  Box,
  CardActions,
  Button,
  useTheme,
  alpha,
  CardHeader,
  IconButton,
  Divider,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { CompanyIdentityCard } from '../utils/types';
import BusinessIcon from '@mui/icons-material/Business';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CompareIcon from '@mui/icons-material/Compare';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import DeleteIcon from '@mui/icons-material/Delete';
import { deleteCompany } from '../utils/api';

interface CompanyCardProps {
  company: CompanyIdentityCard;
  onDelete?: () => void; // Optional callback for when deletion is successful
}

const CompanyCard: React.FC<CompanyCardProps> = ({ company, onDelete }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCardClick = () => {
    navigate(`/companies/${company.id}`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleDeleteClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await deleteCompany(company.id);
      setDeleteDialogOpen(false);
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting company:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate a consistent, semi-random color based on company name
  const getCompanyColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colorOptions = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
    ];

    return colorOptions[Math.abs(hash) % colorOptions.length];
  };

  const companyColor = getCompanyColor(company.brandName);

  // Helper function to get flag emoji for market
  const getMarketWithFlag = (market: string): string => {
    const marketFlags: Record<string, string> = {
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      Canada: '🇨🇦',
      Australia: '🇦🇺',
      France: '🇫🇷',
      Germany: '🇩🇪',
      Japan: '🇯🇵',
      China: '🇨🇳',
      India: '🇮🇳',
      Brazil: '🇧🇷',
      Mexico: '🇲🇽',
      Spain: '🇪🇸',
      Italy: '🇮🇹',
      Netherlands: '🇳🇱',
      Sweden: '🇸🇪',
      Switzerland: '🇨🇭',
      Singapore: '🇸🇬',
      'South Korea': '🇰🇷',
      Russia: '🇷🇺',
      'South Africa': '🇿🇦',
    };

    const flag = marketFlags[market] || '🇺🇸';
    return `${flag} ${market}`;
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          boxShadow: `0 8px 24px 0 ${alpha(theme.palette.primary.main, 0.2)}`,
          transform: 'translateY(-4px)',
          transition: 'all 0.3s ease-in-out',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: -12,
          left: 16,
          height: 24,
          width: 24,
          borderRadius: '50%',
          backgroundColor: companyColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: theme.shadows[2],
        }}
      >
        <BusinessIcon sx={{ fontSize: 14, color: 'white' }} />
      </Box>

      <CardHeader
        action={
          <IconButton
            aria-label="settings"
            size="small"
            onClick={handleMenuOpen}
            aria-controls="company-menu"
            aria-haspopup="true"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        }
        title={
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              cursor: 'pointer',
              '&:hover': {
                color: theme.palette.primary.main,
              },
            }}
            onClick={handleCardClick}
          >
            {company.brandName}
          </Typography>
        }
        subheader={
          <Box component="span">
            {company.industry} • {getMarketWithFlag(company.market)}
          </Box>
        }
      />

      {/* Company Menu */}
      <Menu
        id="company-menu"
        anchorEl={menuAnchorEl}
        keepMounted
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDeleteClick} sx={{ color: theme.palette.error.main }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={(event, reason) => setDeleteDialogOpen(false)}
        aria-labelledby="delete-company-dialog-title"
      >
        <DialogTitle id="delete-company-dialog-title">Delete {company.brandName}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {company.brandName}? This action cannot be undone and
            will remove all associated data including batch results, reports, and prompt sets.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary" disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Divider />

      <CardActionArea onClick={handleCardClick} sx={{ flexGrow: 1 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
            {company.shortDescription}
          </Typography>

          <Box sx={{ mb: 2, minHeight: 32 }}>
            {company.keyBrandAttributes.slice(0, 2).map((feature, index) => (
              <Chip
                key={index}
                label={feature}
                size="small"
                color={index === 0 ? 'primary' : 'default'}
                variant={index === 0 ? 'filled' : 'outlined'}
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
            {company.keyBrandAttributes.length > 2 && (
              <Chip
                label={`+${company.keyBrandAttributes.length - 2} more`}
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
                variant="outlined"
              />
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <ShowChartIcon fontSize="inherit" />
              Last analysis: {new Date(company.updatedAt).toLocaleDateString()}
            </Typography>

            {company.userEmail && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Tooltip title="Owner">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon fontSize="inherit" />
                    <EmailIcon fontSize="inherit" sx={{ ml: 0.5, fontSize: '0.8rem' }} />
                  </Box>
                </Tooltip>
                {company.userEmail}
                {company.userLanguage && (
                  <Chip
                    icon={<LanguageIcon sx={{ fontSize: '0.8rem !important' }} />}
                    label={company.userLanguage}
                    size="small"
                    variant="outlined"
                    sx={{
                      ml: 0.5,
                      height: 20,
                      '& .MuiChip-label': { px: 0.5, fontSize: '0.7rem' },
                    }}
                  />
                )}
              </Typography>
            )}
          </Box>
        </CardContent>
      </CardActionArea>

      <Divider />

      <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1.5 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<BusinessIcon />}
          onClick={handleCardClick}
        >
          Details
        </Button>

        <Box>
          <IconButton
            size="small"
            color="primary"
            onClick={() => navigate(`/companies/${company.id}?tab=sentiment`)}
            sx={{ mr: 1 }}
          >
            <FactCheckIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            color="primary"
            onClick={() => navigate(`/companies/${company.id}?tab=comparison`)}
          >
            <CompareIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

export default CompanyCard;
