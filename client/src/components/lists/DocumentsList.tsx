import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
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
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Snackbar
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';

interface DocumentType {
  id: string;
  code: string;
  name: string;
  description: string;
  is_required: boolean;
  is_active: boolean;
}

const DocumentsList: React.FC = () => {
  const { t } = useTranslation();

  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null);
  const [newDocument, setNewDocument] = useState<Omit<DocumentType, 'id'>>({ 
    code: '', 
    name: '', 
    description: '',
    is_required: false,
    is_active: true
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/document-types/');
      setDocuments(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorLoadingDocuments');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!newDocument.code.trim() || !newDocument.name.trim()) {
      setError(t('fillRequiredFields'));
      return;
    }

    try {
      setError(null);
      const response = await api.post('/document-types/', newDocument);
      setDocuments([...documents, response.data]);
      setNewDocument({ code: '', name: '', description: '', is_required: false, is_active: true });
      setSuccessMessage(t('documentAddedSuccessfully'));
    } catch (err: any) {
      console.error('Error adding document:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorAddingDocument');
      setError(errorMessage);
      
      // إذا كان الخطأ 500، قد يكون مشكلة في السيرفر
      if (err.response?.status === 500) {
        setError(t('serverError'));
      }
    }
  };

  const handleEditDocument = (document: DocumentType) => {
    setCurrentDocument(document);
    setEditDialogOpen(true);
  };

  const handleUpdateDocument = async () => {
    if (!currentDocument) return;

    try {
      setError(null);
      const response = await api.put(`/document-types/${currentDocument.id}`, currentDocument);
      setDocuments(documents.map(document => 
        document.id === currentDocument.id ? response.data : document
      ));
      setEditDialogOpen(false);
      setCurrentDocument(null);
      setSuccessMessage(t('documentUpdatedSuccessfully'));
    } catch (err: any) {
      console.error('Error updating document:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorUpdatingDocument');
      setError(errorMessage);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;

    try {
      await api.delete(`/document-types/${id}`);
      setDocuments(documents.filter(d => d.id !== id));
      setSuccessMessage(t('documentDeletedSuccessfully'));
    } catch (err: any) {
      console.error('Error deleting document:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorDeletingDocument');
      setError(errorMessage);
    }
  };

  const handleToggleStatus = async (id: string, field: 'is_required' | 'is_active', value: boolean) => {
    try {
      const response = await api.patch(`/document-types/${id}`, { [field]: !value });
      setDocuments(documents.map(document => 
        document.id === id ? response.data : document
      ));
      setSuccessMessage(t('documentUpdatedSuccessfully'));
    } catch (err: any) {
      console.error('Error toggling document status:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          t('errorUpdatingDocument');
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

      {/* نموذج الإضافة */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
          {t('addNewDocument')}
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: '1fr 2fr 2fr auto' }, 
          gap: 2,
          alignItems: 'end'
        }}>
          <TextField
            label={t('code')}
            value={newDocument.code}
            onChange={(e) => setNewDocument({ ...newDocument, code: e.target.value.toUpperCase() })}
            fullWidth
            size="small"
            required
            placeholder="INV, COO, PL"
            error={!newDocument.code.trim()}
          />
          <TextField
            label={t('name')}
            value={newDocument.name}
            onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
            fullWidth
            size="small"
            required
            placeholder="Commercial Invoice"
            error={!newDocument.name.trim()}
          />
          <TextField
            label={t('description')}
            value={newDocument.description}
            onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
            fullWidth
            size="small"
            placeholder="وصف المستند"
          />
          <Button 
            variant="contained" 
            onClick={handleAddDocument}
            startIcon={<Add />}
            disabled={!newDocument.code.trim() || !newDocument.name.trim()}
            sx={{ 
              minHeight: '40px',
              bgcolor: 'primary.main',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            {t('add')}
          </Button>
        </Box>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={newDocument.is_required}
                onChange={(e) => setNewDocument({ ...newDocument, is_required: e.target.checked })}
                color="primary"
                size="small"
              />
            }
            label={t('required')}
          />
        </Box>
      </Paper>

      {/* جدول المستندات */}
      <Paper elevation={2}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('code')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('name')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{t('description')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }} align="center">{t('required')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }} align="center">{t('status')}</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }} align="center">{t('actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((document) => (
                <TableRow key={document.id} hover sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                  <TableCell sx={{ fontWeight: 'medium', fontSize: '14px' }}>{document.code}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{document.name}</TableCell>
                  <TableCell sx={{ fontSize: '14px' }}>{document.description}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={document.is_required ? t('required') : t('optional')}
                      color={document.is_required ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <FormControlLabel
                      control={
                        <Switch
                          checked={document.is_active}
                          onChange={() => handleToggleStatus(document.id, 'is_active', document.is_active)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={document.is_active ? t('active') : t('inactive')}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton 
                      color="primary" 
                      size="small" 
                      onClick={() => handleEditDocument(document)}
                      sx={{ mr: 1 }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      size="small" 
                      onClick={() => handleDeleteDocument(document.id)}
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
          {t('editDocument')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label={t('code')}
              value={currentDocument?.code || ''}
              onChange={(e) => setCurrentDocument(currentDocument ? 
                { ...currentDocument, code: e.target.value.toUpperCase() } : null)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label={t('name')}
              value={currentDocument?.name || ''}
              onChange={(e) => setCurrentDocument(currentDocument ? 
                { ...currentDocument, name: e.target.value } : null)}
              fullWidth
              size="small"
              required
            />
            <TextField
              label={t('description')}
              value={currentDocument?.description || ''}
              onChange={(e) => setCurrentDocument(currentDocument ? 
                { ...currentDocument, description: e.target.value } : null)}
              fullWidth
              size="small"
              multiline
              rows={3}
            />
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={currentDocument?.is_required || false}
                    onChange={(e) => setCurrentDocument(currentDocument ? 
                      { ...currentDocument, is_required: e.target.checked } : null)}
                    color="primary"
                  />
                }
                label={t('required')}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={currentDocument?.is_active || false}
                    onChange={(e) => setCurrentDocument(currentDocument ? 
                      { ...currentDocument, is_active: e.target.checked } : null)}
                    color="primary"
                  />
                }
                label={t('active')}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t('cancel')}</Button>
          <Button onClick={handleUpdateDocument} variant="contained">{t('update')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsList;