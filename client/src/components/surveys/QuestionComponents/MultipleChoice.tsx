import React, { useState } from 'react';
import { Box, Typography, Checkbox, FormControlLabel, TextField, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { SurveyQuestion, QuestionOption } from '../../../types/surveys';

interface MultipleChoiceProps {
  question: SurveyQuestion;
  value: string[];
  onChange: (value: string[], otherValue?: string) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
  otherValue?: string;
}

const MultipleChoice: React.FC<MultipleChoiceProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
  otherValue = '',
}) => {
  const theme = useTheme();
  const [showOtherInput, setShowOtherInput] = useState(value.includes('other'));
  const [localOtherValue, setLocalOtherValue] = useState(otherValue);

  const options = question.options || [];
  const allowOther = question.settings?.allow_other || false;
  const otherLabel = lang === 'ar' && question.settings?.other_label_ar 
    ? question.settings.other_label_ar 
    : (question.settings?.other_label || (lang === 'ar' ? 'أخرى...' : 'Other...'));

  const getOptionLabel = (option: QuestionOption) => {
    return lang === 'ar' && option.label_ar ? option.label_ar : option.label;
  };

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    
    if (optionValue === 'other') {
      setShowOtherInput(newValue.includes('other'));
      onChange(newValue, newValue.includes('other') ? localOtherValue : '');
    } else {
      onChange(newValue, value.includes('other') ? localOtherValue : '');
    }
  };

  const handleOtherChange = (newOtherValue: string) => {
    setLocalOtherValue(newOtherValue);
    onChange(value, newOtherValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {options.map((option, index) => (
          <motion.div
            key={option.id || index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={value.includes(option.value)}
                  onChange={() => handleToggle(option.value)}
                  disabled={disabled}
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              }
              label={getOptionLabel(option)}
              sx={{
                margin: 0,
                padding: 1.5,
                borderRadius: 2,
                backgroundColor: value.includes(option.value) 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
                border: `1px solid ${value.includes(option.value) 
                  ? theme.palette.primary.main 
                  : alpha(theme.palette.divider, 0.3)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
                width: '100%',
              }}
            />
          </motion.div>
        ))}
        
        {/* Other option */}
        {allowOther && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: options.length * 0.05 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={value.includes('other')}
                  onChange={() => handleToggle('other')}
                  disabled={disabled}
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              }
              label={otherLabel}
              sx={{
                margin: 0,
                padding: 1.5,
                borderRadius: 2,
                backgroundColor: value.includes('other') 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
                border: `1px solid ${value.includes('other') 
                  ? theme.palette.primary.main 
                  : alpha(theme.palette.divider, 0.3)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
                width: '100%',
              }}
            />
          </motion.div>
        )}
      </Box>
      
      {/* Other text input */}
      {showOtherInput && allowOther && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{ marginTop: 8 }}
        >
          <TextField
            fullWidth
            value={localOtherValue}
            onChange={(e) => handleOtherChange(e.target.value)}
            disabled={disabled}
            placeholder={lang === 'ar' ? 'يرجى التحديد...' : 'Please specify...'}
            inputProps={{
              dir: lang === 'ar' ? 'rtl' : 'ltr',
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </motion.div>
      )}
    </Box>
  );
};

export default MultipleChoice;
