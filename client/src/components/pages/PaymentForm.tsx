import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Autocomplete, TextField, Button, Container, Typography, Box, MenuItem,
  Card, CardContent, Divider, Stack, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Payment, Receipt, CheckCircle, History, Add } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import api from '../../services/api';
import SectionHeader from '../common/SectionHeader';
import { Contract, FinancialTransaction } from '../../types/contracts';

interface PaymentFormProps {
  contractId?: string;
  isEmbedded?: boolean;
  ledger?: FinancialTransaction[];
  onSaveSuccess?: () => void;
  onRefresh?: () => void;
}

// BankAccount interface
interface BankAccount {
    id: string;
    account_name: string;
    account_number: string;
    bank_name: string;
    currency: string;
    branch?: string;
    swift_code?: string;
    iban?: string;
    created_at: string;
}

const PaymentForm: React.FC<PaymentFormProps> = memo(({ contractId, ledger: propsLedger, onSaveSuccess, onRefresh }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { palette, boxShadows }: any = theme;
  const [contracts, setContracts] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [history, setHistory] = useState<FinancialTransaction[]>([]); 
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const isEmbedded = !!contractId;
  const isImportContract = useMemo(() => contract?.direction === 'import', [contract]);

  const [formData, setFormData] = useState({
    contract_id: contractId || '',
    contract_no: '',
    contract_currency: 'USD',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'USD',
    exchange_rate: '1',
    payment_method: 'Bank Transfer',
    bank_account_id: '',
    ref_id: '',
    remarks: '',
    linked_transaction_id: ''
  });

  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [addBankDialogOpen, setAddBankDialogOpen] = useState(false);
  const [newBankAccount, setNewBankAccount] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
    currency: 'USD',
    branch: '',
    swift_code: '',
    iban: ''
  });


  // --- Fetch Data ---
  const fetchPayments = useCallback(async (cId: string, contractData?: any) => {
      if (propsLedger) {
          const payments = propsLedger.filter(t => t.type === 'Payment').slice(-10);
          setHistory(payments);
          return;
      }
      try {
          const res = await api.get(`contracts/${cId}/ledger`);
          const rawLedger: any[] = res.data;
          
          const currentContract = contractData || contract;
          let currentTotal = 0;
          if (currentContract) {
              currentTotal = currentContract.items?.reduce((sum: number, item: any) => sum + (parseFloat(item.total) || 0), 0) || 0;
          }

          let processedLedger: FinancialTransaction[] = rawLedger.map(item => {
              let debit = 0;
              let credit = 0;

              // Use the is_credit flag directly for correct accounting
              debit = item.is_credit ? 0 : item.amount;
              credit = item.is_credit ? item.amount : 0;

              return { ...item, debit, credit };
          });

          // Ensure the contract value (Invoice) is represented if no invoices exist
          const isImportContract = currentContract?.direction === 'import';
          if (isImportContract && currentTotal > 0) {
              const hasAnyInvoice = processedLedger.some(t => t.type === 'Invoice');
              
              if (!hasAnyInvoice) {
                  const contractInvoice = {
                      id: 'contract-invoice',
                      transaction_date: currentContract?.issue_date || new Date().toISOString().split('T')[0],
                      type: 'Invoice',
                      description: `Contract Invoice - Total Contract Value (${currentContract?.contract_no})`,
                      reference: `INV-${currentContract?.contract_no || 'TEMP'}`,
                      amount: currentTotal,
                      is_credit: false,
                      debit: currentTotal,
                      credit: 0
                  };
                  processedLedger = [contractInvoice, ...processedLedger];
              }
          }

          // Recalculate running balances from 0
          processedLedger.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

          let runningBalance = 0;
          processedLedger = processedLedger.map((item) => {
              runningBalance += (item.debit || 0) - (item.credit || 0);
              return { ...item, balance: runningBalance };
          });

          // Limit to last 10 transactions for Payments page
          const recentTransactions = processedLedger.slice(-10);
          setHistory(recentTransactions);
      } catch (error) {
          console.error("Failed to load transactions", error);
      }
  }, [propsLedger, contract]);


  // Fetch bank accounts
  const loadBankAccounts = React.useCallback(async () => {
    try {
      const res = await api.get('bank-accounts/');
      setBankAccounts(res.data);
    } catch (error) {
      console.error("Failed to load bank accounts", error);
    }
  }, []);

  // Handle adding new bank account
  const handleAddBankAccount = async () => {
    if (!newBankAccount.account_name || !newBankAccount.account_number || !newBankAccount.bank_name) {
      setNotification({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const res = await api.post('bank-accounts/', newBankAccount);
      setBankAccounts([...bankAccounts, res.data]);
      setFormData(prev => ({ ...prev, bank_account_id: res.data.id }));
      setAddBankDialogOpen(false);
      setNewBankAccount({
        account_name: '',
        account_number: '',
        bank_name: '',
        currency: 'USD',
        branch: '',
        swift_code: '',
        iban: ''
      });
      setNotification({ open: true, message: 'Bank account added successfully', severity: 'success' });
    } catch (error: any) {
      console.error("Failed to add bank account", error);
      const errorMessage = error.response?.data?.detail || 'Failed to add bank account';
      setNotification({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
        if (isEmbedded && contractId) {
            if (propsLedger) {
                const payments = propsLedger.filter(t => t.type === 'Payment').slice(-10);
                setHistory(payments);
            } else {
                try {
                    const res = await api.get(`contracts/${contractId}`);
                    const data = res.data;
                    setContract(data);
                    setFormData(prev => ({ ...prev, contract_id: data.id, contract_no: data.contract_no, contract_currency: data.contract_currency }));
                    // ✅ جلب جميع الحركات المالية
                    await fetchPayments(contractId, data);
                } catch(e) {}
            }
        } else {
            api.get('contracts/').then(res => setContracts(res.data));
        }
        // Fetch bank accounts
        loadBankAccounts();
    };
    fetchData();
  }, [contractId, isEmbedded, propsLedger, fetchPayments, loadBankAccounts]);

  const handleContractChange = (contract: Contract | null) => {
    if(contract) {
        setFormData({ ...formData, contract_id: contract.id, contract_no: contract.contract_no, contract_currency: contract.contract_currency || 'USD' });
        fetchPayments(contract.id); // جلب السجل عند اختيار العقد
    }
  };

  const calculatedValue = (parseFloat(formData.amount) || 0) * (parseFloat(formData.exchange_rate) || 1);

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

  const handleSave = async () => {
    if (!formData.contract_id || !formData.amount || !formData.bank_account_id) {
        setNotification({ open: true, message: 'Contract, Amount and Bank Account are required', severity: 'error' });
        return;
    }

    try {
        // Generate a professional reference if not provided
        const finalReference = formData.ref_id || `PAY-${formData.contract_no || 'TEMP'}-${new Date().getTime().toString().slice(-4)}`;

        // ✅ إرسال الدفعة للباك إند
        await api.post('payments', {
            contract_id: formData.contract_id,
            payment_date: formData.payment_date,
            amount: parseFloat(formData.amount),
            currency: formData.currency,
            exchange_rate: parseFloat(formData.exchange_rate),
            payment_method: formData.payment_method,
            bank_account_id: formData.bank_account_id,
            reference: finalReference,
            description: formData.remarks || `Payment for contract ${formData.contract_no}`,
            linked_transaction_id: formData.linked_transaction_id || null
        });
        
        // ✅ تحديث الواجهة بعد نجاح الإرسال
        setNotification({ open: true, message: 'Payment registered successfully', severity: 'success' });
        
        // تحديث السجل وإعادة تعيين النموذج
        if (onRefresh) {
            onRefresh();
        } else if (formData.contract_id) {
            await fetchPayments(formData.contract_id);
        }
        
        if (onSaveSuccess) onSaveSuccess(); // لتحديث التابات الأخرى (SOA)
        
        setFormData(prev => ({ ...prev, amount: '', ref_id: '', remarks: '', linked_transaction_id: '' }));

    } catch (error) {
        console.error("Failed to register payment", error);
        setNotification({ open: true, message: 'Failed to register payment', severity: 'error' });
    }
  };

  return (
    <Container maxWidth={false} disableGutters={isEmbedded} sx={{ mt: isEmbedded ? 0 : 4, mb: 8 }}>
      
      {/* Header for Standalone Mode */}
      {!isEmbedded && (
        <Box 
          sx={{ 
            mb: 4, 
            p: 3, 
            borderRadius: '16px', 
            background: palette.gradients.success.main,
            boxShadow: boxShadows.colored.success,
            display: 'flex', 
            alignItems: 'center', 
            gap: 3,
            color: '#fff'
          }}
        >
            <Box 
              sx={{ 
                p: 2, 
                bgcolor: 'rgba(255, 255, 255, 0.2)', 
                borderRadius: '12px', 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)'
              }}
            >
              <Payment fontSize="large" sx={{ fontSize: 40 }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight="700" color="inherit" sx={{ letterSpacing: '-1px', mb: 0.5 }}>
                {t('Register Payment')}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 500 }}>
                {t('Track and manage financial transactions for your contracts')}
              </Typography>
            </Box>
        </Box>
      )}

      <Grid container spacing={3}>
        
        {/* 1. Payment Entry Form */}
        <Grid size={{ xs: 12, lg: 8 }}>
           <Card 
             sx={{ 
               borderRadius: '16px', 
               boxShadow: boxShadows.md,
               border: 'none',
               bgcolor: palette.mode === 'light' ? alpha(palette.background.paper, 0.8) : alpha(palette.background.paper, 0.6),
               backdropFilter: 'blur(10px)',
               overflow: 'visible'
             }}
           >
             <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                  <Box sx={{ p: 1, bgcolor: alpha(palette.primary.main, 0.1), borderRadius: '8px', color: palette.primary.main }}>
                    <Payment fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight="700">
                    {t('New Payment Entry')}
                  </Typography>
                </Box>

                <Grid container spacing={2.5}>
                  {!isEmbedded && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                        {t('contracts.select_contract')}
                      </Typography>
                      <Autocomplete 
                        options={contracts} 
                        getOptionLabel={(opt) => opt?.contract_no || ''} 
                        onChange={(_, val) => handleContractChange(val)} 
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
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('DATE')}
                    </Typography>
                    <TextField 
                      type="date" 
                      fullWidth 
                      size="small" 
                      value={formData.payment_date} 
                      onChange={e => setFormData({...formData, payment_date: e.target.value})} 
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('METHOD')}
                    </Typography>
                    <TextField 
                      select 
                      fullWidth 
                      size="small" 
                      value={formData.payment_method} 
                      onChange={e => setFormData({...formData, payment_method: e.target.value})}
                      sx={inputSx}
                    >
                      {['Bank Transfer', 'Cheque', 'Cash'].map(m => <MenuItem key={m} value={m}>{t(m)}</MenuItem>)}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('AMOUNT')}
                    </Typography>
                    <TextField 
                      type="number" 
                      fullWidth 
                      size="small" 
                      placeholder={t("examples.amount")}
                      value={formData.amount} 
                      onChange={e => setFormData({...formData, amount: e.target.value})} 
                      InputProps={{ sx: { fontWeight: '700', color: palette.primary.main, borderRadius: '8px' } }} 
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('CURRENCY')}
                    </Typography>
                    <TextField 
                      select 
                      fullWidth 
                      size="small" 
                      value={formData.currency} 
                      onChange={e => setFormData({...formData, currency: e.target.value})}
                      sx={inputSx}
                    >
                      {['USD', 'EUR', 'SAR', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('EXCHANGE RATE')}
                    </Typography>
                    <TextField 
                      type="number" 
                      fullWidth 
                      size="small" 
                      value={formData.exchange_rate} 
                      onChange={e => setFormData({...formData, exchange_rate: e.target.value})} 
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('BANK ACCOUNT')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Autocomplete
                        options={bankAccounts}
                        getOptionLabel={(option) => option ? `${option.account_name} - ${option.account_number} (${option.bank_name})` : ''}
                        value={bankAccounts.find(acc => acc.id === formData.bank_account_id) || null}
                        onChange={(_, value) => setFormData({...formData, bank_account_id: value?.id || ''})}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder={t("Select bank account")}
                            fullWidth
                            sx={inputSx}
                          />
                        )}
                        sx={{ flex: 1 }}
                      />
                      <Tooltip title={t("Add new bank account")}>
                        <IconButton
                          onClick={() => setAddBankDialogOpen(true)}
                          sx={{
                            borderRadius: '8px',
                            bgcolor: alpha(palette.primary.main, 0.1),
                            color: palette.primary.main,
                            height: 40,
                            width: 40,
                            '&:hover': { bgcolor: alpha(palette.primary.main, 0.2) }
                          }}
                        >
                          <Add />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('LINK TO INVOICE (OPTIONAL)')}
                    </Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={formData.linked_transaction_id}
                      onChange={e => setFormData({...formData, linked_transaction_id: e.target.value})}
                      sx={inputSx}
                    >
                      <MenuItem value=""><em>{t('None')}</em></MenuItem>
                      {history.filter(t => t.type === 'Invoice').map(inv => (
                        <MenuItem key={inv.id} value={inv.id}>
                          {inv.reference} ({inv.transaction_date}) - {inv.amount.toLocaleString()} {formData.contract_currency}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('REFERENCE / RECEIPT NO')}
                    </Typography>
                    <TextField 
                      fullWidth 
                      size="small" 
                      placeholder={t("examples.refId")}
                      value={formData.ref_id} 
                      onChange={e => setFormData({...formData, ref_id: e.target.value})} 
                      sx={inputSx}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase' }}>
                      {t('REMARKS / DESCRIPTION')}
                    </Typography>
                    <TextField 
                      fullWidth 
                      size="small" 
                      placeholder={t("examples.remarks")}
                      value={formData.remarks} 
                      onChange={e => setFormData({...formData, remarks: e.target.value})} 
                      sx={inputSx}
                    />
                  </Grid>
                </Grid>

                {/* Transaction Ledger */}
                <Divider sx={{ my: 4 }} />
                
                <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                  <Box sx={{ p: 1, bgcolor: alpha(palette.info.main, 0.1), borderRadius: '8px', color: palette.info.main }}>
                    <History fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight="700">
                    {t('Recent Transactions')}
                  </Typography>
                </Box>

                <TableContainer 
                  sx={{ 
                    borderRadius: '12px', 
                    border: `1px solid ${alpha(palette.divider, 0.1)}`,
                    bgcolor: palette.mode === 'light' ? alpha('#fff', 0.5) : alpha(palette.background.paper, 0.2)
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `1px solid ${palette.divider}` }}>{t('Date')}</TableCell>
                        <TableCell sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `1px solid ${palette.divider}` }}>{t('Reference')}</TableCell>
                        <TableCell sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `1px solid ${palette.divider}` }}>{t('Type')}</TableCell>
                        <TableCell sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `1px solid ${palette.divider}` }}>{t('Description')}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: '700', color: 'text.secondary', borderBottom: `1px solid ${palette.divider}` }}>{t('Amount')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.length > 0 ? (
                        history.map((row: FinancialTransaction) => (
                          <TableRow key={row.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ py: 1.5, fontFamily: 'monospace', color: 'text.primary' }}>{row.transaction_date}</TableCell>
                            <TableCell sx={{ py: 1.5, fontFamily: 'monospace', color: palette.primary.main, fontWeight: 700 }}>{row.reference}</TableCell>
                            <TableCell sx={{ py: 1.5 }}>
                              <Box 
                                sx={{ 
                                  width: 32, 
                                  height: 32, 
                                  borderRadius: '8px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  bgcolor: alpha(row.type === 'Invoice' ? palette.warning.main : palette.success.main, 0.1),
                                  color: row.type === 'Invoice' ? palette.warning.main : palette.success.main
                                }}
                              >
                                {row.type === 'Invoice' ? <Receipt fontSize="small" /> : <Payment fontSize="small" />}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1.5, color: 'text.secondary' }}>
                              <Typography variant="body2" fontWeight="600">
                                {row.type === 'Invoice' 
                                  ? `${t('Invoice')}: ${row.reference?.includes('-') ? row.reference.split('-')[1] : (row.reference || 'N/A')}` 
                                  : t('Payment Registration')}
                              </Typography>
                              {row.linked_transaction_id && (
                                <Typography variant="caption" display="block" color="primary.main" sx={{ fontWeight: '700' }}>
                                  {t('Linked to')}: {history.find(h => h.id === row.linked_transaction_id)?.reference || t('Invoice')}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ py: 1.5 }}>
                              <Chip
                                label={`${(isImportContract ? !row.is_credit : row.is_credit) ? '-' : '+'}${row.amount.toLocaleString()} ${formData.contract_currency}`}
                                size="small"
                                sx={{
                                  bgcolor: alpha(row.is_credit ? palette.success.main : palette.error.main, 0.1),
                                  color: row.is_credit ? palette.success.main : palette.error.main,
                                  fontWeight: '700',
                                  borderRadius: '6px',
                                  height: '24px'
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                            <Typography color="text.secondary">{t('No transactions recorded yet.')}</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
             </CardContent>
           </Card>
        </Grid>

        {/* 2. Summary Card */}
        <Grid size={{ xs: 12, lg: 4 }}>
           <Card 
             sx={{ 
               borderRadius: '16px', 
               boxShadow: boxShadows.md,
               bgcolor: palette.mode === 'light' ? alpha(palette.background.paper, 0.8) : alpha(palette.background.paper, 0.6),
               backdropFilter: 'blur(10px)',
               border: 'none',
               position: 'sticky',
               top: 24
             }}
           >
              <CardContent sx={{ p: 3 }}>
                 <Box display="flex" alignItems="center" gap={1.5} mb={4}>
                    <Box sx={{ p: 1, bgcolor: alpha(palette.primary.main, 0.1), borderRadius: '8px', color: palette.primary.main }}>
                      <Receipt fontSize="small" />
                    </Box>
                    <Typography variant="h6" fontWeight="700">
                      {t('Payment Summary')}
                    </Typography>
                 </Box>

                 <Stack spacing={3}>
                    <Box 
                      sx={{ 
                        p: 2.5, 
                        borderRadius: '12px', 
                        bgcolor: alpha(palette.primary.main, 0.03),
                        border: `1px solid ${alpha(palette.primary.main, 0.1)}`
                      }}
                    >
                       <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                          {t('Payment Amount')}
                       </Typography>
                       <Box display="flex" justifyContent="space-between" alignItems="baseline">
                          <Typography variant="h3" fontWeight="800" color="primary.main">
                            {(parseFloat(formData.amount) || 0).toLocaleString()}
                          </Typography>
                          <Typography variant="h6" fontWeight="700" color="text.secondary">
                            {formData.currency}
                          </Typography>
                       </Box>
                    </Box>

                    {parseFloat(formData.exchange_rate) !== 1 && (
                      <Box 
                        sx={{ 
                          p: 2, 
                          borderRadius: '12px', 
                          bgcolor: alpha(palette.warning.main, 0.03),
                          border: `1px dashed ${alpha(palette.warning.main, 0.2)}`
                        }}
                      >
                         <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>
                            {t('Value in Contract Currency')}
                         </Typography>
                         <Box display="flex" justifyContent="space-between" alignItems="baseline">
                            <Typography variant="h4" fontWeight="800" color="warning.main">
                              {calculatedValue.toLocaleString()}
                            </Typography>
                            <Typography variant="h6" fontWeight="700" color="text.secondary">
                              {formData.contract_currency}
                            </Typography>
                         </Box>
                      </Box>
                    )}

                    <Divider />

                    <Box>
                      <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', mb: 2, display: 'block' }}>
                        {t('Transaction Details')}
                      </Typography>
                      <Stack spacing={2}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">{t('Method')}:</Typography>
                          <Typography variant="body2" fontWeight="700">{t(formData.payment_method)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">{t('Date')}:</Typography>
                          <Typography variant="body2" fontWeight="700">{formData.payment_date}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">{t('Bank')}:</Typography>
                          <Typography variant="body2" fontWeight="700">
                            {bankAccounts.find(a => a.id === formData.bank_account_id)?.bank_name || '-'}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    <Button 
                      fullWidth 
                      variant="contained" 
                      size="large" 
                      startIcon={<CheckCircle />} 
                      onClick={handleSave}
                      disabled={!formData.contract_id || !formData.amount}
                      sx={{ 
                        mt: 2,
                        py: 1.5,
                        borderRadius: '12px',
                        background: palette.gradients.primary.main,
                        boxShadow: boxShadows.colored.primary,
                        fontWeight: '700',
                        fontSize: '1rem',
                        '&:hover': {
                          background: palette.gradients.primary.state,
                          boxShadow: boxShadows.md
                        },
                        '&.Mui-disabled': {
                          background: palette.grey[300],
                          color: palette.grey[500]
                        }
                      }}
                    >
                      {t('Register Payment')}
                    </Button>
                 </Stack>
              </CardContent>
           </Card>
        </Grid>

      </Grid>
      
      {/* Add Bank Account Dialog */}
      <Dialog 
        open={addBankDialogOpen} 
        onClose={() => setAddBankDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: '16px', boxShadow: boxShadows.lg, width: '100%', maxWidth: '500px' }
        }}
      >
        <DialogTitle sx={{ fontWeight: '700', pb: 1 }}>{t('Add New Bank Account')}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField 
              label={t("Account Name")} 
              fullWidth 
              size="small" 
              value={newBankAccount.account_name} 
              onChange={e => setNewBankAccount({...newBankAccount, account_name: e.target.value})}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            <TextField 
              label={t("Account Number")} 
              fullWidth 
              size="small" 
              value={newBankAccount.account_number} 
              onChange={e => setNewBankAccount({...newBankAccount, account_number: e.target.value})}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            <TextField 
              label={t("Bank Name")} 
              fullWidth 
              size="small" 
              value={newBankAccount.bank_name} 
              onChange={e => setNewBankAccount({...newBankAccount, bank_name: e.target.value})}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  select 
                  label={t("Currency")} 
                  fullWidth 
                  size="small" 
                  value={newBankAccount.currency} 
                  onChange={e => setNewBankAccount({...newBankAccount, currency: e.target.value})}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                >
                  {['USD', 'EUR', 'SAR', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField 
                  label={t("Branch")} 
                  fullWidth 
                  size="small" 
                  value={newBankAccount.branch} 
                  onChange={e => setNewBankAccount({...newBankAccount, branch: e.target.value})}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
              </Grid>
            </Grid>
            <TextField 
              label={t("SWIFT/BIC Code")} 
              fullWidth 
              size="small" 
              value={newBankAccount.swift_code} 
              onChange={e => setNewBankAccount({...newBankAccount, swift_code: e.target.value})}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
            <TextField 
              label={t("IBAN")} 
              fullWidth 
              size="small" 
              value={newBankAccount.iban} 
              onChange={e => setNewBankAccount({...newBankAccount, iban: e.target.value})}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={() => setAddBankDialogOpen(false)} 
            sx={{ borderRadius: '8px', fontWeight: '700', textTransform: 'none', color: 'text.secondary' }}
          >
            {t('Cancel')}
          </Button>
          <Button 
            onClick={handleAddBankAccount} 
            variant="contained" 
            sx={{ 
              borderRadius: '8px', 
              fontWeight: '700', 
              textTransform: 'none',
              background: palette.gradients.primary.main,
              boxShadow: boxShadows.colored.primary,
              '&:hover': { background: palette.gradients.primary.state }
            }}
          >
            {t('Save Account')}
          </Button>
        </DialogActions>
      </Dialog>

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

export default PaymentForm;