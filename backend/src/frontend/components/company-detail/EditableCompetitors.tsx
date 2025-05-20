import React, { useState } from 'react';
import {
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  IconButton,
  TextField,
  Box,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import { updateCompanyDetails } from '../../utils/api';

interface EditableCompetitorsProps {
  companyId: string;
  competitors: string[];
  onUpdate: (newCompetitors: string[]) => void;
}

const EditableCompetitors: React.FC<EditableCompetitorsProps> = ({ 
  companyId, 
  competitors, 
  onUpdate 
}) => {
  const theme = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editedCompetitors, setEditedCompetitors] = useState<string[]>([...competitors]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleStartEdit = () => {
    setEditedCompetitors([...competitors]);
    setIsEditing(true);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Filter out empty competitors
      const filteredCompetitors = editedCompetitors.filter(c => c.trim() !== '');
      
      // Update the company details
      const updatedCompany = await updateCompanyDetails(companyId, {
        competitors: filteredCompetitors
      });
      
      // Call the onUpdate callback with the new competitors
      onUpdate(updatedCompany.competitors);
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update competitors:', err);
      setError('Failed to save competitors. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleChange = (index: number, value: string) => {
    const newCompetitors = [...editedCompetitors];
    newCompetitors[index] = value;
    setEditedCompetitors(newCompetitors);
  };
  
  const handleDelete = (index: number) => {
    const newCompetitors = [...editedCompetitors];
    newCompetitors.splice(index, 1);
    setEditedCompetitors(newCompetitors);
  };
  
  const handleAddNew = () => {
    setEditedCompetitors([...editedCompetitors, '']);
  };
  
  // Render the view mode
  if (!isEditing) {
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: '1rem',
              fontWeight: 600, 
              color: theme.palette.text.primary
            }}
          >
            <BusinessIcon 
              sx={{ 
                mr: 1, 
                fontSize: '1.1rem',
                color: theme.palette.secondary.main 
              }} 
            />
            Competitors
          </Typography>
          <Tooltip title="Edit competitors">
            <IconButton 
              onClick={handleStartEdit} 
              color="secondary" 
              size="small"
              sx={{ 
                width: 30,
                height: 30,
                backgroundColor: alpha(theme.palette.secondary.main, 0.08),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.secondary.main, 0.12),
                }
              }}
            >
              <EditIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <List sx={{ p: 0 }}>
          {competitors.map((competitor, index) => (
            <ListItem 
              key={index} 
              disablePadding 
              sx={{ 
                py: 0.75,
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.secondary.light, 0.05),
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GroupIcon 
                  fontSize="small" 
                  sx={{ 
                    color: theme.palette.secondary.main,
                    fontSize: '0.9rem'
                  }} 
                />
              </ListItemIcon>
              <ListItemText 
                primary={competitor} 
                primaryTypographyProps={{
                  sx: {
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: theme.palette.text.primary
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
        {competitors.length === 0 && (
          <Box 
            sx={{ 
              p: 2, 
              textAlign: 'center',
              backgroundColor: alpha(theme.palette.grey[50], 0.8),
              borderRadius: 1,
            }}
          >
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.875rem' }}
            >
              No competitors specified. Click the edit button to add competitors.
            </Typography>
          </Box>
        )}
      </>
    );
  }
  
  // Render the edit mode
  return (
    <Dialog 
      open={isEditing} 
      onClose={handleCancel} 
      fullWidth 
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          pb: 1,
          pt: 2,
          fontWeight: 600,
          fontSize: '1.1rem',
        }}
      >
        Edit Competitors
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              backgroundColor: alpha(theme.palette.error.light, 0.1),
              border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
            }}
          >
            <Typography 
              color="error" 
              variant="body2" 
              sx={{ 
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {error}
            </Typography>
          </Box>
        )}
        <List>
          {editedCompetitors.map((competitor, index) => (
            <ListItem 
              key={index} 
              sx={{ 
                py: 1,
                px: 0.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GroupIcon 
                  fontSize="small" 
                  sx={{ 
                    fontSize: '1rem', 
                    color: theme.palette.secondary.main 
                  }} 
                />
              </ListItemIcon>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={competitor}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder="Enter competitor name"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: alpha(theme.palette.secondary.main, 0.5),
                      }
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.secondary.main,
                        borderWidth: 1,
                      }
                    }
                  }
                }}
              />
              <IconButton 
                onClick={() => handleDelete(index)} 
                color="error"
                sx={{ 
                  ml: 0.5,
                  width: 32,
                  height: 32,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.error.main, 0.08),
                  }
                }}
              >
                <DeleteIcon sx={{ fontSize: '1rem' }} />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <Button 
          startIcon={<AddIcon />} 
          onClick={handleAddNew} 
          color="secondary" 
          sx={{ 
            mt: 1, 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            borderRadius: 1,
          }}
        >
          Add Competitor
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button 
          onClick={handleCancel} 
          disabled={saving}
          sx={{ 
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: theme.palette.text.secondary,
            px: 2
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          color="secondary" 
          startIcon={<SaveIcon sx={{ fontSize: '1rem' }} />} 
          disabled={saving}
          sx={{ 
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: 1,
            borderRadius: 1,
            px: 2
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditableCompetitors;