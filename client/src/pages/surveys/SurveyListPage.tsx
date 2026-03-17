import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
  Skeleton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Pagination,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BarChartIcon from '@mui/icons-material/BarChart';
import QrCodeIcon from '@mui/icons-material/QrCode';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import PeopleIcon from '@mui/icons-material/People';
import {
  listSurveys,
  deleteSurvey,
  duplicateSurvey,
  copySurveyLink,
} from '../../services/surveyApi';
import {
  SurveyListItem,
  SurveyStatus,
} from '../../types/surveys';
import QRCodeGenerator from '../../components/surveys/QRCodeGenerator';

const statusColors: Record<SurveyStatus, string> = {
  draft: 'default',
  active: 'success',
  paused: 'warning',
  closed: 'error',
  archived: 'default',
};

const statusLabels: Record<SurveyStatus, Record<string, string>> = {
  draft: { en: 'Draft', ar: 'مسودة' },
  active: { en: 'Active', ar: 'نشط' },
  paused: { en: 'Paused', ar: 'متوقف' },
  closed: { en: 'Closed', ar: 'مغلق' },
  archived: { en: 'Archived', ar: 'مؤرشف' },
};

const SurveyListPage: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listSurveys(page, 12, statusFilter || undefined, search || undefined);
      setSurveys(response.items);
      setTotalPages(response.pages);
    } catch (error) {
      console.error('Failed to fetch surveys:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, survey: SurveyListItem) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedSurvey(survey);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSurvey(null);
  };

  const handleCopyLink = async (surveyId: string) => {
    const success = await copySurveyLink(surveyId);
    if (success) {
      setCopiedId(surveyId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedSurvey) return;
    try {
      await duplicateSurvey(selectedSurvey.id);
      fetchSurveys();
    } catch (error) {
      console.error('Failed to duplicate survey:', error);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedSurvey) return;
    try {
      await deleteSurvey(selectedSurvey.id);
      fetchSurveys();
    } catch (error) {
      console.error('Failed to delete survey:', error);
    }
    setDeleteDialogOpen(false);
    handleMenuClose();
  };

  const handleStatusChange = async (newStatus: SurveyStatus) => {
    // This would call an API to update the survey status
    handleMenuClose();
  };

  const getStatusLabel = (status: SurveyStatus) => {
    return statusLabels[status]?.[lang] || status;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          {lang === 'ar' ? 'الاستبيانات' : 'Surveys'}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/admin/surveys/create')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            px: 3,
          }}
        >
          {lang === 'ar' ? 'استبيان جديد' : 'New Survey'}
        </Button>
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          backgroundColor: alpha(theme.palette.background.paper, 0.6),
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>{lang === 'ar' ? 'الحالة' : 'Status'}</InputLabel>
              <Select
                value={statusFilter}
                label={lang === 'ar' ? 'الحالة' : 'Status'}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="">{lang === 'ar' ? 'الكل' : 'All'}</MenuItem>
                <MenuItem value="draft">{lang === 'ar' ? 'مسودة' : 'Draft'}</MenuItem>
                <MenuItem value="active">{lang === 'ar' ? 'نشط' : 'Active'}</MenuItem>
                <MenuItem value="paused">{lang === 'ar' ? 'متوقف' : 'Paused'}</MenuItem>
                <MenuItem value="closed">{lang === 'ar' ? 'مغلق' : 'Closed'}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Survey Grid */}
      <Grid container spacing={3}>
        <AnimatePresence>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
                </Grid>
              ))
            : surveys.map((survey, index) => (
                <Grid item xs={12} sm={6} md={4} key={survey.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      elevation={0}
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        backgroundColor: alpha(theme.palette.background.paper, 0.6),
                        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                        },
                      }}
                      onClick={() => navigate(`/admin/surveys/${survey.id}/analytics`)}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              flex: 1,
                            }}
                          >
                            {lang === 'ar' && survey.title_ar ? survey.title_ar : survey.title}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, survey)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Chip
                            label={getStatusLabel(survey.status)}
                            size="small"
                            color={statusColors[survey.status] as any}
                            sx={{ borderRadius: 1 }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: theme.palette.text.secondary }}>
                          <PeopleIcon fontSize="small" />
                          <Typography variant="body2">
                            {survey.response_count} {lang === 'ar' ? 'استجابة' : 'responses'}
                          </Typography>
                        </Box>

                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: theme.palette.text.secondary }}>
                          {lang === 'ar' ? 'تم الإنشاء:' : 'Created:'} {formatDate(survey.created_at)}
                        </Typography>
                      </CardContent>

                      <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                        <Tooltip title={lang === 'ar' ? 'نسخ الرابط' : 'Copy Link'}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(survey.id);
                            }}
                            color={copiedId === survey.id ? 'success' : 'default'}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={lang === 'ar' ? 'رمز QR' : 'QR Code'}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSurvey(survey);
                              setQrDialogOpen(true);
                            }}
                          >
                            <QrCodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={lang === 'ar' ? 'التحليلات' : 'Analytics'}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/surveys/${survey.id}/analytics`);
                            }}
                          >
                            <BarChartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
        </AnimatePresence>
      </Grid>

      {/* Empty State */}
      {!loading && surveys.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {lang === 'ar' ? 'لا توجد استبيانات' : 'No surveys found'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/admin/surveys/create')}
            sx={{ mt: 2 }}
          >
            {lang === 'ar' ? 'إنشاء استبيان' : 'Create Survey'}
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { borderRadius: 2, minWidth: 180 },
        }}
      >
        <MenuItem onClick={() => { navigate(`/admin/surveys/${selectedSurvey?.id}/edit`); handleMenuClose(); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{lang === 'ar' ? 'تعديل' : 'Edit'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate(`/admin/surveys/${selectedSurvey?.id}/responses`); handleMenuClose(); }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{lang === 'ar' ? 'عرض الاستجابات' : 'View Responses'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate}>
          <ListItemIcon><ContentCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>{lang === 'ar' ? 'نسخ' : 'Duplicate'}</ListItemText>
        </MenuItem>
        {selectedSurvey?.status === 'active' && (
          <MenuItem onClick={() => handleStatusChange('paused')}>
            <ListItemIcon><PauseIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{lang === 'ar' ? 'إيقاف مؤقت' : 'Pause'}</ListItemText>
          </MenuItem>
        )}
        {selectedSurvey?.status === 'paused' && (
          <MenuItem onClick={() => handleStatusChange('active')}>
            <ListItemIcon><PlayArrowIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{lang === 'ar' ? 'تفعيل' : 'Activate'}</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: theme.palette.error.main }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>{lang === 'ar' ? 'حذف' : 'Delete'}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</DialogTitle>
        <DialogContent>
          <Typography>
            {lang === 'ar'
              ? `هل أنت متأكد من حذف "${selectedSurvey?.title}"؟`
              : `Are you sure you want to delete "${selectedSurvey?.title}"?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {lang === 'ar' ? 'حذف' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={() => setQrDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{lang === 'ar' ? 'رمز QR' : 'QR Code'}</DialogTitle>
        <DialogContent>
          {selectedSurvey && (
            <QRCodeGenerator surveyId={selectedSurvey.id} size={250} lang={lang} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SurveyListPage;
