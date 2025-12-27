import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Autocomplete, TextField, Button, Container, Typography, Box, MenuItem,
  Card, CardContent, Divider, Stack, InputAdornment, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { Payment, Receipt, CheckCircle, History, Add } from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import api from '../../services/api';
import { FinancialTransaction } from '../../types/contracts';

interface PaymentFormProps { 
  contractId?: string; 
  onSaveSuccess?: () => void; 
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

// Contract Total Transaction interface
interface ContractTotalTransaction {
    id: string;
    transaction_date: string;
    type: string;
    description: string;
    reference: string;
    amount: number;
    is_credit: boolean;
    is_contract_total: boolean;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ contractId, onSaveSuccess }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [contracts, setContracts] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [history, setHistory] = useState<FinancialTransaction[]>([]); // ✅ حالة لتخزين سجل الدفعات
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const isEmbedded = !!contractId;

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
  const fetchPayments = async (cId: string, contractData?: any) => {
      try {
          const res = await api.get(`/contracts/${cId}/ledger`);
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
  };


  // Fetch bank accounts
  const fetchBankAccounts = async () => {
    try {
      const res = await api.get('/bank-accounts/');
      setBankAccounts(res.data);
    } catch (error) {
      console.error("Failed to load bank accounts", error);
    }
  };

  // Handle adding new bank account
  const handleAddBankAccount = async () => {
    if (!newBankAccount.account_name || !newBankAccount.account_number || !newBankAccount.bank_name) {
      setNotification({ open: true, message: 'Please fill in all required fields', severity: 'error' });
      return;
    }

    try {
      const res = await api.post('/bank-accounts/', newBankAccount);
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
            try {
                const res = await api.get(`/contracts/${contractId}`);
                const c = res.data;
                setContract(c);
                setFormData(prev => ({ ...prev, contract_id: c.id, contract_no: c.contract_no, contract_currency: c.contract_currency }));
                // ✅ جلب جميع الحركات المالية
                await fetchPayments(contractId);
            } catch(e) {}
        } else {
            api.get('/contracts/').then(res => setContracts(res.data));
        }
        // Fetch bank accounts
        fetchBankAccounts();
    };
    fetchData();
  }, [contractId, isEmbedded]);

  const handleContractChange = (contract: any) => {
    if(contract) {
        setFormData({ ...formData, contract_id: contract.id, contract_no: contract.contract_no, contract_currency: contract.contract_currency || 'USD' });
        fetchPayments(contract.id); // جلب السجل عند اختيار العقد
    }
  };

  const calculatedValue = (parseFloat(formData.amount) || 0) * (parseFloat(formData.exchange_rate) || 1);

  const handleSave = async () => {
    if (!formData.contract_id || !formData.amount) {
        setNotification({ open: true, message: 'Required fields missing', severity: 'error' });
        return;
    }

    try {
        // Generate a professional reference if not provided
        const finalReference = formData.ref_id || `PAY-${formData.contract_no || 'TEMP'}-${new Date().getTime().toString().slice(-4)}`;

        // ✅ إرسال الدفعة للباك إند
        await api.post('/payments', {
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
        if (formData.contract_id) {
            await fetchPayments(formData.contract_id);
            // No need to fetch contract total again as it hasn't changed
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
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box p={1.5} bgcolor={alpha(theme.palette.success.main, 0.1)} borderRadius={2} color="success.main"><Payment fontSize="large" /></Box>
            <Box><Typography variant="h4" fontWeight="800" color="text.primary">{t('Register Payment')}</Typography></Box>
        </Box>
      )}

      <Grid container spacing={3}>
        
        {/* 1. Payment Entry Form */}
        <Grid size={{ xs: 12, lg: 8 }}>
           <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
             <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight="700" sx={{ mb: 3 }}>New Payment Entry</Typography>
                <Grid container spacing={3}>
                  {!isEmbedded && (<Grid size={{ xs: 12 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">SELECT CONTRACT</Typography><Autocomplete options={contracts} getOptionLabel={(opt) => opt.contract_no} onChange={(_, val) => handleContractChange(val)} renderInput={(params) => <TextField {...params} size="small" />} /></Grid>)}
                  <Grid size={{ xs: 12, md: 6 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">DATE</Typography><TextField type="date" fullWidth size="small" value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} /></Grid>
                  <Grid size={{ xs: 12, md: 6 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">METHOD</Typography><TextField select fullWidth size="small" value={formData.payment_method} onChange={e => setFormData({...formData, payment_method: e.target.value})}>{['Bank Transfer', 'Cheque', 'Cash'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}</TextField></Grid>
                  <Divider sx={{ width: '100%' }} />
                  <Grid size={{ xs: 12, md: 4 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">AMOUNT</Typography><TextField type="number" fullWidth size="small" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} InputProps={{ sx: { fontWeight: 'bold', color: 'primary.main' } }} /></Grid>
                  <Grid size={{ xs: 12, md: 4 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">CURRENCY</Typography><TextField select fullWidth size="small" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>{['USD', 'EUR', 'SAR', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField></Grid>
                  <Grid size={{ xs: 12, md: 4 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">EXCHANGE RATE</Typography><TextField type="number" fullWidth size="small" value={formData.exchange_rate} onChange={e => setFormData({...formData, exchange_rate: e.target.value})} /></Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">BANK ACCOUNT</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Autocomplete
                        options={bankAccounts}
                        getOptionLabel={(option) => `${option.account_name} - ${option.account_number} (${option.bank_name})`}
                        value={bankAccounts.find(acc => acc.id === formData.bank_account_id) || null}
                        onChange={(_, value) => setFormData({...formData, bank_account_id: value?.id || ''})}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Select bank account"
                            fullWidth
                          />
                        )}
                        sx={{ flex: 1 }}
                      />
                      <Tooltip title="Add new bank account">
                        <IconButton
                          onClick={() => setAddBankDialogOpen(true)}
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                          }}
                        >
                          <Add color="primary" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary">LINK TO INVOICE (OPTIONAL)</Typography>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      value={formData.linked_transaction_id}
                      onChange={e => setFormData({...formData, linked_transaction_id: e.target.value})}
                      placeholder="Select an invoice"
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {history.filter(t => t.type === 'Invoice').map(inv => (
                        <MenuItem key={inv.id} value={inv.id}>
                          {inv.reference} ({inv.transaction_date}) - {inv.amount.toLocaleString()} {formData.contract_currency}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 12 }}><Typography variant="caption" fontWeight="bold" color="text.secondary">PAYMENT REFERENCE / NOTES</Typography><TextField fullWidth size="small" value={formData.ref_id} onChange={e => setFormData({...formData, ref_id: e.target.value})} placeholder="e.g. PAY-2025-001 or bank confirmation number" /></Grid>
                </Grid>

                {/* Payment History Table - Integrated into the same card */}
                <Divider sx={{ my: 3 }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <History fontSize="small" color="action" />
                  <Typography variant="h6" fontWeight="bold">Transaction Ledger</Typography>
                </Box>
                <TableContainer sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Reference</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Description</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Financial Transactions */}
                      {history.length > 0 ? (
                        history.map((row: FinancialTransaction) => (
                          <TableRow key={row.id} hover>
                            <TableCell sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{row.transaction_date}</TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}>{row.reference}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontSize: '1.2rem' }}>
                                {row.type === 'Invoice' ? '⚡' : '💸'}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>
                              {row.type === 'Invoice' ? `Invoice: ${row.reference.split('-')[1] || row.reference}` : 'Payment'}
                              {row.linked_transaction_id && (
                                <Typography variant="caption" display="block" color="primary.main" sx={{ fontWeight: 'bold' }}>
                                  Linked to: {history.find(h => h.id === row.linked_transaction_id)?.reference || 'Invoice'}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${row.is_credit ? '-' : '+'}${row.amount.toLocaleString()} ${formData.contract_currency}`}
                                size="small"
                                sx={{
                                  bgcolor: alpha(row.is_credit ? theme.palette.success.main : theme.palette.error.main, 0.1),
                                  color: row.is_credit ? 'success.main' : 'error.main',
                                  fontWeight: 'bold',
                                  borderRadius: 1
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                            <Typography color="text.secondary">No transactions recorded yet.</Typography>
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
           <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.6), borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                 <Box display="flex" alignItems="center" gap={1} mb={3} color="text.primary"><Receipt /><Typography variant="h6" fontWeight="bold">Payment Details</Typography></Box>
                 <Stack spacing={2} sx={{ mb: 4 }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.grey[400], 0.1), p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.grey[300] || theme.palette.divider, 0.3)}` }}>
                       <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>CONTRACT</Typography>
                          <Typography variant="body1" fontWeight="600" color="text.primary">{formData.contract_no || '-'}</Typography>
                       </Box>
                    </Box>
                    <Box sx={{ bgcolor: alpha(theme.palette.grey[400], 0.1), p: 2, borderRadius: 2, border: `1px solid ${alpha(theme.palette.grey[300] || theme.palette.divider, 0.3)}` }}>
                       <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>CURRENCY</Typography>
                          <Typography variant="body1" fontWeight="600" color="primary.main">{formData.contract_currency || 'USD'}</Typography>
                       </Box>
                    </Box>
                    {/* Payment Amount */}
                    <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), p: 2, borderRadius: 2, border: `1px dashed ${alpha(theme.palette.info.main, 0.3)}` }}>
                       <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'bold' }}>PAYMENT AMOUNT</Typography>
                          <Box textAlign="right">
                            <Typography variant="h4" fontWeight="800" color="info.main">{calculatedValue.toLocaleString()}</Typography>
                            <Typography variant="caption" color="info.main">{formData.contract_currency}</Typography>
                          </Box>
                       </Box>
                    </Box>
                 </Stack>
                 <Button fullWidth variant="contained" size="large" onClick={handleSave} startIcon={<CheckCircle />} sx={{ py: 1.5, fontWeight: 'bold' }}>Confirm Payment</Button>
              </CardContent>
           </Card>
        </Grid>

      </Grid>

      {/* Bank Account Dialog */}
      <Dialog open={addBankDialogOpen} onClose={() => setAddBankDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Bank Account</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">ACCOUNT NAME *</Typography>
              <TextField
                fullWidth
                size="small"
                value={newBankAccount.account_name}
                onChange={e => setNewBankAccount({...newBankAccount, account_name: e.target.value})}
                placeholder="Enter account name"
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">ACCOUNT NUMBER *</Typography>
              <TextField
                fullWidth
                size="small"
                value={newBankAccount.account_number}
                onChange={e => setNewBankAccount({...newBankAccount, account_number: e.target.value})}
                placeholder="Enter account number"
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">BANK NAME *</Typography>
              <TextField
                fullWidth
                size="small"
                value={newBankAccount.bank_name}
                onChange={e => setNewBankAccount({...newBankAccount, bank_name: e.target.value})}
                placeholder="Enter bank name"
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">BRANCH</Typography>
              <TextField
                fullWidth
                size="small"
                value={newBankAccount.branch}
                onChange={e => setNewBankAccount({...newBankAccount, branch: e.target.value})}
                placeholder="Enter branch name"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">CURRENCY</Typography>
              <TextField
                select
                fullWidth
                size="small"
                value={newBankAccount.currency}
                onChange={e => setNewBankAccount({...newBankAccount, currency: e.target.value})}
              >
                {['USD', 'EUR', 'SAR', 'AED', 'GBP'].map(c => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">SWIFT CODE</Typography>
              <TextField
                fullWidth
                size="small"
                value={newBankAccount.swift_code}
                onChange={e => setNewBankAccount({...newBankAccount, swift_code: e.target.value})}
                placeholder="Enter SWIFT code"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary">IBAN</Typography>
              <TextField
                fullWidth
                size="small"
                value={newBankAccount.iban}
                onChange={e => setNewBankAccount({...newBankAccount, iban: e.target.value})}
                placeholder="Enter IBAN"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddBankDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddBankAccount} variant="contained" color="primary">
            Add Bank Account
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({...notification, open: false})}><Alert severity={notification.severity} variant="filled" sx={{ width: '100%' }}>{notification.message}</Alert></Snackbar>
    </Container>
  );
};

export default PaymentForm;