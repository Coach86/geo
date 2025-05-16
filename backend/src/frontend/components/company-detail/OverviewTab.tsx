import React, { useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  Chip,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Grid,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import GroupIcon from '@mui/icons-material/Group';
import { CompanyIdentityCard } from '../../utils/types';
import EditableKeyFeatures from './EditableKeyFeatures';
import EditableCompetitors from './EditableCompetitors';

interface OverviewTabProps {
  company: CompanyIdentityCard;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ company }) => {
  const [keyBrandAttributes, setKeyBrandAttributes] = useState<string[]>(
    company.keyBrandAttributes,
  );
  const [competitors, setCompetitors] = useState<string[]>(company.competitors);

  // Helper function to get flag emoji for market
  const getMarketWithFlag = (market: string): string => {
    const marketFlags: Record<string, string> = {
      'United States': '🇺🇸',
      'United Kingdom': '🇬🇧',
      Canada: '🇨🇦',
      Australia: '🇦🇺',
      France: '🇫🇷',
      Germany: '🇩🇪',
      Japan: '🇯🇵',
      China: '🇨🇳',
      India: '🇮🇳',
      Brazil: '🇧🇷',
      Mexico: '🇲🇽',
      Spain: '🇪🇸',
      Italy: '🇮🇹',
      Netherlands: '🇳🇱',
      Sweden: '🇸🇪',
      Switzerland: '🇨🇭',
      Singapore: '🇸🇬',
      'South Korea': '🇰🇷',
      Russia: '🇷🇺',
      'South Africa': '🇿🇦',
    };

    const flag = marketFlags[market] || '🇺🇸';
    return `${flag} ${market}`;
  };
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Chip label={getMarketWithFlag(company.market)} variant="outlined" size="small" />
          </Box>
          <Typography variant="body1" paragraph>
            {company.longDescription || company.shortDescription}
          </Typography>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <EditableKeyFeatures
              companyId={company.id}
              keyBrandAttributes={keyBrandAttributes}
              onUpdate={setKeyBrandAttributes}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <EditableCompetitors
              companyId={company.id}
              competitors={competitors}
              onUpdate={setCompetitors}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12 }}>
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              Company ID: {company.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {new Date(company.createdAt).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last Updated: {new Date(company.updatedAt).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default OverviewTab;
