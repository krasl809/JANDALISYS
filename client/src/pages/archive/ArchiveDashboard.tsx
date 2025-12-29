import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent, 
  IconButton, useTheme, CircularProgress, Alert, Paper,
  Stack, Divider, Button, alpha, Avatar
} from '@mui/material';
import {
  Folder, Description, Storage, TrendingUp, 
  History, PieChart as PieChartIcon, Print, 
  CloudUpload, Download, FileOpen
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const ArchiveDashboard = () => {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/archive/stats');
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load archive statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );

  if (error) return (
    <Container sx={{ mt: 4 }}>
      <Alert severity="error">{error}</Alert>
    </Container>
  );

  const COLORS = [theme.palette.primary.main, theme.palette.secondary.main, theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, direction: isRtl ? 'rtl' : 'ltr' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="800" color="primary">
            {t('Archive Dashboard')}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {t('System overview and document statistics')}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Print />} 
          onClick={() => window.print()}
          sx={{ borderRadius: 2 }}
        >
          {t('Print Report')}
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        {[
          { title: t('Total Folders'), value: stats.total_folders, icon: <Folder />, color: theme.palette.primary.main },
          { title: t('Total Files'), value: stats.total_files, icon: <Description />, color: theme.palette.success.main },
          { title: t('Storage Used'), value: formatSize(stats.total_size), icon: <Storage />, color: theme.palette.info.main },
          { title: t('Recent Uploads'), value: stats.activity.length, icon: <History />, color: theme.palette.secondary.main },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
              <Card sx={{ 
                borderRadius: 4, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                border: '1px solid',
                borderColor: alpha(stat.color, 0.1),
                bgcolor: alpha(stat.color, 0.02)
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {stat.value}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(stat.color, 0.1), color: stat.color, width: 56, height: 56 }}>
                      {stat.icon}
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Uploads Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              {t('Upload Activity')}
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthly_stats}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: theme.shadows[3] }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke={theme.palette.primary.main} 
                    fillOpacity={1} 
                    fill="url(#colorCount)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* File Types Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              {t('File Types')}
            </Typography>
            <Box height={300} display="flex" flexDirection="column" justifyContent="center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.files_by_ext}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="ext"
                  >
                    {stats.files_by_ext.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <Stack spacing={1} mt={2}>
                {stats.files_by_ext.map((entry: any, index: number) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: COLORS[index % COLORS.length] }} />
                      <Typography variant="body2">{entry.ext}</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight="bold">{entry.count}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity List */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              {t('Recent Activity')}
            </Typography>
            <Stack divider={<Divider />}>
              {stats.activity.map((item: any, index: number) => (
                <Box key={index} py={2} display="flex" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                      <CloudUpload />
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="600">
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {format(new Date(item.created_at), 'PPP p', { locale: isRtl ? ar : undefined })}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <IconButton size="small" color="primary">
                      <FileOpen fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="secondary">
                      <Download fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
            {stats.activity.length === 0 && (
              <Box py={4} textAlign="center">
                <Typography color="textSecondary">{t('No recent activity found')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ArchiveDashboard;
