// [file name]: BrokersList.tsx
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

interface Broker {
  id: string;
  contact_name: string;
  address: string;
  post_box: string;
  tel: string;
  fax: string;
  email: string;
  code: string; // هذا هو الحقل الصحيح، ليس broker_code
}

const BrokersList: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentBroker, setCurrentBroker] = useState<Broker | null>(null);
  const [newBroker, setNewBroker] = useState<Omit<Broker, 'id'>>({ 
    contact_name: '', 
    address: '', 
    post_box: '', 
    tel: '', 
    fax: '', 
    email: '',
    code: ''
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    setLoading(true);
    try {
      const response = await api.get('brokers/');
      setBrokers(response.data);
    } catch (err: any) {
      console.error('Error fetching brokers:', err);
      setError(err.response?.data?.detail || t('errorLoadingBrokers'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddBroker = async () => {
    if (!newBroker.contact_name || !newBroker.code) {
      setError(t('contactNameAndCodeRequired'));
      return;
    }

    try {
      const response = await api.post('brokers/', newBroker);
      setBrokers([...brokers, response.data]);
      setNewBroker({ contact_name: '', address: '', post_box: '', tel: '', fax: '', email: '', code: '' });
      setError(null);
    } catch (err: any) {
      console.error('Error adding broker:', err);
      setError(err.response?.data?.detail || t('errorAddingBroker'));
    }
  };

  const handleEditBroker = (broker: Broker) => {
    setCurrentBroker(broker);
    setEditDialogOpen(true);
  };

  const handleUpdateBroker = async () => {
    if (!currentBroker) return;

    try {
      const response = await api.put(`brokers/${currentBroker.id}`, currentBroker);
      setBrokers(brokers.map(broker => 
        broker.id === currentBroker.id ? response.data : broker
      ));
      setEditDialogOpen(false);
      setCurrentBroker(null);
    } catch (err: any) {
      console.error('Error updating broker:', err);
      setError(err.response?.data?.detail || t('errorUpdatingBroker'));
    }
  };

  const handleDeleteBroker = async (id: string) => {
    if (!await confirm({ message: t('confirmDelete') })) return;

    try {
      await api.delete(`brokers/${id}`);
      setBrokers(brokers.filter(b => b.id !== id));
    } catch (err: any) {
      console.error('Error deleting broker:', err);
      setError(err.response?.data?.detail || t('errorDeletingBroker'));
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* نموذج الإضافة */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {t('addNewBroker')}
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 2fr 1fr 1fr 1fr 2fr auto' }, 
          gap: 2,
          alignItems: 'end'
        }}>
          <TextField
            label={t('code')}
            value={newBroker.code}
            onChange={(e) => setNewBroker({ ...newBroker, code: e.target.value.toUpperCase() })}
            fullWidth
            size="small"
            required
            placeholder="BRK1"
            inputProps={{ maxLength: 4 }}
          />
          <TextField
            label={t('contactName')}
            value={newBroker.contact_name}
            onChange={(e) => setNewBroker({ ...newBroker, contact_name: e.target.value })}
            fullWidth
            size="small"
            required
          />
          <TextField
            label={t('address')}
            value={newBroker.address}
            onChange={(e) => setNewBroker({ ...newBroker, address: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('postBox')}
            value={newBroker.post_box}
            onChange={(e) => setNewBroker({ ...newBroker, post_box: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('tel')}
            value={newBroker.tel}
            onChange={(e) => setNewBroker({ ...newBroker, tel: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('fax')}
            value={newBroker.fax}
            onChange={(e) => setNewBroker({ ...newBroker, fax: e.target.value })}
            fullWidth
            size="small"
          />
          <TextField
            label={t('email')}
            value={newBroker.email}
            onChange={(e) => setNewBroker({ ...newBroker, email: e.target.value })}
            fullWidth
            size="small"
          />
          <Button 
            variant="contained" 
            onClick={handleAddBroker}
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

      {/* جدول البروكرز */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('code')}</TableCell>
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
              {brokers.map((broker) => (
                <TableRow key={broker.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium', fontSize: '14px' }}>{broker.code}</TableCell>
                  <TableCell sx={{ fontWeight: 'medium', fontSize: '14px' }}>{broker.contact_name || ''}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{broker.address}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{broker.post_box}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{broker.tel}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{broker.fax}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{broker.email}</TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
                      size="small" 
                      onClick={() => handleEditBroker(broker)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => handleDeleteBroker(broker.id)}
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
          {t('editBroker')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, 
            gap: 2, 
            mt: 2 
          }}>
            <TextField
              label={t('code')}
              value={currentBroker?.code || ''}
              onChange={(e) => setCurrentBroker(currentBroker ? 
                { ...currentBroker, code: e.target.value.toUpperCase() } : null)}
              fullWidth
              required
              size="small"
              inputProps={{ maxLength: 4 }}
            />
            <TextField
              label={t('contactName')}
              value={currentBroker?.contact_name || ''}
              onChange={(e) => setCurrentBroker(currentBroker ? 
                { ...currentBroker, contact_name: e.target.value } : null)}
              fullWidth
              required
              size="small"
            />
            <TextField
              label={t('address')}
              value={currentBroker?.address || ''}
              onChange={(e) => setCurrentBroker(currentBroker ? 
                { ...currentBroker, address: e.target.value } : null)}
              fullWidth
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
            <TextField
              label={t('postBox')}
              value={currentBroker?.post_box || ''}
              onChange={(e) => setCurrentBroker(currentBroker ? 
                { ...currentBroker, post_box: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('tel')}
              value={currentBroker?.tel || ''}
              onChange={(e) => setCurrentBroker(currentBroker ? 
                { ...currentBroker, tel: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('fax')}
              value={currentBroker?.fax || ''}
              onChange={(e) => setCurrentBroker(currentBroker ? 
                { ...currentBroker, fax: e.target.value } : null)}
              fullWidth
              size="small"
            />
            <TextField
              label={t('email')}
              value={currentBroker?.email || ''}
              onChange={(e) => setCurrentBroker(currentBroker ? 
                { ...currentBroker, email: e.target.value } : null)}
              fullWidth
              size="small"
              sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdateBroker} variant="contained">{t('update')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BrokersList;