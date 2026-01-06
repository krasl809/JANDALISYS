import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
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

interface Buyer {
  id: string;
  contact_name: string;
  address: string;
  post_box: string;
  tel: string;
  fax: string;
  email: string;
}

const BuyersList: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentBuyer, setCurrentBuyer] = useState<Buyer | null>(null);
  const [newBuyer, setNewBuyer] = useState<Omit<Buyer, 'id'>>({ 
    contact_name: '', 
    address: '', 
    post_box: '', 
    tel: '', 
    fax: '', 
    email: '' 
  });

  useEffect(() => {
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const response = await api.get('buyers/');
      setBuyers(response.data);
    } catch (err: any) {
      console.error('Error fetching buyers:', err);
      setError(err.response?.data?.detail || t('errorLoadingBuyers'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBuyer = async () => {
    if (!newBuyer.contact_name) {
      setError(t('contactNameRequired'));
      return;
    }

    try {
      const response = await api.post('buyers/', newBuyer);
      setBuyers([...buyers, response.data]);
      setNewBuyer({ contact_name: '', address: '', post_box: '', tel: '', fax: '', email: '' });
      setError(null);
    } catch (err: any) {
      console.error('Error adding buyer:', err);
      setError(err.response?.data?.detail || t('errorAddingBuyer'));
    }
  };

  const handleEditBuyer = (buyer: Buyer) => {
    setCurrentBuyer(buyer);
    setEditDialogOpen(true);
  };

  const handleUpdateBuyer = async () => {
    if (!currentBuyer) return;

    try {
      const response = await api.put(`buyers/${currentBuyer.id}`, currentBuyer);
      setBuyers(buyers.map(buyer => 
        buyer.id === currentBuyer.id ? response.data : buyer
      ));
      setEditDialogOpen(false);
      setCurrentBuyer(null);
    } catch (err: any) {
      console.error('Error updating buyer:', err);
      setError(err.response?.data?.detail || t('errorUpdatingBuyer'));
    }
  };

  const handleDeleteBuyer = async (id: string) => {
    if (!await confirm({ message: t('confirmDelete') })) return;

    try {
      await api.delete(`buyers/${id}`);
      setBuyers(buyers.filter(b => b.id !== id));
    } catch (err: any) {
      console.error('Error deleting buyer:', err);
      setError(err.response?.data?.detail || t('errorDeletingBuyer'));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ✅ نموذج الإضافة - تصميم موحد */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {t('addNewBuyer')}
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '2fr 2fr 1fr 1fr 1fr 2fr auto' }, 
          gap: 2,
          alignItems: 'end'
        }}>
          <TextField
            label={t('contactName')}
            value={newBuyer.contact_name}
            onChange={(e) => setNewBuyer({ ...newBuyer, contact_name: e.target.value })}
            fullWidth
            size="small"
            required
          />
          <TextField
            label={t('address')}
            value={newBuyer.address}
            onChange={(e) => setNewBuyer({ ...newBuyer, address: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('postBox')}
            value={newBuyer.post_box}
            onChange={(e) => setNewBuyer({ ...newBuyer, post_box: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('tel')}
            value={newBuyer.tel}
            onChange={(e) => setNewBuyer({ ...newBuyer, tel: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('fax')}
            value={newBuyer.fax}
            onChange={(e) => setNewBuyer({ ...newBuyer, fax: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('email')}
            value={newBuyer.email}
            onChange={(e) => setNewBuyer({ ...newBuyer, email: e.target.value })}
            fullWidth
            size="small"
          />
          <Button 
            variant="contained" 
            onClick={handleAddBuyer}
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

      {/* ✅ جدول المشترين - تصميم موحد */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
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
              {buyers.map((buyer) => (
                <TableRow key={buyer.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium', fontSize: '14px' }}>{buyer.contact_name || ''}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{buyer.address}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{buyer.post_box}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{buyer.tel}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{buyer.fax}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{buyer.email}</TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
                      size="small" 
                      onClick={() => handleEditBuyer(buyer)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => handleDeleteBuyer(buyer.id)}
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
          {t('editBuyer')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
            gap: 2, 
            mt: 2 
          }}>
            <TextField
              label={t('contactName')}
              value={currentBuyer?.contact_name || ''}
              onChange={(e) => setCurrentBuyer(currentBuyer ? 
                { ...currentBuyer, contact_name: e.target.value } : null)}
              fullWidth
              required
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
            <TextField
              label={t('address')}
              value={currentBuyer?.address || ''}
              onChange={(e) => setCurrentBuyer(currentBuyer ? 
                { ...currentBuyer, address: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('postBox')}
              value={currentBuyer?.post_box || ''}
              onChange={(e) => setCurrentBuyer(currentBuyer ? 
                { ...currentBuyer, post_box: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('tel')}
              value={currentBuyer?.tel || ''}
              onChange={(e) => setCurrentBuyer(currentBuyer ? 
                { ...currentBuyer, tel: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('fax')}
              value={currentBuyer?.fax || ''}
              onChange={(e) => setCurrentBuyer(currentBuyer ? 
                { ...currentBuyer, fax: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('email')}
              value={currentBuyer?.email || ''}
              onChange={(e) => setCurrentBuyer(currentBuyer ? 
                { ...currentBuyer, email: e.target.value } : null)}
              fullWidth
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdateBuyer} variant="contained">{t('update')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BuyersList;