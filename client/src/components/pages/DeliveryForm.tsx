import React, { useState, useEffect } from 'react';
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

const DeliveryForm: React.FC<DeliveryFormProps> = ({ contractId, onSaveSuccess }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const isEmbedded = !!contractId;

  // Contract Totals (Mocked for now, normally fetched from Contract Details)
  const totalContractQty = 12500; 
  const totalShipped = shipments.reduce((sum, item) => sum + Number(item.qty), 0);
  const progress = Math.min((totalShipped / totalContractQty) * 100, 100);

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
        api.get('/contracts/').then(res => setContracts(res.data));
    }
  }, [isEmbedded]);

  const handleSave = async () => {
    if (!formData.contract_id || !formData.qty_ton) {
        setNotification({ open: true, message: 'Please enter quantity.', severity: 'error' });
        return;
    }
    const qty = parseFloat(formData.qty_ton);
    if (isNaN(qty) || qty <= 0) {
        setNotification({ open: true, message: 'Please enter a valid positive quantity.', severity: 'error' });
        return;
    }
    
    const shipmentData = {
        id: editingShipment ? editingShipment.id : Date.now(),
        date: formData.date,
        ref: formData.ref_id || 'N/A',
        method: formData.method,
        qty: qty,
        status: formData.status
    };
    
    if (editingShipment) {
        setShipments(shipments.map(s => s.id === editingShipment.id ? shipmentData : s));
        setNotification({ open: true, message: 'Shipment Updated Successfully', severity: 'success' });
    } else {
        setShipments([shipmentData, ...shipments]);
        setNotification({ open: true, message: 'Shipment Logged Successfully', severity: 'success' });
    }
    
    // Reset Form
    setFormData(prev => ({ ...prev, qty_ton: '', ref_id: '', notes: '', status: 'Scheduled' }));
    setEditingShipment(null);
    
    if (onSaveSuccess) onSaveSuccess();
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'Delivered': return 'success';
          case 'In Transit': return 'info';
          case 'At Port': return 'warning';
          default: return 'default';
      }
  };

  const getStatusIcon = (status: string) => {
      switch(status) {
          case 'Delivered': return <CheckCircle fontSize='small'/>;
          case 'In Transit': return <LocalShipping fontSize='small'/>;
          case 'At Port': return <Anchor fontSize='small'/>;
          default: return <AccessTime fontSize='small'/>;
      }
  };

  return (
    <Container maxWidth={false} disableGutters={isEmbedded} sx={{ mt: isEmbedded ? 0 : 4, mb: 8 }}>
      
      {!isEmbedded && (
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box p={1.5} bgcolor={alpha(theme.palette.info.main, 0.1)} borderRadius={2} color="info.main"><LocalShipping fontSize="large" /></Box>
            <Box><Typography variant="h4" fontWeight="800" color="text.primary">{t('Logistics Manager')}</Typography></Box>
        </Box>
      )}

      {/* 1. Fulfillment Progress (KPI) */}
      <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12 }}>
              <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.6), borderRadius: 3 }}>
                  <CardContent>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                          <Typography variant="caption" fontWeight="bold" color="text.secondary">CONTRACT FULFILLMENT</Typography>
                          <Typography variant="caption" fontWeight="bold" color="primary.main">{totalShipped.toLocaleString()} / {totalContractQty.toLocaleString()} MT</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={progress} 
                        sx={{ 
                            height: 10, 
                            borderRadius: 5, 
                            bgcolor: alpha(theme.palette.grey[500], 0.1),
                            '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: progress >= 100 ? theme.palette.success.main : theme.palette.primary.main }
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {progress.toFixed(1)}% of the contract quantity has been shipped.
                      </Typography>
                  </CardContent>
              </Card>
          </Grid>
      </Grid>

      <Grid container spacing={3}>
        
        {/* 2. New Shipment Form */}
        <Grid size={{ xs: 12, lg: 5 }}>
           <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, height: '100%' }}>
             <CardContent sx={{ p: 3 }}>
               <Typography variant="h6" fontWeight="700" gutterBottom sx={{ mb: 3 }}>{editingShipment ? 'Edit Shipment' : 'New Shipment Entry'}</Typography>
               <Grid container spacing={3}>
                  {!isEmbedded && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" fontWeight="bold" color="text.secondary">CONTRACT</Typography>
                        <Autocomplete options={contracts} getOptionLabel={(opt) => opt.contract_no} onChange={(_, val) => setFormData({ ...formData, contract_id: val?.id || '' })} renderInput={(params) => <TextField {...params} size="small" />} />
                      </Grid>
                  )}
                  
                  <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">DATE</Typography>
                      <TextField type="date" fullWidth size="small" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">REF / BL NO.</Typography>
                      <TextField fullWidth size="small" value={formData.ref_id} onChange={e => setFormData({...formData, ref_id: e.target.value})} />
                  </Grid>
                  
                  {/* ✅ حقل الحالة الجديد */}
                  <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">CURRENT STATUS</Typography>
                      <TextField select fullWidth size="small" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                        <MenuItem value="Scheduled">Scheduled (Planned)</MenuItem>
                        <MenuItem value="In Transit">In Transit (On The Way)</MenuItem>
                        <MenuItem value="At Port">At Port (Customs Clearance)</MenuItem>
                        <MenuItem value="Delivered">Delivered (Completed)</MenuItem>
                      </TextField>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                     <Typography variant="caption" fontWeight="bold" color="text.secondary" display="block" mb={1}>METHOD</Typography>
                     <ToggleButtonGroup 
                        value={formData.method} exclusive onChange={(_, val) => val && setFormData({ ...formData, method: val })} fullWidth size="small"
                        sx={{ '& .Mui-selected': { bgcolor: alpha(theme.palette.info.main, 0.1) + ' !important', color: 'info.main' } }}
                     >
                        <ToggleButton value="Truck"><LocalShipping sx={{ mr: 1 }} /> Truck</ToggleButton>
                        <ToggleButton value="Ship"><DirectionsBoat sx={{ mr: 1 }} /> Ship</ToggleButton>
                        <ToggleButton value="Train"><Train sx={{ mr: 1 }} /> Train</ToggleButton>
                     </ToggleButtonGroup>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" fontWeight="bold" color="text.secondary">QUANTITY (MT)</Typography>
                      <TextField type="number" fullWidth value={formData.qty_ton} onChange={e => setFormData({...formData, qty_ton: e.target.value})} InputProps={{ startAdornment: <Inventory color="action" sx={{ mr: 1 }} />, sx: { fontWeight: 'bold', fontSize: '1.1rem' } }} />
                  </Grid>
                  
                  <Grid size={{ xs: 12 }}><Divider /></Grid>
                  <Grid size={{ xs: 6 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">DRIVER</Typography><TextField fullWidth size="small" value={formData.driver_name} onChange={e => setFormData({...formData, driver_name: e.target.value})} /></Grid>
                  <Grid size={{ xs: 6 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">PLATE / ID</Typography><TextField fullWidth size="small" value={formData.plate_number} onChange={e => setFormData({...formData, plate_number: e.target.value})} /></Grid>

                  <Grid size={{ xs: 12 }}>
                      <Button fullWidth variant="contained" size="large" startIcon={<Save />} onClick={handleSave} sx={{ bgcolor: 'primary.main', py: 1.5 }}>{editingShipment ? 'Update Shipment' : 'Register Shipment'}</Button>
                  </Grid>
               </Grid>
             </CardContent>
           </Card>
        </Grid>

        {/* 3. Shipment Manifest (Log) */}
        <Grid size={{ xs: 12, lg: 7 }}>
            <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, height: '100%', overflow: 'hidden' }}>
                <Box sx={{ p: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.03), borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={1}><History color="action" /><Typography variant="h6" fontWeight="bold">Shipment Manifest</Typography></Box>
                    <Button size="small" startIcon={<Print />}>Report</Button>
                </Box>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Ref. No</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Method</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Qty (MT)</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Status</TableCell>
                                <TableCell align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {shipments.length > 0 ? shipments.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{row.date}</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{row.ref}</TableCell>
                                    <TableCell>{row.method}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.qty.toLocaleString()}</TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={row.status} 
                                            size="small" 
                                            icon={getStatusIcon(row.status)}
                                            color={getStatusColor(row.status) as any}
                                            variant="outlined"
                                            sx={{ borderRadius: 1, fontWeight: 'bold', minWidth: 100 }} 
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" onClick={() => {
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
                                        }}><Edit fontSize="small" /></IconButton>
                                        <IconButton size="small" color="error" onClick={() => {
                                            setShipments(shipments.filter(s => s.id !== row.id));
                                            setNotification({ open: true, message: 'Shipment Deleted Successfully', severity: 'success' });
                                        }}><Delete fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><Typography color="text.secondary">No shipments recorded yet.</Typography></TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Grid>

      </Grid>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({...notification, open: false})}><Alert severity={notification.severity}>{notification.message}</Alert></Snackbar>
    </Container>
  );
};

export default DeliveryForm;