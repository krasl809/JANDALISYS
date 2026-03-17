import React, { useState } from 'react';
import { Box, Typography, useTheme, alpha, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { SurveyQuestion } from '../../../types/surveys';

interface StarRatingProps {
  question: SurveyQuestion;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  lang?: 'en' | 'ar';
  maxRating?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  question,
  value,
  onChange,
  disabled = false,
  lang = 'en',
  maxRating = 5,
}) => {
  const theme = useTheme();
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const labels = lang === 'ar' 
    ? ['سيء', 'ضعيف', 'متوسط', 'جيد', 'ممتاز']
    : ['Poor', 'Fair', 'Average', 'Good', 'Excellent'];

  const getLabel = (rating: number) => {
    if (rating >= 1 && rating <= labels.length) {
      return labels[rating - 1];
    }
    return '';
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        {/* Stars */}
        <Box
          sx={{
            display: 'flex',
            gap: 1,
          }}
        >
          {Array.from({ length: maxRating }, (_, index) => {
            const rating = index + 1;
            const isFilled = rating <= displayValue;
            
            return (
              <motion.div
                key={rating}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Tooltip 
                  title={getLabel(rating)} 
                  placement="top"
                  arrow
                >
                  <Box
                    component="span"
                    onClick={() => !disabled && onChange(rating)}
                    onMouseEnter={() => !disabled && setHoverValue(rating)}
                    onMouseLeave={() => !disabled && setHoverValue(null)}
                    sx={{
                      cursor: disabled ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      filter: isFilled ? 'none' : 'grayscale(50%)',
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    {isFilled ? (
                      <StarIcon
                        sx={{
                          fontSize: 40,
                          color: theme.palette.warning.main,
                        }}
                      />
                    ) : (
                      <StarBorderIcon
                        sx={{
                          fontSize: 40,
                          color: theme.palette.text.secondary,
                        }}
                      />
                    )}
                  </Box>
                </Tooltip>
              </motion.div>
            );
          })}
        </Box>
        
        {/* Rating label */}
        <motion.div
          key={displayValue}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Typography
            variant="body1"
            sx={{
              color: displayValue 
                ? theme.palette.primary.main 
                : theme.palette.text.secondary,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {displayValue ? getLabel(displayValue) : (lang === 'ar' ? 'انقر للتقييم' : 'Click to rate')}
          </Typography>
        </motion.div>
        
        {/* Rating number */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            padding: '4px 12px',
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 700,
            }}
          >
            {displayValue || 0}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
            }}
          >
            / {maxRating}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default StarRating;
