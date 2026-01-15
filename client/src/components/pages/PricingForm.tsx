import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import api from '../../services/api';
import { 
  Autocomplete, TextField, Button, Container, 
  Table, TableHead, TableRow, TableCell, TableBody, TableContainer,
  Typography, Box, CircularProgress, Alert, Snackbar, Chip, Card, CardContent, Stack, Divider, InputAdornment,
  List, ListItem, ListItemText, ListItemIcon, Select, MenuItem, FormControl, Tooltip
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import { 
  Send, PriceCheck, TrendingUp, Assessment, History, Receipt
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import { useAuth } from '../../context/AuthContext';
import { usePresence } from '../../hooks/usePresence';
import { EditCalendar } from '@mui/icons-material';

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
interface ExchangeQuoteUnit { id: string; name: string; symbol?: string; factor: number; description?: string; }

const PricingForm: React.FC<PricingFormProps> = memo(({ contractId, onSaveSuccess }) => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const theme = useTheme();
  const { user } = useAuth();
  const { palette, boxShadows }: any = theme;
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [articlesList, setArticlesList] = useState<Article[]>([]);
  const [exchangeUnits, setExchangeUnits] = useState<ExchangeQuoteUnit[]>([]);
  const [itemQuotes, setItemQuotes] = useState<{[key: string]: {quote: string, unitId: string}}>({});
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const activeUsers = usePresence(contractId || selectedContract?.id, user?.name);
  const [pricingDate, setPricingDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<ContractItem[]>([]);
  const [partialQty, setPartialQty] = useState<{[key: string]: string}>({});
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [pricingTree, setPricingTree] = useState<{[key: string]: PartialPricing[]}>({});
  
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [savingAll, setSavingAll] = useState(false);
  const isEmbedded = !!contractId;

  // Use ref for articlesList to avoid infinite loops in handleContractSelect
  const articlesListRef = useRef(articlesList);
  useEffect(() => {
    articlesListRef.current = articlesList;
  }, [articlesList]);

  // Styles
  const headerSx = useMemo(() => ({ 
    bgcolor: palette.mode === 'light' ? '#F8FAFC' : alpha(palette.common.white, 0.05),
    color: palette.text.secondary, 
    fontWeight: '700', 
    fontSize: '0.75rem', 
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: `1px solid ${palette.divider}`, 
    paddingInline: '16px', 
    paddingY: '12px' 
  }), [palette]);

  const cellSx = useMemo(() => ({ 
    borderBottom: `1px solid ${palette.divider}`, 
    paddingInline: '16px', 
    paddingY: '12px', 
    color: palette.text.primary, 
    fontSize: '0.875rem' 
  }), [palette]);

  const inputSx = useMemo(() => ({ 
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      bgcolor: palette.mode === 'light' 
        ? '#FFFFFF' 
        : alpha(palette.background.paper, 0.4),
      transition: 'all 0.2s',
      '& fieldset': {
        borderColor: palette.mode === 'light' ? alpha('#344767', 0.25) : alpha(palette.divider, 0.8),
        borderWidth: '1.5px',
      },
      '&:hover fieldset': { 
        borderColor: palette.primary.main,
        borderWidth: '1.5px',
      },
      '&.Mui-focused fieldset': {
        borderColor: palette.primary.main,
        borderWidth: '2px',
        boxShadow: `0 0 0 4px ${alpha(palette.primary.main, 0.15)}`,
      },
    },
    '& .MuiInputBase-input': {
      padding: '8.5px 12px',
      textAlign: palette.mode === 'rtl' ? 'right' : 'left',
      fontWeight: 600,
      fontSize: '0.875rem',
      color: palette.text.primary,
      '&::placeholder': {
        color: palette.text.secondary,
        opacity: 0.6
      }
    },
    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
      WebkitAppearance: 'none',
      display: 'none',
      margin: 0,
    },
    '& input[type=number]': {
      MozAppearance: 'textfield',
      appearance: 'textfield',
    },
    '& .MuiInputLabel-root': { color: palette.text.secondary },
    '& .MuiAutocomplete-inputRoot': { padding: '2px 8px' }
  }), [palette]);

  // ✅ دالة لجلب تاريخ التعديلات (الفواتير + التسويات)
  const fetchPricingHistory = useCallback(async (cId: string) => {
      try {
          const res = await api.get(`contracts/${cId}/ledger`);
          
          const updates = res.data.filter((tx: any) => 
              tx.type === 'Invoice' || tx.type === 'Pricing Adjustment' || tx.type === 'Partial Pricing'
          ).sort((a: any, b: any) => 
              new Date(b.created_at || b.transaction_date).getTime() - new Date(a.created_at || a.transaction_date).getTime()
          );
          
          setPriceHistory(updates);
      } catch (e) {
          console.error("Failed to fetch pricing history", e);
      }
  }, []);

  const loadPricingTree = useCallback(async (cId: string, itemsList: ContractItem[]) => {
    try {
      const res = await api.get(`contracts/${cId}/pricing-tree`);
      setPricingTree(res.data);
      
      // Update items with priced quantities
      setItems(prev => {
        return prev.map(item => {
          const tree = res.data[item.id] || [];
          const pricedQty = tree.reduce((sum: number, p: PartialPricing) => sum + p.qty_priced, 0);
          return {
            ...item,
            qty_priced: pricedQty,
            qty_remaining: parseFloat(item.qty_ton) - pricedQty
          };
        });
      });
    } catch (e) {
      console.error('Failed to load pricing tree', e);
    }
  }, []);

  const handleContractSelect = useCallback((contract: any, articles = articlesListRef.current) => {
    setSelectedContract(contract);
    if (contract) fetchPricingHistory(contract.id); // ✅ جلب السجل

    if (contract && articles && articles.length > 0) {
      const mappedItems = contract.items.map((i: any) => {
        const articleObj = articles.find(a => a.id === i.article_id);
        const name = articleObj ? `${articleObj.article_name}` : t('Unknown');
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
  }, [fetchPricingHistory, loadPricingTree, t]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, contractsRes, unitsRes] = await Promise.all([
          api.get('articles/'),
          contractId ? api.get(`contracts/${contractId}`) : api.get('contracts/'),
          api.get('exchange-units/')
        ]);
        
        const articles = articlesRes.data;
        setArticlesList(articles);
        setExchangeUnits(unitsRes.data);

        if (contractId) {
            const contract = contractsRes.data;
            setContracts([contract]);
            handleContractSelect(contract, articles);
        } else {
            // Allow both stock_market and fixed_price contracts that aren't fully approved yet
            const relevantContracts = contractsRes.data.filter((c: any) => 
              (c.contract_type === 'stock_market' || c.contract_type === 'fixed_price') && 
              c.pricing_status !== 'approved'
            );
            setContracts(relevantContracts);
        }
      } catch (err) { 
        console.error("Error loading pricing data:", err);
        setNotification({ open: true, message: t('errorLoadingData'), severity: 'error' }); 
      } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [contractId, t]); // Removed handleContractSelect from dependencies

  const handlePriceChange = useCallback((index: number, val: string) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index] };
      item.market_price = val;
      const marketPrice = parseFloat(val) || 0;
      const premium = parseFloat(item.premium) || 0;
      const qty = parseFloat(item.qty_ton) || 0;
      item.total_unit_price = marketPrice + premium; 
      item.total_price = qty * item.total_unit_price; 
      newItems[index] = item;
      return newItems;
    });
  }, []);

  const handleQuoteChange = useCallback((index: number, itemId: string, quoteVal: string) => {
    setItemQuotes(prev => {
      const currentQuote = prev[itemId] || { quote: '', unitId: '' };
      const updatedQuote = { ...currentQuote, quote: quoteVal };
      const newState = { ...prev, [itemId]: updatedQuote };
      
      // Calculate market price if unit is selected
      if (updatedQuote.unitId) {
        const unit = exchangeUnits.find(u => u.id === updatedQuote.unitId);
        if (unit) {
          const calculatedPrice = (parseFloat(quoteVal) || 0) * unit.factor;
          handlePriceChange(index, calculatedPrice.toFixed(2));
        }
      }
      return newState;
    });
  }, [exchangeUnits, handlePriceChange]);

  const handleUnitChange = useCallback((index: number, itemId: string, unitId: string) => {
    setItemQuotes(prev => {
      const currentQuote = prev[itemId] || { quote: '', unitId: '' };
      const updatedQuote = { ...currentQuote, unitId };
      const newState = { ...prev, [itemId]: updatedQuote };
      
      // Calculate market price if quote is entered
      if (updatedQuote.quote) {
        const unit = exchangeUnits.find(u => u.id === unitId);
        if (unit) {
          const calculatedPrice = (parseFloat(updatedQuote.quote) || 0) * unit.factor;
          handlePriceChange(index, calculatedPrice.toFixed(2));
        }
      }
      return newState;
    });
  }, [exchangeUnits, handlePriceChange]);

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

  const handlePartialSave = useCallback(async (itemId: string) => {
    if (!selectedContract) return;
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    
    const qtyToPrice = parseFloat(partialQty[itemId] || '0');
    const marketPrice = parseFloat(item.market_price || '0');
    
    if (qtyToPrice <= 0 || qtyToPrice > item.qty_remaining) {
      setNotification({ open: true, message: t('pricing_module.invalid_qty'), severity: 'error' });
      return;
    }
    
    if (marketPrice <= 0) {
      setNotification({ open: true, message: t('pricing_module.enter_price'), severity: 'error' });
      return;
    }
    
    try {
      const res = await api.post(`contracts/${selectedContract.id}/partial-price`, {
        item_id: itemId,
        qty_priced: qtyToPrice,
        market_price: marketPrice,
        pricing_date: pricingDate,
        version: selectedContract.version
      });
      
      setNotification({ open: true, message: t('pricing_module.save_success'), severity: 'success' });
      setPartialQty(prev => ({...prev, [itemId]: ''}));
      
      // Update local contract version
      if (res.data.version) {
        setSelectedContract((prev: any) => ({ ...prev, version: res.data.version }));
      }
      
      // Reload data
      fetchPricingHistory(selectedContract.id);
      loadPricingTree(selectedContract.id, items);
      
      if (onSaveSuccess) onSaveSuccess();
    } catch (e: any) {
      let errorMsg = t('pricing_module.save_error');
      
      if (e.response?.status === 401) {
        errorMsg = t('Session expired. Please login again.');
      } else if (e.response?.status === 409) {
        errorMsg = t('Concurrency conflict: This contract was updated by another user. Please refresh to see changes.');
      } else if (e.response?.data?.detail) {
        errorMsg = e.response.data.detail;
      }
      
      setNotification({ open: true, message: errorMsg, severity: 'error' });
    }
  }, [selectedContract, items, partialQty, pricingDate, t, fetchPricingHistory, loadPricingTree, onSaveSuccess]);

  const handleSaveAll = useCallback(async () => {
    if (!selectedContract) return;
    
    // Find all items with entries
    const itemsWithEntries = items.filter(item => {
      const qty = parseFloat(partialQty[item.id] || '0');
      const price = parseFloat(item.market_price || '0');
      return qty > 0 && price > 0;
    });

    if (itemsWithEntries.length === 0) return;

    setSavingAll(true);
    try {
      let currentVersion = selectedContract.version;
      for (const item of itemsWithEntries) {
        const res = await api.post(`contracts/${selectedContract.id}/partial-price`, {
          item_id: item.id,
          qty_priced: parseFloat(partialQty[item.id]),
          market_price: parseFloat(item.market_price),
          pricing_date: pricingDate,
          version: currentVersion
        });
        if (res.data.version) {
          currentVersion = res.data.version;
        }
      }
      
      setSelectedContract((prev: any) => ({ ...prev, version: currentVersion }));
      setNotification({ open: true, message: t('pricing_module.save_success'), severity: 'success' });
      setPartialQty({});
      fetchPricingHistory(selectedContract.id);
      loadPricingTree(selectedContract.id, items);
      if (onSaveSuccess) onSaveSuccess();
    } catch (e: any) {
      let errorMsg = t('pricing_module.save_error');
      if (e.response?.status === 409) {
        errorMsg = t('Concurrency conflict: This contract was updated by another user. Please refresh to see changes.');
      }
      setNotification({ open: true, message: errorMsg, severity: 'error' });
    } finally {
      setSavingAll(false);
    }
  }, [selectedContract, items, partialQty, pricingDate, t, fetchPricingHistory, loadPricingTree, onSaveSuccess]);

  const handleSave = useCallback(async () => {
    if (!selectedContract) return;
    
    // Check if all quantities are fully priced
    const allFullyPriced = items.every(i => i.qty_remaining === 0);
    if (!allFullyPriced) {
      setNotification({ open: true, message: t('pricing_module.all_must_be_priced'), severity: 'error' });
      return;
    }
    
    try {
      const res = await api.post(`contracts/${selectedContract.id}/approve-pricing?version=${selectedContract.version || ''}`);
      setNotification({ open: true, message: t('pricing_module.confirm_success'), severity: 'success' });
      
      if (res.data.version) {
        setSelectedContract((prev: any) => ({ ...prev, version: res.data.version }));
      }
      
      if (onSaveSuccess) onSaveSuccess();
    } catch (e: any) {
      let errorMsg = t('pricing_module.confirm_error');
      
      if (e.response?.status === 401) {
        errorMsg = t('Session expired. Please login again.');
      } else if (e.response?.status === 409) {
        errorMsg = t('Concurrency conflict: This contract was updated by another user. Please refresh to see changes.');
      }
      
      setNotification({ open: true, message: errorMsg, severity: 'error' });
    }
  }, [selectedContract, items, t, onSaveSuccess]);

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress sx={{ color: palette.primary.main }} />
    </Box>
  );

  return (
    <Container maxWidth={false} disableGutters={isEmbedded} sx={{ mt: isEmbedded ? 0 : 4, mb: 8 }}>
      {!isEmbedded && (
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box 
                sx={{ 
                  p: 1.5, 
                  background: palette.gradients.primary.main, 
                  borderRadius: '12px', 
                  color: '#fff',
                  boxShadow: boxShadows.colored.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <PriceCheck fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="700" color="text.primary" sx={{ letterSpacing: '-0.5px' }}>
                    {t('pricing_module.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('pricing_module.desc')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {activeUsers.length > 0 && (
                <Tooltip title={t('Users currently viewing/editing this contract: {{users}}', { users: activeUsers.join(', ') })}>
                  <Chip 
                    size="small"
                    icon={<EditCalendar />}
                    label={t('{{count}} other user(s) editing', { count: activeUsers.length })}
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 'bold', borderRadius: '8px' }}
                  />
                </Tooltip>
              )}
              <Chip 
                label={t("pricing_module.market_active")} 
              color="success" 
              icon={<TrendingUp sx={{ fontSize: '1rem !important' }} />} 
              variant="outlined" 
              sx={{ 
                borderRadius: '8px', 
                fontWeight: 700, 
                px: 1,
                bgcolor: alpha(palette.success.main, 0.05),
                borderColor: alpha(palette.success.main, 0.2)
              }}
            />
          </Box>
        </Box>
      )}

      <Grid2 container spacing={3}>
        <Grid2 size={{ xs: 12 }}>
           <Card 
             sx={{ 
               borderRadius: '16px', 
               boxShadow: boxShadows.md,
               border: 'none',
               mb: 3,
               overflow: 'hidden'
             }}
           >
             <CardContent sx={{ p: 2 }}>
               <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                 {!isEmbedded && (
                   <Box sx={{ flexGrow: 1, minWidth: 300 }}>
                     <Autocomplete 
                       options={contracts} 
                       getOptionLabel={(opt) => opt ? `${opt.contract_no} - ${opt.seller?.contact_name || ''}` : ''} 
                       value={selectedContract} 
                       onChange={(_, val) => handleContractSelect(val)} 
                       renderInput={(params) => (
                         <TextField 
                           {...params} 
                           size="small" 
                           placeholder={t("pricing_module.select_contract")}
                           sx={inputSx} 
                         />
                       )} 
                     />
                   </Box>
                 )}
                 
                 {selectedContract && (
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                       <EditCalendar fontSize="small" color="primary" />
                       <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
                         {t("pricing_module.pricing_date")}
                       </Typography>
                     </Box>
                     <TextField 
                       type="date" 
                       size="small" 
                       variant="standard"
                       value={pricingDate} 
                       onChange={e => setPricingDate(e.target.value)} 
                       sx={{ 
                         width: 130, 
                         '& .MuiInputBase-input': { p: '2px 0', fontSize: '0.85rem', fontWeight: 700 },
                         '& .MuiInput-underline:before': { borderBottomColor: 'transparent' },
                         '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: palette.primary.main },
                       }}
                     />
                   </Box>
                 )}
               </Box>
             </CardContent>
           </Card>

           {selectedContract ? (
             <Box>
               <Card 
                 sx={{ 
                   borderRadius: '16px', 
                   boxShadow: boxShadows.lg,
                   border: 'none',
                   overflow: 'hidden',
                   mb: 3,
                   p: 0
                 }}
               >
                 <TableContainer>
                   <Table>
                     <TableHead>
                      <TableRow>
                        <TableCell sx={{...headerSx, width: '15%'}}>{t("pricing_module.article")}</TableCell>
                        <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>{t("pricing_module.total_qty")}</TableCell>
                        <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>{t("pricing_module.priced")}</TableCell>
                        <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>{t("pricing_module.remaining")}</TableCell>
                        <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>{t("pricing_module.premium")}</TableCell>
                        <TableCell sx={{...headerSx, width: '12%', bgcolor: alpha(theme.palette.warning.main, 0.08), color: theme.palette.warning.main, textAlign: 'center'}}>{t("pricing_module.exchange_quote")}</TableCell>
                        <TableCell sx={{...headerSx, width: '12%', bgcolor: alpha(theme.palette.warning.main, 0.08), color: theme.palette.warning.main, textAlign: 'center'}}>{t("pricing_module.unit")}</TableCell>
                        <TableCell sx={{...headerSx, width: '12%', bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.main, textAlign: 'center'}}>{t("pricing_module.market_price")}</TableCell>
                        <TableCell sx={{...headerSx, width: '10%', textAlign: 'center'}}>{t("pricing_module.qty_to_price")}</TableCell>
                        <TableCell sx={{...headerSx, width: '11%', textAlign: 'center'}}>{t("pricing_module.action")}</TableCell>
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
                               <Typography variant="caption" color="text.secondary">{t("pricing_module.mt")}</Typography>
                             </TableCell>
                             <TableCell sx={{...cellSx, textAlign: 'center'}}>
                               <Typography fontWeight="bold" fontSize="0.9rem" color="success.main">{item.qty_priced.toLocaleString()}</Typography>
                               <Typography variant="caption" color="text.secondary">{t("pricing_module.mt")}</Typography>
                             </TableCell>
                             <TableCell sx={{...cellSx, textAlign: 'center'}}>
                               <Typography fontWeight="bold" fontSize="0.9rem" color={item.qty_remaining > 0 ? 'primary.main' : 'success.main'}>{item.qty_remaining.toLocaleString()}</Typography>
                               <Typography variant="caption" color="text.secondary">{t("pricing_module.mt")}</Typography>
                             </TableCell>
                             <TableCell sx={{...cellSx, textAlign: 'center'}}>
                               <Typography fontWeight="bold" fontSize="0.9rem">${item.premium}</Typography>
                             </TableCell>
                             <TableCell sx={{ p: 1, bgcolor: alpha(theme.palette.warning.main, 0.03) }}>
                               <TextField 
                                 fullWidth 
                                 size="small" 
                                 type="number" 
                                 value={itemQuotes[item.id]?.quote || ''} 
                                 onChange={e => handleQuoteChange(idx, item.id, e.target.value)} 
                                 placeholder={t("examples.marketPrice")}
                                 InputProps={{ 
                                   sx: { ...inputSx, fontWeight: 'bold' } 
                                 }} 
                                 disabled={item.qty_remaining === 0}
                               />
                             </TableCell>
                             <TableCell sx={{ p: 1, bgcolor: alpha(theme.palette.warning.main, 0.03) }}>
                               <FormControl fullWidth size="small">
                                 <Select
                                   value={itemQuotes[item.id]?.unitId || ''}
                                   onChange={e => handleUnitChange(idx, item.id, e.target.value as string)}
                                   sx={{ ...inputSx, borderRadius: '8px', fontSize: '0.75rem' }}
                                   disabled={item.qty_remaining === 0}
                                 >
                                   <MenuItem value=""><em>{t("None")}</em></MenuItem>
                                   {exchangeUnits.map(unit => (
                                     <MenuItem key={unit.id} value={unit.id} sx={{ fontSize: '0.75rem' }}>
                                       {unit.name} {unit.symbol ? `(${unit.symbol})` : ''}
                                     </MenuItem>
                                   ))}
                                 </Select>
                               </FormControl>
                             </TableCell>
                             <TableCell sx={{ p: 1, bgcolor: alpha(theme.palette.info.main, 0.03) }}>
                               <TextField 
                                 fullWidth 
                                 size="small" 
                                 type="number" 
                                 value={item.market_price} 
                                 onChange={e => handlePriceChange(idx, e.target.value)} 
                                 placeholder={t("examples.marketPrice")}
                                 InputProps={{ 
                                   startAdornment: <InputAdornment position="start" sx={{ mr: 0.2 }}><Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ fontSize: '0.7rem' }}>$</Typography></InputAdornment>, 
                                   sx: { ...inputSx, fontWeight: 'bold', color: palette.primary.main } 
                                 }} 
                                 disabled={item.qty_remaining === 0}
                               />
                             </TableCell>
                             <TableCell sx={{ p: 1 }}>
                               <TextField 
                                 fullWidth 
                                 size="small" 
                                 type="number" 
                                 value={partialQty[item.id] || ''} 
                                 onChange={e => setPartialQty({...partialQty, [item.id]: e.target.value})} 
                                 placeholder={t("examples.qtyToPrice")} 
                                 InputProps={{ 
                                   endAdornment: <InputAdornment position="end" sx={{ ml: 0.2 }}><Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{t("pricing_module.mt")}</Typography></InputAdornment>,
                                   inputProps: { min: 0, max: item.qty_remaining, step: 1 },
                                   sx: { ...inputSx, fontWeight: 'bold' }
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
                                 {t("pricing_module.price")}
                               </Button>
                             </TableCell>
                           </TableRow>
                           {pricingTree[item.id] && pricingTree[item.id].length > 0 && (
                             <TableRow>
                               <TableCell colSpan={8} sx={{ p: 0, bgcolor: alpha(theme.palette.background.default, 0.3), borderTop: `1px dashed ${theme.palette.divider}` }}>
                                 <Box sx={{ p: 2.5, pl: 5 }}>
                                   <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                     <History fontSize="small" />
                                     {t("pricing_module.history")}
                                   </Typography>
                                   <Stack spacing={1}>
                                     {pricingTree[item.id].map((pricing, i) => (
                                       <Box key={pricing.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1.5, border: `1px solid ${theme.palette.divider}` }}>
                                         <Box sx={{ minWidth: 28, height: 28, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                           <Typography variant="caption" fontWeight="bold" color="primary.main" fontSize="0.75rem">{i + 1}</Typography>
                                         </Box>
                                         <Box flexGrow={1}>
                                           <Typography variant="body2" fontWeight="bold" fontSize="0.85rem">{pricing.qty_priced.toLocaleString()} {t("pricing_module.mt")} @ ${pricing.price.toLocaleString()}/{t("pricing_module.mt")}</Typography>
                                           <Typography variant="caption" color="text.secondary" fontSize="0.7rem">{pricing.date} • {pricing.reference}</Typography>
                                         </Box>
                                         <Chip label={`$${pricing.total_value.toLocaleString()}`} size="small" color="success" variant="outlined" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }} />
                                         <Button size="small" color="error" onClick={async () => {
                                           if (await confirm({ message: t('pricing_module.delete_pricing') })) {
                                             try {
                                               await api.delete(`financial-transactions/${pricing.id}`);
                                               setNotification({ open: true, message: t('pricing_module.save_success'), severity: 'success' });
                                               fetchPricingHistory(selectedContract.id);
                                               loadPricingTree(selectedContract.id, items);
                                             } catch (e) {
                                               setNotification({ open: true, message: 'Error deleting', severity: 'error' });
                                             }
                                           }
                                         }}>{t('Delete')}</Button>
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

               <Card 
                 sx={{ 
                   borderRadius: '16px', 
                   boxShadow: boxShadows.md,
                   border: 'none',
                   mb: 3,
                   bgcolor: palette.mode === 'light' ? alpha(palette.background.paper, 0.8) : alpha(palette.background.paper, 0.6),
                   backdropFilter: 'blur(10px)'
                 }}
               >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={2}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Box sx={{ p: 1, bgcolor: alpha(palette.primary.main, 0.1), borderRadius: '8px', color: palette.primary.main }}>
                        <Assessment fontSize="small" />
                      </Box>
                      <Typography variant="subtitle1" fontWeight="700" color="text.primary">
                        {t('pricing_module.summary')}
                      </Typography>
                    </Box>
                    
                    <Box display="flex" flexWrap="wrap" gap={4} alignItems="center">
                      <Box>
                        <Typography variant="caption" fontWeight="700" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>
                          {t('pricing_module.total_contract_qty')}
                        </Typography>
                        <Typography variant="body2" fontWeight="700">
                          {summary.totalQty.toLocaleString()} <Typography variant="caption" fontWeight="600">{t('pricing_module.mt')}</Typography>
                        </Typography>
                      </Box>
                       <Box>
                         <Typography variant="caption" fontWeight="700" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>
                           {t('pricing_module.total_priced_qty')}
                         </Typography>
                         <Typography variant="body2" fontWeight="700" color="success.main">
                           {summary.totalPricedQty.toLocaleString()} <Typography variant="caption" fontWeight="600">{t('pricing_module.mt')}</Typography>
                         </Typography>
                       </Box>
                       <Box>
                         <Typography variant="caption" fontWeight="700" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>
                           {t('pricing_module.avg_price')}
                         </Typography>
                         <Typography variant="body2" fontWeight="700">
                           ${summary.avgPrice.toLocaleString(undefined, {maximumFractionDigits:2})} <Typography variant="caption" fontWeight="600">/ {t('pricing_module.mt')}</Typography>
                         </Typography>
                       </Box>
                       <Box>
                         <Typography variant="caption" fontWeight="700" color="text.secondary" display="block" sx={{ textTransform: 'uppercase', fontSize: '0.65rem', mb: 0.5 }}>
                           {t('pricing_module.priced_value')}
                         </Typography>
                         <Typography variant="h5" fontWeight="800" color="info.main">
                           ${summary.totalValue.toLocaleString()}
                         </Typography>
                       </Box>
                     </Box>

                     <Box display="flex" gap={1.5}>
                       {items.some(i => (parseFloat(partialQty[i.id] || '0') > 0 && parseFloat(i.market_price || '0') > 0)) && (
                         <Button 
                           variant="outlined" 
                           size="small" 
                           startIcon={savingAll ? <CircularProgress size={16} /> : <PriceCheck />} 
                           onClick={handleSaveAll} 
                           disabled={savingAll}
                           sx={{ 
                             borderRadius: '8px',
                             fontWeight: 700, 
                             textTransform: 'none',
                             borderColor: palette.primary.main,
                             color: palette.primary.main,
                             '&:hover': { bgcolor: alpha(palette.primary.main, 0.05), borderColor: palette.primary.main }
                           }}
                         >
                           {t('pricing_module.save_session')}
                         </Button>
                       )}
                       <Button 
                         variant="contained" 
                         size="small" 
                         startIcon={<Send />} 
                         onClick={handleSave} 
                         sx={{ 
                           borderRadius: '8px',
                           background: palette.gradients.primary.main,
                           boxShadow: boxShadows.sm,
                           fontWeight: 700, 
                           textTransform: 'none',
                           '&:hover': { background: palette.gradients.primary.state, boxShadow: boxShadows.md }
                         }}
                       >
                         {t('pricing_module.confirm_pricing')}
                       </Button>
                     </Box>
                   </Box>
                 </CardContent>
               </Card>

               {/* ✅ Pricing History Log at the bottom */}
               <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
                 <CardContent sx={{ p: 0 }}>
                     <Box p={2} display="flex" alignItems="center" gap={1} borderBottom={`1px solid ${theme.palette.divider}`}>
                         <History fontSize="small" color="action" />
                         <Typography variant="subtitle2" fontWeight="bold">{t('pricing_module.pricing_log')}</Typography>
                     </Box>
                     <List dense>
                         {priceHistory.length > 0 ? (
                             priceHistory.map((tx, i) => (
                                 <React.Fragment key={tx.id}>
                                     <ListItem>
                                         <ListItemIcon><Receipt fontSize="small" color="primary" /></ListItemIcon>
                                         <ListItemText 
                                             primary={`${t('pricing_module.updated_value')}: $${tx.amount.toLocaleString()}`}
                                             secondary={`${tx.transaction_date} • ${tx.description}`}
                                             primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem' }}
                                             secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                         />
                                     </ListItem>
                                     {i < priceHistory.length - 1 && <Divider variant="inset" component="li" />}
                                 </React.Fragment>
                             ))
                         ) : (
                             <Box p={3} textAlign="center"><Typography variant="caption" color="text.secondary">{t('pricing_module.no_fixations')}</Typography></Box>
                         )}
                     </List>
                 </CardContent>
               </Card>
             </Box>
           ) : (<Alert severity="info" variant="outlined">{t('pricing_module.select_contract_info')}</Alert>)}
        </Grid2>
      </Grid2>
      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({...notification, open: false})}><Alert severity={notification.severity}>{notification.message}</Alert></Snackbar>
    </Container>
  );
});

export default PricingForm;