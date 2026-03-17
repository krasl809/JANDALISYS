import React from 'react';
import { Box, TextField, MenuItem, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { SurveyQuestion, QuestionOption } from '../../../types/surveys';

interface DropdownSelectProps {
  question: SurveyQuestion;
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
  error?: string;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
  error,
}) => {
  const theme = useTheme();
  const options = question.options || [];
  const placeholder = lang === 'ar' ? 'اختر...' : 'Select...';

  const getOptionLabel = (option: QuestionOption) => {
    return lang === 'ar' && option.label_ar ? option.label_ar : option.label;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <TextField
          select
          fullWidth
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          error={!!error}
          helperText={error}
          placeholder={placeholder}
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected: unknown) => {
              if (!selected) {
                return (
                  <Box sx={{ color: theme.palette.text.disabled }}>
                    {placeholder}
                  </Box>
                );
              }
              const selectedOption = options.find(opt => opt.value === selected);
              return selectedOption ? getOptionLabel(selectedOption) : selected as React.ReactNode;
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: alpha(theme.palette.background.paper, 0.95),
              },
              '&.Mui-focused': {
                backgroundColor: alpha(theme.palette.background.paper, 1),
                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
              },
            },
          }}
        >
          <MenuItem value="" disabled>
            <Box sx={{ color: theme.palette.text.disabled }}>
              {placeholder}
            </Box>
          </MenuItem>
          {options.map((option, index) => (
            <MenuItem 
              key={option.id || index} 
              value={option.value}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.2),
                  },
                },
              }}
            >
              {getOptionLabel(option)}
            </MenuItem>
          ))}
        </TextField>
      </motion.div>
    </Box>
  );
};

export default DropdownSelect;
