import React, { useState, useEffect } from 'react';
import { Typography, Box, Card, CardContent, Tabs, Tab, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, CircularProgress, IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
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
}

const PromptsTab: React.FC<PromptsTabProps> = ({ promptSet }) => {
  const [currentTab, setCurrentTab] = useState<PromptTabValue>(PromptTabValue.SPONTANEOUS);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedPromptSet, setRegeneratedPromptSet] = useState<PromptSet | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplates | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Handle both direct arrays and JSON strings
  const [directPrompts, setDirectPrompts] = useState<string[]>(
    Array.isArray(promptSet.direct) 
      ? promptSet.direct 
      : JSON.parse(promptSet.direct || '[]')
  );
  const [spontaneousPrompts, setSpontaneousPrompts] = useState<string[]>(
    Array.isArray(promptSet.spontaneous) 
      ? promptSet.spontaneous 
      : JSON.parse(promptSet.spontaneous || '[]')
  );
  const [comparisonPrompts, setComparisonPrompts] = useState<string[]>(
    Array.isArray(promptSet.comparison) 
      ? promptSet.comparison 
      : JSON.parse(promptSet.comparison || '[]')
  );
  const [accuracyPrompts, setAccuracyPrompts] = useState<string[]>(
    Array.isArray(promptSet.accuracy) 
      ? promptSet.accuracy 
      : JSON.parse(promptSet.accuracy || '[]')
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
          console.error("Failed to fetch prompt templates:", error);
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
        Array.isArray(result.direct) 
          ? result.direct 
          : JSON.parse(result.direct || '[]')
      );
      setSpontaneousPrompts(
        Array.isArray(result.spontaneous) 
          ? result.spontaneous 
          : JSON.parse(result.spontaneous || '[]')
      );
      setComparisonPrompts(
        Array.isArray(result.comparison) 
          ? result.comparison 
          : JSON.parse(result.comparison || '[]')
      );
      setAccuracyPrompts(
        Array.isArray(result.accuracy) 
          ? result.accuracy 
          : JSON.parse(result.accuracy || '[]')
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
      default:
        return null;
    }
  };

  return (
    <>
      {/* Regenerate Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="regenerate-prompts-dialog-title"
      >
        <DialogTitle id="regenerate-prompts-dialog-title">Regenerate All Prompts?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will delete all current prompts and generate new ones using AI. Any customizations you've made will be lost. This process may take a minute to complete.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDialog} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleRegeneratePrompts} 
            color="primary" 
            variant="contained"
            startIcon={<RefreshIcon />}
            disabled={isRegenerating}
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
                These are the base prompt templates used to generate the prompts for {currentTab} analysis.
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
                      backgroundColor: 'rgba(0, 0, 0, 0.04)' 
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
                      backgroundColor: 'rgba(0, 0, 0, 0.04)' 
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

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Generated Prompts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            These prompts are automatically generated for analyzing this company and will be used in
            batch processes.
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="View template prompts used to generate these prompts">
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<CodeIcon />}
              onClick={handleOpenTemplateDialog}
            >
              View Templates
            </Button>
          </Tooltip>
          
          <Button
            variant="outlined"
            color="primary"
            startIcon={isRegenerating ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={handleOpenConfirmDialog}
            disabled={isRegenerating}
          >
            {isRegenerating ? 'Regenerating...' : 'Regenerate Prompts'}
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="prompt type tabs"
          variant="fullWidth"
        >
          <Tab
            label={`Spontaneous (${spontaneousPrompts.length})`}
            value={PromptTabValue.SPONTANEOUS}
            icon={<QuestionAnswerIcon />}
            iconPosition="start"
          />
          <Tab
            label={`Direct Sentiment (${directPrompts.length})`}
            value={PromptTabValue.DIRECT}
            icon={<ChatBubbleOutlineIcon />}
            iconPosition="start"
          />
          <Tab
            label={`Comparison (${comparisonPrompts.length})`}
            value={PromptTabValue.COMPARISON}
            icon={<CompareArrowsIcon />}
            iconPosition="start"
          />
          <Tab
            label={`Accuracy (${accuracyPrompts.length})`}
            value={PromptTabValue.ACCURACY}
            icon={<FactCheckIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {isRegenerating ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ ml: 2 }}>
            Regenerating prompts...
          </Typography>
        </Box>
      ) : (
        <Card>
          <CardContent>
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
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PromptsTab;
