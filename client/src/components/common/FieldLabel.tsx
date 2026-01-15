import React from 'react';
import { Typography, useTheme } from '@mui/material';

interface FieldLabelProps {
  label: string;
  required?: boolean;
}

const FieldLabel: React.FC<FieldLabelProps> = React.memo(({ label, required }) => {
  const theme = useTheme();
  return (
    <Typography 
      variant="caption" 
      sx={{ 
        fontWeight: 700, 
        color: theme.palette.text.secondary, 
        mb: 0.5, 
        display: 'block', 
        textTransform: 'uppercase', 
        fontSize: '0.7rem', 
        letterSpacing: '0.5px' 
      }}
    >
      {label} {required && <span style={{ color: theme.palette.error.main }}>*</span>}
    </Typography>
  );
});

export default FieldLabel;
