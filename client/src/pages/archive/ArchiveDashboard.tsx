import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, 
  IconButton, useTheme, CircularProgress, Alert, Paper,
  Stack, Divider, Button, alpha, Avatar
} from '@mui/material';
import {
  Folder, Description, Storage, 
  History, Print, 
  CloudUpload, Download, FileOpen
} from '@mui/icons-material';
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
  const isRtl = i18n.language.startsWith('ar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('archive/stats');
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError(t('common.errors.network_error'));
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return `0 ${t('common.units.bytes', { defaultValue: 'Bytes' })}`;
    const k = 1024;
    const sizes = [
      t('common.units.bytes', { defaultValue: 'Bytes' }),
      t('common.units.kb', { defaultValue: 'KB' }),
      t('common.units.mb', { defaultValue: 'MB' }),
      t('common.units.gb', { defaultValue: 'GB' }),
      t('common.units.tb', { defaultValue: 'TB' })
    ];
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
    <Box sx={{ 
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      <Box mb={6} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" fontWeight="700" sx={{ mb: 1, color: 'text.primary' }}>
            {t('archive.dashboard')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('archive.system_overview')}
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          size="small"
          startIcon={isRtl ? null : <Print />} 
          endIcon={isRtl ? <Print /> : null}
          onClick={() => window.print()}
          sx={{ borderRadius: '4px' }}
        >
          {t('archive.print_report')}
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} mb={4}>
        {[
          { title: t('archive.total_folders'), value: stats?.total_folders || 0, icon: <Folder />, color: theme.palette.primary.main },
          { title: t('archive.total_files'), value: stats?.total_files || 0, icon: <Description />, color: theme.palette.success.main },
          { title: t('archive.storage_used'), value: formatSize(stats?.total_size || 0), icon: <Storage />, color: theme.palette.info.main },
          { title: t('archive.recent_uploads'), value: stats?.activity?.length || 0, icon: <History />, color: theme.palette.secondary.main },
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: 'background.paper',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: stat.color,
                  boxShadow: `0 4px 12px ${alpha(stat.color, 0.08)}`,
                  transform: 'translateY(-2px)',
                }
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '8px',
                  bgcolor: alpha(stat.color as string, 0.1),
                  color: stat.color,
                }}
              >
                {React.cloneElement(stat.icon as React.ReactElement, { fontSize: 'small' })}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="700" sx={{ lineHeight: 1.2 }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" fontWeight="500">
                  {stat.title}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Monthly Uploads Chart */}
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              border: `1px solid ${theme.palette.divider}`,
              height: '100%',
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="h6" fontWeight="700" mb={3}>
              {t('archive.upload_activity')}
            </Typography>
            <Box sx={{ height: 300, minHeight: 300, width: '100%', position: 'relative', minWidth: 0, overflow: 'hidden' }}>
              {stats?.monthly_stats && stats.monthly_stats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
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
                      tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                      reversed={isRtl}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                      orientation={isRtl ? 'right' : 'left'}
                      dx={isRtl ? 10 : -10}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: 8, 
                        border: `1px solid ${theme.palette.divider}`, 
                        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                        backgroundColor: theme.palette.background.paper,
                        color: theme.palette.text.primary
                      }}
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
                  <Typography color="textSecondary">{t('archive.noDataAvailable')}</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* File Types Distribution */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              border: `1px solid ${theme.palette.divider}`,
              height: '100%',
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="h6" fontWeight="700" mb={3}>
              {t('archive.file_types')}
            </Typography>
            <Box sx={{ height: 300, minHeight: 300, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, overflow: 'hidden' }}>
              <Box sx={{ height: 200, minHeight: 200, width: '100%', position: 'relative', minWidth: 0, overflow: 'hidden' }}>
                {stats?.files_by_ext && stats.files_by_ext.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
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
                      <RechartsTooltip 
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: `1px solid ${theme.palette.divider}`, 
                          boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                          backgroundColor: theme.palette.background.paper
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                    <Typography color="textSecondary">{t('archive.noDataAvailable')}</Typography>
                  </Box>
                )}
              </Box>
              <Stack spacing={1} mt={2}>
                {stats?.files_by_ext?.map((entry: any, index: number) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ overflow: 'hidden' }}>
                      <Box sx={{ minWidth: 8, width: 8, height: 8, borderRadius: '50%', bgcolor: COLORS[index % COLORS.length] }} />
                      <Typography variant="caption" color="text.secondary" noWrap>{entry.ext}</Typography>
                    </Stack>
                    <Typography variant="caption" fontWeight="700" sx={{ ml: isRtl ? 0 : 1, mr: isRtl ? 1 : 0 }}>{entry.count}</Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity List */}
        <Grid item xs={12}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              borderRadius: 2, 
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="h6" fontWeight="700" mb={3}>
              {t('archive.recent_activity')}
            </Typography>
            <Stack divider={<Divider sx={{ opacity: 0.5 }} />}>
              {stats?.activity?.map((item: any, index: number) => (
                <Box 
                  key={index} 
                  py={2} 
                  display="flex" 
                  justifyContent="space-between" 
                  alignItems="center"
                  sx={{ 
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                    px: 1,
                    borderRadius: 1
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Avatar sx={{ 
                      width: 36, 
                      height: 36, 
                      bgcolor: alpha(theme.palette.primary.main, 0.1), 
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                    }}>
                      <CloudUpload fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="600">
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.created_at ? format(new Date(item.created_at), 'PPP p', { locale: isRtl ? ar : undefined }) : '---'}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton 
                      size="small" 
                      sx={{ '&:hover': { color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
                    >
                      <FileOpen fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      sx={{ '&:hover': { color: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.05) } }}
                    >
                      <Download fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
            </Stack>
            {(!stats?.activity || stats.activity.length === 0) && (
              <Box py={4} textAlign="center">
                <Typography variant="body2" color="text.secondary">{t('archive.no_recent_activity')}</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ArchiveDashboard;
