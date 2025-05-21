import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Tabs,
  Tab,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha,
} from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
import SportsMmaIcon from '@mui/icons-material/SportsMma';
import CodeIcon from '@mui/icons-material/Code';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PromptSet, PromptTemplates } from '../../utils/types';
import EditablePrompts from './EditablePrompts';
import { regeneratePromptSet, getPromptTemplates } from '../../utils/api';

interface PromptsTabProps {
  promptSet: PromptSet;
}

enum PromptTabValue {
  DIRECT = 'direct',
  SPONTANEOUS = 'spontaneous',
  COMPARISON = 'comparison',
  ACCURACY = 'accuracy',
  BRAND_BATTLE = 'brand-battle',
}

const PromptsTab: React.FC<PromptsTabProps> = ({ promptSet }) => {
  const theme = useTheme();
  const [currentTab, setCurrentTab] = useState<PromptTabValue>(PromptTabValue.SPONTANEOUS);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedPromptSet, setRegeneratedPromptSet] = useState<PromptSet | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplates | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Handle both direct arrays and JSON strings
  const [directPrompts, setDirectPrompts] = useState<string[]>(
    Array.isArray(promptSet.direct) ? promptSet.direct : JSON.parse(promptSet.direct || '[]'),
  );
  const [spontaneousPrompts, setSpontaneousPrompts] = useState<string[]>(
    Array.isArray(promptSet.spontaneous)
      ? promptSet.spontaneous
      : JSON.parse(promptSet.spontaneous || '[]'),
  );
  const [comparisonPrompts, setComparisonPrompts] = useState<string[]>(
    Array.isArray(promptSet.comparison)
      ? promptSet.comparison
      : JSON.parse(promptSet.comparison || '[]'),
  );
  const [accuracyPrompts, setAccuracyPrompts] = useState<string[]>(
    Array.isArray(promptSet.accuracy) ? promptSet.accuracy : JSON.parse(promptSet.accuracy || '[]'),
  );
  
  const [brandBattlePrompts, setBrandBattlePrompts] = useState<string[]>(
    Array.isArray(promptSet.brandBattle) ? promptSet.brandBattle : JSON.parse(promptSet.brandBattle || '[]'),
  );

  // Fetch prompt templates
  useEffect(() => {
    const fetchTemplates = async () => {
      if (templateDialogOpen && !promptTemplates) {
        try {
          setIsLoadingTemplates(true);
          const templates = await getPromptTemplates(promptSet.companyId);
          setPromptTemplates(templates);
        } catch (error) {
          console.error('Failed to fetch prompt templates:', error);
        } finally {
          setIsLoadingTemplates(false);
        }
      }
    };

    fetchTemplates();
  }, [templateDialogOpen, promptSet.companyId, promptTemplates]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: PromptTabValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenConfirmDialog = () => {
    setConfirmDialogOpen(true);
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialogOpen(false);
  };

  const handleRegeneratePrompts = async () => {
    try {
      setIsRegenerating(true);
      setConfirmDialogOpen(false);

      // Call the API to regenerate prompts
      const result = await regeneratePromptSet(promptSet.companyId);
      setRegeneratedPromptSet(result);

      // Update local state with new prompts
      setDirectPrompts(
        Array.isArray(result.direct) ? result.direct : JSON.parse(result.direct || '[]'),
      );
      setSpontaneousPrompts(
        Array.isArray(result.spontaneous)
          ? result.spontaneous
          : JSON.parse(result.spontaneous || '[]'),
      );
      setComparisonPrompts(
        Array.isArray(result.comparison)
          ? result.comparison
          : JSON.parse(result.comparison || '[]'),
      );
      setAccuracyPrompts(
        Array.isArray(result.accuracy) ? result.accuracy : JSON.parse(result.accuracy || '[]'),
      );
      
      setBrandBattlePrompts(
        Array.isArray(result.brandBattle) ? result.brandBattle : JSON.parse(result.brandBattle || '[]'),
      );

      // Clear the templates cache so they'll be refreshed next time
      setPromptTemplates(null);
    } catch (error) {
      console.error('Failed to regenerate prompts:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleOpenTemplateDialog = () => {
    setTemplateDialogOpen(true);
  };

  const handleCloseTemplateDialog = () => {
    setTemplateDialogOpen(false);
  };

  // Helper to get the current template based on the active tab
  const getCurrentTemplate = () => {
    if (!promptTemplates) return null;

    switch (currentTab) {
      case PromptTabValue.DIRECT:
        return promptTemplates.direct;
      case PromptTabValue.SPONTANEOUS:
        return promptTemplates.spontaneous;
      case PromptTabValue.COMPARISON:
        return promptTemplates.comparison;
      case PromptTabValue.ACCURACY:
        return promptTemplates.accuracy;
      case PromptTabValue.BRAND_BATTLE:
        return promptTemplates.brandBattle;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ maxWidth: '95vw', width: '100%' }}>
      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="regenerate-prompts-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          id="regenerate-prompts-dialog-title"
          sx={{
            pb: 1,
            pt: 2,
            fontWeight: 600,
            fontSize: '1.1rem',
          }}
        >
          Regenerate All Prompts?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.875rem' }}>
            This will delete all current prompts and generate new ones using AI. Any customizations
            you've made will be lost. This process may take a minute to complete.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={handleCloseConfirmDialog}
            color="primary"
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: theme.palette.text.secondary,
              px: 2,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRegeneratePrompts}
            color="primary"
            variant="contained"
            startIcon={<RefreshIcon sx={{ fontSize: '1rem' }} />}
            disabled={isRegenerating}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              boxShadow: 1,
              borderRadius: 1,
              px: 2,
            }}
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template View Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={handleCloseTemplateDialog}
        maxWidth="lg"
        fullWidth
        aria-labelledby="template-dialog-title"
      >
        <DialogTitle id="template-dialog-title">
          LLM Prompt Templates
          <IconButton
            aria-label="close"
            onClick={handleCloseTemplateDialog}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <RefreshIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {isLoadingTemplates ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : promptTemplates ? (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                These are the base prompt templates used to generate the prompts for {currentTab}{' '}
                analysis.
              </Typography>

              <Accordion defaultExpanded sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">System Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {getCurrentTemplate()?.systemPrompt || 'No system prompt available'}
                  </Paper>
                </AccordionDetails>
              </Accordion>

              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1">User Prompt</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {getCurrentTemplate()?.userPrompt || 'No user prompt available'}
                  </Paper>
                </AccordionDetails>
              </Accordion>
            </Box>
          ) : (
            <Typography>Failed to load prompt templates</Typography>
          )}
        </DialogContent>
      </Dialog>

      <Box
        sx={{
          width: '100%',
          maxWidth: '95vw',
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              fontWeight: 600,
              fontSize: '1rem',
              color: theme.palette.text.primary,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChatBubbleOutlineIcon
              sx={{
                fontSize: '1.1rem',
                color: theme.palette.primary.main,
                mr: 1,
              }}
            />
            Generated Analysis Prompts
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: '0.875rem',
              opacity: 0.85,
            }}
          >
            These prompts are automatically generated for analyzing this company and will be used in
            batch processes.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Tooltip title="View template prompts used to generate these prompts">
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CodeIcon sx={{ fontSize: '0.9rem' }} />}
              onClick={handleOpenTemplateDialog}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                fontWeight: 500,
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                py: 0.75,
                whiteSpace: 'nowrap',
                minWidth: 'fit-content',
                border: `1px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
              }}
            >
              View Templates
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            color="primary"
            startIcon={
              isRegenerating ? (
                <CircularProgress size={16} />
              ) : (
                <RefreshIcon sx={{ fontSize: '0.9rem' }} />
              )
            }
            onClick={handleOpenConfirmDialog}
            disabled={isRegenerating}
            sx={{
              borderRadius: 1,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              py: 0.75,
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
            }}
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate Prompts'}
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          width: '100%',
          mb: 3,
          borderRadius: 1.5,
          boxShadow: 'none',
          border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
        }}
      >
        <Box
          sx={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
            '::-webkit-scrollbar': {
              height: '8px',
            },
            '::-webkit-scrollbar-thumb': {
              borderRadius: '4px',
              backgroundColor: alpha(theme.palette.grey[500], 0.3),
            },
          }}
        >
          <Box sx={{ minWidth: '500px' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              aria-label="prompt type tabs"
              variant="scrollable"
              scrollButtons={false}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  minHeight: 48,
                  fontWeight: 500,
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    color: 'primary.main',
                    fontWeight: 600,
                  },
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                },
              }}
            >
              <Tab
                icon={<QuestionAnswerIcon sx={{ fontSize: '1.1rem' }} />}
                label={
                  <Typography sx={{ fontSize: '0.85rem', ml: 0.5 }}>
                    Tone ({spontaneousPrompts.length})
                  </Typography>
                }
                value={PromptTabValue.SPONTANEOUS}
                sx={{ minWidth: '80px' }}
              />
              <Tab
                icon={<ChatBubbleOutlineIcon sx={{ fontSize: '1.1rem' }} />}
                label={
                  <Typography sx={{ fontSize: '0.85rem', ml: 0.5 }}>
                    Sentiment ({directPrompts.length})
                  </Typography>
                }
                value={PromptTabValue.DIRECT}
                sx={{ minWidth: '80px' }}
              />
              <Tab
                icon={<CompareArrowsIcon sx={{ fontSize: '1.1rem' }} />}
                label={
                  <Typography sx={{ fontSize: '0.85rem', ml: 0.5 }}>
                    Comparison ({comparisonPrompts.length})
                  </Typography>
                }
                value={PromptTabValue.COMPARISON}
                sx={{ minWidth: '80px' }}
              />
              <Tab
                icon={<FactCheckIcon sx={{ fontSize: '1.1rem' }} />}
                label={
                  <Typography sx={{ fontSize: '0.85rem', ml: 0.5 }}>
                    Accord ({accuracyPrompts.length})
                  </Typography>
                }
                value={PromptTabValue.ACCURACY}
                sx={{ minWidth: '80px' }}
              />
              <Tab
                icon={<SportsMmaIcon sx={{ fontSize: '1.1rem' }} />}
                label={
                  <Typography sx={{ fontSize: '0.85rem', ml: 0.5 }}>
                    Brand Battle ({brandBattlePrompts.length})
                  </Typography>
                }
                value={PromptTabValue.BRAND_BATTLE}
                sx={{ minWidth: '80px' }}
              />
            </Tabs>
          </Box>
        </Box>
      </Box>

      {isRegenerating ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 8 }}>
          <CircularProgress size={40} />
          <Typography
            variant="h6"
            sx={{
              ml: 2,
              fontSize: '1rem',
              fontWeight: 500,
              color: alpha(theme.palette.text.primary, 0.8),
            }}
          >
            Regenerating prompts...
          </Typography>
        </Box>
      ) : (
        <Card
          sx={{
            borderRadius: 1.5,
            boxShadow: 'none',
            border: `1px solid ${alpha(theme.palette.grey[500], 0.12)}`,
            width: '100%',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            {currentTab === PromptTabValue.DIRECT && (
              <EditablePrompts
                companyId={promptSet.companyId}
                title="Direct Sentiment Prompts"
                icon={<ChatBubbleOutlineIcon color="primary" sx={{ mr: 1 }} />}
                prompts={directPrompts}
                promptType="direct"
                description="These prompts directly ask about the company to analyze sentiment."
                onUpdate={setDirectPrompts}
              />
            )}

            {currentTab === PromptTabValue.SPONTANEOUS && (
              <EditablePrompts
                companyId={promptSet.companyId}
                title="Spontaneous Mention Prompts"
                icon={<QuestionAnswerIcon color="primary" sx={{ mr: 1 }} />}
                prompts={spontaneousPrompts}
                promptType="spontaneous"
                description="These prompts check if the company is mentioned spontaneously."
                onUpdate={setSpontaneousPrompts}
              />
            )}

            {currentTab === PromptTabValue.COMPARISON && (
              <EditablePrompts
                companyId={promptSet.companyId}
                title="Competitor Comparison Prompts"
                icon={<CompareArrowsIcon color="primary" sx={{ mr: 1 }} />}
                prompts={comparisonPrompts}
                promptType="comparison"
                description="These prompts compare the company with its competitors."
                onUpdate={setComparisonPrompts}
              />
            )}

            {currentTab === PromptTabValue.ACCURACY && (
              <EditablePrompts
                companyId={promptSet.companyId}
                title="Accuracy Evaluation Prompts"
                icon={<FactCheckIcon color="primary" sx={{ mr: 1 }} />}
                prompts={accuracyPrompts}
                promptType="accuracy"
                description="These prompts evaluate the factual accuracy of information about the company."
                onUpdate={setAccuracyPrompts}
              />
            )}
            
            {currentTab === PromptTabValue.BRAND_BATTLE && (
              <EditablePrompts
                companyId={promptSet.companyId}
                title="Brand Battle Prompts"
                icon={<SportsMmaIcon color="primary" sx={{ mr: 1 }} />}
                prompts={brandBattlePrompts}
                promptType="brand-battle"
                description="These prompts compare the brand directly against each competitor to identify strengths and weaknesses."
                onUpdate={setBrandBattlePrompts}
              />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PromptsTab;
