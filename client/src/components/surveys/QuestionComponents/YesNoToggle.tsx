import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { SurveyQuestion } from '../../../types/surveys';

interface YesNoToggleProps {
  question: SurveyQuestion;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
}

const YesNoToggle: React.FC<YesNoToggleProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
}) => {
  const theme = useTheme();

  const labels = {
    yes: lang === 'ar' ? 'نعم' : 'Yes',
    no: lang === 'ar' ? 'لا' : 'No',
  };

  const handleToggle = (_: React.MouseEvent<HTMLElement>, newValue: boolean | null) => {
    if (newValue !== null) {
      onChange(newValue);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ToggleButtonGroup
          value={value}
          exclusive
          onChange={handleToggle}
          disabled={disabled}
          sx={{
            display: 'flex',
            gap: 2,
            backgroundColor: 'transparent',
            '& .MuiToggleButtonGroup-grouped': {
              margin: 0,
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              flex: 1,
              padding: 2,
              '&.Mui-selected': {
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                borderColor: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              },
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
            },
          }}
        >
          <ToggleButton value={true}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CheckIcon
                sx={{
                  fontSize: 32,
                  color: value === true 
                    ? theme.palette.success.main 
                    : theme.palette.text.secondary,
                }}
              />
              <Typography
                variant="body1"
                sx={{
                  fontWeight: value === true ? 600 : 400,
                  color: value === true 
                    ? theme.palette.success.main 
                    : theme.palette.text.primary,
                }}
              >
                {labels.yes}
              </Typography>
            </Box>
          </ToggleButton>
          
          <ToggleButton value={false}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <CloseIcon
                sx={{
                  fontSize: 32,
                  color: value === false 
                    ? theme.palette.error.main 
                    : theme.palette.text.secondary,
                }}
              />
              <Typography
                variant="body1"
                sx={{
                  fontWeight: value === false ? 600 : 400,
                  color: value === false 
                    ? theme.palette.error.main 
                    : theme.palette.text.primary,
                }}
              >
                {labels.no}
              </Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </motion.div>
    </Box>
  );
};

export default YesNoToggle;
