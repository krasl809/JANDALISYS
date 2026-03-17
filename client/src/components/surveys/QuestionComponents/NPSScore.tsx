import React, { useState } from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import { SurveyQuestion, NPS_LABELS } from '../../../types/surveys';

interface NPSScoreProps {
  question: SurveyQuestion;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
}

const NPSScore: React.FC<NPSScoreProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
}) => {
  const theme = useTheme();
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const scores = Array.from({ length: 11 }, (_, i) => i);
  
  const lowLabel = lang === 'ar' ? NPS_LABELS.low.label_ar : NPS_LABELS.low.label;
  const highLabel = lang === 'ar' ? NPS_LABELS.high.label_ar : NPS_LABELS.high.label;

  const getScoreColor = (score: number) => {
    if (score <= 6) return theme.palette.error.main;
    if (score <= 8) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const getNPSCategory = (score: number) => {
    if (score <= 6) return lang === 'ar' ? 'منتقد' : 'Detractor';
    if (score <= 8) return lang === 'ar' ? 'محايد' : 'Passive';
    return lang === 'ar' ? 'مروج' : 'Promoter';
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Score buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 0.5,
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
          }}
        >
          {scores.map((score, index) => {
            const isSelected = score === value;
            const isHovered = score === hoverValue;
            const isActive = isSelected || isHovered;
            
            return (
              <motion.div
                key={score}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.03 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Box
                  onClick={() => !disabled && onChange(score)}
                  onMouseEnter={() => !disabled && setHoverValue(score)}
                  onMouseLeave={() => !disabled && setHoverValue(null)}
                  sx={{
                    width: { xs: 28, sm: 36 },
                    height: { xs: 28, sm: 36 },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 2,
                    cursor: disabled ? 'default' : 'pointer',
                    backgroundColor: isActive 
                      ? alpha(getScoreColor(score), 0.2)
                      : alpha(theme.palette.divider, 0.1),
                    border: `2px solid ${isActive 
                      ? getScoreColor(score) 
                      : 'transparent'}`,
                    color: isActive 
                      ? getScoreColor(score) 
                      : theme.palette.text.primary,
                    fontWeight: isActive ? 700 : 400,
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    transition: 'all 0.2s ease',
                    opacity: disabled ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: alpha(getScoreColor(score), 0.15),
                    },
                  }}
                >
                  {score}
                </Box>
              </motion.div>
            );
          })}
        </Box>
        
        {/* Labels */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            px: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{ 
              color: theme.palette.error.main,
              fontWeight: 500,
            }}
          >
            {lowLabel}
          </Typography>
          <Typography
            variant="caption"
            sx={{ 
              color: theme.palette.success.main,
              fontWeight: 500,
            }}
          >
            {highLabel}
          </Typography>
        </Box>
        
        {/* Selected score display */}
        {value !== null && value !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                padding: 2,
                borderRadius: 2,
                backgroundColor: alpha(getScoreColor(value), 0.1),
                border: `1px solid ${alpha(getScoreColor(value), 0.3)}`,
              }}
            >
              <Typography
                variant="h3"
                sx={{
                  color: getScoreColor(value),
                  fontWeight: 700,
                }}
              >
                {value}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: getScoreColor(value),
                  fontWeight: 600,
                }}
              >
                {getNPSCategory(value)}
              </Typography>
            </Box>
          </motion.div>
        )}
      </Box>
    </Box>
  );
};

export default NPSScore;
