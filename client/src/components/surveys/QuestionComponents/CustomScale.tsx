import React, { useState } from 'react';
import { Box, Typography, Slider, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { SurveyQuestion } from '../../../types/surveys';

interface CustomScaleProps {
  question: SurveyQuestion;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
}

const CustomScale: React.FC<CustomScaleProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
}) => {
  const theme = useTheme();
  
  const minValue = question.min_value ?? 0;
  const maxValue = question.max_value ?? 10;
  const stepSize = question.settings?.step_size ?? 1;
  
  const minLabel = lang === 'ar' && question.min_label_ar 
    ? question.min_label_ar 
    : (question.min_label || minValue.toString());
  const maxLabel = lang === 'ar' && question.max_label_ar 
    ? question.max_label_ar 
    : (question.max_label || maxValue.toString());

  const marks = [];
  const numMarks = Math.floor((maxValue - minValue) / stepSize) + 1;
  for (let i = 0; i < numMarks; i++) {
    const val = minValue + (i * stepSize);
    marks.push({ value: val, label: val.toString() });
  }

  const getSliderColor = (val: number) => {
    const percentage = (val - minValue) / (maxValue - minValue);
    if (percentage <= 0.33) return theme.palette.error.main;
    if (percentage <= 0.66) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  return (
    <Box sx={{ width: '100%', px: 2 }}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Current value display */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 24px',
              borderRadius: 3,
              backgroundColor: alpha(getSliderColor(value || minValue), 0.1),
              border: `2px solid ${alpha(getSliderColor(value || minValue), 0.3)}`,
            }}
          >
            <Typography
              variant="h3"
              sx={{
                color: getSliderColor(value || minValue),
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {value ?? minValue}
            </Typography>
          </Box>
        </Box>
        
        {/* Slider */}
        <Slider
          value={value ?? minValue}
          onChange={(_, newValue) => onChange(newValue as number)}
          min={minValue}
          max={maxValue}
          step={stepSize}
          marks={marks}
          disabled={disabled}
          sx={{
            height: 12,
            borderRadius: 6,
            '& .MuiSlider-rail': {
              backgroundColor: alpha(theme.palette.divider, 0.3),
              height: 12,
              borderRadius: 6,
            },
            '& .MuiSlider-track': {
              backgroundColor: getSliderColor(value || minValue),
              height: 12,
              borderRadius: 6,
              border: 'none',
            },
            '& .MuiSlider-thumb': {
              width: 28,
              height: 28,
              backgroundColor: theme.palette.background.paper,
              border: `3px solid ${getSliderColor(value || minValue)}`,
              boxShadow: `0 0 0 4px ${alpha(getSliderColor(value || minValue), 0.2)}`,
              transition: 'all 0.2s ease',
              '&:hover, &.Mui-focusVisible': {
                boxShadow: `0 0 0 6px ${alpha(getSliderColor(value || minValue), 0.3)}`,
              },
              '&.Mui-active': {
                boxShadow: `0 0 0 8px ${alpha(getSliderColor(value || minValue), 0.4)}`,
              },
            },
            '& .MuiSlider-mark': {
              width: 2,
              height: 16,
              backgroundColor: alpha(theme.palette.divider, 0.5),
              '&.MuiSlider-markActive': {
                backgroundColor: 'transparent',
              },
            },
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem',
              color: theme.palette.text.secondary,
              marginTop: 1,
            },
          }}
        />
        
        {/* Labels */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{ 
              color: theme.palette.text.secondary,
              fontWeight: 500,
            }}
          >
            {minLabel}
          </Typography>
          <Typography
            variant="caption"
            sx={{ 
              color: theme.palette.text.secondary,
              fontWeight: 500,
            }}
          >
            {maxLabel}
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
};

export default CustomScale;
