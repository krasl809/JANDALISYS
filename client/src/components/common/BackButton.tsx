import React from 'react';
import { useTranslation } from 'react-i18next';
import { IconButton, Tooltip, useTheme, alpha } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // 👈

const BackButton: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isRTL = i18n.language === 'ar';

  return (
    <Tooltip title={t('back') || "Back"}>
      <IconButton
        onClick={() => navigate(-1)}
        sx={{
          color: 'text.secondary',
          padding: '8px',
          marginRight: isRTL ? 0 : 1,
          marginLeft: isRTL ? 1 : 0,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: '10px',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            transform: isRTL ? 'translateX(3px)' : 'translateX(-3px)'
          },
          '&:active': {
            transform: 'scale(0.9)'
          }
        }}
      >
        <ArrowBack sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
      </IconButton>
    </Tooltip>
  );
};

export default BackButton;