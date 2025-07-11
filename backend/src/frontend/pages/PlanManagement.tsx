import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon, DragIndicator as DragIcon } from '@mui/icons-material';
import { PlanResponseDto } from '../utils/types';
import { getPlans, createPlan, updatePlan, getStripeProducts } from '../utils/api-plans';

interface PlanFormData {
  name: string;
  tag: string;
  subtitle: string;
  included: string[];
  stripeProductId: string;
  maxModels: number;
  maxProjects: number;
  maxUrls: number;
  maxSpontaneousPrompts: number;
  maxCompetitors: number;
  maxUsers: number;
  isActive: boolean;
  isRecommended: boolean;
  isMostPopular: boolean;
  order: number;
  metadata: Record<string, any>;
  refreshFrequency: string;
  shopifyMonthlyPrice?: number;
  shopifyAnnualPrice?: number;
  shopifyTrialDays?: number;
}

const defaultPlanData: PlanFormData = {
  name: '',
  tag: '',
  subtitle: '',
  included: [],
  stripeProductId: '',
  maxModels: 5,
  maxProjects: 1,
  maxUrls: 1,
  maxSpontaneousPrompts: 12,
  maxCompetitors: 5,
  maxUsers: 1,
  isActive: true,
  isRecommended: false,
  isMostPopular: false,
  order: 0,
  metadata: {},
  refreshFrequency: 'weekly',
};

export default function PlanManagement() {
  const [plans, setPlans] = useState<PlanResponseDto[]>([]);
  const [stripeProducts, setStripeProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanResponseDto | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlanData);
  const [includedInput, setIncludedInput] = useState('');

  useEffect(() => {
    loadPlans();
    loadStripeProducts();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await getPlans(true);
      setPlans(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      setError('Failed to load plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStripeProducts = async () => {
    try {
      const products = await getStripeProducts();
      setStripeProducts(products);
    } catch (err) {
      console.error('Failed to load Stripe products:', err);
    }
  };

  const handleEdit = (plan: PlanResponseDto) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      tag: plan.tag,
      subtitle: plan.subtitle,
      included: plan.included,
      stripeProductId: plan.stripeProductId,
      maxModels: plan.maxModels,
      maxProjects: plan.maxProjects,
      maxUrls: plan.maxUrls,
      maxSpontaneousPrompts: plan.maxSpontaneousPrompts,
      maxCompetitors: plan.maxCompetitors,
      maxUsers: plan.maxUsers || 1,
      isActive: plan.isActive,
      isRecommended: plan.isRecommended,
      isMostPopular: plan.isMostPopular,
      order: plan.order,
      metadata: plan.metadata,
      refreshFrequency: plan.refreshFrequency || 'weekly',
      shopifyMonthlyPrice: plan.shopifyMonthlyPrice,
      shopifyAnnualPrice: plan.shopifyAnnualPrice,
      shopifyTrialDays: plan.shopifyTrialDays,
    });
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData(defaultPlanData);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.id, formData);
      } else {
        await createPlan(formData);
      }
      setEditDialogOpen(false);
      loadPlans();
    } catch (err) {
      setError('Failed to save plan');
      console.error(err);
    }
  };

  const addIncluded = () => {
    if (includedInput.trim()) {
      setFormData({
        ...formData,
        included: [...formData.included, includedInput.trim()],
      });
      setIncludedInput('');
    }
  };

  const removeIncluded = (index: number) => {
    setFormData({
      ...formData,
      included: formData.included.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Plan Management</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreate}>
          Create Plan
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={3}>
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                  {plan.isRecommended && (
                    <Chip label="Recommended" color="success" size="small" sx={{ mb: 1 }} />
                  )}
                  {plan.isMostPopular && (
                    <Chip label="Most Popular" color="primary" size="small" sx={{ mb: 1 }} />
                  )}
                  <Typography variant="h5" gutterBottom>
                    {plan.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {plan.tag}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {plan.subtitle}
                  </Typography>
                </Box>
                <IconButton size="small">
                  <DragIcon />
                </IconButton>
              </Box>

              {plan.prices && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Stripe Pricing
                  </Typography>
                  <Typography variant="h6">${plan.prices.monthly}/mo</Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${plan.prices.yearly}/year
                  </Typography>
                </Box>
              )}

              {(plan.shopifyMonthlyPrice || plan.shopifyAnnualPrice) && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Shopify Pricing
                  </Typography>
                  {plan.shopifyMonthlyPrice && (
                    <Typography variant="h6">${plan.shopifyMonthlyPrice}/mo</Typography>
                  )}
                  {plan.shopifyAnnualPrice && (
                    <Typography variant="body2" color="text.secondary">
                      ${plan.shopifyAnnualPrice}/year
                    </Typography>
                  )}
                  {plan.shopifyTrialDays && (
                    <Typography variant="body2" color="text.secondary">
                      {plan.shopifyTrialDays} day trial
                    </Typography>
                  )}
                </Box>
              )}

              <Box mb={2}>
                <Typography variant="body2" color="text.secondary">
                  Max Models: {plan.maxModels}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max Projects: {plan.maxProjects}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max URLs: {plan.maxUrls}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max Spontaneous Prompts: {plan.maxSpontaneousPrompts}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max Competitors: {plan.maxCompetitors}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Max Users: {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers}
                </Typography>
              </Box>

              <Chip
                label={plan.isActive ? 'Active' : 'Inactive'}
                color={plan.isActive ? 'success' : 'default'}
                size="small"
              />
            </CardContent>
            <CardActions>
              <IconButton onClick={() => handleEdit(plan)} color="primary">
                <EditIcon />
              </IconButton>
            </CardActions>
          </Card>
        ))}
      </Box>

      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <TextField
                fullWidth
                label="Tag"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
              />
            </Box>
            <TextField
              fullWidth
              label="Subtitle"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Stripe Product</InputLabel>
              <Select
                value={formData.stripeProductId}
                onChange={(e) =>
                  setFormData({ ...formData, stripeProductId: e.target.value as string })
                }
                label="Stripe Product"
              >
                {stripeProducts.map((product) => (
                  <MenuItem key={product.id} value={product.id}>
                    {product.name} ({product.id})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr 1fr', sm: '1fr 1fr' }} gap={2}>
              <TextField
                fullWidth
                type="number"
                label="Max Models"
                value={formData.maxModels}
                onChange={(e) => setFormData({ ...formData, maxModels: parseInt(e.target.value) })}
              />
              <TextField
                fullWidth
                type="number"
                label="Max Projects"
                value={formData.maxProjects}
                onChange={(e) =>
                  setFormData({ ...formData, maxProjects: parseInt(e.target.value) })
                }
              />
              <TextField
                fullWidth
                type="number"
                label="Max URLs"
                value={formData.maxUrls}
                onChange={(e) => setFormData({ ...formData, maxUrls: parseInt(e.target.value) })}
              />
              <TextField
                fullWidth
                type="number"
                label="Max Spontaneous Prompts"
                value={formData.maxSpontaneousPrompts}
                onChange={(e) =>
                  setFormData({ ...formData, maxSpontaneousPrompts: parseInt(e.target.value) })
                }
              />
              <TextField
                fullWidth
                type="number"
                label="Max Competitors"
                value={formData.maxCompetitors}
                onChange={(e) =>
                  setFormData({ ...formData, maxCompetitors: parseInt(e.target.value) })
                }
              />
              <Box>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Users"
                  value={formData.maxUsers === -1 ? '' : formData.maxUsers}
                  disabled={formData.maxUsers === -1}
                  onChange={(e) =>
                    setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })
                  }
                  InputProps={{
                    inputProps: { min: 1 },
                  }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.maxUsers === -1}
                      onChange={(e) =>
                        setFormData({ ...formData, maxUsers: e.target.checked ? -1 : 1 })
                      }
                    />
                  }
                  label="Unlimited users"
                  sx={{ mt: 1 }}
                />
              </Box>
              <TextField
                fullWidth
                type="number"
                label="Order"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              />
            </Box>
            <FormControl fullWidth>
              <InputLabel>Refresh Frequency</InputLabel>
              <Select
                value={formData.refreshFrequency}
                onChange={(e) => setFormData({ ...formData, refreshFrequency: e.target.value as string })}
                label="Refresh Frequency"
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="unlimited">Unlimited</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              Shopify Pricing
            </Typography>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr 1fr' }} gap={2}>
              <TextField
                fullWidth
                type="number"
                label="Shopify Monthly Price"
                value={formData.shopifyMonthlyPrice || ''}
                onChange={(e) => setFormData({ ...formData, shopifyMonthlyPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 },
                  startAdornment: '$',
                }}
              />
              <TextField
                fullWidth
                type="number"
                label="Shopify Annual Price"
                value={formData.shopifyAnnualPrice || ''}
                onChange={(e) => setFormData({ ...formData, shopifyAnnualPrice: e.target.value ? parseFloat(e.target.value) : undefined })}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 },
                  startAdornment: '$',
                }}
              />
              <TextField
                fullWidth
                type="number"
                label="Shopify Trial Days"
                value={formData.shopifyTrialDays || 7}
                onChange={(e) => setFormData({ ...formData, shopifyTrialDays: parseInt(e.target.value) || 7 })}
                InputProps={{
                  inputProps: { min: 0, max: 30 },
                }}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                What's Included
              </Typography>
              <Box display="flex" gap={1} mb={1}>
                <TextField
                  size="small"
                  placeholder="Add included item"
                  value={includedInput}
                  onChange={(e) => setIncludedInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addIncluded()}
                />
                <Button onClick={addIncluded} variant="outlined" size="small">
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {formData.included.map((item, index) => (
                  <Chip key={index} label={item} onDelete={() => removeIncluded(index)} />
                ))}
              </Box>
            </Box>
            <Box display="flex" flexDirection="column" gap={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Active"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isRecommended}
                    onChange={(e) => setFormData({ ...formData, isRecommended: e.target.checked })}
                  />
                }
                label="Recommended"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isMostPopular}
                    onChange={(e) => setFormData({ ...formData, isMostPopular: e.target.checked })}
                  />
                }
                label="Most Popular"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
