import React from 'react';
import { Box, Typography, RadioGroup, FormControlLabel, Radio, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SurveyQuestion, LIKERT_5_LABELS, LIKERT_7_LABELS } from '../../../types/surveys';

interface LikertScaleProps {
  question: SurveyQuestion;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
}

const LikertScale: React.FC<LikertScaleProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  
  const isLikert7 = question.question_type === 'likert_7';
  const labels = isLikert7 ? LIKERT_7_LABELS : LIKERT_5_LABELS;
  
  const getLabel = (item: typeof labels[0]) => {
    return lang === 'ar' && item.label_ar ? item.label_ar : item.label;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <RadioGroup
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}
      >
        {labels.map((item, index) => (
          <motion.div
            key={item.value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{ flex: '1 1 auto', minWidth: 60 }}
          >
            <FormControlLabel
              value={item.value}
              disabled={disabled}
              control={
                <Radio
                  sx={{
                    '&.Mui-checked': {
                      color: theme.palette.primary.main,
                    },
                  }}
                />
              }
              label={
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: value === item.value 
                        ? theme.palette.primary.main 
                        : theme.palette.text.secondary,
                      fontWeight: value === item.value ? 600 : 400,
                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                    }}
                  >
                    {getLabel(item)}
                  </Typography>
                </Box>
              }
              labelPlacement="bottom"
              sx={{
                margin: 0,
                flexDirection: 'column',
                alignItems: 'center',
                padding: 1,
                borderRadius: 2,
                backgroundColor: value === item.value 
                  ? alpha(theme.palette.primary.main, 0.1)
                  : 'transparent',
                border: `1px solid ${value === item.value 
                  ? theme.palette.primary.main 
                  : alpha(theme.palette.divider, 0.3)}`,
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderColor: alpha(theme.palette.primary.main, 0.3),
                },
              }}
            />
          </motion.div>
        ))}
      </RadioGroup>
      
      {/* Visual scale indicator */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mt: 1,
          px: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}
        >
          {lang === 'ar' && question.min_label_ar ? question.min_label_ar : (question.min_label || labels[0].label)}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}
        >
          {lang === 'ar' && question.max_label_ar ? question.max_label_ar : (question.max_label || labels[labels.length - 1].label)}
        </Typography>
      </Box>
    </Box>
  );
};

export default LikertScale;
