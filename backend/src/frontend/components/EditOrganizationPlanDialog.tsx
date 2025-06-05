import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  LinearProgress,
  TextField,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CpuIcon from '@mui/icons-material/Memory';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Link';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import { getOrganizationModels, updateOrganizationModels, updateOrganizationPlanSettings, updateOrganization } from '../utils/api-organization';

interface Organization {
  id: string;
  planSettings: {
    maxProjects: number;
    maxAIModels: number;
    maxSpontaneousPrompts: number;
    maxUrls: number;
    maxUsers: number;
  };
  selectedModels: string[];
  stripePlanId?: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
}

interface EditOrganizationPlanDialogProps {
  open: boolean;
  onClose: () => void;
  organization: Organization | null;
  onUpdate: () => void;
}

export const EditOrganizationPlanDialog: React.FC<EditOrganizationPlanDialogProps> = ({
  open,
  onClose,
  organization,
  onUpdate,
}) => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planSettings, setPlanSettings] = useState({
    maxProjects: 0,
    maxAIModels: 0,
    maxSpontaneousPrompts: 0,
    maxUrls: 0,
    maxUsers: 0,
  });
  const [stripePlanId, setStripePlanId] = useState<string>('');

  useEffect(() => {
    if (organization && open) {
      setSelectedModels(organization.selectedModels || []);
      setPlanSettings(organization.planSettings);
      setStripePlanId(organization.stripePlanId || '');
      
      // Fetch available models
      const fetchModels = async () => {
        try {
          setModelsLoading(true);
          const data = await getOrganizationModels();
          console.log('Fetched models data:', data);
          setAvailableModels(data.models || []);
        } catch (err) {
          console.error('Failed to fetch available models:', err);
          setError('Failed to load available models. Please try again.');
        } finally {
          setModelsLoading(false);
        }
      };

      fetchModels();
    }
  }, [organization, open]);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) => {
      const isSelected = prev.includes(modelId);
      if (isSelected) {
        return prev.filter((id) => id !== modelId);
      } else {
        return [...prev, modelId];
      }
    });
  };

  const handleSave = async () => {
    if (!organization) return;
    setError(null);
    setSaving(true);
    try {
      // Update plan settings, selected models, and stripe plan ID
      const promises = [
        updateOrganizationPlanSettings(organization.id, planSettings),
        updateOrganizationModels(organization.id, selectedModels),
      ];
      
      // Only update stripePlanId if it has changed
      if (stripePlanId !== organization.stripePlanId) {
        promises.push(updateOrganization(organization.id, { stripePlanId }));
      }
      
      await Promise.all(promises);
      onUpdate();
      onClose();
    } catch (err: any) {
      console.error('Failed to update organization settings:', err);
      setError(err.response?.data?.message || 'Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      // Reset to original values
      if (organization) {
        setSelectedModels(organization.selectedModels || []);
        setPlanSettings(organization.planSettings);
        setStripePlanId(organization.stripePlanId || '');
      }
    }
  };

  if (!organization) return null;

  const getPlanBadge = () => {
    const { planSettings } = organization;
    if (planSettings.maxProjects === 1 && planSettings.maxUsers === 1) {
      return <Chip label="Starter" size="small" color="default" />;
    } else if (planSettings.maxUsers === -1) {
      return <Chip label="Enterprise" size="small" color="primary" />;
    } else {
      return <Chip label="Professional" size="small" color="secondary" />;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Organization Plan & Settings</Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {organization.id}
            </Typography>
          </Box>
          {getPlanBadge()}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {/* Plan Limits Overview */}
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Plan Limits
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                type="number"
                label="Max Projects"
                value={planSettings.maxProjects}
                onChange={(e) => setPlanSettings({ ...planSettings, maxProjects: parseInt(e.target.value) || 0 })}
                InputProps={{
                  inputProps: { min: 0 },
                  startAdornment: <BusinessIcon fontSize="small" sx={{ mr: 1, color: 'action.main' }} />,
                }}
                helperText="Maximum number of projects allowed"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                type="number"
                label="Max Users"
                value={planSettings.maxUsers}
                onChange={(e) => setPlanSettings({ ...planSettings, maxUsers: parseInt(e.target.value) || 0 })}
                InputProps={{
                  inputProps: { min: -1 },
                  startAdornment: <PeopleIcon fontSize="small" sx={{ mr: 1, color: 'action.main' }} />,
                }}
                helperText="Use -1 for unlimited users"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                type="number"
                label="Max AI Models"
                value={planSettings.maxAIModels}
                onChange={(e) => setPlanSettings({ ...planSettings, maxAIModels: parseInt(e.target.value) || 0 })}
                InputProps={{
                  inputProps: { min: 0 },
                  startAdornment: <ModelTrainingIcon fontSize="small" sx={{ mr: 1, color: 'action.main' }} />,
                }}
                helperText="Maximum AI models per batch"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                type="number"
                label="Max URLs per Project"
                value={planSettings.maxUrls}
                onChange={(e) => setPlanSettings({ ...planSettings, maxUrls: parseInt(e.target.value) || 0 })}
                InputProps={{
                  inputProps: { min: 0 },
                  startAdornment: <LinkIcon fontSize="small" sx={{ mr: 1, color: 'action.main' }} />,
                }}
                helperText="URLs allowed per project"
              />
            </Box>
            
            <Box sx={{ flex: '1 1 300px' }}>
              <TextField
                fullWidth
                type="number"
                label="Max Spontaneous Prompts"
                value={planSettings.maxSpontaneousPrompts}
                onChange={(e) => setPlanSettings({ ...planSettings, maxSpontaneousPrompts: parseInt(e.target.value) || 0 })}
                InputProps={{
                  inputProps: { min: 0 },
                  startAdornment: <QuestionAnswerIcon fontSize="small" sx={{ mr: 1, color: 'action.main' }} />,
                }}
                helperText="Custom prompts allowed"
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Stripe Settings */}
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
            Billing Settings
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Stripe Plan ID"
              value={stripePlanId}
              onChange={(e) => setStripePlanId(e.target.value)}
              InputProps={{
                startAdornment: <CreditCardIcon fontSize="small" sx={{ mr: 1, color: 'action.main' }} />,
              }}
              helperText="The Stripe plan ID for billing purposes (e.g., 'manual', 'basic', 'pro', 'enterprise')"
              sx={{ maxWidth: '400px' }}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* AI Models Selection */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CpuIcon fontSize="small" color="action" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                AI Models Selection
              </Typography>
              <Chip 
                label="Admin Override" 
                size="small" 
                color="warning" 
                sx={{ ml: 1 }} 
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Select which AI models to use for batch processing
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">
                  {selectedModels.length} of {availableModels.length} models selected
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setSelectedModels(availableModels.map(m => m.id))}
                    disabled={selectedModels.length === availableModels.length}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setSelectedModels([])}
                    disabled={selectedModels.length === 0}
                  >
                    Deselect All
                  </Button>
                </Box>
              </Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="caption">
                  <strong>Admin Override Active:</strong> You can select any number of models regardless of the plan's maxAIModels limit. 
                  The maxAIModels field ({planSettings.maxAIModels}) still applies to regular users when they edit their settings.
                </Typography>
              </Alert>
            </Box>

            {modelsLoading ? (
              <Box>
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} variant="text" width="100%" height={40} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : (
              <FormControl component="fieldset" variant="standard" fullWidth>
                <FormGroup>
                  {availableModels.map((model) => (
                    <FormControlLabel
                      key={model.id}
                      control={
                        <Checkbox
                          checked={selectedModels.includes(model.id)}
                          onChange={() => handleModelToggle(model.id)}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                          <Typography variant="body1">
                            {model.name}
                          </Typography>
                          <Chip
                            label={model.provider}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                          {!model.enabled && (
                            <Chip
                              label="Disabled"
                              size="small"
                              color="default"
                            />
                          )}
                        </Box>
                      }
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 1,
                        px: 2,
                        mb: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: selectedModels.includes(model.id)
                          ? 'action.hover'
                          : 'background.paper',
                        '&:hover': {
                          bgcolor: selectedModels.includes(model.id)
                            ? 'action.selected'
                            : 'action.hover',
                        },
                        '& .MuiFormControlLabel-label': {
                          flex: 1,
                        },
                      }}
                    />
                  ))}
                </FormGroup>
                {availableModels.length === 0 && !modelsLoading && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    No AI models are currently available in the configuration.
                  </Alert>
                )}
              </FormControl>
            )}
          </Box>

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
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};