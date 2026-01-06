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
    <Stack direction="row" spacing={3} sx={{ px: 2, display: { xs: 'none', md: 'flex' } }}>
      <Box sx={{ borderRight: 1, borderColor: 'divider', pr: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>{t('Total Volume')}</Typography>
        <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1rem', color: 'text.primary' }}>{totalVol.toLocaleString()} MT</Typography>
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>{t('Total Value')}</Typography>
        <Typography variant="h6" fontWeight="700" sx={{ fontSize: '1rem', color: 'text.primary' }}>${(totalVal / 1000000).toFixed(1)}M</Typography>
      </Box>
    </Stack>
  );
};

export default MetricStrip;
