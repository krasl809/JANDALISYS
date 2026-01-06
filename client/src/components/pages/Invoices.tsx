import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Button, Card, CardContent, Typography,
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select, Alert, Snackbar,
  LinearProgress, Tooltip, Grid, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import Grid2 from '@mui/material/Grid2';
import {
  Receipt, Add, CloudUpload, Delete,
  Print,
  AttachFile
} from '@mui/icons-material';
import { useTheme, alpha } from '@mui/material/styles';
import api from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';

interface InvoicesProps { contractId?: string; }

interface Invoice {
  id: string;
  transaction_date: string;
  type: string;
  description?: string;
  reference?: string;
  amount: number;
  is_credit: boolean;
  contract_id?: string;
  linked_transaction_id?: string;
}

interface Contract {
  id: string;
  contract_no: string;
  contract_currency: string;
  direction: string;
}

const Invoices: React.FC<InvoicesProps> = ({ contractId }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { confirm } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    contract_id: contractId || '',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    reference: '',
    external_invoice_url: '',
    external_invoice_number: ''
  });

  // Notification
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Load data
  useEffect(() => {
    loadInvoices();
    if (!contractId) {
      loadContracts();
    }
  }, [contractId]);

  const loadInvoices = async () => {
    try {
      setLoading(true);

      if (contractId) {
        // If we have a contract ID, get invoices from contract ledger
        const response = await api.get(`contracts/${contractId}/ledger`);
        const ledger = response.data;
        // Filter for invoice transactions
        const invoiceTransactions = ledger.filter((transaction: any) => transaction.type === 'Invoice');
        setInvoices(invoiceTransactions);
      } else {
        // If no contract ID, we need to get all contracts and their invoices
        // For now, show empty list - this would need a backend endpoint to get all invoices
        setInvoices([]);
      }
    } catch (error) {
      console.error('Failed to load invoices:', error);
      setNotification({
        open: true,
        message: 'Failed to load invoices',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      const response = await api.get('contracts/');
      setContracts(response.data);
    } catch (error) {
      console.error('Failed to load contracts:', error);
    }
  };

  const handleCreateInvoice = async () => {
    if (!formData.contract_id || !formData.amount) {
      setNotification({
        open: true,
        message: 'Contract and amount are required',
        severity: 'error'
      });
      return;
    }

    try {
      const invoiceData = {
        transaction_date: formData.transaction_date,
        type: 'Invoice',
        description: formData.description || `Manual invoice for contract`,
        reference: formData.reference || `INV-${Date.now()}`,
        amount: parseFloat(formData.amount),
        is_credit: false, // Invoices are debits (amounts owed)
        contract_id: formData.contract_id
      };

      const response = await api.post('financial-transactions/', invoiceData);
      setInvoices(prev => [response.data, ...prev]);
      setNotification({
        open: true,
        message: 'Invoice created successfully',
        severity: 'success'
      });

      // Reset form
      setFormData({
        contract_id: contractId || '',
        transaction_date: new Date().toISOString().split('T')[0],
        amount: '',
        description: '',
        reference: '',
        external_invoice_url: '',
        external_invoice_number: ''
      });
      setCreateDialogOpen(false);

    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'Failed to create invoice',
        severity: 'error'
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setNotification({
          open: true,
          message: 'File size exceeds 10MB limit',
          severity: 'error'
        });
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setNotification({
          open: true,
          message: 'File type not supported. Please upload PDF, JPG, PNG, DOC, or DOCX files.',
          severity: 'error'
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleAttachDocument = async () => {
    if (!selectedFile || !selectedInvoice) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', selectedFile);
    uploadFormData.append('document_type_id', 'invoice-attachment'); // You might want to create this document type
    if (formData.external_invoice_number) uploadFormData.append('document_number', formData.external_invoice_number);
    if (formData.description) uploadFormData.append('description', `Attachment for invoice ${selectedInvoice.reference}`);
    uploadFormData.append('is_required', 'false');

    try {
      setUploading(true);
      setUploadProgress(0);

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await api.post(`contracts/${selectedInvoice.contract_id}/documents`, uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setNotification({
        open: true,
        message: 'Document attached successfully',
        severity: 'success'
      });

      // Reset form
      setSelectedFile(null);
      setFormData(prev => ({
        ...prev,
        external_invoice_url: '',
        external_invoice_number: '',
        description: ''
      }));
      setAttachDialogOpen(false);
      setSelectedInvoice(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error: any) {
      console.error('Upload failed:', error);
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'Failed to attach document',
        severity: 'error'
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!await confirm({ message: `Are you sure you want to delete invoice "${invoice.reference}"?` })) {
      return;
    }
    try {
      await api.delete(`financial-transactions/${invoice.id}`);
      setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
      setNotification({
        open: true,
        message: 'Invoice deleted successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Delete failed:', error);
      setNotification({
        open: true,
        message: 'Failed to delete invoice',
        severity: 'error'
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getContractInfo = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract ? `${contract.contract_no} (${contract.contract_currency})` : 'Unknown Contract';
  };

  return (
    <Box>
      <Grid2 container spacing={3}>
        {/* Header and Create Button */}
        <Grid2 size={{ xs: 12 }}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box p={1.5} bgcolor={alpha(theme.palette.primary.main, 0.1)} borderRadius={2} color="primary.main">
              <Receipt fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="800" color="text.primary">
                {t('Commercial Invoices')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} found
              </Typography>
            </Box>
          </Box>
        </Grid2>

        {/* Create Invoice Card */}
        <Grid2 size={{ xs: 12, md: 4 }}>
          <Card
            sx={{
              border: `2px dashed ${theme.palette.divider}`,
              bgcolor: 'transparent',
              textAlign: 'center',
              py: 4,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.02),
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => setCreateDialogOpen(true)}
          >
            <Add sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Create New Invoice
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Issue a new commercial invoice
            </Typography>
          </Card>
        </Grid2>

        {/* Invoices List */}
        <Grid2 size={{ xs: 12, md: 8 }}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box p={3} borderBottom={`1px solid ${theme.palette.divider}`}>
                <Typography variant="h6" fontWeight={700}>Invoice History</Typography>
              </Box>

              {loading ? (
                <Box p={4} textAlign="center">
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" mt={2}>
                    Loading invoices...
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Reference</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Contract</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Amount</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary' }} align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.length > 0 ? invoices.map((invoice) => (
                        <TableRow key={invoice.id} hover>
                          <TableCell sx={{ fontFamily: 'monospace', color: 'primary.main', fontWeight: 600 }}>
                            {invoice.reference}
                          </TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>
                            {new Date(invoice.transaction_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {invoice.contract_id ? getContractInfo(invoice.contract_id) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`${invoice.amount.toLocaleString()} ${contracts.find(c => c.id === invoice.contract_id)?.contract_currency || 'USD'}`}
                              size="small"
                              sx={{
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: 'info.main',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label="Active"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Attach Document">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedInvoice(invoice);
                                  setAttachDialogOpen(true);
                                }}
                              >
                                <AttachFile fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print">
                              <IconButton size="small">
                                <Print fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteInvoice(invoice)}
                                color="error"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                            <Receipt sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="h6" color="text.secondary" gutterBottom>
                              No Invoices Yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Create your first commercial invoice to get started
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid2>
      </Grid2>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Invoice</DialogTitle>
        <DialogContent>
          <Stack spacing={3} mt={1}>
            {!contractId && (
              <FormControl fullWidth>
                <InputLabel>Contract</InputLabel>
                <Select
                  value={formData.contract_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_id: e.target.value }))}
                  label="Contract"
                >
                  {contracts.map(contract => (
                    <MenuItem key={contract.id} value={contract.id}>
                      {contract.contract_no} - {contract.contract_currency}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Invoice Date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  InputProps={{
                    startAdornment: contracts.find(c => c.id === formData.contract_id)?.contract_currency || 'USD'
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Reference Number"
              value={formData.reference}
              onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
              placeholder="e.g. INV-2025-001"
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
              placeholder="Invoice description or notes"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateInvoice} variant="contained">
            Create Invoice
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attach Document Dialog */}
      <Dialog open={attachDialogOpen} onClose={() => !uploading && setAttachDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Attach External Invoice Document</DialogTitle>
        <DialogContent>
          {uploading && (
            <Box mb={2}>
              <Typography variant="body2" gutterBottom>Uploading...</Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          <Stack spacing={3} mt={1}>
            {selectedFile && (
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>File:</strong> {selectedFile.name}<br />
                  <strong>Size:</strong> {formatFileSize(selectedFile.size)}<br />
                  <strong>Type:</strong> {selectedFile.type}
                </Typography>
              </Alert>
            )}

            <Box
              sx={{
                border: `2px dashed ${theme.palette.divider}`,
                borderRadius: 2,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main' }
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                hidden
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileSelect}
              />
              <CloudUpload sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Click to select file or drag and drop
              </Typography>
              <Typography variant="caption" color="text.secondary">
                PDF, JPG, PNG, DOC, DOCX (max 10MB)
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="External Invoice Number"
              value={formData.external_invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, external_invoice_number: e.target.value }))}
              placeholder="External invoice reference number"
            />

            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
              placeholder="Description of the attached document"
            />

            <TextField
              fullWidth
              label="External Invoice URL (Optional)"
              value={formData.external_invoice_url}
              onChange={(e) => setFormData(prev => ({ ...prev, external_invoice_url: e.target.value }))}
              placeholder="https://..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachDialogOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleAttachDocument}
            variant="contained"
            disabled={uploading || !selectedFile}
          >
            {uploading ? 'Uploading...' : 'Attach Document'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={notification.severity} variant="filled">
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Invoices;