import { useState, useEffect, useCallback, FC, memo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  useTheme,
  alpha,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Collapse,
  Divider,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import PersonIcon from '@mui/icons-material/Person';
import AnonymousIcon from '@mui/icons-material/PersonOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DevicesIcon from '@mui/icons-material/Devices';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  getSurvey,
  getSurveyResponses,
  getSurveyResponse,
  exportSurveyCSV,
  exportSurveyJSON,
  downloadExportedFile,
} from '../../services/surveyApi';
import {
  Survey,
  SurveyResponse,
  Answer,
  SurveyQuestion,
} from '../../types/surveys';

const SurveyResponsesPage: FC = memo(() => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id) {
      loadSurvey(id);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadResponses(id);
    }
  }, [id, page, rowsPerPage]);

  const loadSurvey = async (surveyId: string) => {
    try {
      const data = await getSurvey(surveyId);
      setSurvey(data);
    } catch (error) {
      console.error('Failed to load survey:', error);
    }
  };

  const loadResponses = async (surveyId: string) => {
    setLoading(true);
    try {
      const data = await getSurveyResponses(surveyId, page + 1, rowsPerPage);
      setResponses(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to load responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!id) return;
    try {
      const blob = format === 'csv'
        ? await exportSurveyCSV(id)
        : await exportSurveyJSON(id);
      downloadExportedFile(blob, `survey-${id}-responses.${format}`);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const handleViewResponse = async (responseId: string) => {
    if (!id) return;
    try {
      const response = await getSurveyResponse(id, responseId);
      setSelectedResponse(response);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Failed to load response:', error);
    }
  };

  const toggleQuestionExpand = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionById = (questionId: string): SurveyQuestion | undefined => {
    return survey?.questions.find((q) => q.id === questionId);
  };

  const getQuestionTitle = (questionId: string): string => {
    const question = getQuestionById(questionId);
    if (!question) return questionId;
    return lang === 'ar' && question.title_ar ? question.title_ar : (question.title || question.question_text || '');
  };

  const formatAnswer = (answer: Answer): string => {
    const question = getQuestionById(answer.question_id);
    if (!question) return String(answer.answer_value ?? '-');

    if (answer.answer_value === null || answer.answer_value === undefined) {
      return '-';
    }

    switch (question.question_type) {
      case 'single_choice':
      case 'dropdown':
        const option = question.options?.find((o) => o.value === answer.answer_value);
        return option ? (lang === 'ar' && option.label_ar ? option.label_ar : option.label) : String(answer.answer_value);
      
      case 'multiple_choice':
        if (Array.isArray(answer.answer_value)) {
          return answer.answer_value.map((v) => {
            const opt = question.options?.find((o) => o.value === v);
            return opt ? (lang === 'ar' && opt.label_ar ? opt.label_ar : opt.label) : v;
          }).join(', ');
        }
        return String(answer.answer_value);
      
      case 'yes_no':
        return answer.answer_value
          ? (lang === 'ar' ? 'نعم' : 'Yes')
          : (lang === 'ar' ? 'لا' : 'No');
      
      default:
        return String(answer.answer_value);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading && !survey) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/admin/surveys')}>
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {survey ? (lang === 'ar' && survey.title_ar ? survey.title_ar : survey.title) : (lang === 'ar' ? 'الاستجابات' : 'Responses')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lang === 'ar' ? `${total} استجابة` : `${total} responses`}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => handleExport('csv')}
        >
          {lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
        </Button>
      </Box>

      {/* Responses Table */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          backgroundColor: alpha(theme.palette.background.paper, 0.6),
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflow: 'hidden',
        }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{lang === 'ar' ? 'المستجيب' : 'Respondent'}</TableCell>
                <TableCell>{lang === 'ar' ? 'تاريخ الإرسال' : 'Submitted'}</TableCell>
                <TableCell>{lang === 'ar' ? 'المدة' : 'Duration'}</TableCell>
                <TableCell>{lang === 'ar' ? 'الجهاز' : 'Device'}</TableCell>
                <TableCell>{lang === 'ar' ? 'الإكمال' : 'Completion'}</TableCell>
                <TableCell align="right">{lang === 'ar' ? 'إجراءات' : 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: rowsPerPage }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : responses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      {lang === 'ar' ? 'لا توجد استجابات بعد' : 'No responses yet'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((response) => (
                  <TableRow
                    key={response.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      },
                    }}
                    onClick={() => handleViewResponse(response.id)}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {response.is_anonymous ? (
                          <AnonymousIcon color="action" fontSize="small" />
                        ) : (
                          <PersonIcon color="primary" fontSize="small" />
                        )}
                        <Box>
                          {response.is_anonymous ? (
                            <Typography variant="body2" color="text.secondary">
                              {lang === 'ar' ? 'مجهول' : 'Anonymous'}
                            </Typography>
                          ) : (
                            <>
                              <Typography variant="body2">
                                {response.respondent_name || '-'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {response.respondent_email || ''}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(response.submitted_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatDuration(response.time_spent_seconds)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DevicesIcon fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {response.device_type || '-'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${Math.round(response.completion_percentage)}%`}
                        color={response.completion_percentage === 100 ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewResponse(response.id);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={lang === 'ar' ? 'صفوف لكل صفحة:' : 'Rows per page:'}
          labelDisplayedRows={({ from, to, count }) =>
            lang === 'ar' ? `${from}-${to} من ${count}` : `${from}-${to} of ${count}`
          }
        />
      </Paper>

      {/* Response Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {selectedResponse?.is_anonymous ? (
              <AnonymousIcon color="action" />
            ) : (
              <PersonIcon color="primary" />
            )}
            <Box>
              <Typography variant="h6">
                {selectedResponse?.is_anonymous
                  ? (lang === 'ar' ? 'مجهول' : 'Anonymous')
                  : selectedResponse?.respondent_name || (lang === 'ar' ? 'استجابة' : 'Response')}
              </Typography>
              {selectedResponse && (
                <Typography variant="caption" color="text.secondary">
                  {formatDate(selectedResponse.submitted_at)}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedResponse && (
            <Box>
              {/* Response metadata */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    {lang === 'ar' ? 'المدة' : 'Duration'}
                  </Typography>
                  <Typography variant="body2">
                    {formatDuration(selectedResponse.time_spent_seconds)}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    {lang === 'ar' ? 'الجهاز' : 'Device'}
                  </Typography>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {selectedResponse.device_type || '-'}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    {lang === 'ar' ? 'الإكمال' : 'Completion'}
                  </Typography>
                  <Typography variant="body2">
                    {Math.round(selectedResponse.completion_percentage)}%
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="text.secondary">
                    {lang === 'ar' ? 'بدأ في' : 'Started'}
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(selectedResponse.started_at)}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 3 }} />

              {/* Answers */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                {lang === 'ar' ? 'الإجابات' : 'Answers'}
              </Typography>
              {selectedResponse.answers.map((answer, index) => {
                const question = getQuestionById(answer.question_id);
                const isExpanded = expandedQuestions.has(answer.question_id);
                
                return (
                  <Card
                    key={answer.question_id}
                    elevation={0}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.default, 0.5),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleQuestionExpand(answer.question_id)}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {lang === 'ar' ? `سؤال ${index + 1}` : `Question ${index + 1}`}
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {getQuestionTitle(answer.question_id)}
                          </Typography>
                        </Box>
                        <IconButton size="small">
                          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </Box>
                      
                      <Collapse in={isExpanded}>
                        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            {lang === 'ar' ? 'الإجابة:' : 'Answer:'}
                          </Typography>
                          <Typography variant="body1">
                            {formatAnswer(answer)}
                          </Typography>
                          {answer.other_value && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {lang === 'ar' ? 'أخرى:' : 'Other:'} {answer.other_value}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                      
                      {!isExpanded && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: theme.palette.primary.main,
                          }}
                        >
                          {formatAnswer(answer)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

export default SurveyResponsesPage;
