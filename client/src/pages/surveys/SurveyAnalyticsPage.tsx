import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  alpha,
  Skeleton,
  Chip,
  Menu,
  MenuItem,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import DevicesIcon from '@mui/icons-material/Devices';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  getSurvey,
  getSurveyAnalytics,
  exportSurveyCSV,
  exportSurveyJSON,
  downloadExportedFile,
} from '../../services/surveyApi';
import {
  Survey,
  SurveyAnalytics,
  QuestionAnalytics,
} from '../../types/surveys';
import QRCodeGenerator from '../../components/surveys/QRCodeGenerator';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SurveyAnalyticsPage: React.FC = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const lang = i18n.language === 'ar' ? 'ar' : 'en';

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (surveyId: string) => {
    setLoading(true);
    try {
      const [surveyData, analyticsData] = await Promise.all([
        getSurvey(surveyId),
        getSurveyAnalytics(surveyId),
      ]);
      setSurvey(surveyData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load survey analytics:', error);
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
    setExportAnchorEl(null);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQuestionTitle = (question: QuestionAnalytics) => {
    return question.question_title;
  };

  // Summary cards data
  const summaryCards = analytics ? [
    {
      title: lang === 'ar' ? 'إجمالي الاستجابات' : 'Total Responses',
      value: analytics.total_responses,
      icon: <PeopleIcon />,
      color: theme.palette.primary.main,
    },
    {
      title: lang === 'ar' ? 'مكتملة' : 'Completed',
      value: analytics.completed_responses,
      icon: <CheckCircleIcon />,
      color: theme.palette.success.main,
    },
    {
      title: lang === 'ar' ? 'معدل الإكمال' : 'Completion Rate',
      value: `${Math.round(analytics.completion_rate)}%`,
      icon: <TrendingUpIcon />,
      color: theme.palette.info.main,
    },
    {
      title: lang === 'ar' ? 'متوسط الوقت' : 'Avg. Time',
      value: formatDuration(analytics.average_completion_time_seconds),
      icon: <ScheduleIcon />,
      color: theme.palette.warning.main,
    },
  ] : [];

  // Device breakdown data for pie chart
  const deviceData = analytics ? [
    { name: lang === 'ar' ? 'سطح المكتب' : 'Desktop', value: analytics.device_breakdown.desktop },
    { name: lang === 'ar' ? 'جوال' : 'Mobile', value: analytics.device_breakdown.mobile },
    { name: lang === 'ar' ? 'تابلت' : 'Tablet', value: analytics.device_breakdown.tablet },
  ] : [];

  // Responses over time data
  const timeData = analytics?.responses_over_time.map((item) => ({
    date: new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }),
    total: item.count,
    completed: item.completed,
  })) || [];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 2 }} />
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (!survey || !analytics) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          {lang === 'ar' ? 'لم يتم العثور على الاستبيان' : 'Survey not found'}
        </Typography>
        <Button onClick={() => navigate('/admin/surveys')} sx={{ mt: 2 }}>
          {lang === 'ar' ? 'العودة للقائمة' : 'Back to List'}
        </Button>
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
            {lang === 'ar' && survey.title_ar ? survey.title_ar : survey.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lang === 'ar' ? 'التحليلات والإحصائيات' : 'Analytics & Statistics'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={(e) => setExportAnchorEl(e.currentTarget)}
        >
          {lang === 'ar' ? 'تصدير' : 'Export'}
        </Button>
        <Menu
          anchorEl={exportAnchorEl}
          open={Boolean(exportAnchorEl)}
          onClose={() => setExportAnchorEl(null)}
        >
          <MenuItem onClick={() => handleExport('csv')}>CSV</MenuItem>
          <MenuItem onClick={() => handleExport('json')}>JSON</MenuItem>
        </Menu>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  backgroundColor: alpha(card.color, 0.1),
                  border: `1px solid ${alpha(card.color, 0.2)}`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: alpha(card.color, 0.2),
                        color: card.color,
                      }}
                    >
                      {card.icon}
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {card.title}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {card.value}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Responses Over Time */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.background.paper, 0.6),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {lang === 'ar' ? 'الاستجابات عبر الوقت' : 'Responses Over Time'}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                  <XAxis dataKey="date" stroke={theme.palette.text.secondary} />
                  <YAxis stroke={theme.palette.text.secondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={lang === 'ar' ? 'الإجمالي' : 'Total'}
                    stroke={theme.palette.primary.main}
                    strokeWidth={2}
                    dot={{ fill: theme.palette.primary.main }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name={lang === 'ar' ? 'مكتملة' : 'Completed'}
                    stroke={theme.palette.success.main}
                    strokeWidth={2}
                    dot={{ fill: theme.palette.success.main }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Device Breakdown */}
        <Grid item xs={12} md={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.background.paper, 0.6),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              height: '100%',
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {lang === 'ar' ? 'توزيع الأجهزة' : 'Device Breakdown'}
            </Typography>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Question Analytics */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.background.paper, 0.6),
              border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              {lang === 'ar' ? 'تحليل الأسئلة' : 'Question Analytics'}
            </Typography>
            <Grid container spacing={3}>
              {analytics.question_analytics.map((question, index) => (
                <Grid item xs={12} md={6} key={question.question_id}>
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.background.default, 0.5),
                      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    }}
                  >
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        {index + 1}. {question.question_title}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Chip
                          size="small"
                          label={`${question.response_count} ${lang === 'ar' ? 'استجابة' : 'responses'}`}
                        />
                        <Chip
                          size="small"
                          label={`${Math.round(question.skip_rate * 100)}% ${lang === 'ar' ? 'تخطي' : 'skip'}`}
                          color="warning"
                        />
                      </Box>
                      {question.distribution.length > 0 && (
                        <Box sx={{ height: 150 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={question.distribution} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" />
                              <YAxis dataKey="label" type="category" width={80} />
                              <Tooltip />
                              <Bar dataKey="count" fill={theme.palette.primary.main} radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Box>
                      )}
                      {question.average_value !== undefined && question.average_value !== null && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {lang === 'ar' ? 'المتوسط:' : 'Average:'} {Number(question.average_value).toFixed(2)}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Sentiment Analysis (if available) */}
        {analytics.sentiment_analysis && (
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.background.paper, 0.6),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                {lang === 'ar' ? 'تحليل المشاعر' : 'Sentiment Analysis'}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: theme.palette.success.main, fontWeight: 700 }}>
                      {Math.round(analytics.sentiment_analysis.positive * 100)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lang === 'ar' ? 'إيجابي' : 'Positive'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: theme.palette.warning.main, fontWeight: 700 }}>
                      {Math.round(analytics.sentiment_analysis.neutral * 100)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lang === 'ar' ? 'محايد' : 'Neutral'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ color: theme.palette.error.main, fontWeight: 700 }}>
                      {Math.round(analytics.sentiment_analysis.negative * 100)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {lang === 'ar' ? 'سلبي' : 'Negative'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SurveyAnalyticsPage;
