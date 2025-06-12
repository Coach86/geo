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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { getConfig } from '../utils/api';

interface LlmModel {
  id: string;
  provider: string;
  model: string;
  enabled: boolean;
  webAccess: boolean;
  parameters: {
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
  };
}

interface AnalyzerConfig {
  visibility: {
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
  alignment: {
    primary: {
      provider: string;
      model: string;
    };
    fallback: {
      provider: string;
      model: string;
    };
  };
  competition: {
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
  visibility: number;
  sentiment: number;
  alignment: number;
  competition: number;
}

interface ConfigData {
  llmModels: LlmModel[];
  analyzerConfig: AnalyzerConfig;
  concurrencyLimit: number;
  pipelineLimits: PipelineLimits;
}

// Component for each model row with expandable system prompt
const ModelRow: React.FC<{ model: LlmModel }> = ({ model }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <TableRow 
        sx={{ 
          '& > *': { borderBottom: 'unset' },
          borderLeft: model.enabled ? '4px solid #4caf50' : '4px solid #9e9e9e',
          bgcolor: model.enabled ? 'action.hover' : 'transparent'
        }}
      >
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          <Typography variant="body2" fontWeight="bold">
            {model.provider}
          </Typography>
        </TableCell>
        <TableCell>{model.model}</TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
            {model.id}
          </Typography>
        </TableCell>
        <TableCell align="center">
          <Chip 
            label={model.enabled ? 'Enabled' : 'Disabled'} 
            color={model.enabled ? 'success' : 'default'}
            size="small"
          />
        </TableCell>
        <TableCell align="center">
          <Chip 
            label={model.webAccess ? 'Web Access' : 'No Web'} 
            color={model.webAccess ? 'primary' : 'warning'}
            size="small"
            variant="outlined"
          />
        </TableCell>
        <TableCell align="center">{model.parameters.temperature}</TableCell>
        <TableCell align="center">{model.parameters.maxTokens}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="subtitle2" gutterBottom component="div">
                System Prompt
              </Typography>
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {model.parameters.systemPrompt}
                </Typography>
              </Paper>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5">
            LLM Models
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Chip 
              label={`Total: ${configData.llmModels.length}`} 
              color="default"
              variant="outlined"
            />
            <Chip 
              label={`Enabled: ${configData.llmModels.filter(m => m.enabled).length}`} 
              color="success"
              variant="outlined"
            />
            <Chip 
              label={`Web Access: ${configData.llmModels.filter(m => m.webAccess).length}`} 
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell />
                <TableCell>Provider</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>ID</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Web Access</TableCell>
                <TableCell align="center">Temperature</TableCell>
                <TableCell align="center">Max Tokens</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {configData.llmModels.map((model) => (
                <ModelRow key={model.id} model={model} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
                  primary="Visibility"
                  secondary={
                    <>
                      <Typography variant="body2">
                        Runs Per Model: {configData.analyzerConfig.visibility.runsPerModel}
                      </Typography>
                      <Typography variant="body2">
                        Primary: {configData.analyzerConfig.visibility.primary.provider} - {configData.analyzerConfig.visibility.primary.model}
                      </Typography>
                      <Typography variant="body2">
                        Fallback: {configData.analyzerConfig.visibility.fallback.provider} - {configData.analyzerConfig.visibility.fallback.model}
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
              <ListItem divider>
                <ListItemText
                  primary="Alignment"
                  secondary={
                    <>
                      <Typography variant="body2">
                        Primary: {configData.analyzerConfig.alignment.primary.provider} - {configData.analyzerConfig.alignment.primary.model}
                      </Typography>
                      <Typography variant="body2">
                        Fallback: {configData.analyzerConfig.alignment.fallback.provider} - {configData.analyzerConfig.alignment.fallback.model}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Competition"
                  secondary={
                    <>
                      <Typography variant="body2">
                        Primary: {configData.analyzerConfig.competition.primary.provider} - {configData.analyzerConfig.competition.primary.model}
                      </Typography>
                      <Typography variant="body2">
                        Fallback: {configData.analyzerConfig.competition.fallback.provider} - {configData.analyzerConfig.competition.fallback.model}
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
                  primary="Visibility"
                  secondary={`${configData.pipelineLimits.visibility} requests`}
                />
              </ListItem>
              <ListItem divider>
                <ListItemText
                  primary="Sentiment"
                  secondary={`${configData.pipelineLimits.sentiment} requests`}
                />
              </ListItem>
              <ListItem divider>
                <ListItemText
                  primary="Alignment"
                  secondary={`${configData.pipelineLimits.alignment} requests`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Competition"
                  secondary={`${configData.pipelineLimits.competition} requests`}
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