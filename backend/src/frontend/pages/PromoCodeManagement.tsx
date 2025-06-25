import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import authApi from '../utils/auth';

interface PromoCode {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed_amount' | 'trial_days' | 'free_trial';
  discountValue: number;
  durationType: 'once' | 'forever' | 'months';
  durationInMonths?: number;
  validPlanIds: string[];
  trialPlanId?: string;
  maxUses: number;
  currentUses: number;
  validFrom?: Date;
  validUntil?: Date;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Plan {
  id: string;
  name: string;
  prices: {
    monthly: number;
    yearly: number;
  };
}

const PromoCodeManagement: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'trial_days' as PromoCode['discountType'],
    discountValue: 7,
    durationType: 'once' as PromoCode['durationType'],
    durationInMonths: 1,
    validPlanIds: [] as string[],
    trialPlanId: '',
    maxUses: -1,
    validFrom: null as Date | null,
    validUntil: null as Date | null,
    isActive: true,
    description: '',
  });

  useEffect(() => {
    fetchPromoCodes();
    fetchPlans();
  }, []);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const response = await authApi.get('/promo-codes');
      setPromoCodes(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch promo codes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await authApi.get('/plans');
      setPlans(response.data);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      const data = {
        ...formData,
        code: formData.code.toUpperCase(),
        validFrom: formData.validFrom || undefined,
        validUntil: formData.validUntil || undefined,
      };

      if (editingCode) {
        await authApi.put(`/promo-codes/${editingCode._id}`, data);
        setSuccessMessage('Promo code updated successfully');
      } else {
        await authApi.post('/promo-codes', data);
        setSuccessMessage('Promo code created successfully');
      }

      setDialogOpen(false);
      fetchPromoCodes();
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save promo code');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await authApi.put(`/promo-codes/${id}/deactivate`);
      setSuccessMessage('Promo code deactivated');
      fetchPromoCodes();
    } catch (err) {
      setError('Failed to deactivate promo code');
    }
  };

  const handleEdit = (promoCode: PromoCode) => {
    setEditingCode(promoCode);
    setFormData({
      code: promoCode.code,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      durationType: promoCode.durationType,
      durationInMonths: promoCode.durationInMonths || 1,
      validPlanIds: promoCode.validPlanIds,
      trialPlanId: promoCode.trialPlanId || '',
      maxUses: promoCode.maxUses,
      validFrom: promoCode.validFrom ? new Date(promoCode.validFrom) : null,
      validUntil: promoCode.validUntil ? new Date(promoCode.validUntil) : null,
      isActive: promoCode.isActive,
      description: promoCode.description || '',
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCode(null);
    setFormData({
      code: '',
      discountType: 'trial_days',
      discountValue: 7,
      durationType: 'once',
      durationInMonths: 1,
      validPlanIds: [],
      trialPlanId: '',
      maxUses: -1,
      validFrom: null,
      validUntil: null,
      isActive: true,
      description: '',
    });
  };

  const copyToClipboard = (code: string) => {
    const url = `https://app.getmint.ai/auth?code=${code}`;
    navigator.clipboard.writeText(url);
    setSuccessMessage(`URL copied: ${url}`);
  };

  const getDiscountTypeLabel = (type: PromoCode['discountType']) => {
    switch (type) {
      case 'percentage':
        return 'Percentage';
      case 'fixed_amount':
        return 'Fixed Amount';
      case 'trial_days':
        return 'Trial Days';
      case 'free_trial':
        return 'Free Trial';
      default:
        return type;
    }
  };

  const getDiscountValueLabel = (code: PromoCode) => {
    switch (code.discountType) {
      case 'percentage':
        return `${code.discountValue}%`;
      case 'fixed_amount':
        return `€${code.discountValue / 100}`;
      case 'trial_days':
        return `${code.discountValue} days`;
      case 'free_trial':
        return 'Free';
      default:
        return code.discountValue;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Promo Code Management
        </Typography>
        <Box>
          <IconButton onClick={fetchPromoCodes} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            Create Promo Code
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Valid Period</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {promoCodes.map((code) => (
              <TableRow key={code._id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {code.code}
                    </Typography>
                    <IconButton size="small" onClick={() => copyToClipboard(code.code)}>
                      <CopyIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell>{getDiscountTypeLabel(code.discountType)}</TableCell>
                <TableCell>{getDiscountValueLabel(code)}</TableCell>
                <TableCell>
                  {code.currentUses} / {code.maxUses === -1 ? '∞' : code.maxUses}
                </TableCell>
                <TableCell>
                  <Box>
                    {code.validFrom && (
                      <Typography variant="caption" display="block">
                        From: {new Date(code.validFrom).toLocaleDateString()}
                      </Typography>
                    )}
                    {code.validUntil && (
                      <Typography variant="caption" display="block">
                        Until: {new Date(code.validUntil).toLocaleDateString()}
                      </Typography>
                    )}
                    {!code.validFrom && !code.validUntil && (
                      <Typography variant="caption">Always valid</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={code.isActive ? 'Active' : 'Inactive'}
                    color={code.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEdit(code)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {code.isActive && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeactivate(code._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCode ? 'Edit Promo Code' : 'Create Promo Code'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Promo Code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              fullWidth
              disabled={!!editingCode}
              helperText="Enter a unique code (will be converted to uppercase)"
            />

            <FormControl fullWidth>
              <InputLabel>Discount Type</InputLabel>
              <Select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({ ...formData, discountType: e.target.value as PromoCode['discountType'] })
                }
              >
                <MenuItem value="trial_days">Trial Days</MenuItem>
                <MenuItem value="percentage">Percentage Discount</MenuItem>
                <MenuItem value="fixed_amount">Fixed Amount</MenuItem>
                <MenuItem value="free_trial">Free Trial</MenuItem>
              </Select>
            </FormControl>

            {formData.discountType === 'trial_days' && (
              <>
                <TextField
                  label="Number of Trial Days"
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) =>
                    setFormData({ ...formData, discountValue: parseInt(e.target.value) || 0 })
                  }
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Trial Plan</InputLabel>
                  <Select
                    value={formData.trialPlanId}
                    onChange={(e) => setFormData({ ...formData, trialPlanId: e.target.value })}
                  >
                    <MenuItem value="">None</MenuItem>
                    {plans.map((plan) => (
                      <MenuItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}

            <TextField
              label="Max Uses (-1 for unlimited)"
              type="number"
              value={formData.maxUses}
              onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || -1 })}
              fullWidth
            />

            <TextField
              label="Valid From (Optional - YYYY-MM-DD)"
              type="date"
              value={formData.validFrom ? new Date(formData.validFrom).toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, validFrom: e.target.value ? new Date(e.target.value) : null })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Valid Until (Optional - YYYY-MM-DD)"
              type="date"
              value={formData.validUntil ? new Date(formData.validUntil).toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, validUntil: e.target.value ? new Date(e.target.value) : null })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateOrUpdate} variant="contained">
            {editingCode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PromoCodeManagement;
