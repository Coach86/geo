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
  Tooltip
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import { updateCompanyDetails } from '../../utils/api';

interface EditableKeyFeaturesProps {
  companyId: string;
  keyFeatures: string[];
  onUpdate: (newKeyFeatures: string[]) => void;
}

const EditableKeyFeatures: React.FC<EditableKeyFeaturesProps> = ({ 
  companyId, 
  keyFeatures, 
  onUpdate 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedFeatures, setEditedFeatures] = useState<string[]>([...keyFeatures]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleStartEdit = () => {
    setEditedFeatures([...keyFeatures]);
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
      
      // Filter out empty features
      const filteredFeatures = editedFeatures.filter(f => f.trim() !== '');
      
      // Update the company details
      const updatedCompany = await updateCompanyDetails(companyId, {
        keyFeatures: filteredFeatures
      });
      
      // Call the onUpdate callback with the new features
      onUpdate(updatedCompany.keyFeatures);
      
      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update key features:', err);
      setError('Failed to save key features. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleChange = (index: number, value: string) => {
    const newFeatures = [...editedFeatures];
    newFeatures[index] = value;
    setEditedFeatures(newFeatures);
  };
  
  const handleDelete = (index: number) => {
    const newFeatures = [...editedFeatures];
    newFeatures.splice(index, 1);
    setEditedFeatures(newFeatures);
  };
  
  const handleAddNew = () => {
    setEditedFeatures([...editedFeatures, '']);
  };
  
  // Render the view mode
  if (!isEditing) {
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <StarIcon color="primary" sx={{ mr: 1 }} />
            Key Features
          </Typography>
          <Tooltip title="Edit key features">
            <IconButton onClick={handleStartEdit} color="primary" size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <List>
          {keyFeatures.map((feature, index) => (
            <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <StarIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText primary={feature} />
            </ListItem>
          ))}
        </List>
        {keyFeatures.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No key features specified. Click the edit button to add features.
          </Typography>
        )}
      </>
    );
  }
  
  // Render the edit mode
  return (
    <Dialog open={isEditing} onClose={handleCancel} fullWidth maxWidth="sm">
      <DialogTitle>
        Edit Key Features
      </DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <List>
          {editedFeatures.map((feature, index) => (
            <ListItem key={index} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <StarIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={feature}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder="Enter key feature"
              />
              <IconButton onClick={() => handleDelete(index)} color="error">
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
        <Button 
          startIcon={<AddIcon />} 
          onClick={handleAddNew} 
          color="primary" 
          sx={{ mt: 1 }}
        >
          Add Feature
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          startIcon={<SaveIcon />} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditableKeyFeatures;