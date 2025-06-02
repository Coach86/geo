import React from 'react';
import { Tabs as MuiTabs, TabsProps, styled } from '@mui/material';

// Create a styled version of MUI Tabs that forces full width
const FullWidthTabs: React.ComponentType<TabsProps> = styled((props: TabsProps) => <MuiTabs {...props} variant="fullWidth" />)(
  ({ theme }) => ({}),
);

export default FullWidthTabs;
