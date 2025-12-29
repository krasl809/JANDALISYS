import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { 
  Autocomplete, TextField, Button, Container, Paper, 
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Typography, Box, CircularProgress, Alert, Snackbar, Chip, Card, CardContent, Stack, Divider, InputAdornment,
  List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { 
  Send, PriceCheck, TrendingUp, Assessment, History, ShowChart, EditCalendar, Receipt
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';

interface PricingFormProps {
  contractId?: string;
  onSaveSuccess?: () => void;
}

interface ContractItem {
  id: string; article_id: string; article_name: string;
  qty_ton: string; premium: string; market_price: string; 
  total_unit_price: number; total_price: number;
  qty_priced: number; qty_remaining: number;
}

interface PartialPricing {
  id: string;
  date: string;
  qty_priced: number;
  price: number;
  total_value: number;
  reference: string;
}
interface Article { id: string; article_name: string; item_code: string; }

const PricingForm: React.FC<PricingFormProps> = ({ contractId, onSaveSuccess }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [articlesList, setArticlesList] = useState<Article[]>([]);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [pricingDate, setPricingDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [partialQty, setPartialQty] = useState<{[key: string]: string}>({});
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [pricingTree, setPricingTree] = useState<{[key: string]: PartialPricing[]}>({});
  
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const isEmbedded = !!contractId;

  // Styles
  const headerSx = { bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.text.secondary, fontWeight: '700', fontSize: '0.75rem', borderBottom: `1px solid ${theme.palette.divider}`, padding: '12px 16px' };
  const cellSx = { borderBottom: `1px solid ${theme.palette.divider}`, padding: '12px 16px', color: theme.palette.text.primary, fontSize: '0.9rem' };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, contractsRes] = await Promise.all([
          api.get('/articles/'),
          contractId ? api.get(`/contracts/${contractId}`) : api.get('/contracts/')
        ]);
        setArticlesList(articlesRes.data);

        if (contractId) {
            const contract = contractsRes.data;
            setContracts([contract]);
            handleContractSelect(contract, articlesRes.data);
        } else {
            const stockContracts = contractsRes.data.filter((c: any) => c.contract_type === 'stock_market' && c.pricing_status !== 'approved');
            setContracts(stockContracts);
        }
      } catch (err) { setNotification({ open: true, message: 'Error loading data', severity: 'error' }); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [contractId]);

  // ✅ دالة لجلب تاريخ التعديلات (الفواتير + التسويات)
  const fetchPricingHistory = async (cId: string) => {
      try {
          const res = await api.get(`/contracts/${cId}/ledger`);
          
          const updates = res.data.filter((tx: any) => 
              tx.type === 'Invoice' || tx.type === 'Pricing Adjustment' || tx.type === 'Partial Pricing'
          ).sort((a: any, b: any) => 
              new Date(b.created_at || b.transaction_date).getTime() - new Date(a.created_at || a.transaction_date).getTime()
          );
          
          setPriceHistory(updates);
      } catch (e) {
          console.error("Failed to fetch pricing history", e);
      }
  };

  const handleContractSelect = (contract: any, articles = articlesList) => {
    setSelectedContract(contract);
    if (contract) fetchPricingHistory(contract.id); // ✅ جلب السجل

    if (contract && articles.length > 0) {
      const mappedItems = contract.items.map((i: any) => {
        const articleObj = articles.find(a => a.id === i.article_id);
        const name = articleObj ? `${articleObj.article_name}` : 'Unknown';
        const premium = parseFloat(i.premium || 0);
        const qty = parseFloat(i.qty_ton || i.quantity || 0);
        
        // Calculate priced quantity from history
        const pricedQty = 0; // Will be calculated from pricing tree
        
        return {
          id: i.id, article_id: i.article_id, article_name: name,
          qty_ton: qty.toString(), premium: premium.toString(),
          market_price: i.price ? i.price.toString() : '',
          total_unit_price: (parseFloat(i.price || 0) + premium),
          total_price: qty * (parseFloat(i.price || 0) + premium),
          qty_priced: pricedQty,
          qty_remaining: qty - pricedQty
        };
      });
      setItems(mappedItems);
      
      // Load pricing tree for each item
      loadPricingTree(contract.id, mappedItems);
    } else { setItems([]); }
  };

  const handlePriceChange = (index: number, val: string) => {
    const newItems = [...items];
    const item = newItems[index];
    item.market_price = val;
    const marketPrice = parseFloat(val) || 0;
    const premium = parseFloat(item.premium) || 0;
    const qty = parseFloat(item.qty_ton) || 0;
    item.total_unit_price = marketPrice + premium; 
    item.total_price = qty * item.total_unit_price; 
    setItems(newItems);
  };

  const summary = useMemo(() => {
    const totalQty = items.reduce((sum, i) => sum + (parseFloat(i.qty_ton) || 0), 0);
    
    let totalValue = 0;
    items.forEach(item => {
      const tree = pricingTree[item.id] || [];
      const pricedValue = tree.reduce((sum, p) => sum + p.total_value, 0);
      totalValue += pricedValue;
    });
    
    const totalPricedQty = items.reduce((sum, i) => sum + i.qty_priced, 0);
    const avgPrice = totalPricedQty > 0 ? totalValue / totalPricedQty : 0;
    
    return { totalQty, totalValue, avgPrice, totalPricedQty };
  }, [items, pricingTree]);

  const loadPricingTree = async (contractId: string, itemsList: ContractItem[]) => {
    try {
      const res = await api.get(`/contracts/${contractId}/pricing-tree`);
      setPricingTree(res.data);
      
      // Update items with priced quantities
      const updatedItems = itemsList.map(item => {
        const tree = res.data[item.id] || [];
        const pricedQty = tree.reduce((sum: number, p: PartialPricing) => sum + p.qty_priced, 0);
        return {
          ...item,
          qty_priced: pricedQty,
          qty_remaining: parseFloat(item.qty_ton) - pricedQty
        };
      });
      setItems(updatedItems);
    } catch (e) {
      console.error('Failed to load pricing tree', e);
    }
  };

  const handlePartialSave = async (itemId: string) => {
    if (!selectedContract) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const qtyToPrice = parseFloat(partialQty[itemId] || '0');
    const marketPrice = parseFloat(item.market_price || '0');
    
    if (qtyToPrice <= 0 || qtyToPrice > item.qty_remaining) {
      setNotification({ open: true, message: 'Invalid quantity', severity: 'error' });
      return;
    }
    
    if (marketPrice <= 0) {
      setNotification({ open: true, message: 'Enter market price', severity: 'error' });
      return;
    }
    
    try {
      console.log('Sending partial pricing request:', {
        item_id: itemId,
        qty_priced: qtyToPrice,
        market_price: marketPrice,
        pricing_date: pricingDate
      });
      
      const token = localStorage.getItem('access_token');
      console.log('Token exists:', !!token);
      
      const response = await api.post(`/contracts/${selectedContract.id}/partial-price`, {
        item_id: itemId,
        qty_priced: qtyToPrice,
        market_price: marketPrice,
        pricing_date: pricingDate
      });
      
      console.log('Response:', response.data);
      
      setNotification({ open: true, message: 'Partial pricing saved', severity: 'success' });
      setPartialQty({...partialQty, [itemId]: ''});
      
      // Reload data
      fetchPricingHistory(selectedContract.id);
      loadPricingTree(selectedContract.id, items);
      
      if (onSaveSuccess) onSaveSuccess();
    } catch (e: any) {
      console.error('Error saving partial pricing:', e);
      console.error('Error response:', e.response?.data);
      console.error('Error status:', e.response?.status);
      
      const errorMsg = e.response?.status === 401 
        ? 'Session expired. Please login again.' 
        : e.response?.data?.detail || 'Error saving';
      
      setNotification({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  const handleSave = async () => {
    if (!selectedContract) return;
    
    // Check if all quantities are fully priced
    const allFullyPriced = items.every(i => i.qty_remaining === 0);
    if (!allFullyPriced) {
      setNotification({ open: true, message: 'All quantities must be priced before confirming', severity: 'error' });
      return;
    }
    
    try {
      await api.post(`/contracts/${selectedContract.id}/approve-pricing`);
      setNotification({ open: true, message: 'Pricing confirmed successfully', severity: 'success' });
      
      if (onSaveSuccess) onSaveSuccess();
    } catch (e: any) {
      const errorMsg = e.response?.status === 401 
        ? 'Session expired. Please login again.' 
        : 'Error confirming pricing.';
      setNotification({ open: true, message: errorMsg, severity: 'error' });
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>;

  return (
    <Container maxWidth={false} disableGutters={isEmbedded} sx={{ mt: isEmbedded ? 0 : 4, mb: 8 }}>
      {!isEmbedded && (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
            <Box>
                <Box display="flex" gap={1.5} alignItems="center" mb={1}>
                    <Box p={1} bgcolor={alpha(theme.palette.primary.main, 0.1)} borderRadius={2} color="primary.main"><PriceCheck /></Box>
                    <Typography variant="h4" fontWeight="800" color="text.primary">{t('Price Fixation')}</Typography>
                </Box>
            </Box>
            <Chip label="Market Active" color="success" icon={<TrendingUp />} variant="outlined" />
        </Box>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
           <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, mb: 3, borderRadius: 3 }}>
             <CardContent>
               <Grid container spacing={2}>
                 {!isEmbedded && (<Grid size={{ xs: 12, md: 8 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">SELECT CONTRACT</Typography><Autocomplete options={contracts} getOptionLabel={(opt) => opt.contract_no} value={selectedContract} onChange={(_, val) => handleContractSelect(val)} renderInput={(params) => <TextField {...params} size="small" />} /></Grid>)}
                 <Grid size={{ xs: 12, md: isEmbedded ? 6 : 4 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">PRICING DATE</Typography><TextField type="date" fullWidth size="small" value={pricingDate} onChange={e => setPricingDate(e.target.value)} /></Grid>
               </Grid>
             </CardContent>
           </Card>

           {selectedContract ? (
             <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3, overflow: 'hidden' }}>
               <TableContainer>
                 <Table>
                   <TableHead>
                     <TableRow>
                       <TableCell sx={{...headerSx, width: '25%'}}>Article</TableCell>
                       <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>Total Qty</TableCell>
                       <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>Priced</TableCell>
                       <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>Remaining</TableCell>
                       <TableCell sx={{...headerSx, width: '8%', textAlign: 'center'}}>Premium</TableCell>
                       <TableCell sx={{...headerSx, width: '12%', bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.main, textAlign: 'center'}}>Market Price</TableCell>
                       <TableCell sx={{...headerSx, width: '12%', textAlign: 'center'}}>Qty to Price</TableCell>
                       <TableCell sx={{...headerSx, width: '13%', textAlign: 'center'}}>Action</TableCell>
                     </TableRow>
                   </TableHead>
                   <TableBody>
                     {items.map((item, idx) => (
                       <React.Fragment key={item.id}>
                         <TableRow hover sx={{ bgcolor: item.qty_remaining === 0 ? alpha(theme.palette.success.main, 0.05) : 'inherit' }}>
                           <TableCell sx={cellSx}>
                             <Box>
                               <Typography fontWeight="bold" fontSize="0.9rem">{item.article_name}</Typography>
                               {pricingTree[item.id] && pricingTree[item.id].length > 0 && (
                                 <Chip label={`${pricingTree[item.id].length} pricing(s)`} size="small" sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }} />
                               )}
                             </Box>
                           </TableCell>
                           <TableCell sx={{...cellSx, textAlign: 'center'}}>
                             <Typography fontWeight="bold" fontSize="0.9rem">{Number(item.qty_ton).toLocaleString()}</Typography>
                             <Typography variant="caption" color="text.secondary">MT</Typography>
                           </TableCell>
                           <TableCell sx={{...cellSx, textAlign: 'center'}}>
                             <Typography fontWeight="bold" fontSize="0.9rem" color="success.main">{item.qty_priced.toLocaleString()}</Typography>
                             <Typography variant="caption" color="text.secondary">MT</Typography>
                           </TableCell>
                           <TableCell sx={{...cellSx, textAlign: 'center'}}>
                             <Typography fontWeight="bold" fontSize="0.9rem" color={item.qty_remaining > 0 ? 'primary.main' : 'success.main'}>{item.qty_remaining.toLocaleString()}</Typography>
                             <Typography variant="caption" color="text.secondary">MT</Typography>
                           </TableCell>
                           <TableCell sx={{...cellSx, textAlign: 'center'}}>
                             <Typography fontWeight="bold" fontSize="0.9rem">${item.premium}</Typography>
                           </TableCell>
                           <TableCell sx={{ p: 1.5, bgcolor: alpha(theme.palette.info.main, 0.03) }}>
                             <TextField 
                               fullWidth 
                               size="small" 
                               type="number" 
                               value={item.market_price} 
                               onChange={e => handlePriceChange(idx, e.target.value)} 
                               InputProps={{ 
                                 startAdornment: <InputAdornment position="start">$</InputAdornment>, 
                                 sx: { bgcolor: alpha(theme.palette.background.paper, 0.8), fontWeight: 'bold' } 
                               }} 
                               disabled={item.qty_remaining === 0}
                             />
                           </TableCell>
                           <TableCell sx={{ p: 1.5 }}>
                             <TextField 
                               fullWidth 
                               size="small" 
                               type="number" 
                               value={partialQty[item.id] || ''} 
                               onChange={e => setPartialQty({...partialQty, [item.id]: e.target.value})} 
                               placeholder={item.qty_remaining.toString()} 
                               InputProps={{ 
                                 endAdornment: <InputAdornment position="end">MT</InputAdornment>,
                                 inputProps: { min: 0, max: item.qty_remaining, step: 1 }
                               }} 
                               disabled={item.qty_remaining === 0}
                             />
                           </TableCell>
                           <TableCell sx={{ p: 1.5, textAlign: 'center' }}>
                             <Button 
                               size="small" 
                               variant="contained" 
                               onClick={() => handlePartialSave(item.id)} 
                               disabled={item.qty_remaining === 0 || !partialQty[item.id] || parseFloat(partialQty[item.id]) <= 0}
                               startIcon={<PriceCheck />}
                               fullWidth
                             >
                               Price
                             </Button>
                           </TableCell>
                         </TableRow>
                         {pricingTree[item.id] && pricingTree[item.id].length > 0 && (
                           <TableRow>
                             <TableCell colSpan={8} sx={{ p: 0, bgcolor: alpha(theme.palette.background.default, 0.3), borderTop: `1px dashed ${theme.palette.divider}` }}>
                               <Box sx={{ p: 2.5, pl: 5 }}>
                                 <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                   <History fontSize="small" />
                                   PRICING HISTORY:
                                 </Typography>
                                 <Stack spacing={1}>
                                   {pricingTree[item.id].map((pricing, i) => (
                                     <Box key={pricing.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                                       <Box sx={{ minWidth: 28, height: 28, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                         <Typography variant="caption" fontWeight="bold" color="primary.main" fontSize="0.75rem">{i + 1}</Typography>
                                       </Box>
                                       <Box flexGrow={1}>
                                         <Typography variant="body2" fontWeight="bold" fontSize="0.85rem">{pricing.qty_priced.toLocaleString()} MT @ ${pricing.price.toLocaleString()}/MT</Typography>
                                         <Typography variant="caption" color="text.secondary" fontSize="0.7rem">{pricing.date} • {pricing.reference}</Typography>
                                       </Box>
                                       <Chip label={`$${pricing.total_value.toLocaleString()}`} size="small" color="success" variant="outlined" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} />
                                       <Button size="small" color="error" onClick={async () => {
                                         if (window.confirm('Delete this pricing?')) {
                                           try {
                                             await api.delete(`/financial-transactions/${pricing.id}`);
                                             setNotification({ open: true, message: 'Pricing deleted', severity: 'success' });
                                             fetchPricingHistory(selectedContract.id);
                                             loadPricingTree(selectedContract.id, items);
                                           } catch (e) {
                                             setNotification({ open: true, message: 'Error deleting', severity: 'error' });
                                           }
                                         }
                                       }}>Delete</Button>
                                     </Box>
                                   ))}
                                 </Stack>
                               </Box>
                             </TableCell>
                           </TableRow>
                         )}
                       </React.Fragment>
                     ))}
                   </TableBody>
                 </Table>
               </TableContainer>
             </Card>
           ) : (<Alert severity="info" variant="outlined">Select a contract to start.</Alert>)}
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          {selectedContract && items.length > 0 && (
             <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.6), borderRadius: 3 }}>
               <CardContent sx={{ p: 3 }}>
                 <Box display="flex" alignItems="center" gap={1} mb={2}><Assessment color="primary" /><Typography variant="h6" fontWeight="bold">Summary</Typography></Box>
                 <Divider sx={{ mb: 2 }} />
                 <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between"><Typography color="text.secondary">Total Qty:</Typography><Typography fontWeight="bold">{summary.totalQty.toLocaleString()} MT</Typography></Box>
                    <Box display="flex" justifyContent="space-between"><Typography color="text.secondary">Priced Qty:</Typography><Typography fontWeight="bold" color="success.main">{summary.totalPricedQty.toLocaleString()} MT</Typography></Box>
                    <Box display="flex" justifyContent="space-between"><Typography color="text.secondary">Avg Price:</Typography><Typography fontWeight="bold">${summary.avgPrice.toLocaleString(undefined, {maximumFractionDigits:2})} / MT</Typography></Box>
                    <Divider />
                    <Box><Typography variant="caption" color="text.secondary">PRICED VALUE (SO FAR)</Typography><Typography variant="h4" fontWeight="800" color="info.main">${summary.totalValue.toLocaleString()}</Typography></Box>
                 </Stack>
                 <Button fullWidth variant="contained" size="large" startIcon={<Send />} onClick={handleSave} sx={{ mt: 3, bgcolor: 'primary.main', color: 'white', fontWeight: 'bold' }}>Confirm Pricing</Button>
               </CardContent>
             </Card>
          )}
          
          {/* ✅ Pricing History Log */}
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, mt: 3, borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
                <Box p={2} display="flex" alignItems="center" gap={1} borderBottom={`1px solid ${theme.palette.divider}`}>
                    <History fontSize="small" color="action" />
                    <Typography variant="subtitle2" fontWeight="bold">Pricing Log (Updates)</Typography>
                </Box>
                <List dense>
                    {priceHistory.length > 0 ? (
                        priceHistory.map((tx, i) => (
                            <React.Fragment key={tx.id}>
                                <ListItem>
                                    <ListItemIcon><Receipt fontSize="small" color="primary" /></ListItemIcon>
                                    <ListItemText 
                                        primary={`Updated Value: $${tx.amount.toLocaleString()}`}
                                        secondary={`${tx.transaction_date} • ${tx.description}`}
                                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                    />
                                </ListItem>
                                {i < priceHistory.length - 1 && <Divider variant="inset" component="li" />}
                            </React.Fragment>
                        ))
                    ) : (
                        <Box p={3} textAlign="center"><Typography variant="caption" color="text.secondary">No price fixations recorded yet.</Typography></Box>
                    )}
                </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({...notification, open: false})}><Alert severity={notification.severity}>{notification.message}</Alert></Snackbar>
    </Container>
  );
};

export default PricingForm;