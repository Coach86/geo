import React, { useState } from 'react';
import {
  Typography,
  Box,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Alert
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import { updatePromptSet } from '../../utils/api';

interface EditablePromptsProps {
  companyId: string;
  title: string;
  icon: React.ReactNode;
  prompts: string[];
  promptType: 'direct' | 'spontaneous' | 'comparison' | 'accuracy' | 'brand-battle';
  description: string;
  onUpdate: (newPrompts: string[]) => void;
}

const EditablePrompts: React.FC<EditablePromptsProps> = ({
  companyId,
  title,
  icon,
  prompts,
  promptType,
  description,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompts, setEditedPrompts] = useState<string[]>([...prompts]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return <ChatBubbleOutlineIcon color="primary" />;
      case 'spontaneous':
        return <QuestionAnswerIcon color="primary" />;
      case 'comparison':
        return <CompareArrowsIcon color="primary" />;
      case 'accuracy':
        return <FactCheckIcon color="primary" />;
      case 'brand-battle':
        return <SportsMmaIcon color="primary" />;
      default:
        return null;
    }
  };

  const handleStartEdit = () => {
    setEditedPrompts([...prompts]);
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

      // Filter out empty prompts
      const filteredPrompts = editedPrompts.filter(p => p.trim() !== '');

      // Build the update object with the correct property
      const updateData: any = {};
      
      // Handle the special case for brand-battle which maps to brandBattle in the API
      const promptTypeKey = promptType === 'brand-battle' ? 'brandBattle' : promptType;
      updateData[promptTypeKey] = filteredPrompts;

      // Update the prompts
      const updatedPromptSet = await updatePromptSet(companyId, updateData);

      // Get the updated prompts, which could be an array directly or a JSON string
      const updatedPrompts = Array.isArray(updatedPromptSet[promptTypeKey])
        ? updatedPromptSet[promptTypeKey] 
        : JSON.parse(updatedPromptSet[promptTypeKey] || '[]');

      // Call the onUpdate callback with the new prompts
      onUpdate(updatedPrompts);

      // Exit edit mode
      setIsEditing(false);
    } catch (err) {
      console.error(`Failed to update ${promptType} prompts:`, err);
      setError(`Failed to save ${promptType} prompts. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    const newPrompts = [...editedPrompts];
    newPrompts[index] = value;
    setEditedPrompts(newPrompts);
  };

  const handleDelete = (index: number) => {
    const newPrompts = [...editedPrompts];
    newPrompts.splice(index, 1);
    setEditedPrompts(newPrompts);
  };

  const handleAddNew = () => {
    setEditedPrompts([...editedPrompts, '']);
  };

  // Render the view mode
  if (!isEditing) {
    return (
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            {icon}
            <Box component="span" sx={{ ml: 1 }}>{title}</Box>
          </Typography>
          <Tooltip title={`Edit ${title}`}>
            <IconButton onClick={handleStartEdit} color="primary" size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <List>
          {prompts.map((prompt, index) => (
            <ListItem key={index} sx={{ py: 1 }}>
              <ListItemIcon>
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  {getIcon(promptType)}
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: -8,
                      right: -5,
                      fontSize: '0.7rem',
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {index + 1}
                  </Typography>
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={prompt}
                primaryTypographyProps={{
                  component: 'div',
                  style: { whiteSpace: 'pre-wrap' }
                }}
              />
            </ListItem>
          ))}
        </List>
        {prompts.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No prompts available. Click the edit button to add prompts.
          </Typography>
        )}
      </>
    );
  }

  // Render the edit mode
  return (
    <Dialog open={isEditing} onClose={handleCancel} fullWidth maxWidth="md">
      <DialogTitle>
        Edit {title}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {description}
        </Typography>
        
        <List>
          {editedPrompts.map((prompt, index) => (
            <ListItem key={index} sx={{ py: 1, alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                  {getIcon(promptType)}
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: -8,
                      right: -5,
                      fontSize: '0.7rem',
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {index + 1}
                  </Typography>
                </Box>
              </ListItemIcon>
              <TextField
                fullWidth
                multiline
                variant="outlined"
                size="small"
                value={prompt}
                onChange={(e) => handleChange(index, e.target.value)}
                placeholder="Enter prompt"
                sx={{ flex: 1 }}
              />
              <IconButton onClick={() => handleDelete(index)} color="error" sx={{ ml: 1 }}>
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
          Add Prompt
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

export default EditablePrompts;