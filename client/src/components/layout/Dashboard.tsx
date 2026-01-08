import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button,
  Chip, Avatar, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, useTheme,
  Alert, Skeleton, Paper
} from '@mui/material';
import {
  AccessTime, LocalShipping, AttachMoney, Warning, ArrowForward,
  NotificationsActive, MoreVert, CheckCircle, TrendingUp
} from '@mui/icons-material';
import {
  motion, AnimatePresence
} from 'framer-motion';
import { alpha } from '@mui/material/styles';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

// --- COMPONENTS ---

// 1. Executive: Smart Brief Header
const SmartBrief = React.memo(() => {
  const theme = useTheme();
  const { t } = useTranslation();
  const { palette, boxShadows }: any = theme;

  return (
    <Card sx={{
      mb: 4,
      background: `linear-gradient(135deg, ${palette.gradients.primary.main} 0%, ${palette.gradients.primary.state} 100%)`,
      color: 'white',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: boxShadows.lg,
      border: 'none',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,        left: 0,        right: 0,        bottom: 0,
        background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2) 0%, transparent 70%)',
        zIndex: 1
      },
    }}>
      <CardContent sx={{ p: { xs: 3, md: 4 }, position: 'relative', zIndex: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3}>
          <Box>
            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
              <CheckCircle sx={{ fontSize: 24, color: '#fff' }} />
              <Typography variant="h4" fontWeight="700" sx={{ color: 'white' }}>
                {t('dashboard.systemStatusOperational')}
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 400, maxWidth: '600px' }}>
              {t('dashboard.systemStatusDescription')}
            </Typography>
          </Box>
          <Box display="flex" gap={1.5}>
            <Button 
              variant="contained" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                fontWeight: 600
              }}
            >
              {t('dashboard.viewReports')}
            </Button>
            <IconButton sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
              <NotificationsActive />
            </IconButton>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
});

// 2. Executive: Visual Pipeline
const VisualPipeline = React.memo(() => {
    const theme = useTheme();
    const { palette, boxShadows }: any = theme;
    const { t } = useTranslation();
    const iconMap = useMemo(() => ({
        AccessTime: AccessTime,
        LocalShipping: LocalShipping,
        AttachMoney: AttachMoney,
        Warning: Warning
    }), []);

    interface PipelineStepRaw {
        icon: string;
        color: string;
        label: string;
        amount: string;
        value: string;
    }

    interface PipelineStepProcessed {
        icon: React.ReactElement;
        color: string;
        label: string;
        amount: string;
        value: string;
    }

    const [steps, setSteps] = useState<PipelineStepProcessed[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(API_ENDPOINTS.DASHBOARD.PIPELINE);
            const data: PipelineStepProcessed[] = (response.data as PipelineStepRaw[]).map((step: PipelineStepRaw) => ({
                ...step,
                icon: React.createElement(iconMap[step.icon as keyof typeof iconMap] || AccessTime)
            }));
            setSteps(data);
        } catch (err) {
            console.error('Failed to fetch pipeline data', err);
        } finally {
            setLoading(false);
        }
    }, [iconMap]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as any } }
    };

  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 4, height: 24, bgcolor: theme.palette.primary.main, borderRadius: 2 }} />
        {t('dashboard.liveFlow')}
      </Typography>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Grid container spacing={3}>
          {loading ? (
            [...Array(4)].map((_, i) => (
              <Grid item xs={12} sm={6} md={3} key={`skeleton-${i}`}>
                <Card sx={{ p: 3, borderRadius: 3 }}>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Skeleton variant="circular" width={32} height={32} />
                      <Skeleton variant="text" width="60%" />
                    </Box>
                    <Skeleton variant="text" width="80%" height={40} />
                    <Skeleton variant="text" width="40%" />
                  </Stack>
                </Card>
              </Grid>
            ))
          ) : (
            steps.map((step, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <motion.div variants={itemVariants}>
                  <Card sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                    background: palette.background.paper,
                    transition: 'all 0.3s ease',
                    boxShadow: boxShadows.sm,
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: boxShadows.md,
                      border: `1px solid ${alpha(step.color, 0.2)}`,
                      '& .icon-bg': { transform: 'scale(1.2) rotate(15deg)', opacity: 0.15 }
                    }
                  }}>
                    <Box className="icon-bg" sx={{
                      position: 'absolute', top: -10, right: -10, width: 90, height: 90,
                      bgcolor: step.color, borderRadius: '50%', opacity: 0.08,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.5s ease'
                    }}>
                      {React.cloneElement(step.icon as React.ReactElement, { sx: { fontSize: 48 } })}
                    </Box>
                    <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                      <Stack spacing={1.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ 
                            bgcolor: alpha(step.color, 0.1), 
                            color: step.color, 
                            width: 36, 
                            height: 36,
                            boxShadow: `0 4px 8px ${alpha(step.color, 0.2)}`
                          }}>
                            {React.cloneElement(step.icon as React.ReactElement, { sx: { fontSize: 20 } })}
                          </Avatar>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                            {step.label}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>{step.value}</Typography>
                          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                            <TrendingUp sx={{ fontSize: 16, color: step.color }} />
                            <Typography variant="body2" sx={{ color: step.color, fontWeight: 700 }}>{step.amount}</Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))
          )}
        </Grid>
      </motion.div>
    </Box>
  );
});

