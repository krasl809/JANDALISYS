import React, { useState, useEffect } from 'react';
import { Box } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = React.memo(({ children, value, index, ...other }) => {
  // Use a state to track if the tab has ever been opened
  // This allows us to keep the component mounted once it's opened if we want,
  // or we can just do conditional rendering.
  // For now, let's do conditional rendering to maximize performance.
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`contract-tabpanel-${index}`}
      aria-labelledby={`contract-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
});

export default TabPanel;
