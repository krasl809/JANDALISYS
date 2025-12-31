import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent, 
  IconButton, useTheme, CircularProgress, Alert, Paper,
  Stack, Divider, Button, alpha, Avatar
} from '@mui/material';
import {
  Folder, Description, Storage, 
  History, Print, 
  CloudUpload, Download, FileOpen
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  XAxis, YAxis, Tooltip as RechartsTooltip, 
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
      setError(t('common.errors.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
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
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} sx={{ flexDirection: isRtl ? 'row-reverse' : 'row' }}>
        <Box sx={{ textAlign: isRtl ? 'right' : 'left' }}>
          <Typography variant="h4" fontWeight="800" color="primary">
            {t('archive.dashboard')}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {t('archive.system_overview')}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={isRtl ? null : <Print />} 
          endIcon={isRtl ? <Print /> : null}
          onClick={() => window.print()}
          sx={{ borderRadius: 2 }}
        >
          {t('archive.print_report')}
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} mb={4}>
        {[
          { title: t('archive.total_folders'), value: stats?.total_folders || 0, icon: <Folder />, color: theme.palette.primary.main },
          { title: t('archive.total_files'), value: stats?.total_files || 0, icon: <Description />, color: theme.palette.success.main },
          { title: t('archive.storage_used'), value: formatSize(stats?.total_size || 0), icon: <Storage />, color: theme.palette.info.main },
          { title: t('archive.recent_uploads'), value: stats?.activity?.length || 0, icon: <History />, color: theme.palette.secondary.main },
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
              {t('archive.upload_activity')}
            </Typography>
            <Box sx={{ height: 300, minHeight: 300, width: '100%', position: 'relative' }}>
              {stats?.monthly_stats && stats.monthly_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthly_stats}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.1}/>
                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      reversed={isRtl}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      orientation={isRtl ? 'right' : 'left'}
                    />
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
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="textSecondary">{t('dashboard.noDataAvailable')}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* File Types Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', height: '100%' }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              {t('archive.file_types')}
            </Typography>
            <Box sx={{ height: 300, minHeight: 300, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Box sx={{ height: 200, width: '100%' }}>
                {stats?.files_by_ext && stats.files_by_ext.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
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
                        {stats.files_by_ext.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="textSecondary">{t('dashboard.noDataAvailable')}</Typography>
                  </Box>
                )}
              </Box>
              <Stack spacing={1} mt={2}>
                {stats?.files_by_ext?.map((entry: any, index: number) => (
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
              {t('archive.recent_activity')}
            </Typography>
            <Stack divider={<Divider />}>
              {stats?.activity?.map((item: any, index: number) => (
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
                        {item.created_at ? format(new Date(item.created_at), 'PPP p', { locale: isRtl ? ar : undefined }) : '---'}
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
            {(!stats?.activity || stats.activity.length === 0) && (
              <Box py={4} textAlign="center">
                <Typography color="textSecondary">{t('archive.no_recent_activity')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ArchiveDashboard;
