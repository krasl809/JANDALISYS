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

interface Shipper {
  id: string;
  contact_name: string;
  address: string;
  post_box: string;
  tel: string;
  fax: string;
  email: string;
}

const ShippersList: React.FC = () => {
  const { t } = useTranslation();

  const [shippers, setShippers] = useState<Shipper[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentShipper, setCurrentShipper] = useState<Shipper | null>(null);
  const [newShipper, setNewShipper] = useState<Omit<Shipper, 'id'>>({ 
    contact_name: '', 
    address: '', 
    post_box: '', 
    tel: '', 
    fax: '', 
    email: '' 
  });

  useEffect(() => {
    fetchShippers();
  }, []);

  const fetchShippers = async () => {
    try {
      const response = await api.get('/shippers/');
      setShippers(response.data);
    } catch (err: any) {
      console.error('Error fetching shippers:', err);
      setError(err.response?.data?.detail || t('errorLoadingShippers'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddShipper = async () => {
    if (!newShipper.contact_name) {
      setError(t('contactNameRequired'));
      return;
    }

    try {
      const response = await api.post('/shippers/', newShipper);
      setShippers([...shippers, response.data]);
      setNewShipper({ contact_name: '', address: '', post_box: '', tel: '', fax: '', email: '' });
      setError(null);
    } catch (err: any) {
      console.error('Error adding shipper:', err);
      setError(err.response?.data?.detail || t('errorAddingShipper'));
    }
  };

  const handleEditShipper = (shipper: Shipper) => {
    setCurrentShipper(shipper);
    setEditDialogOpen(true);
  };

  const handleUpdateShipper = async () => {
    if (!currentShipper) return;

    try {
      const response = await api.put(`/shippers/${currentShipper.id}`, currentShipper);
      setShippers(shippers.map(shipper => 
        shipper.id === currentShipper.id ? response.data : shipper
      ));
      setEditDialogOpen(false);
      setCurrentShipper(null);
    } catch (err: any) {
      console.error('Error updating shipper:', err);
      setError(err.response?.data?.detail || t('errorUpdatingShipper'));
    }
  };

  const handleDeleteShipper = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      await api.delete(`/shippers/${id}`);
      setShippers(shippers.filter(s => s.id !== id));
    } catch (err: any) {
      console.error('Error deleting shipper:', err);
      setError(err.response?.data?.detail || t('errorDeletingShipper'));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* نموذج الإضافة - تصميم موحد */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {t('addNewShipper')}
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '2fr 2fr 1fr 1fr 1fr 2fr auto' }, 
          gap: 2,
          alignItems: 'end'
        }}>
          <TextField
            label={t('contactName')}
            value={newShipper.contact_name}
            onChange={(e) => setNewShipper({ ...newShipper, contact_name: e.target.value })}
            fullWidth
            size="small"
            required
          />
          <TextField
            label={t('address')}
            value={newShipper.address}
            onChange={(e) => setNewShipper({ ...newShipper, address: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('postBox')}
            value={newShipper.post_box}
            onChange={(e) => setNewShipper({ ...newShipper, post_box: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('tel')}
            value={newShipper.tel}
            onChange={(e) => setNewShipper({ ...newShipper, tel: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('fax')}
            value={newShipper.fax}
            onChange={(e) => setNewShipper({ ...newShipper, fax: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('email')}
            value={newShipper.email}
            onChange={(e) => setNewShipper({ ...newShipper, email: e.target.value })}
            fullWidth
            size="small"
          />
          <Button 
            variant="contained" 
            onClick={handleAddShipper}
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

      {/* جدول الشاحنين - تصميم موحد */}
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
              {shippers.map((shipper) => (
                <TableRow key={shipper.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium', fontSize: '14px' }}>{shipper.contact_name}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{shipper.address}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{shipper.post_box}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{shipper.tel}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{shipper.fax}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{shipper.email}</TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
                      size="small" 
                      onClick={() => handleEditShipper(shipper)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => handleDeleteShipper(shipper.id)}
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
          {t('editShipper')}
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
              value={currentShipper?.contact_name || ''}
              onChange={(e) => setCurrentShipper(currentShipper ? 
                { ...currentShipper, contact_name: e.target.value } : null)}
              fullWidth
              required
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
            <TextField
              label={t('address')}
              value={currentShipper?.address || ''}
              onChange={(e) => setCurrentShipper(currentShipper ? 
                { ...currentShipper, address: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('postBox')}
              value={currentShipper?.post_box || ''}
              onChange={(e) => setCurrentShipper(currentShipper ? 
                { ...currentShipper, post_box: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('tel')}
              value={currentShipper?.tel || ''}
              onChange={(e) => setCurrentShipper(currentShipper ? 
                { ...currentShipper, tel: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('fax')}
              value={currentShipper?.fax || ''}
              onChange={(e) => setCurrentShipper(currentShipper ? 
                { ...currentShipper, fax: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('email')}
              value={currentShipper?.email || ''}
              onChange={(e) => setCurrentShipper(currentShipper ? 
                { ...currentShipper, email: e.target.value } : null)}
              fullWidth
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdateShipper} variant="contained">{t('update')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ShippersList;