// 3. Executive: Risk Radar
const RiskRadar = React.memo(() => {
    const theme = useTheme();
    const { palette, boxShadows }: any = theme;
    const { t } = useTranslation();
    const iconMap = useMemo(() => ({
        LocalShipping: LocalShipping,
        AttachMoney: AttachMoney,
        Warning: Warning
    }), []);

    interface AlertRaw {
        id: string | number;
        icon: string;
        color: string;
        title: string;
        description: string;
        action: string;
    }

    interface AlertProcessed {
        id: string | number;
        icon: React.ReactElement;
        color: string;
        title: string;
        description: string;
        action: string;
    }

    const [alerts, setAlerts] = useState<AlertProcessed[]>([]);
    const [loading, setLoading] = useState(true);

   useEffect(() => {
       const fetchData = async () => {
           try {
               setLoading(true);
               const response = await api.get(API_ENDPOINTS.DASHBOARD.RISKS);
               const data: AlertProcessed[] = (response.data as AlertRaw[]).map((alert: AlertRaw) => ({
                   ...alert,
                   icon: React.createElement(iconMap[alert.icon as keyof typeof iconMap] || Warning, { color: alert.color as any })
               }));
               setAlerts(data);
           } catch (err) {
               console.error('Failed to fetch risks data', err);
           } finally {
               setLoading(false);
           }
       };
       fetchData();
   }, []);

   // Ensure cards inside have readable backgrounds regardless of theme
   const cardBg = theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.4) : '#fff';

  return (
    <Card
      sx={{
        borderRadius: '16px',
        border: `1px solid ${alpha(theme.palette.warning.light, 0.2)}`,
        bgcolor: palette.background.paper,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: boxShadows.md,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          bgcolor: theme.palette.warning.main,
          opacity: 0.5
        }
      }}
      aria-label="Risk alerts and notifications"
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ 
              p: 1.2, 
              borderRadius: 2, 
              bgcolor: alpha(theme.palette.warning.main, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Warning color="warning" sx={{ fontSize: 24 }} />
            </Box>
            <Typography variant="h6" fontWeight="800" color="text.primary">{t('dashboard.riskAlerts')}</Typography>
          </Box>
          <Chip label={alerts.length} size="small" color="warning" sx={{ fontWeight: 800 }} />
        </Box>

        <Stack spacing={2}>
          {loading ? (
            [...Array(3)].map((_, i) => (
              <Box key={i} sx={{ p: 2, bgcolor: cardBg, borderRadius: 3 }}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Skeleton variant="circular" width={24} height={24} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Box>
              </Box>
            ))
          ) : (
            <AnimatePresence>
              {alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={2}
                    bgcolor={cardBg}
                    borderRadius={3}
                    sx={{
                      border: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      cursor: 'pointer',
                      '&:hover': { 
                        transform: 'translateX(-8px)',
                        bgcolor: alpha(theme.palette.background.paper, 0.8),
                        boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.05)}`
                      }
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box sx={{ color: (theme.palette as any)[alert.color]?.main || theme.palette.primary.main }}>
                        {alert.icon}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="700" color="text.primary">{t(alert.title)}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>{t(alert.description)}</Typography>
                      </Box>
                    </Box>
                    <IconButton 
                      size="small" 
                      color={(alert.color as any) === 'error' || (alert.color as any) === 'warning' || (alert.color as any) === 'info' || (alert.color as any) === 'success' || (alert.color as any) === 'primary' || (alert.color as any) === 'secondary' ? (alert.color as any) : 'default'}
                      sx={{ bgcolor: alpha((theme.palette as any)[alert.color]?.main || theme.palette.primary.main, 0.1) }}
                    >
                      <ArrowForward fontSize="small" />
                    </IconButton>
                  </Box>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
});

// 4. Executive: Profit Chart
const ProfitChart = React.memo(() => {
    const theme = useTheme();
    const { palette, boxShadows }: any = theme;
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any[]>([]);

    const barColors = useMemo(() => [
        (theme.palette as any).financial.chart.primary,
        (theme.palette as any).financial.chart.secondary,
        (theme.palette as any).financial.chart.tertiary,
        (theme.palette as any).financial.chart.quaternary,
    ], [theme.palette]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get(API_ENDPOINTS.DASHBOARD.PROFIT_CHART);
            setData(response.data || []);
        } catch (err) {
            console.error('Failed to fetch profit data', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <Card
                sx={{
                    height: '100%',
                    minHeight: 350,
                    borderRadius: 4,
                    p: 3,
                    boxShadow: theme.palette.mode === 'light' ? '0 10px 40px rgba(0,0,0,0.05)' : '0 10px 40px rgba(0,0,0,0.2)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
            >
                <Stack spacing={2}>
                    <Skeleton variant="text" width="40%" height={32} />
                    <Skeleton variant="text" width="60%" height={24} />
                    <Skeleton variant="rectangular" width="100%" height={200} sx={{ borderRadius: 2 }} />
                </Stack>
            </Card>
        );
    }

    if (error) {
        return (
            <Card
                sx={{
                    height: '100%',
                    minHeight: 350,
                    borderRadius: 4,
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${theme.palette.error.light}`,
                    bgcolor: alpha(theme.palette.error.main, 0.02)
                }}
            >
                <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                height: '100%',
                minHeight: 350,
                borderRadius: '16px',
                p: 3,
                boxShadow: boxShadows.md,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                background: palette.background.paper,
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                    boxShadow: boxShadows.lg,
                }
            }}
            aria-label={t('dashboard.profitChartVisualization')}
        >
            <Box mb={4} display="flex" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="h6" fontWeight="800" sx={{ mb: 0.5 }}>{t('dashboard.netProfitIndex')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.7 }}>{t('dashboard.monthlyPerformanceSummary')}</Typography>
                </Box>
                <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }}>
                    <TrendingUp color="primary" />
                </Box>
            </Box>
            {data.length === 0 ? (
                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height={200} gap={2}>
                    <Box sx={{ opacity: 0.2 }}>
                        <BarChart width={40} height={40} data={[{v:1}]}>
                            <Bar dataKey="v" fill={theme.palette.text.disabled} />
                        </BarChart>
                    </Box>
                    <Typography color="text.secondary" variant="body2">{t('dashboard.noDataAvailable')}</Typography>
                </Box>
            ) : (
                <Box sx={{ height: 220, width: '100%', position: 'relative', minHeight: 220, minWidth: 0, overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                {barColors.map((color, i) => (
                                    <linearGradient key={`grad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={color} stopOpacity={1} />
                                        <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 500 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 500 }}
                            />
                            <RechartsTooltip
                                cursor={{ fill: alpha(theme.palette.primary.main, 0.05), radius: 4 }}
                                contentStyle={{
                                    borderRadius: 12,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                    backgroundColor: theme.palette.mode === 'dark' 
                                        ? alpha(theme.palette.background.paper, 0.95)
                                        : theme.palette.background.paper,
                                    padding: '12px'
                                }}
                                itemStyle={{ fontWeight: 700, color: theme.palette.text.primary }}
                                labelStyle={{ marginBottom: '4px', opacity: 0.7, fontSize: '12px' }}
                            />
                            <Bar dataKey="val" radius={[6, 6, 0, 0]} barSize={32}>
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={`url(#barGrad-${index % barColors.length})`} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Card>
    );
});

// --- WRAPPERS ---

const ExecutiveDashboard = () => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
    <SmartBrief />
    <VisualPipeline />
    <Grid container spacing={3}>
      <Grid item xs={12} md={8} sx={{ minHeight: 300 }}>
        <ProfitChart />
      </Grid>
      <Grid item xs={12} md={4}>
        <RiskRadar />
      </Grid>
    </Grid>
  </motion.div>
);

const OperationalStatCard = React.memo(({ title, value, icon, color, delay = 0 }: any) => {
    const theme = useTheme();
    const { t } = useTranslation();
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
        >
            <Card
                sx={{
                    p: 2.5,
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    background: theme.palette.mode === 'dark'
                        ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)`
                        : `linear-gradient(135deg, #ffffff 0%, ${alpha(theme.palette.background.paper, 0.5)} 100%)`,
                    boxShadow: theme.palette.mode === 'light' 
                        ? '0 4px 20px rgba(0,0,0,0.03)' 
                        : '0 4px 20px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                        boxShadow: theme.palette.mode === 'light' 
                            ? '0 12px 30px rgba(0,0,0,0.08)' 
                            : '0 12px 30px rgba(0,0,0,0.4)',
                        transform: 'translateY(-5px)',
                        border: `1px solid ${alpha(color, 0.3)}`,
                        '& .stat-avatar': {
                            transform: 'scale(1.1) rotate(5deg)',
                            boxShadow: `0 8px 16px ${alpha(color, 0.3)}`
                        }
                    },
                }}
                aria-label={`${t(title)}: ${value}`}
            >
                <Stack direction="row" spacing={2.5} alignItems="center">
                    <Avatar 
                        className="stat-avatar"
                        variant="rounded" 
                        sx={{ 
                            bgcolor: alpha(color, 0.1), 
                            color: color, 
                            width: 56, 
                            height: 56,
                            borderRadius: 3,
                            transition: 'all 0.4s ease',
                            boxShadow: `0 4px 10px ${alpha(color, 0.1)}`
                        }}
                    >
                        {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: 28 } })}
                    </Avatar>
                    <Box>
                        <Typography variant="h4" fontWeight="900" sx={{ letterSpacing: -1 }}>{value}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, opacity: 0.8 }}>{t(title)}</Typography>
                    </Box>
                </Stack>
            </Card>
        </motion.div>
    )
});

