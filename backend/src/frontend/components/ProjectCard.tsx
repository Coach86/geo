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
  IconButton,
  Stack,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Avatar,
  Divider,
} from '@mui/material';
import { Project } from '../utils/types';
import BusinessIcon from '@mui/icons-material/Business';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CompareIcon from '@mui/icons-material/Compare';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { getFormattedMarket } from '../utils/constants';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LanguageIcon from '@mui/icons-material/Language';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { deleteProject } from '../utils/api';

interface ProjectCardProps {
  project: Project;
  onDelete?: () => void; // Optional callback for when deletion is successful
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
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
      await deleteProject(project.id);
      setDeleteDialogOpen(false);
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Generate a consistent, semi-random color based on project name
  const getProjectColor = (name: string) => {
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

  const projectColor = getProjectColor(project.brandName);
  const formattedDate = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 1.5,
        boxShadow: 'none',
        border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
        transition: 'all 0.2s ease-in-out',
        overflow: 'hidden',
        '&:hover': {
          borderColor: alpha(theme.palette.primary.main, 0.3),
          boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.15)}`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 9,
        }}
      >
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{
            backgroundColor: alpha(theme.palette.grey[500], 0.08),
            backdropFilter: 'blur(4px)',
            width: 28,
            height: 28,
            '&:hover': {
              backgroundColor: alpha(theme.palette.grey[500], 0.12),
            },
          }}
        >
          <MoreVertIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Box>

      {/* Project Menu */}
      <Menu
        id="project-menu"
        anchorEl={menuAnchorEl}
        keepMounted
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => navigate(`/projects/${project.id}`)}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1.5 }} />
          View
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: theme.palette.error.main }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>Delete {project.brandName}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {project.brandName}? This action cannot be undone and
            will remove all associated data including batch results, reports, and prompt sets.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            disabled={isDeleting}
            sx={{ borderRadius: 1 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
            disabled={isDeleting}
            sx={{ borderRadius: 1 }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Box sx={{ pt: 2, px: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              backgroundColor: alpha(projectColor, 0.12),
              color: projectColor,
              mr: 2,
              fontWeight: 600,
            }}
          >
            {project.brandName.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography
              variant="subtitle1"
              component="h2"
              noWrap
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                transition: 'color 0.2s',
                cursor: 'pointer',
                fontSize: '0.95rem',
                '&:hover': { color: theme.palette.primary.main },
              }}
              onClick={handleCardClick}
            >
              {project.brandName}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{
                fontSize: '0.8rem',
                opacity: 0.8,
              }}
            >
              {project.industry} • {getFormattedMarket(project.market)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <CardActionArea onClick={handleCardClick} sx={{ flexGrow: 1 }}>
        <CardContent sx={{ pt: 0 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              height: 54,
              mb: 2,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              fontSize: '0.825rem',
              lineHeight: 1.5,
              opacity: 0.85,
            }}
          >
            {project.shortDescription}
          </Typography>

          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap' }}>
            {project.keyBrandAttributes.slice(0, 2).map((feature, index) => (
              <Chip
                key={index}
                label={feature}
                size="small"
                color={index === 0 ? 'primary' : 'default'}
                variant={index === 0 ? 'filled' : 'outlined'}
                sx={{
                  mb: 1,
                  height: 22,
                  borderRadius: 1,
                  '& .MuiChip-label': {
                    px: 1,
                    py: 0.25,
                    fontSize: '0.7rem',
                    fontWeight: index === 0 ? 600 : 400,
                  },
                }}
              />
            ))}
            {project.keyBrandAttributes.length > 2 && (
              <Chip
                label={`+${project.keyBrandAttributes.length - 2}`}
                size="small"
                variant="outlined"
                sx={{
                  mb: 1,
                  height: 22,
                  borderRadius: 1,
                  '& .MuiChip-label': {
                    px: 0.75,
                    fontSize: '0.7rem',
                  },
                }}
              />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>

      <Box sx={{ px: 2, pt: 0 }}>
        <Divider sx={{ my: 1.5 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: theme.palette.text.secondary,
              opacity: 0.8,
            }}
          >
            <ShowChartIcon fontSize="inherit" sx={{ mr: 0.5 }} />
            Updated {formattedDate}
          </Typography>

          {project.userEmail && (
            <Tooltip title={project.userEmail}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon
                  sx={{
                    fontSize: '0.8rem',
                    color: theme.palette.text.secondary,
                    mr: 0.5,
                    opacity: 0.8,
                  }}
                />
                {project.userLanguage && (
                  <Chip
                    label={project.userLanguage}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 18,
                      borderRadius: 0.75,
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontSize: '0.65rem',
                        fontWeight: 500,
                      },
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          )}
        </Stack>
      </Box>

      <CardActions
        sx={{
          px: 2,
          pt: 0,
          pb: 2,
          mt: 'auto',
          justifyContent: 'space-between',
          '& .MuiButton-root': { borderRadius: 1 },
        }}
      >
        <Button
          size="small"
          variant="outlined"
          startIcon={<BusinessIcon sx={{ fontSize: '0.9rem' }} />}
          onClick={handleCardClick}
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            py: 0.5,
            fontSize: '0.75rem',
          }}
        >
          View Details
        </Button>

        <Box>
          <Tooltip title="Sentiment Analysis">
            <IconButton
              size="small"
              color="primary"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/projects/${project.id}?tab=sentiment`);
              }}
              sx={{
                mr: 1,
                width: 28,
                height: 28,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.12) },
              }}
            >
              <FactCheckIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Competitor Analysis">
            <IconButton
              size="small"
              color="info"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/projects/${project.id}?tab=comparison`);
              }}
              sx={{
                width: 28,
                height: 28,
                backgroundColor: alpha(theme.palette.info.main, 0.08),
                '&:hover': { backgroundColor: alpha(theme.palette.info.main, 0.12) },
              }}
            >
              <CompareIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
