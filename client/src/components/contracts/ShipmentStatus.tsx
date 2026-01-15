import React from 'react';
import { Card, CardContent, Box, Typography, TextField, alpha } from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { Anchor } from '@mui/icons-material';
import SectionHeader from '../common/SectionHeader';
import FieldLabel from '../common/FieldLabel';

interface ShipmentStatusProps {
  formData: any;
  handleInputChange: (field: string, value: any) => void;
  t: any;
  theme: any;
}

const ShipmentStatus: React.FC<ShipmentStatusProps> = React.memo(({ formData, handleInputChange, t, theme }) => {
  const { palette } = theme;
  const alphaVal = 0.05;
  const borderAlpha = 0.2;

  return (
    <Card elevation={0} sx={{ border: `1px solid ${palette.divider}`, borderRadius: 3 }}>
      <CardContent>
        <SectionHeader title={t("Shipment Status Timeline")} icon={<Anchor fontSize="small" />} />
        <Grid2 container spacing={3}>
          {/* ATA - Actual Time of Arrival */}
          <Grid2 size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: alpha(palette.primary.main, alphaVal), borderRadius: 2, border: `1px solid ${alpha(palette.primary.main, borderAlpha)}` }}>
              <Typography variant="subtitle2" fontWeight="700" color="primary.main" sx={{ mb: 1.5 }}>{t("ATA - Actual Time of Arrival")}</Typography>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Date")} />
                  <TextField type="date" fullWidth size="small" value={formData.ata_date || ''} onChange={e => handleInputChange('ata_date', e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Time")} />
                  <TextField type="time" fullWidth size="small" value={formData.ata_time || ''} onChange={e => handleInputChange('ata_time', e.target.value)} />
                </Grid2>
              </Grid2>
            </Box>
          </Grid2>

          {/* Arrival at Loading Port */}
          <Grid2 size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: alpha(palette.info.main, alphaVal), borderRadius: 2, border: `1px solid ${alpha(palette.info.main, borderAlpha)}` }}>
              <Typography variant="subtitle2" fontWeight="700" color="info.main" sx={{ mb: 1.5 }}>{t("Arrival at Loading Port")}</Typography>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Date")} />
                  <TextField type="date" fullWidth size="small" value={formData.arrival_loading_port_date || ''} onChange={e => handleInputChange('arrival_loading_port_date', e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Time")} />
                  <TextField type="time" fullWidth size="small" value={formData.arrival_loading_port_date || ''} onChange={e => handleInputChange('arrival_loading_port_date', e.target.value)} />
                </Grid2>
              </Grid2>
            </Box>
          </Grid2>

          {/* NOR - Notice of Readiness */}
          <Grid2 size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: alpha(palette.warning.main, alphaVal), borderRadius: 2, border: `1px solid ${alpha(palette.warning.main, borderAlpha)}` }}>
              <Typography variant="subtitle2" fontWeight="700" color="warning.main" sx={{ mb: 1.5 }}>{t("NOR - Notice of Readiness")}</Typography>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Date")} />
                  <TextField type="date" fullWidth size="small" value={formData.nor_date || ''} onChange={e => handleInputChange('nor_date', e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Time")} />
                  <TextField type="time" fullWidth size="small" value={formData.nor_time || ''} onChange={e => handleInputChange('nor_time', e.target.value)} />
                </Grid2>
              </Grid2>
            </Box>
          </Grid2>

          {/* Commencement of Discharge */}
          <Grid2 size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: alpha(palette.success.main, alphaVal), borderRadius: 2, border: `1px solid ${alpha(palette.success.main, borderAlpha)}` }}>
              <Typography variant="subtitle2" fontWeight="700" color="success.main" sx={{ mb: 1.5 }}>{t("Commencement of Discharge")}</Typography>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Date")} />
                  <TextField type="date" fullWidth size="small" value={formData.commencement_discharge_date || ''} onChange={e => handleInputChange('commencement_discharge_date', e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Time")} />
                  <TextField type="time" fullWidth size="small" value={formData.commencement_discharge_time || ''} onChange={e => handleInputChange('commencement_discharge_time', e.target.value)} />
                </Grid2>
              </Grid2>
            </Box>
          </Grid2>

          {/* Completion of Discharge */}
          <Grid2 size={{ xs: 12 }}>
            <Box sx={{ p: 2, bgcolor: alpha(palette.error.main, alphaVal), borderRadius: 2, border: `1px solid ${alpha(palette.error.main, borderAlpha)}` }}>
              <Typography variant="subtitle2" fontWeight="700" color="error.main" sx={{ mb: 1.5 }}>{t("Completion of Discharge")}</Typography>
              <Grid2 container spacing={2}>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Date")} />
                  <TextField type="date" fullWidth size="small" value={formData.completion_discharge_date || ''} onChange={e => handleInputChange('completion_discharge_date', e.target.value)} />
                </Grid2>
                <Grid2 size={{ xs: 12, md: 6 }}>
                  <FieldLabel label={t("Time")} />
                  <TextField type="time" fullWidth size="small" value={formData.completion_discharge_time || ''} onChange={e => handleInputChange('completion_discharge_time', e.target.value)} />
                </Grid2>
              </Grid2>
            </Box>
          </Grid2>
        </Grid2>
      </CardContent>
    </Card>
  );
});

export default ShipmentStatus;
