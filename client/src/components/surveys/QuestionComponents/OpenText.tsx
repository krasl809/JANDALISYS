import React from 'react';
import { Box, TextField, Typography, useTheme, alpha, InputAdornment } from '@mui/material';
import { motion } from 'framer-motion';
import { SurveyQuestion } from '../../../types/surveys';

interface OpenTextProps {
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
  error?: string;
}

const OpenText: React.FC<OpenTextProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
  error,
}) => {
  const theme = useTheme();
  const maxLength = question.max_length || 1000;
  const currentLength = value?.length || 0;
  const isOverLimit = currentLength > maxLength;

  return (
    <Box sx={{ width: '100%' }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <TextField
          fullWidth
          multiline
          rows={4}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={lang === 'ar' ? 'اكتب إجابتك هنا...' : 'Type your answer here...'}
          error={!!error || isOverLimit}
          helperText={error || (isOverLimit 
            ? (lang === 'ar' ? `تجاوز الحد الأقصى (${maxLength} حرف)` : `Exceeded maximum length (${maxLength} characters)`)
            : undefined
          )}
          inputProps={{
            maxLength: question.max_length ? question.max_length + 100 : undefined, // Allow slight overflow for UX
            dir: lang === 'ar' ? 'rtl' : 'ltr',
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
            '& .MuiInputBase-input': {
              fontSize: '1rem',
              lineHeight: 1.6,
            },
          }}
        />
      </motion.div>
      
      {/* Character counter */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mt: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: isOverLimit 
              ? theme.palette.error.main 
              : currentLength > maxLength * 0.9 
                ? theme.palette.warning.main 
                : theme.palette.text.secondary,
          }}
        >
          {currentLength} / {maxLength}
        </Typography>
      </Box>
    </Box>
  );
};

export default OpenText;
