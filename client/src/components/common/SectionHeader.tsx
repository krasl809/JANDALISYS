import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ color: theme.palette.primary.main, display: 'flex', p: 0.5, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight="700" color="text.primary">
        {title}
      </Typography>
    </Box>
  );
};

export default SectionHeader;
