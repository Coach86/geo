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
import GroupIcon from '@mui/icons-material/Group';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon color="primary" sx={{ mr: 1 }} />
            Competitors
          </Typography>
          <Tooltip title="Edit competitors">
            <IconButton onClick={handleStartEdit} color="primary" size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <List>
          {competitors.map((competitor, index) => (
            <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GroupIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText primary={competitor} />
            </ListItem>
          ))}
        </List>
        {competitors.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No competitors specified. Click the edit button to add competitors.
          </Typography>
        )}
      </>
    );
  }
  
  // Render the edit mode
  return (
    <Dialog open={isEditing} onClose={handleCancel} fullWidth maxWidth="sm">
      <DialogTitle>
        Edit Competitors
      </DialogTitle>
      <DialogContent>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <List>
          {editedCompetitors.map((competitor, index) => (
            <ListItem key={index} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <GroupIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                value={competitor}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder="Enter competitor name"
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
          Add Competitor
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

export default EditableCompetitors;