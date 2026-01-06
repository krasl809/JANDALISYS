import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, TextField, Alert, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Snackbar
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';

interface PaymentTerm {
  id: string;
  code: string;
  name: string;
  description: string;
}

const PaymentTermsList: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const [terms, setTerms] = useState<PaymentTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<PaymentTerm | null>(null);
  const [newTerm, setNewTerm] = useState<Omit<PaymentTerm, 'id'>>({ 
    code: '', name: '', description: '' 
  });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const response = await api.get('payment-terms/');
      setTerms(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching payment terms:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorLoadingData');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerm = async () => {
    // تحقق من الحقول المطلوبة - مثل BuyersList
    if (!newTerm.code.trim() || !newTerm.name.trim()) {
      setError(t('fillRequiredFields'));
      return;
    }

    try {
      setError(null);
      const response = await api.post('payment-terms/', {
        code: newTerm.code.trim(),
        name: newTerm.name.trim(),
        description: newTerm.description.trim()
      });
      setTerms([...terms, response.data]);
      setNewTerm({ code: '', name: '', description: '' });
      setSuccessMessage(t('paymentTermAddedSuccessfully'));
    } catch (err: any) {
      console.error('Error adding payment term:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorAddingData');
      setError(errorMessage);
    }
  };

  const handleEditTerm = (term: PaymentTerm) => {
    setCurrentTerm(term);
    setEditDialogOpen(true);
  };

  const handleUpdateTerm = async () => {
    if (!currentTerm) return;

    try {
      setError(null);
      const response = await api.put(`payment-terms/${currentTerm.id}`, {
        code: currentTerm.code.trim(),
        name: currentTerm.name.trim(),
        description: currentTerm.description.trim()
      });
      setTerms(terms.map(term => 
        term.id === currentTerm.id ? response.data : term
      ));
      setEditDialogOpen(false);
      setCurrentTerm(null);
      setSuccessMessage(t('paymentTermUpdatedSuccessfully'));
    } catch (err: any) {
      console.error('Error updating payment term:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorUpdatingData');
      setError(errorMessage);
    }
  };

  const handleDeleteTerm = async (id: string) => {
    if (!await confirm({ message: t('confirmDelete') })) return;

    try {
      await api.delete(`payment-terms/${id}`);
      setTerms(terms.filter(t => t.id !== id));
      setSuccessMessage(t('paymentTermDeletedSuccessfully'));
    } catch (err: any) {
      console.error('Error deleting payment term:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorDeletingData');
      setError(errorMessage);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
      <CircularProgress />
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {t('addNewPaymentTerm')}
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 2fr auto' }, 
          gap: 2,
          alignItems: 'end'
        }}>
          <TextField
            label={t('code')}
            value={newTerm.code}
            onChange={(e) => setNewTerm({ ...newTerm, code: e.target.value })}
            fullWidth 
            size="small" 
            required
            error={!newTerm.code.trim()}
            helperText={!newTerm.code.trim() ? t('fieldRequired') : ''}
          />
          <TextField
            label={t('name')}
            value={newTerm.name}
            onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
            fullWidth 
            size="small" 
            required
            error={!newTerm.name.trim()}
            helperText={!newTerm.name.trim() ? t('fieldRequired') : ''}
          />
          <TextField
            label={t('description')}
            value={newTerm.description}
            onChange={(e) => setNewTerm({ ...newTerm, description: e.target.value })}
            fullWidth 
            size="small"
          />
          <Button 
            variant="contained" 
            onClick={handleAddTerm} 
            startIcon={<Add />}
            disabled={!newTerm.code.trim() || !newTerm.name.trim()}
            sx={{ minHeight: '40px', bgcolor: 'primary.main' }}
          >
            {t('add')}
          </Button>
        </Box>
      </Paper>

      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('code')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('name')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('description')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }} align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {terms.map((term) => (
                <TableRow key={term.id} hover>
                  <TableCell sx={{ fontWeight: 'medium' }}>{term.code}</TableCell>
                  <TableCell>{term.name}</TableCell>
                  <TableCell>{term.description}</TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
                      size="small" 
                      sx={{ mr: 1 }}
                      onClick={() => handleEditTerm(term)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => handleDeleteTerm(term.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* نافذة التعديل */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {t('editPaymentTerm')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label={t('code')}
              value={currentTerm?.code || ''}
              onChange={(e) => setCurrentTerm(currentTerm ? 
                { ...currentTerm, code: e.target.value } : null)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label={t('name')}
              value={currentTerm?.name || ''}
              onChange={(e) => setCurrentTerm(currentTerm ? 
                { ...currentTerm, name: e.target.value } : null)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label={t('description')}
              value={currentTerm?.description || ''}
              onChange={(e) => setCurrentTerm(currentTerm ? 
                { ...currentTerm, description: e.target.value } : null)}
              fullWidth
              size="small"
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdateTerm} variant="contained">{t('update')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentTermsList;