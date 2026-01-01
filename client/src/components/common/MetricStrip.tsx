import React from 'react';
import { Stack, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface MetricStripProps {
  totalVol: number;
  totalVal: number;
}

const MetricStrip: React.FC<MetricStripProps> = ({ totalVol, totalVal }) => {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={4} sx={{ px: 1, display: { xs: 'none', md: 'flex' } }}>
      <Box>
        <Typography variant="caption" color="text.secondary">{t('Total Volume')}</Typography>
        <Typography variant="h6" fontWeight="bold">{totalVol.toLocaleString()} MT</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">{t('Total Value')}</Typography>
        <Typography variant="h6" fontWeight="bold">${(totalVal / 1000000).toFixed(1)}M</Typography>
      </Box>
    </Stack>
  );
};

export default MetricStrip;
