import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Autocomplete, TextField, Button, Container, Typography, Box, Card, CardContent, 
    ToggleButton, ToggleButtonGroup, Snackbar, Alert, Divider, LinearProgress, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, MenuItem
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { 
    LocalShipping, DirectionsBoat, Train, Inventory, Save, History, Delete, Print, Edit, AccessTime, CheckCircle, Anchor
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import api from '../../services/api';

interface DeliveryFormProps {
  contractId?: string;
  onSaveSuccess?: () => void;
}

interface Contract {
  id: string;
  contract_no: string;
}

interface Shipment {
  id: number;
  date: string;
  ref: string;
  method: string;
  qty: number;
  status: string;
}

// Mock Data for demonstration - empty for new contracts
const initialShipments: Shipment[] = [];

const DeliveryForm: React.FC<DeliveryFormProps> = memo(({ contractId, onSaveSuccess }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { palette, boxShadows }: any = theme;
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const isEmbedded = !!contractId;

  // Contract Totals (Normally fetched from Contract Details)
  const [totalContractQty, setTotalContractQty] = useState(12500); 
  const totalShipped = useMemo(() => shipments.reduce((sum, item) => sum + Number(item.qty), 0), [shipments]);
  const progress = useMemo(() => Math.min((totalShipped / (totalContractQty || 1)) * 100, 100), [totalShipped, totalContractQty]);

  const [formData, setFormData] = useState({
    contract_id: contractId || '', 
    date: new Date().toISOString().split('T')[0], 
    qty_ton: '', 
    method: 'Truck', 
    ref_id: '', 
    notes: '',
    driver_name: '',
    plate_number: '',
    status: 'Scheduled' // ✅ الحقل الجديد
  });

  useEffect(() => {
    if (!isEmbedded) {
        api.get('contracts/').then(res => setContracts(res.data));
    }
  }, [isEmbedded]);

  const handleSave = useCallback(async () => {
    if (!formData.contract_id || !formData.qty_ton) {
        setNotification({ open: true, message: t('Please enter quantity.'), severity: 'error' });
        return;
    }
    const qty = parseFloat(formData.qty_ton);
    if (isNaN(qty) || qty <= 0) {
        setNotification({ open: true, message: t('Please enter a valid positive quantity.'), severity: 'error' });
        return;
    }
    
    const shipmentData = {
        id: editingShipment ? editingShipment.id : Date.now(),
        date: formData.date,
        ref: formData.ref_id || t('N/A'),
        method: formData.method,
        qty: qty,
        status: formData.status
    };
    
    if (editingShipment) {
        setShipments(prev => prev.map(s => s.id === editingShipment.id ? shipmentData : s));
        setNotification({ open: true, message: t('Shipment Updated Successfully'), severity: 'success' });
    } else {
        setShipments(prev => [shipmentData, ...prev]);
        setNotification({ open: true, message: t('Shipment Logged Successfully'), severity: 'success' });
    }
    
    // Reset Form
    setFormData(prev => ({ ...prev, qty_ton: '', ref_id: '', notes: '', status: 'Scheduled' }));
    setEditingShipment(null);
    
    if (onSaveSuccess) onSaveSuccess();
  }, [formData, editingShipment, t, onSaveSuccess]);

  const inputSx = useMemo(() => ({ 
    '& .MuiOutlinedInput-root': { 
      borderRadius: '8px',
      bgcolor: palette.mode === 'light' 
        ? alpha(palette.primary.main, 0.04) 
        : alpha(palette.background.paper, 0.4),
      border: `1.5px solid ${palette.mode === 'light' ? alpha(palette.divider, 0.6) : alpha(palette.divider, 0.45)}`,
      '&:hover': { 
        borderColor: alpha(palette.primary.main, 0.7),
        bgcolor: palette.mode === 'light' ? alpha(palette.primary.main, 0.08) : alpha(palette.background.paper, 0.6),
      },
      '&.Mui-focused': { 
        borderColor: palette.primary.main,
        borderWidth: '2px', 
        bgcolor: palette.mode === 'light' ? '#FFFFFF' : palette.background.paper,
        boxShadow: `0 0 0 4px ${alpha(palette.primary.main, palette.mode === 'light' ? 0.15 : 0.25)}` 
      },
      '& fieldset': { border: 'none' },
      '& .MuiInputBase-input': {
        color: palette.text.primary,
        padding: '8.5px 12px',
        fontWeight: 600,
        fontSize: '0.875rem',
        '&::placeholder': {
          color: palette.text.secondary,
          opacity: 0.6
        }
      }
    },
    '& .MuiInputLabel-root': { color: palette.text.secondary },
    '& .MuiAutocomplete-inputRoot': { padding: '2px 8px' }
  }), [palette]);

  const getStatusColor = useCallback((status: string): 'success' | 'info' | 'warning' | 'secondary' | 'error' | 'primary' => {
      switch(status) {
          case 'Delivered': return 'success';
          case 'In Transit': return 'info';
          case 'At Port': return 'warning';
          case 'Scheduled': return 'secondary';
          default: return 'primary';
      }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
      switch(status) {
          case 'Delivered': return <CheckCircle fontSize='small'/>;
          case 'In Transit': return <LocalShipping fontSize='small'/>;
          case 'At Port': return <Anchor fontSize='small'/>;
          case 'Scheduled': return <AccessTime fontSize='small'/>;
          default: return <AccessTime fontSize='small'/>;
      }
  }, []);

  return (
    <Container maxWidth={false} disableGutters={isEmbedded} sx={{ mt: isEmbedded ? 0 : 4, mb: 8 }}>
      
      {!isEmbedded && (
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              sx={{ 
                p: 1.5, 
                background: palette.gradients.info.main, 
                borderRadius: '12px', 
                color: '#fff',
                boxShadow: boxShadows.colored.info,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <LocalShipping fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="700" color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
                {t('Logistics Manager')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('Manage shipments, tracking, and fulfillment progress')}
              </Typography>
            </Box>
        </Box>
      )}

      {/* 1. Fulfillment Progress (KPI) */}
      <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12 }}>
              <Card 
                sx={{ 
                  borderRadius: '16px', 
                  boxShadow: boxShadows.md,
                  bgcolor: palette.mode === 'light' ? alpha(palette.background.paper, 0.8) : alpha(palette.background.paper, 0.6),
                  backdropFilter: 'blur(10px)',
                  border: 'none'
                }}
              >
                  <CardContent sx={{ p: 3 }}>
                      <Box display="flex" justifyContent="space-between" mb={2}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Inventory fontSize="small" color="primary" />
                            <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                              {t("CONTRACT FULFILLMENT")}
                            </Typography>
                          </Box>
                          <Typography variant="subtitle2" fontWeight="700" color="primary.main">
                            {totalShipped.toLocaleString()} / {totalContractQty.toLocaleString()} {t("MT")}
                          </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ 
                            height: 12, 
                            borderRadius: 6, 
                            bgcolor: alpha(palette.grey[500], 0.1),
                            '& .MuiLinearProgress-bar': { 
                              borderRadius: 6, 
                              background: progress >= 100 ? palette.gradients.success.main : palette.gradients.primary.main 
                            }
                        }} 
                      />
                      <Box display="flex" justifyContent="space-between" mt={1.5}>
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                            {progress.toFixed(1)}% {t("of the contract quantity has been shipped.")}
                        </Typography>
                        {progress >= 100 && (
                          <Chip 
                            label={t("Fully Fulfilled")} 
                            size="small" 
                            color="success" 
                            sx={{ fontWeight: '700', borderRadius: '4px', height: '20px' }} 
                          />
                        )}
                      </Box>
                  </CardContent>
              </Card>
          </Grid>
      </Grid>

      <Grid container spacing={3}>
        
        {/* 2. New Shipment Form */}
        <Grid size={{ xs: 12, lg: 5 }}>
           <Card 
             sx={{ 
               borderRadius: '16px', 
               boxShadow: boxShadows.md,
               bgcolor: palette.mode === 'light' ? alpha(palette.background.paper, 0.8) : alpha(palette.background.paper, 0.6),
               backdropFilter: 'blur(10px)',
               border: 'none',
               height: '100%'
             }}
           >
             <CardContent sx={{ p: 3 }}>
               <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                  <Box sx={{ p: 1, bgcolor: alpha(palette.primary.main, 0.1), borderRadius: '8px', color: palette.primary.main }}>
                    <Edit fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight="700">
                    {editingShipment ? t('Edit Shipment') : t('New Shipment Entry')}
                  </Typography>
               </Box>

               <Grid container spacing={2.5}>
                  {!isEmbedded && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                          {t("CONTRACT")}
                        </Typography>
                        <Autocomplete 
                          options={contracts} 
                          getOptionLabel={(opt) => opt?.contract_no || ''} 
                          onChange={(_, val) => setFormData({ ...formData, contract_id: val?.id || '' })} 
                          renderInput={(params) => (
                            <TextField 
                              {...params} 
                              size="small" 
                              placeholder={t("examples.contractNo")}
                              sx={inputSx}
                            />
                          )} 
                        />
                      </Grid>
                  )}
                  
                  <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                        {t("DATE")}
                      </Typography>
                      <TextField 
                        type="date" 
                        fullWidth 
                        size="small" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                        sx={inputSx}
                      />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                        {t("REF / BL NO.")}
                      </Typography>
                      <TextField 
                        fullWidth 
                        size="small" 
                        placeholder={t("examples.refBlNo")}
                        value={formData.ref_id} 
                        onChange={e => setFormData({...formData, ref_id: e.target.value})} 
                        sx={inputSx}
                      />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                        {t("CURRENT STATUS")}
                      </Typography>
                      <TextField 
                        select 
                        fullWidth 
                        size="small" 
                        value={formData.status} 
                        onChange={e => setFormData({...formData, status: e.target.value})}
                        sx={inputSx}
                      >
                        <MenuItem value="Scheduled">{t("Scheduled (Planned)")}</MenuItem>
                        <MenuItem value="In Transit">{t("In Transit (On The Way)")}</MenuItem>
                        <MenuItem value="At Port">{t("At Port (Customs Clearance)")}</MenuItem>
                        <MenuItem value="Delivered">{t("Delivered (Completed)")}</MenuItem>
                      </TextField>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                     <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase' }}>
                        {t("METHOD")}
                     </Typography>
                     <ToggleButtonGroup 
                        value={formData.method} 
                        exclusive 
                        onChange={(_, val) => val && setFormData({ ...formData, method: val })} 
                        fullWidth 
                        size="small"
                        sx={{ 
                          '& .MuiToggleButton-root': { 
                            borderRadius: '8px', 
                            mx: 0.5, 
                            border: `1px solid ${alpha(palette.divider, 0.1)} !important`,
                            fontWeight: '700',
                            textTransform: 'none'
                          },
                          '& .Mui-selected': { 
                            bgcolor: alpha(palette.info.main, 0.1) + ' !important', 
                            color: palette.info.main + ' !important',
                            borderColor: palette.info.main + ' !important'
                          } 
                        }}
                     >
                        <ToggleButton value="Truck"><LocalShipping sx={{ marginInlineEnd: 1, fontSize: 18 }} /> {t("Truck")}</ToggleButton>
                        <ToggleButton value="Ship"><DirectionsBoat sx={{ marginInlineEnd: 1, fontSize: 18 }} /> {t("Ship")}</ToggleButton>
                        <ToggleButton value="Train"><Train sx={{ marginInlineEnd: 1, fontSize: 18 }} /> {t("Train")}</ToggleButton>
                     </ToggleButtonGroup>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                        {t("QUANTITY (MT)")}
                      </Typography>
                      <TextField 
                        type="number" 
                        fullWidth 
                        placeholder={t("examples.qtyTon")}
                        value={formData.qty_ton} 
                        onChange={e => setFormData({...formData, qty_ton: e.target.value})} 
                        InputProps={{ 
                          startAdornment: <Inventory color="action" sx={{ marginInlineEnd: 1 }} />, 
                          sx: { fontWeight: '800', fontSize: '1.25rem', borderRadius: '12px' } 
                        }} 
                        sx={inputSx}
                      />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t("DRIVER")}
                    </Typography>
                    <TextField 
                      fullWidth 
                      size="small" 
                      placeholder={t("examples.driverName")}
                      value={formData.driver_name} 
                      onChange={e => setFormData({...formData, driver_name: e.target.value})} 
                      sx={inputSx}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t("PLATE / ID")}
                    </Typography>
                    <TextField 
                      fullWidth 
                      size="small" 
                      placeholder={t("examples.plateNumber")}
                      value={formData.plate_number} 
                      onChange={e => setFormData({...formData, plate_number: e.target.value})} 
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        size="large" 
                        startIcon={<Save />} 
                        onClick={handleSave} 
                        sx={{ 
                          py: 1.5,
                          borderRadius: '12px',
                          background: palette.gradients.primary.main,
                          boxShadow: boxShadows.colored.primary,
                          fontWeight: '700',
                          fontSize: '1rem',
                          mt: 2,
                          '&:hover': {
                            background: palette.gradients.primary.state,
                            boxShadow: boxShadows.md
                          }
                        }}
                      >
                        {editingShipment ? t('Update Shipment') : t('Register Shipment')}
                      </Button>
                  </Grid>
               </Grid>
             </CardContent>
           </Card>
        </Grid>

        {/* 3. Shipment Manifest (Log) */}
        <Grid size={{ xs: 12, lg: 7 }}>
            <Card 
              sx={{ 
                borderRadius: '16px', 
                boxShadow: boxShadows.md,
                bgcolor: palette.mode === 'light' ? alpha(palette.background.paper, 0.8) : alpha(palette.background.paper, 0.6),
                backdropFilter: 'blur(10px)',
                border: 'none',
                height: '100%', 
                overflow: 'hidden' 
              }}
            >
                <Box 
                  sx={{ 
                    p: 2.5, 
                    bgcolor: alpha(palette.primary.main, 0.03), 
                    borderBottom: `1px solid ${alpha(palette.divider, 0.1)}`, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center' 
                  }}
                >
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Box sx={{ p: 1, bgcolor: alpha(palette.primary.main, 0.1), borderRadius: '8px', color: palette.primary.main }}>
                        <History fontSize="small" />
                      </Box>
                      <Typography variant="h6" fontWeight="700">
                        {t('Shipment Manifest')}
                      </Typography>
                    </Box>
                    <Button 
                      size="small" 
                      variant="outlined"
                      startIcon={<Print />}
                      sx={{ borderRadius: '8px', fontWeight: '700', textTransform: 'none' }}
                    >
                      {t('Report')}
                    </Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: '700', color: 'text.secondary', py: 2 }}>{t('Date')}</TableCell>
                                <TableCell sx={{ fontWeight: '700', color: 'text.secondary', py: 2 }}>{t('Ref. No')}</TableCell>
                                <TableCell sx={{ fontWeight: '700', color: 'text.secondary', py: 2 }}>{t('Method')}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: '700', color: 'text.secondary', py: 2 }}>{t('Qty (MT)')}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: '700', color: 'text.secondary', py: 2 }}>{t('Status')}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: '700', color: 'text.secondary', py: 2 }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {shipments.length > 0 ? shipments.map((row) => (
                                <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={{ py: 2, fontFamily: 'monospace', color: 'text.primary' }}>{row.date}</TableCell>
                                    <TableCell sx={{ py: 2, fontWeight: '700', color: palette.primary.main, fontFamily: 'monospace' }}>{row.ref}</TableCell>
                                    <TableCell sx={{ py: 2 }}>
                                      <Box display="flex" alignItems="center" gap={1}>
                                        {row.method === 'Truck' && <LocalShipping fontSize="small" color="action" />}
                                        {row.method === 'Ship' && <DirectionsBoat fontSize="small" color="action" />}
                                        {row.method === 'Train' && <Train fontSize="small" color="action" />}
                                        <Typography variant="body2">{t(row.method)}</Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 2, fontWeight: '800', color: 'text.primary' }}>{row.qty.toLocaleString()}</TableCell>
                                    <TableCell align="center" sx={{ py: 2 }}>
                                        <Chip 
                                            label={t(row.status)} 
                                            size="small" 
                                            icon={getStatusIcon(row.status)}
                                            sx={{ 
                                              borderRadius: '6px', 
                                              fontWeight: '700', 
                                              minWidth: 110,
                                              bgcolor: alpha((palette as any)[getStatusColor(row.status)].main, 0.1),
                                              color: (palette as any)[getStatusColor(row.status)].main,
                                              border: 'none',
                                              '& .MuiChip-icon': { color: 'inherit' }
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell align="right" sx={{ py: 2 }}>
                                        <IconButton 
                                          size="small" 
                                          sx={{ color: palette.primary.main, bgcolor: alpha(palette.primary.main, 0.05), mr: 1 }}
                                          onClick={() => {
                                            setEditingShipment(row);
                                            setFormData({
                                                contract_id: contractId || '',
                                                date: row.date,
                                                qty_ton: row.qty.toString(),
                                                method: row.method,
                                                ref_id: row.ref,
                                                notes: '',
                                                driver_name: '',
                                                plate_number: '',
                                                status: row.status
                                            });
                                        }}>
                                          <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton 
                                          size="small" 
                                          sx={{ color: palette.error.main, bgcolor: alpha(palette.error.main, 0.05) }}
                                          onClick={() => {
                                            setShipments(shipments.filter(s => s.id !== row.id));
                                            setNotification({ open: true, message: t('Shipment Deleted Successfully'), severity: 'success' });
                                        }}>
                                          <Delete fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><Typography color="text.secondary">{t('No shipments recorded yet.')}</Typography></TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Grid>

      </Grid>

      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={() => setNotification({...notification, open: false})}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setNotification({...notification, open: false})} 
          severity={notification.severity} 
          sx={{ borderRadius: '8px', boxShadow: boxShadows.md, width: '100%' }}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
});

export default DeliveryForm;