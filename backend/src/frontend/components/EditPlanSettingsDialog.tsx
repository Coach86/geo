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
} from '@mui/material';
import { User } from '../utils/types';
import { updateUserPlanSettings } from '../utils/api';
import BusinessIcon from '@mui/icons-material/Business';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import CreditCardIcon from '@mui/icons-material/CreditCard';

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
  const [maxBrands, setMaxBrands] = useState(1);
  const [maxAIModels, setMaxAIModels] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setMaxBrands(user.planSettings?.maxBrands || 1);
      setMaxAIModels(user.planSettings?.maxAIModels || 3);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setError(null);
    setSaving(true);

    try {
      const updatedUser = await updateUserPlanSettings(user.id, {
        maxBrands,
        maxAIModels,
      });
      onUpdate(updatedUser);
      onClose();
    } catch (err) {
      console.error('Failed to update plan settings:', err);
      setError('Failed to update plan settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
      // Reset to original values
      if (user) {
        setMaxBrands(user.planSettings?.maxBrands || 1);
        setMaxAIModels(user.planSettings?.maxAIModels || 3);
      }
    }
  };

  if (!user) return null;

  const currentBrandCount = user.companyIds?.length || 0;
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
                  {currentBrandCount} / {user.planSettings?.maxBrands || 1}
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
                label="Max Brands"
                type="number"
                value={maxBrands}
                onChange={(e) => setMaxBrands(Math.max(1, parseInt(e.target.value) || 1))}
                InputProps={{
                  inputProps: { min: 1 },
                  startAdornment: <BusinessIcon sx={{ mr: 1, color: 'action.active' }} />,
                }}
                helperText={`Currently using ${currentBrandCount} brands`}
                error={maxBrands < currentBrandCount}
              />
              {maxBrands < currentBrandCount && (
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