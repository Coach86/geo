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
  useTheme,
  alpha,
  Grid,
} from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import GroupIcon from '@mui/icons-material/Group';
import PublicIcon from '@mui/icons-material/Public';
import { CompanyIdentityCard } from '../../utils/types';
import EditableKeyFeatures from './EditableKeyFeatures';
import EditableCompetitors from './EditableCompetitors';
import { getFormattedMarket } from '../../utils/constants';

interface OverviewTabProps {
  company: CompanyIdentityCard;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ company }) => {
  const [keyBrandAttributes, setKeyBrandAttributes] = useState<string[]>(
    company.keyBrandAttributes,
  );
  const [competitors, setCompetitors] = useState<string[]>(company.competitors);
  const theme = useTheme();

  // Using shared constant for market flags
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Card 
        sx={{ 
          borderRadius: 1.5,
          boxShadow: 'none',
          border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                fontSize: '1rem',
                color: theme.palette.text.primary,
              }}
            >
              Company Description
            </Typography>
            <Chip 
              icon={<PublicIcon sx={{ fontSize: '0.9rem' }} />}
              label={getFormattedMarket(company.market)} 
              variant="outlined" 
              size="small"
              sx={{ 
                borderRadius: 1,
                height: 28,
                '& .MuiChip-label': { 
                  px: 1,
                  fontSize: '0.75rem',
                  fontWeight: 500
                }
              }} 
            />
          </Box>
          <Typography 
            variant="body1" 
            sx={{ 
              color: alpha(theme.palette.text.primary, 0.8),
              fontSize: '0.9rem',
              lineHeight: 1.6,
            }}
          >
            {company.longDescription || company.shortDescription}
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Card 
          sx={{ 
            borderRadius: 1.5,
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            height: '100%',
            flex: 1,
          }}
        >
          <CardContent sx={{ p: 3, height: '100%' }}>
            <EditableKeyFeatures
              companyId={company.id}
              keyBrandAttributes={keyBrandAttributes}
              onUpdate={setKeyBrandAttributes}
            />
          </CardContent>
        </Card>

        <Card 
          sx={{ 
            borderRadius: 1.5,
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            height: '100%',
            flex: 1,
          }}
        >
          <CardContent sx={{ p: 3, height: '100%' }}>
            <EditableCompetitors
              companyId={company.id}
              competitors={competitors}
              onUpdate={setCompetitors}
            />
          </CardContent>
        </Card>
      </Box>

      <Card 
        sx={{ 
          mt: 2,
          borderRadius: 1.5,
          boxShadow: 'none',
          border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Typography 
              variant="body2" 
              color="text.primary"
              sx={{ 
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>
                Company ID:
              </Box>
              {company.id}
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.primary"
              sx={{ 
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>
                Created:
              </Box>
              {new Date(company.createdAt).toLocaleString()}
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.primary"
              sx={{ 
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box component="span" sx={{ fontWeight: 600, mr: 0.5 }}>
                Last Updated:
              </Box>
              {new Date(company.updatedAt).toLocaleString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OverviewTab;