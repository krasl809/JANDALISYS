import React from 'react';
import { 
  Card, CardContent, TextField, Typography, InputAdornment, 
  MenuItem, TableContainer, Table, TableHead, TableRow, TableCell, 
  TableBody, Box, Theme, SxProps 
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { Anchor } from '@mui/icons-material';
import SectionHeader from '../common/SectionHeader';
import FieldLabel from '../common/FieldLabel';

interface CharterDetailsProps {
  mode: 'export' | 'import';
  charterItems: any[];
  setCharterItems: React.Dispatch<React.SetStateAction<any[]>>;
  t: any;
  theme: Theme;
  palette: any;
  boxShadows: any;
  headerSx: SxProps<Theme>;
  cellSx: SxProps<Theme>;
  inputTableSx: SxProps<Theme>;
  formData: any;
  handleInputChange: (field: string, value: any) => void;
}

const CharterDetails: React.FC<CharterDetailsProps> = React.memo(({
  mode, charterItems, setCharterItems, t, theme, palette, boxShadows, 
  headerSx, cellSx, inputTableSx, formData, handleInputChange
}) => {
  if (mode !== 'import') return null;

  return (
    <Card elevation={0} sx={{ mb: 3, borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
        <CardContent sx={{ p: 3 }}>
        <SectionHeader title={t("Charter Party")} icon={<Anchor fontSize="small" />} />
        <Grid2 container spacing={3}>
            <Grid2 size={{ xs: 12 }}><FieldLabel label={t("Vessel Name")} /><TextField size="small" fullWidth value={formData.vessel_name} onChange={e => handleInputChange('vessel_name', e.target.value)} placeholder={t("examples.vesselName")} /></Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}><FieldLabel label={t("Demurrage Rate % formula")} /><TextField size="small" fullWidth value={formData.demurrage_rate} onChange={e => handleInputChange('demurrage_rate', e.target.value)} placeholder={t("examples.demurrage")} slotProps={{ input: { endAdornment: <InputAdornment position="end">{formData.contract_currency}/WWD</InputAdornment> } }} /></Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}><FieldLabel label={t("Discharge Rate % formula")} /><TextField size="small" fullWidth value={formData.discharge_rate} onChange={e => handleInputChange('discharge_rate', e.target.value)} placeholder={t("examples.dischargeRate")} slotProps={{ input: { endAdornment: <InputAdornment position="end">{t("MT/WWD")}</InputAdornment> } }} /></Grid2>
            <Grid2 size={{ xs: 12, md: 4 }}><FieldLabel label={t("Dispatch Rate % formula")} /><TextField size="small" fullWidth value={formData.dispatch_rate || ''} onChange={e => handleInputChange('dispatch_rate', e.target.value)} placeholder={t("examples.dispatchRate")} slotProps={{ input: { endAdornment: <InputAdornment position="end">{formData.contract_currency}{t("/WWD")}</InputAdornment> } }} /></Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}><FieldLabel label={t("Laycan Date (LC) Date/Time Formula")} /><TextField type="date" size="small" fullWidth value={formData.laycan_date_from || ''} onChange={e => handleInputChange('laycan_date_from', e.target.value || null)} /></Grid2>
            <Grid2 size={{ xs: 12, md: 6 }}><FieldLabel label={t("Laycan Date (LC) Date/Time Formula (To)")} /><TextField type="date" size="small" fullWidth value={formData.laycan_date_to || ''} onChange={e => handleInputChange('laycan_date_to', e.target.value || null)} /></Grid2>
        </Grid2>
        
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 2 }}>{t("FREIGHT DETAILS")}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerSx}>{t("Article")}</TableCell>
                  <TableCell sx={headerSx}>{t("Qty (MT)")}</TableCell>
                  <TableCell sx={headerSx}>{t("Freight Rate")}</TableCell>
                  <TableCell sx={headerSx}>{t("Loading Rate")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {charterItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={cellSx}><Typography variant="body2" fontWeight="600">{item.article_name || t('N/A')}</Typography></TableCell>
                    <TableCell sx={cellSx}><Typography variant="body2">{item.qty_ton} {t("MT")}</Typography></TableCell>
                    <TableCell sx={cellSx}>
                      <TextField 
                        variant="standard" 
                        type="number" 
                        placeholder="0.00"
                        value={item.freight} 
                        onChange={e => setCharterItems(prev => prev.map(c => c.id === item.id ? {...c, freight: e.target.value} : c))}
                        sx={{...inputTableSx, '& input::placeholder': { opacity: 0.5 }}}
                        slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption">{formData.contract_currency}/MT</Typography></InputAdornment> } }}
                      />
                    </TableCell>
                    <TableCell sx={cellSx}>
                      <TextField 
                        variant="standard" 
                        type="number" 
                        placeholder="0"
                        value={item.loading_rate} 
                        onChange={e => setCharterItems(prev => prev.map(c => c.id === item.id ? {...c, loading_rate: e.target.value} : c))}
                        sx={{...inputTableSx, '& input::placeholder': { opacity: 0.5 }}}
                        slotProps={{ input: { endAdornment: <InputAdornment position="end"><Typography variant="caption">{t("MT/Day")}</Typography></InputAdornment> } }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
        </CardContent>
    </Card>
  );
});

export default CharterDetails;