const OperationalDashboard = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [operationalData, setOperationalData] = useState<any[]>([]);
    const [stats, setStats] = useState({
        tasks_today: 0,
        review_pending: 0,
        arriving: 0,
        pay_requests: 0
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get(API_ENDPOINTS.DASHBOARD.OPERATIONAL_DATA);
                setOperationalData(response.data);
                setError(null);
            } catch (err) {
                setError(t('dashboard.errorLoadingOperationalData'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [t]);

    useEffect(() => {
        const fetchStats = async () => {
        try {
            console.log("🔍 Dashboard: Fetching stats...");
            const res = await api.get(API_ENDPOINTS.DASHBOARD.STATS);
            console.log("✅ Dashboard: Stats received:", res.data);
            setStats(res.data);
        } catch (error) {
            console.error('Failed to load dashboard stats', error);
        }
    };
        fetchStats();
    }, []);

    return (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <Box display="flex" alignItems="center" gap={2} mb={4}>
                <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.15), borderRadius: 2, display: 'flex' }}>
                    <NotificationsActive color="primary" />
                </Box>
                <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: -0.5 }}>{t('dashboard.dailyOperations')}</Typography>
            </Box>

            <Grid container spacing={3} mb={6}>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.tasksToday" value={stats.tasks_today.toString()} icon={<AccessTime />} color={theme.palette.primary.main} delay={0.1} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.reviewPending" value={stats.review_pending.toString()} icon={<Warning />} color={theme.palette.secondary.main} delay={0.2} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.arriving" value={stats.arriving.toString()} icon={<LocalShipping />} color={theme.palette.info.main} delay={0.3} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.payRequests" value={stats.pay_requests.toString()} icon={<AttachMoney />} color={theme.palette.error.main} delay={0.4} />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <motion.div variants={itemVariants}>
                        <Card
                            sx={{
                                borderRadius: 4,
                                boxShadow: theme.palette.mode === 'light' 
                                    ? '0 10px 40px rgba(0,0,0,0.05)' 
                                    : '0 10px 40px rgba(0,0,0,0.2)',
                                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                overflow: 'hidden',
                                background: theme.palette.mode === 'dark'
                                    ? alpha(theme.palette.background.paper, 0.95)
                                    : theme.palette.background.paper,
                            }}
                        >
                            <Box p={3} display="flex" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6" fontWeight="800">{t('dashboard.recentMovements')}</Typography>
                                <Button 
                                    variant="outlined" 
                                    size="small" 
                                    endIcon={<ArrowForward />}
                                    sx={{ borderRadius: 2, fontWeight: 700 }}
                                >
                                    {t('dashboard.viewAll')}
                                </Button>
                            </Box>
                            {loading ? (
                                <Box p={3}>
                                    {[...Array(5)].map((_, i) => (
                                        <Box key={i} display="flex" gap={2} mb={2}>
                                            <Skeleton variant="rectangular" width={60} height={20} />
                                            <Skeleton variant="rectangular" width="20%" height={20} />
                                            <Skeleton variant="rectangular" width="30%" height={20} />
                                            <Skeleton variant="rectangular" width="15%" height={20} />
                                        </Box>
                                    ))}
                                </Box>
                            ) : error ? (
                                <Box p={3}>
                                    <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
                                </Box>
                            ) : operationalData.length === 0 ? (
                                <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={6} gap={2}>
                                    <Box sx={{ opacity: 0.1 }}>
                                        <NotificationsActive sx={{ fontSize: 64 }} />
                                    </Box>
                                    <Typography color="text.secondary" variant="body2">{t('dashboard.noOperationalData')}</Typography>
                                </Box>
                            ) : (
                                <TableContainer>
                                    <Table>
                                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 700 }}>{t('common.id')}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{t('common.type')}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{t('common.counterparty')}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{t('common.date')}</TableCell>
                                                <TableCell sx={{ fontWeight: 700 }}>{t('common.status')}</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 700 }}>{t('common.action')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {operationalData.map((row) => (
                                                <TableRow 
                                                    key={row.id} 
                                                    hover
                                                    sx={{ 
                                                        '&:last-child td, &:last-child th': { border: 0 },
                                                        transition: 'background-color 0.2s ease',
                                                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }
                                                    }}
                                                >
                                                    <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'primary.main' }}>#{row.id}</TableCell>
                                                    <TableCell sx={{ fontWeight: 600 }}>{t(row.type)}</TableCell>
                                                    <TableCell>{row.party}</TableCell>
                                                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{row.date}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={t(row.status)}
                                                            size="small"
                                                            sx={{ 
                                                                fontWeight: 700,
                                                                borderRadius: 1.5,
                                                                bgcolor: alpha(
                                                                    row.status === 'Active' ? theme.palette.success.main : 
                                                                    row.status === 'Pending' ? theme.palette.warning.main : 
                                                                    row.status === 'Completed' ? theme.palette.info.main : 
                                                                    theme.palette.grey[500], 0.1
                                                                ),
                                                                color: 
                                                                    row.status === 'Active' ? 'success.main' : 
                                                                    row.status === 'Pending' ? 'warning.main' : 
                                                                    row.status === 'Completed' ? 'info.main' : 
                                                                    'text.secondary',
                                                                border: 'none'
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton size="small" sx={{ bgcolor: alpha(theme.palette.divider, 0.05) }}>
                                                            <MoreVert fontSize="small" />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            )}
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>
        </motion.div>
    )
};

