import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Chip,
  Divider,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Skeleton,
} from '@mui/material';
import { User, AIModel } from '../utils/types';
import { updateUserPlanSettings, getAvailableModels, updateUserSelectedModels } from '../utils/api';
import BusinessIcon from '@mui/icons-material/Business';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CpuIcon from '@mui/icons-material/Memory';

interface EditPlanSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: (updatedUser: User) => void;
}

export const EditPlanSettingsDialog: React.FC<EditPlanSettingsDialogProps> = ({
  open,
  onClose,
  user,
  onUpdate,
}) => {
  const [maxProjects, setMaxProjects] = useState(1);
  const [maxAIModels, setMaxAIModels] = useState(3);
  const [maxSpontaneousPrompts, setMaxSpontaneousPrompts] = useState(12);
  const [maxUrls, setMaxUrls] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AI Models state
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setMaxProjects(user.planSettings?.maxProjects || 1);
      setMaxAIModels(user.planSettings?.maxAIModels || 3);
      setMaxSpontaneousPrompts(user.planSettings?.maxSpontaneousPrompts || 12);
      setMaxUrls(user.planSettings?.maxUrls || 1);
      setSelectedModels(user.selectedModels || []);

      // Fetch available models
      const fetchModels = async () => {
        try {
          setModelsLoading(true);
          const data = await getAvailableModels(user.id);
          setAvailableModels(data.models || []);
        } catch (err) {
          console.error('Failed to fetch available models:', err);
        } finally {
          setModelsLoading(false);
        }
      };

      fetchModels();
    }
  }, [user]);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => {
      const isSelected = prev.includes(modelId);
      if (isSelected) {
        return prev.filter(id => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleSave = async () => {
    if (!user) return;

    setError(null);
    setSaving(true);

    try {
      // Update plan settings
      const updatedUser = await updateUserPlanSettings(user.id, {
        maxProjects,
        maxAIModels,
        maxSpontaneousPrompts,
        maxUrls,
      });

      // Update selected models
      const finalUpdatedUser = await updateUserSelectedModels(user.id, selectedModels);
      
      onUpdate(finalUpdatedUser);
      onClose();
    } catch (err) {
      console.error('Failed to update user settings:', err);
      setError('Failed to update user settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      // Reset to original values
      if (user) {
        setMaxProjects(user.planSettings?.maxProjects || 1);
        setMaxAIModels(user.planSettings?.maxAIModels || 3);
        setMaxSpontaneousPrompts(user.planSettings?.maxSpontaneousPrompts || 12);
        setMaxUrls(user.planSettings?.maxUrls || 1);
        setSelectedModels(user.selectedModels || []);
      }
    }
  };

  if (!user) return null;

  const currentBrandCount = user.projectIds?.length || 0;
  const getPlanName = () => {
    if (!user.stripePlanId) return 'Free';
    // Map plan IDs to names - this would come from your backend
    return 'Pro';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit Plan Settings
        <Typography variant="body2" color="textSecondary">
          {user.email}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {/* Current Plan Info */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CreditCardIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="textSecondary">
                    Current Plan
                  </Typography>
                </Box>
                <Typography variant="h6" color="textPrimary">{getPlanName()}</Typography>
                {user.stripePlanId && (
                  <Typography variant="caption" color="textSecondary">
                    {user.stripePlanId}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="textSecondary">
                    Current Usage
                  </Typography>
                </Box>
                <Typography variant="h6" color="textPrimary">
                  {currentBrandCount} / {user.planSettings?.maxProjects || 1}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  brands
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Editable Fields */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Max Projects"
                type="number"
                value={maxProjects}
                onChange={(e) => setMaxProjects(Math.max(1, parseInt(e.target.value) || 1))}
                InputProps={{
                  inputProps: { min: 1 },
                  startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                helperText={`Currently using ${currentBrandCount} brands`}
                error={maxProjects < currentBrandCount}
              />
              {maxProjects < currentBrandCount && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                  Warning: This is less than current usage
                </Typography>
              )}
            </Box>

            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Max AI Models"
                type="number"
                value={maxAIModels}
                onChange={(e) => setMaxAIModels(Math.max(1, parseInt(e.target.value) || 1))}
                InputProps={{
                  inputProps: { min: 1 },
                  startAdornment: <ModelTrainingIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                helperText="Number of AI models available"
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Max Spontaneous Prompts"
                type="number"
                value={maxSpontaneousPrompts}
                onChange={(e) => setMaxSpontaneousPrompts(Math.max(1, parseInt(e.target.value) || 1))}
                InputProps={{
                  inputProps: { min: 1 },
                }}
                helperText="Number of spontaneous prompts allowed"
              />
            </Box>

            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                fullWidth
                label="Max URLs"
                type="number"
                value={maxUrls}
                onChange={(e) => setMaxUrls(Math.max(1, parseInt(e.target.value) || 1))}
                InputProps={{
                  inputProps: { min: 1 },
                }}
                helperText="Number of unique URLs allowed"
              />
            </Box>
          </Box>

          {/* AI Models Selection */}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CpuIcon fontSize="small" color="action" />
              <Typography variant="h6" color="textPrimary">
                AI Models Selection
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Select which AI models this user can use for batch processing (admin can select without restrictions)
            </Typography>
            
            {modelsLoading ? (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} variant="rounded" width={200} height={40} />
                ))}
              </Box>
            ) : (
              <FormControl component="fieldset" variant="standard">
                <FormLabel component="legend">
                  <Typography variant="body2" color="textSecondary">
                    {selectedModels.length} of {availableModels.length} models selected
                  </Typography>
                </FormLabel>
                <FormGroup sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                  {availableModels.map((model) => (
                    <FormControlLabel
                      key={model.id}
                      control={
                        <Checkbox
                          checked={selectedModels.includes(model.id)}
                          onChange={() => handleModelToggle(model.id)}
                          size="small"
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {model.name}
                          </Typography>
                          <Chip 
                            label={model.provider} 
                            size="small" 
                            variant="outlined" 
                            sx={{ fontSize: 10, height: 20 }}
                          />
                        </Box>
                      }
                      sx={{ 
                        border: '1px solid',
                        borderColor: selectedModels.includes(model.id) ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        p: 1,
                        m: 0,
                        minWidth: 200,
                        bgcolor: selectedModels.includes(model.id) ? 'primary.light' : 'transparent',
                        '&:hover': {
                          bgcolor: selectedModels.includes(model.id) ? 'primary.light' : 'action.hover',
                        }
                      }}
                    />
                  ))}
                </FormGroup>
                {availableModels.length === 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No AI models are currently available in the configuration.
                  </Alert>
                )}
              </FormControl>
            )}
          </Box>

          {/* Stripe Customer Info */}
          {user.stripeCustomerId && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="textSecondary">
                Stripe Customer ID
              </Typography>
              <Typography variant="body2" color="textPrimary" sx={{ fontFamily: 'monospace' }}>
                {user.stripeCustomerId}
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};