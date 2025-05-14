import React, { useState } from 'react';
import { Typography, Box, Card, CardContent, Tabs, Tab, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, CircularProgress } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PromptSet } from '../../utils/types';
import EditablePrompts from './EditablePrompts';
import { regeneratePromptSet } from '../../utils/api';

interface PromptsTabProps {
  promptSet: PromptSet;
}

enum PromptTabValue {
  DIRECT = 'direct',
  SPONTANEOUS = 'spontaneous',
  COMPARISON = 'comparison',
}

const PromptsTab: React.FC<PromptsTabProps> = ({ promptSet }) => {
  const [currentTab, setCurrentTab] = useState<PromptTabValue>(PromptTabValue.SPONTANEOUS);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratedPromptSet, setRegeneratedPromptSet] = useState<PromptSet | null>(null);

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
    } catch (error) {
      console.error('Failed to regenerate prompts:', error);
    } finally {
      setIsRegenerating(false);
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
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PromptsTab;