// --- MAIN DASHBOARD WRAPPER ---

const Dashboard = () => {
  const [isOwnerMode, setIsOwnerMode] = useState(true);
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // توجيه مستخدمي الأرشيف إلى لوحة تحكم الأرشيف إذا لم يكن لديهم صلاحية الوصول للوحة التحكم الرئيسية
    if (user && !hasPermission('view_dashboard') && hasPermission('archive_read')) {
      console.log('Redirecting archive user from main dashboard to archive dashboard');
      navigate('/archive/dashboard', { replace: true });
    }
  }, [user, hasPermission, navigate]);

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      <Box display="flex" justifyContent="flex-end" mb={4}>
         <Paper 
            elevation={0}
            sx={{ 
                p: 0.5, 
                borderRadius: 3, 
                bgcolor: alpha(theme.palette.divider, 0.05),
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 1
            }}
         >
            <Button
                size="small"
                onClick={() => setIsOwnerMode(false)}
                sx={{
                    borderRadius: 2.5,
                    px: 2,
                    fontWeight: 700,
                    bgcolor: !isOwnerMode ? theme.palette.background.paper : 'transparent',
                    color: !isOwnerMode ? theme.palette.primary.main : theme.palette.text.secondary,
                    boxShadow: !isOwnerMode ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': {
                        bgcolor: !isOwnerMode ? theme.palette.background.paper : alpha(theme.palette.divider, 0.1),
                    }
                }}
            >
                {t('dashboard.operationalMode')}
            </Button>
            <Button
                size="small"
                onClick={() => setIsOwnerMode(true)}
                sx={{
                    borderRadius: 2.5,
                    px: 2,
                    fontWeight: 700,
                    bgcolor: isOwnerMode ? theme.palette.background.paper : 'transparent',
                    color: isOwnerMode ? theme.palette.primary.main : theme.palette.text.secondary,
                    boxShadow: isOwnerMode ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                    '&:hover': {
                        bgcolor: isOwnerMode ? theme.palette.background.paper : alpha(theme.palette.divider, 0.1),
                    }
                }}
            >
                {t('dashboard.executiveMode')}
            </Button>
         </Paper>
      </Box>
      
      <AnimatePresence mode="wait">
        <motion.div
            key={isOwnerMode ? 'executive' : 'operational'}
            initial={{ opacity: 0, x: isOwnerMode ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isOwnerMode ? -20 : 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
        >
            {isOwnerMode ? <ExecutiveDashboard /> : <OperationalDashboard />}
        </motion.div>
      </AnimatePresence>
    </Container>
  );
};

export default Dashboard;