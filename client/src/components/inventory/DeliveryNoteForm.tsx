import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Grid, Typography, TextField, MenuItem, Button,
  Box, Table, TableBody, TableCell, TableHead, TableRow, IconButton,
  Card, CardContent, CircularProgress
} from '@mui/material';
import { Add, Delete, Save, Send, ArrowBack } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { inventoryApi } from '../../services/inventoryApi';
import { useConfirm } from '../../context/ConfirmContext';

// تعريف واجهة لنوع القوائم لحل مشكلة TypeScript
interface ListsState {
  warehouses: any[];
  articles: any[];
  contracts: any[];
  entities: any[];
}

const DeliveryNoteForm = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { alert } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  
  // ✅ الحل: تحديد النوع <ListsState> هنا لمنع خطأ TypeScript
  const [lists, setLists] = useState<ListsState>({
    warehouses: [],
    articles: [],
    contracts: [],
    entities: [] // Buyers or Sellers
  });

  const [formData, setFormData] = useState({
    type: 'inbound', // inbound, outbound, transfer
    date: new Date().toISOString().split('T')[0],
    warehouse_id: '', // Source (or Destination for Inbound)
    target_warehouse_id: '', // Only for Transfer
    contract_id: '',
    entity_id: '', // Supplier or Customer
    notes: '',
    status: 'draft'
  });

  const [items, setItems] = useState([
    { id: Date.now(), article_id: '', quantity: '', batch_number: '' }
  ]);

  // 1. تحميل البيانات الأساسية عند فتح الصفحة
  useEffect(() => {
    const loadData = async () => {
      try {
        const [wh, art, con] = await Promise.all([
          inventoryApi.getWarehouses(),
          api.get('articles/'),
          api.get('contracts/')
        ]);
        
        setLists(prev => ({
          ...prev,
          warehouses: wh.data || [],
          articles: art.data || [],
          contracts: con.data || []
        }));
      } catch (error) {
        console.error("Failed to load master data", error);
      } finally {
        setPageLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. تحميل الكيانات (موردين/عملاء) عند تغيير نوع الحركة
  useEffect(() => {
    const loadEntities = async () => {
      try {
        if (formData.type === 'inbound') {
          const res = await api.get('sellers/');
          setLists(prev => ({ ...prev, entities: res.data || [] }));
        } else if (formData.type === 'outbound') {
          const res = await api.get('buyers/');
          setLists(prev => ({ ...prev, entities: res.data || [] }));
        } else {
          setLists(prev => ({ ...prev, entities: [] }));
        }
      } catch (error) {
        console.error("Failed to load entities", error);
      }
    };
    loadEntities();
  }, [formData.type]);

  // Handlers
  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), article_id: '', quantity: '', batch_number: '' }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: number, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async (action: 'draft' | 'approve') => {
    // تحقق بسيط قبل الإرسال
    if (!formData.warehouse_id) {
        alert(t("Please select a warehouse."), t('Warning'), 'warning');
        return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        // تنظيف البيانات وإرسال null بدلاً من string فارغ
        target_warehouse_id: formData.type === 'transfer' ? formData.target_warehouse_id : null,
        contract_id: formData.contract_id || null,
        entity_id: formData.entity_id || null,
        status: action === 'approve' ? 'approved' : 'draft', // نرسل الحالة المطلوبة
        items: items.map(i => ({
            article_id: i.article_id,
            quantity: parseFloat(i.quantity) || 0,
            batch_number: i.batch_number
        }))
      };

      const res = await inventoryApi.createMovement(payload);
      
      // إذا طلب المستخدم الموافقة الفورية وكان الباك إند يتطلب خطوة منفصلة
      if (action === 'approve' && res.data.id) {
        await inventoryApi.approveMovement(res.data.id);
      }
      
      navigate('/inventory/movements');
    } catch (err) {
      console.error(err);
      alert(t('Error processing request. Please check all fields.'), t('Error'), 'error');
    } finally {
        setLoading(false);
    }
  };

  if (pageLoading) {
      return <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3, mb: 10 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate(-1)}><ArrowBack /></IconButton>
            <Box>
                <Typography variant="h5" fontWeight="bold">{t("New Stock Movement")}</Typography>
                <Typography variant="body2" color="textSecondary">{t("Create Inbound, Outbound, or Transfer notes")}</Typography>
            </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Info */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', mb: 3 }}>
            <Typography variant="h6" fontWeight="600" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
               {t("Movement Details")}
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <TextField 
                        select fullWidth label={t("Movement Type")} size="small"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                    >
                        <MenuItem value="inbound">📥 {t("Inbound (Receipt)")}</MenuItem>
                        <MenuItem value="outbound">📤 {t("Outbound (Delivery)")}</MenuItem>
                        <MenuItem value="transfer">🔄 {t("Transfer (Internal)")}</MenuItem>
                    </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField 
                        type="date" fullWidth label={t("Date")} size="small"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <TextField 
                        select fullWidth label={t("Contract Ref (Optional)")} size="small"
                        value={formData.contract_id}
                        onChange={(e) => setFormData({...formData, contract_id: e.target.value})}
                    >
                        <MenuItem value="">{t("None")}</MenuItem>
                        {lists.contracts.map((c: any) => (
                            <MenuItem key={c.id} value={c.id}>{c.contract_no}</MenuItem>
                        ))}
                    </TextField>
                </Grid>

                {/* Dynamic Warehouse Selection */}
                <Grid item xs={12} md={6}>
                    <TextField 
                        select fullWidth size="small" required
                        label={formData.type === 'transfer' ? t("Source Warehouse") : (formData.type === 'inbound' ? t("Destination Warehouse") : t("Source Warehouse"))}
                        value={formData.warehouse_id}
                        onChange={(e) => setFormData({...formData, warehouse_id: e.target.value})}
                    >
                        {lists.warehouses.map((w: any) => (
                            <MenuItem key={w.id} value={w.id}>{t(w.name)}</MenuItem>
                        ))}
                    </TextField>
                </Grid>

                {formData.type === 'transfer' && (
                    <Grid item xs={12} md={6}>
                        <TextField 
                            select fullWidth size="small" required
                            label={t("Target Warehouse")}
                            value={formData.target_warehouse_id}
                            onChange={(e) => setFormData({...formData, target_warehouse_id: e.target.value})}
                        >
                            {lists.warehouses.filter((w: any) => w.id !== formData.warehouse_id).map((w: any) => (
                                <MenuItem key={w.id} value={w.id}>{t(w.name)}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                )}

                {formData.type !== 'transfer' && (
                    <Grid item xs={12} md={6}>
                        <TextField 
                            select fullWidth size="small"
                            label={formData.type === 'inbound' ? t("Supplier") : t("Customer")}
                            value={formData.entity_id}
                            onChange={(e) => setFormData({...formData, entity_id: e.target.value})}
                        >
                            {lists.entities.map((e: any) => (
                                <MenuItem key={e.id} value={e.id}>{t(e.contact_name)}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                )}
            </Grid>
          </Paper>

          {/* Items Table */}
          <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', overflow: 'hidden' }}>
            <Box p={2} bgcolor="#F8FAFC" borderBottom="1px solid #E2E8F0">
                <Typography variant="subtitle2" fontWeight="bold">{t("Items & Quantities")}</Typography>
            </Box>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell width="40%">{t("Article")}</TableCell>
                        <TableCell width="20%">{t("Quantity")}</TableCell>
                        <TableCell width="30%">{t("Batch/Lot No.")}</TableCell>
                        <TableCell width="10%"></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <TextField 
                                    select fullWidth variant="standard" placeholder={t("Select Article")}
                                    value={item.article_id}
                                    onChange={(e) => handleItemChange(item.id, 'article_id', e.target.value)}
                                    InputProps={{ disableUnderline: true }}
                                >
                                    {lists.articles.map((a: any) => (
                                        <MenuItem key={a.id} value={a.id}>{t(a.article_name)} ({a.item_code})</MenuItem>
                                    ))}
                                </TextField>
                            </TableCell>
                            <TableCell>
                                <TextField 
                                    type="number" fullWidth variant="standard" placeholder="0.00"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                    InputProps={{ disableUnderline: true }}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField 
                                    fullWidth variant="standard" placeholder={t("e.g. B-2024-001")}
                                    value={item.batch_number}
                                    onChange={(e) => handleItemChange(item.id, 'batch_number', e.target.value)}
                                    InputProps={{ disableUnderline: true }}
                                />
                            </TableCell>
                            <TableCell>
                                <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.id)}>
                                    <Delete fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Box p={2}>
                <Button startIcon={<Add />} onClick={handleAddItem} size="small">{t("Add Item")}</Button>
            </Box>
          </Paper>
        </Grid>

        {/* Sidebar Actions */}
        <Grid item xs={12} md={4}>
           <Card elevation={0} sx={{ border: '1px solid #e0e0e0', mb: 2 }}>
             <CardContent>
                <Typography variant="subtitle2" gutterBottom>{t("Actions")}</Typography>
                <Button 
                    fullWidth variant="outlined" startIcon={<Save />} sx={{ mb: 1 }}
                    onClick={() => handleSubmit('draft')}
                    disabled={loading}
                >
                    {t("Save as Draft")}
                </Button>
                <Button 
                    fullWidth variant="contained" startIcon={<Send />} 
                    sx={{ bgcolor: '#0F172A' }}
                    onClick={() => handleSubmit('approve')}
                    disabled={loading}
                >
                    {t("Save & Approve")}
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                    * {t("Approving will immediately update the stock levels in the selected warehouse.")}
                </Typography>
             </CardContent>
           </Card>
           
           <TextField 
             fullWidth multiline rows={4} label={t("Notes / Comments")}
             variant="outlined"
             value={formData.notes}
             onChange={(e) => setFormData({...formData, notes: e.target.value})}
             sx={{ bgcolor: 'white' }}
           />
        </Grid>
      </Grid>
    </Container>
  );
};

export default DeliveryNoteForm;