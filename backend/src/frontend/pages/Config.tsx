import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { getConfig } from '../utils/api';

interface LlmModel {
  id: string;
  provider: string;
  model: string;
  enabled: boolean;
  parameters: {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
}

interface AnalyzerConfig {
  spontaneous: {
    runsPerModel: number;
    primary: {
      provider: string;
      model: string;
    };
    fallback: {
      provider: string;
      model: string;
    };
  };
  sentiment: {
    primary: {
      provider: string;
      model: string;
    };
    fallback: {
      provider: string;
      model: string;
    };
  };
  comparison: {
    primary: {
      provider: string;
      model: string;
    };
    fallback: {
      provider: string;
      model: string;
    };
  };
}

interface PipelineLimits {
  spontaneous: number;
  sentiment: number;
  comparison: number;
}

interface ConfigData {
  llmModels: LlmModel[];
  analyzerConfig: AnalyzerConfig;
  concurrencyLimit: number;
  pipelineLimits: PipelineLimits;
}

const Config: React.FC = () => {
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const data = await getConfig();
        setConfigData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load configuration data');
        console.error('Error fetching config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="h4">Loading configuration...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="h4" color="error">
            Error: {error}
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!configData) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 2 }}>
          <Typography variant="h4">No configuration available</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          System Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Current configuration of the system and available LLM models.
        </Typography>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          LLM Models
        </Typography>
        <Stack direction="row" flexWrap="wrap" spacing={2}>
          {configData.llmModels.map((model) => (
            <Box sx={{ width: { xs: '100%', md: '31%' }, mb: 2 }} key={model.id}>
              <Card 
                elevation={3}
                sx={{ 
                  height: '100%', 
                  borderLeft: model.enabled ? '4px solid green' : '4px solid gray'
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {model.provider}
                  </Typography>
                  <Typography variant="subtitle1">{model.model}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    ID: {model.id}
                  </Typography>
                  <Chip 
                    label={model.enabled ? 'Enabled' : 'Disabled'} 
                    color={model.enabled ? 'success' : 'default'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Parameters:
                  </Typography>
                  <Typography variant="body2">
                    Temperature: {model.parameters.temperature}
                  </Typography>
                  <Typography variant="body2">
                    Max Tokens: {model.parameters.maxTokens}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    <strong>System Prompt:</strong>
                  </Typography>
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 1, 
                      mt: 0.5, 
                      bgcolor: 'background.default',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}
                  >
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {model.parameters.systemPrompt}
                    </Typography>
                  </Paper>
                </CardContent>
              </Card>
            </Box>
          ))}
        </Stack>
      </Box>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ width: { xs: '100%', md: '50%' } }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              Analyzer Configuration
            </Typography>
            <List>
              <ListItem divider>
                <ListItemText
                  primary="Spontaneous"
                  secondary={
                    <>
                      <Typography variant="body2">
                        Runs Per Model: {configData.analyzerConfig.spontaneous.runsPerModel}
                      </Typography>
                      <Typography variant="body2">
                        Primary: {configData.analyzerConfig.spontaneous.primary.provider} - {configData.analyzerConfig.spontaneous.primary.model}
                      </Typography>
                      <Typography variant="body2">
                        Fallback: {configData.analyzerConfig.spontaneous.fallback.provider} - {configData.analyzerConfig.spontaneous.fallback.model}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <ListItem divider>
                <ListItemText
                  primary="Sentiment"
                  secondary={
                    <>
                      <Typography variant="body2">
                        Primary: {configData.analyzerConfig.sentiment.primary.provider} - {configData.analyzerConfig.sentiment.primary.model}
                      </Typography>
                      <Typography variant="body2">
                        Fallback: {configData.analyzerConfig.sentiment.fallback.provider} - {configData.analyzerConfig.sentiment.fallback.model}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Comparison"
                  secondary={
                    <>
                      <Typography variant="body2">
                        Primary: {configData.analyzerConfig.comparison.primary.provider} - {configData.analyzerConfig.comparison.primary.model}
                      </Typography>
                      <Typography variant="body2">
                        Fallback: {configData.analyzerConfig.comparison.fallback.provider} - {configData.analyzerConfig.comparison.fallback.model}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            </List>
          </Paper>
        </Box>

        <Box sx={{ width: { xs: '100%', md: '50%' } }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
              System Limits
            </Typography>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Concurrency Limit: {configData.concurrencyLimit}
            </Typography>
            <Typography variant="h6" gutterBottom>
              Pipeline Limits:
            </Typography>
            <List>
              <ListItem divider>
                <ListItemText
                  primary="Spontaneous"
                  secondary={`${configData.pipelineLimits.spontaneous} requests`}
                />
              </ListItem>
              <ListItem divider>
                <ListItemText
                  primary="Sentiment"
                  secondary={`${configData.pipelineLimits.sentiment} requests`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Comparison"
                  secondary={`${configData.pipelineLimits.comparison} requests`}
                />
              </ListItem>
            </List>
          </Paper>
        </Box>
      </Stack>
    </Container>
  );
};

export default Config;