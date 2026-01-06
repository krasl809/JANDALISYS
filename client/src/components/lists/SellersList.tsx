import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';

import { useConfirm } from '../../context/ConfirmContext';

interface Seller {
  id: string;
  contact_name: string;
  address: string;
  post_box: string;
  tel: string;
  fax: string;
  email: string;
  seller_code: string; // إضافة الحقل الجديد
}

const SellersList: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [newSeller, setNewSeller] = useState<Omit<Seller, 'id'>>({ 
    contact_name: '', 
    address: '', 
    post_box: '', 
    tel: '', 
    fax: '', 
    email: '',
    seller_code: '' // إضافة الحقل الجديد
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const response = await api.get('sellers/');
      setSellers(response.data);
    } catch (err: any) {
      console.error('Error fetching sellers:', err);
      setError(err.response?.data?.detail || t('errorLoadingSellers'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeller = async () => {
    if (!newSeller.contact_name) {
      setError(t('contactNameRequired'));
      return;
    }

    try {
      const response = await api.post('sellers/', newSeller);
      setSellers([...sellers, response.data]);
      setNewSeller({ contact_name: '', address: '', post_box: '', tel: '', fax: '', email: '', seller_code: '' });
      setError(null);
    } catch (err: any) {
      console.error('Error adding seller:', err);
      setError(err.response?.data?.detail || t('errorAddingSeller'));
    }
  };

  const handleEditSeller = (seller: Seller) => {
    setCurrentSeller(seller);
    setEditDialogOpen(true);
  };

  const handleUpdateSeller = async () => {
    if (!currentSeller) return;

    try {
      const response = await api.put(`sellers/${currentSeller.id}`, currentSeller);
      setSellers(sellers.map(seller => 
        seller.id === currentSeller.id ? response.data : seller
      ));
      setEditDialogOpen(false);
      setCurrentSeller(null);
    } catch (err: any) {
      console.error('Error updating seller:', err);
      setError(err.response?.data?.detail || t('errorUpdatingSeller'));
    }
  };

  const handleDeleteSeller = async (id: string) => {
    if (!await confirm({ message: t('confirmDelete') })) return;

    try {
      await api.delete(`sellers/${id}`);
      setSellers(sellers.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting seller:', err);
      setError(err.response?.data?.detail || t('errorDeletingSeller'));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ✅ نموذج الإضافة - تصميم موحد */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {t('addNewSeller')}
        </Typography>
          <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 2fr 1fr 1fr 1fr 2fr auto' }, 
          gap: 2,
          alignItems: 'end'
          }}>
            <TextField
      label={t('sellerCode')}
      value={newSeller.seller_code}
      onChange={(e) => setNewSeller({ ...newSeller, seller_code: e.target.value.toUpperCase() })}
      fullWidth
      size="small"
      required
      placeholder="SELL"
      inputProps={{ maxLength: 4 }}
    />

          <TextField
            label={t('contactName')}
            value={newSeller.contact_name}
            onChange={(e) => setNewSeller({ ...newSeller, contact_name: e.target.value })}
            fullWidth
            size="small"
            required
          />
          <TextField
            label={t('address')}
            value={newSeller.address}
            onChange={(e) => setNewSeller({ ...newSeller, address: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('postBox')}
            value={newSeller.post_box}
            onChange={(e) => setNewSeller({ ...newSeller, post_box: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('tel')}
            value={newSeller.tel}
            onChange={(e) => setNewSeller({ ...newSeller, tel: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('fax')}
            value={newSeller.fax}
            onChange={(e) => setNewSeller({ ...newSeller, fax: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('email')}
            value={newSeller.email}
            onChange={(e) => setNewSeller({ ...newSeller, email: e.target.value })}
            fullWidth
            size="small"
          />
          <Button 
            variant="contained" 
            onClick={handleAddSeller}
            startIcon={<Add />}
            sx={{ 
              minHeight: '40px',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            {t('add')}
          </Button>
        </Box>
      </Paper>

      {/* ✅ جدول البائعين - تصميم موحد */}
      <Paper elevation={2}>
        <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('sellerCode')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('contactName')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('address')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('postBox')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('tel')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('fax')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('email')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }} align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sellers.map((seller) => (
                <TableRow key={seller.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium', fontSize: '14px' }}>{seller.seller_code}</TableCell>
                  <TableCell sx={{ fontWeight: 'medium', fontSize: '14px' }}>{seller.contact_name}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{seller.address}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{seller.post_box}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{seller.tel}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{seller.fax}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{seller.email}</TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
                      size="small" 
                      onClick={() => handleEditSeller(seller)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => handleDeleteSeller(seller.id)}
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
          {t('editSeller')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
            gap: 2, 
            mt: 2 
          }}>
            <TextField
              label={t('sellerCode')}
              value={currentSeller?.seller_code || ''}
              onChange={(e) => setCurrentSeller(currentSeller ? 
                { ...currentSeller, seller_code: e.target.value.toUpperCase() } : null)}
              fullWidth
              required
              size="small"
              inputProps={{ maxLength: 4 }}
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
            <TextField
              label={t('contactName')}
              value={currentSeller?.contact_name || ''}
              onChange={(e) => setCurrentSeller(currentSeller ? 
                { ...currentSeller, contact_name: e.target.value } : null)}
              fullWidth
              required
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
            <TextField
              label={t('address')}
              value={currentSeller?.address || ''}
              onChange={(e) => setCurrentSeller(currentSeller ? 
                { ...currentSeller, address: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('postBox')}
              value={currentSeller?.post_box || ''}
              onChange={(e) => setCurrentSeller(currentSeller ? 
                { ...currentSeller, post_box: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('tel')}
              value={currentSeller?.tel || ''}
              onChange={(e) => setCurrentSeller(currentSeller ? 
                { ...currentSeller, tel: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('fax')}
              value={currentSeller?.fax || ''}
              onChange={(e) => setCurrentSeller(currentSeller ? 
                { ...currentSeller, fax: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('email')}
              value={currentSeller?.email || ''}
              onChange={(e) => setCurrentSeller(currentSeller ? 
                { ...currentSeller, email: e.target.value } : null)}
              fullWidth
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdateSeller} variant="contained">{t('update')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SellersList;