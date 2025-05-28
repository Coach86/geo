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
import {
  Edit as EditIcon,
  Add as AddIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { PlanResponseDto } from '../utils/types';
import {
  getPlans,
  createPlan,
  updatePlan,
  getStripeProducts,
} from '../utils/api-plans';

interface PlanFormData {
  name: string;
  tag: string;
  subtitle: string;
  features: string[];
  included: string[];
  stripeProductId: string;
  maxModels: number;
  maxBrands: number;
  maxMarkets: number;
  maxSpontaneousPrompts: number;
  isActive: boolean;
  isRecommended: boolean;
  isMostPopular: boolean;
  order: number;
  metadata: Record<string, any>;
}

const defaultPlanData: PlanFormData = {
  name: '',
  tag: '',
  subtitle: '',
  features: [],
  included: [],
  stripeProductId: '',
  maxModels: 5,
  maxBrands: 1,
  maxMarkets: 1,
  maxSpontaneousPrompts: 12,
  isActive: true,
  isRecommended: false,
  isMostPopular: false,
  order: 0,
  metadata: {},
};

export default function PlanManagement() {
  const [plans, setPlans] = useState<PlanResponseDto[]>([]);
  const [stripeProducts, setStripeProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanResponseDto | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlanData);
  const [featureInput, setFeatureInput] = useState('');
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
      features: plan.features,
      included: plan.included,
      stripeProductId: plan.stripeProductId,
      maxModels: plan.maxModels,
      maxBrands: plan.maxBrands,
      maxMarkets: plan.maxMarkets,
      maxSpontaneousPrompts: plan.maxSpontaneousPrompts,
      isActive: plan.isActive,
      isRecommended: plan.isRecommended,
      isMostPopular: plan.isMostPopular,
      order: plan.order,
      metadata: plan.metadata,
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


  const addFeature = () => {
    if (featureInput.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, featureInput.trim()],
      });
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
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
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreate}
        >
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
                    <Typography variant="h6">
                      ${plan.prices.monthly}/mo
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ${plan.prices.yearly}/year
                    </Typography>
                  </Box>
                )}

                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    Max Models: {plan.maxModels}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Max Brands: {plan.maxBrands}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Max Markets: {plan.maxMarkets}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Max Spontaneous Prompts: {plan.maxSpontaneousPrompts}
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

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingPlan ? 'Edit Plan' : 'Create Plan'}
        </DialogTitle>
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
                onChange={(e) => setFormData({ ...formData, stripeProductId: e.target.value as string })}
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
                label="Max Brands"
                value={formData.maxBrands}
                onChange={(e) => setFormData({ ...formData, maxBrands: parseInt(e.target.value) })}
              />
              <TextField
                fullWidth
                type="number"
                label="Max Markets"
                value={formData.maxMarkets}
                onChange={(e) => setFormData({ ...formData, maxMarkets: parseInt(e.target.value) })}
              />
              <TextField
                fullWidth
                type="number"
                label="Max Spontaneous Prompts"
                value={formData.maxSpontaneousPrompts}
                onChange={(e) => setFormData({ ...formData, maxSpontaneousPrompts: parseInt(e.target.value) })}
              />
              <TextField
                fullWidth
                type="number"
                label="Order"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
              />
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Features
              </Typography>
              <Box display="flex" gap={1} mb={1}>
                <TextField
                  size="small"
                  placeholder="Add feature"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                />
                <Button onClick={addFeature} variant="outlined" size="small">
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {formData.features.map((feature, index) => (
                  <Chip
                    key={index}
                    label={feature}
                    onDelete={() => removeFeature(index)}
                  />
                ))}
              </Box>
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
                  <Chip
                    key={index}
                    label={item}
                    onDelete={() => removeIncluded(index)}
                  />
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