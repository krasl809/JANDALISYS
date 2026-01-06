import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useConfirm } from '../../context/ConfirmContext';
import { v4 as uuidv4 } from 'uuid';
import {
  Container,
  Card,
  CardContent,
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
  InputAdornment,
  useTheme,
  alpha,
  Stack,
  useMediaQuery,
  Divider,
  Chip
} from '@mui/material';
import Grid from '@mui/material/Grid2';
import { 
  Edit, 
  Delete, 
  Add, 
  Inventory, 
  Search, 
  QrCode, 
  Scale, 
  Label,
  Save,
  Close,
  FilterListOff
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

// تعريف الواجهة
interface Article {
  id: string;
  article_name: string;
  uom: string;
  item_code: string;
}

const ArticlesList: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const theme = useTheme();
  // ✅ هوك لاكتشاف حجم الشاشة
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // --- States ---
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog States
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  
  // Form State
  const [newArticle, setNewArticle] = useState<Omit<Article, 'id'>>({ 
    article_name: '', 
    uom: '', 
    item_code: '' 
  });

  // --- API Calls ---
  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const response = await api.get('articles/');
      setArticles(response.data);
    } catch (err: any) {
      console.error('Error fetching articles:', err);
      setError(err.response?.data?.detail || t('errorLoadingArticles'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddArticle = async () => {
    if (!newArticle.article_name || !newArticle.uom || !newArticle.item_code) {
      setError(t('fillAllFields'));
      return;
    }

    try {
      const articleWithId = { ...newArticle, id: uuidv4() };
      const response = await api.post('articles/', articleWithId);
      
      setArticles((prev) => [...prev, response.data]);
      setNewArticle({ article_name: '', uom: '', item_code: '' });
      setError(null);
    } catch (err: any) {
      console.error('Error adding article:', err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : t('errorAddingArticle'));
    }
  };

  const handleUpdateArticle = async () => {
    if (!currentArticle) return;

    try {
      const response = await api.put(`articles/${currentArticle.id}`, currentArticle);
      setArticles(articles.map(article => 
        article.id === currentArticle.id ? response.data : article
      ));
      setEditDialogOpen(false);
      setCurrentArticle(null);
    } catch (err: any) {
      console.error('Error updating article:', err);
      setError(err.response?.data?.detail || t('errorUpdatingArticle'));
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!await confirm({ message: t('confirmDelete') })) return;

    try {
      await api.delete(`articles/${id}`);
      setArticles(articles.filter(a => a.id !== id));
    } catch (err: any) {
      console.error('Error deleting article:', err);
      setError(err.response?.data?.detail || t('errorDeletingArticle'));
    }
  };

  const handleEditClick = (article: Article) => {
    setCurrentArticle(article);
    setEditDialogOpen(true);
  };

  // --- Filtering ---
  const filteredArticles = useMemo(() => {
    return articles.filter(a => 
      a.article_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.item_code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [articles, searchQuery]);

  // --- Styles ---
  const tableHeadSx = {
    bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : '#F8FAFC',
    color: theme.palette.text.secondary,
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${theme.palette.divider}`,
    py: 2
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 8, px: { xs: 2, md: 3 } }}>
      
      {/* 1. Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2, color: 'primary.main' }}>
            <Inventory fontSize={isMobile ? "medium" : "large"} />
          </Box>
          <Box>
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight="800" color="text.primary">
              {t('Articles Manager')}
            </Typography>
            {!isMobile && (
              <Typography variant="body1" color="text.secondary">
                Define product catalog, codes, and units of measurement.
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

      {/* 2. Add New & Search Section (Responsive Grid) */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
        {/* Form Card */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight="700" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Add fontSize="small" color="primary" /> {t('Add New Article')}
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

              {/* ✅ Responsive Inputs: Stack on Mobile, Row on Desktop */}
              <Grid container spacing={2} alignItems="flex-end">
                <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                        label={t('Article Name')}
                        placeholder="e.g. White Sugar"
                        value={newArticle.article_name}
                        onChange={(e) => setNewArticle({ ...newArticle, article_name: e.target.value })}
                        fullWidth size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><Label fontSize="small" /></InputAdornment> }}
                    />
                </Grid>
                {/* On mobile: Code and UOM share a row (6 cols each) */}
                <Grid size={{ xs: 6, sm: 3 }}>
                    <TextField
                        label={t('Code')}
                        placeholder="SKU-01"
                        value={newArticle.item_code}
                        onChange={(e) => setNewArticle({ ...newArticle, item_code: e.target.value })}
                        fullWidth size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><QrCode fontSize="small" /></InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                        label={t('UOM')}
                        placeholder="MT"
                        value={newArticle.uom}
                        onChange={(e) => setNewArticle({ ...newArticle, uom: e.target.value })}
                        fullWidth size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start"><Scale fontSize="small" /></InputAdornment> }}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 2 }}>
                    <Button 
                        variant="contained" 
                        fullWidth 
                        onClick={handleAddArticle}
                        sx={{ 
                            bgcolor: 'primary.main', 
                            color: '#fff', 
                            fontWeight: 600,
                            boxShadow: theme.shadows[2],
                            height: 40
                        }}
                    >
                        {t('Add')}
                    </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Search Card */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', height: '100%', display: 'flex', alignItems: 'center' }}>
            <CardContent sx={{ width: '100%' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight="700">
                    SEARCH CATALOG
                </Typography>
                <TextField
                    placeholder="Search by Name or Code..."
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><Search color="action" /></InputAdornment>,
                        sx: { borderRadius: 2, bgcolor: theme.palette.background.default }
                    }}
                />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Data Display (Responsive Switch) */}
      
      {/* ✅ A. Desktop View (Table) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Card} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
            <Table>
            <TableHead>
                <TableRow>
                <TableCell sx={tableHeadSx}>{t('Article Name')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('Item Code')}</TableCell>
                <TableCell sx={tableHeadSx}>{t('UOM')}</TableCell>
                <TableCell sx={{ ...tableHeadSx, textAlign: 'right' }}>{t('Actions')}</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                <AnimatePresence>
                {filteredArticles.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                        <FilterListOff sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                        <Typography color="text.secondary">No articles found.</Typography>
                    </TableCell>
                    </TableRow>
                ) : (
                    filteredArticles.map((article) => (
                    <TableRow 
                        key={article.id}
                        component={motion.tr}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        layout
                        hover 
                        sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}
                    >
                        <TableCell sx={{ fontWeight: 600 }}>{article.article_name}</TableCell>
                        <TableCell>
                            <Chip 
                                label={article.item_code} 
                                size="small" 
                                sx={{ 
                                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                                    color: 'primary.main', 
                                    fontWeight: 'bold', 
                                    fontFamily: 'monospace',
                                    borderRadius: 1
                                }} 
                            />
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{article.uom}</TableCell>
                        <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <IconButton 
                            size="small" 
                            onClick={() => handleEditClick(article)}
                            sx={{ color: theme.palette.info.main, bgcolor: alpha(theme.palette.info.main, 0.1) }}
                            >
                            <Edit fontSize="small" />
                            </IconButton>
                            <IconButton 
                            size="small" 
                            onClick={() => handleDeleteArticle(article.id)}
                            sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1) }}
                            >
                            <Delete fontSize="small" />
                            </IconButton>
                        </Stack>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </AnimatePresence>
            </TableBody>
            </Table>
        </TableContainer>
      </Box>

      {/* ✅ B. Mobile View (Cards) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
        <AnimatePresence>
            {filteredArticles.length === 0 ? (
                <Box textAlign="center" py={5}>
                    <FilterListOff sx={{ fontSize: 40, color: 'text.secondary', opacity: 0.5 }} />
                    <Typography color="text.secondary">No articles found.</Typography>
                </Box>
            ) : (
                filteredArticles.map((article) => (
                    <Card 
                        key={article.id}
                        component={motion.div}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}
                    >
                        <CardContent sx={{ pb: '16px !important' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="700">
                                        {article.article_name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        UOM: {article.uom}
                                    </Typography>
                                </Box>
                                <Chip 
                                    label={article.item_code} 
                                    size="small" 
                                    sx={{ borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 'bold' }} 
                                />
                            </Box>
                            
                            <Divider sx={{ my: 1.5 }} />
                            
                            <Box display="flex" justifyContent="flex-end" gap={1}>
                                <Button 
                                    size="small" 
                                    startIcon={<Edit />} 
                                    onClick={() => handleEditClick(article)}
                                    sx={{ color: theme.palette.info.main }}
                                >
                                    Edit
                                </Button>
                                <Button 
                                    size="small" 
                                    startIcon={<Delete />} 
                                    onClick={() => handleDeleteArticle(article.id)}
                                    color="error"
                                >
                                    Delete
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                ))
            )}
        </AnimatePresence>
      </Box>

      {/* 4. Edit Dialog (Full width on mobile) */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile} // ✅ Full screen on mobile
        PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
      >
        <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <Box display="flex" alignItems="center" gap={1}>
             <Edit color="primary" /> {t('Edit Article')}
           </Box>
           <IconButton size="small" onClick={() => setEditDialogOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('Article Name')}
              value={currentArticle?.article_name || ''}
              onChange={(e) => setCurrentArticle(currentArticle ? { ...currentArticle, article_name: e.target.value } : null)}
              fullWidth
            />
            <TextField
              label={t('Item Code')}
              value={currentArticle?.item_code || ''}
              onChange={(e) => setCurrentArticle(currentArticle ? { ...currentArticle, item_code: e.target.value } : null)}
              fullWidth
            />
            <TextField
              label={t('UOM')}
              value={currentArticle?.uom || ''}
              onChange={(e) => setCurrentArticle(currentArticle ? { ...currentArticle, uom: e.target.value } : null)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit" variant="text">{t('Cancel')}</Button>
          <Button onClick={handleUpdateArticle} variant="contained" startIcon={<Save />} disableElevation>{t('Save Changes')}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ArticlesList;