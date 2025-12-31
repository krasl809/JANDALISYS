import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Grid, Card, CardContent, Button,
  Chip, Avatar, Stack, Switch, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton, useTheme,
  CircularProgress, Alert
} from '@mui/material';
import {
  AccessTime, LocalShipping, AttachMoney, Warning, ArrowForward,
  NotificationsActive, MoreVert, CheckCircle
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { alpha } from '@mui/material/styles';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';

import { useTranslation } from 'react-i18next';

// --- COMPONENTS ---

// 1. Executive: Smart Brief Header
const SmartBrief = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Card sx={{
      mb: 4,
      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${(theme.palette as any).financial.accent} 100%)`,
      color: 'white',
      borderRadius: 3,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: theme.palette.mode === 'light'
        ? '0 10px 40px rgba(0,0,0,0.15)'
        : '0 10px 40px rgba(0,0,0,0.4)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
      }
    }}>
      <Box sx={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '50%', opacity: 0.6 }} />
      <Box sx={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
      <CardContent sx={{ p: 4, position: 'relative', zIndex: 2 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <CheckCircle sx={{ fontSize: 32, color: theme.palette.success.main }} />
          <Typography variant="h4" fontWeight="700" sx={{ color: 'white' }}>
            {t('dashboard.systemStatusOperational')}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, lineHeight: 1.6, maxWidth: '80%' }}>
          {t('dashboard.systemStatusDescription')}
        </Typography>
        <Box mt={2} display="flex" gap={1}>
          <Chip
            label={t('dashboard.realTime')}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 500 }}
          />
          <Chip
            label={t('dashboard.secure')}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 500 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

// 2. Executive: Visual Pipeline
const VisualPipeline = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const iconMap = {
        AccessTime: AccessTime,
        LocalShipping: LocalShipping,
        AttachMoney: AttachMoney,
        Warning: Warning
    };

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await api.get(API_ENDPOINTS.DASHBOARD.PIPELINE);
                const data: PipelineStepProcessed[] = (response.data as PipelineStepRaw[]).map((step: PipelineStepRaw) => ({
                    ...step,
                    icon: React.createElement(iconMap[step.icon as keyof typeof iconMap] || AccessTime)
                }));
                setSteps(data);
            } catch (err) {
                console.error('Failed to fetch pipeline data', err);
            }
        };
        fetchData();
    }, []);

  return (
    <Box sx={{ mb: 5 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>{t('dashboard.liveFlow')}</Typography>
      <Grid container spacing={2}>
        {steps.map((step, index) => (
          <Grid item xs={12} md={3} key={index}>
            <motion.div whileHover={{ y: -5 }}>
              <Card sx={{ 
                height: '100%', 
                borderRadius: 4, 
                border: `1px solid ${alpha(step.color, 0.2)}`, 
                background: theme.palette.mode === 'dark' 
                  ? `linear-gradient(180deg, ${alpha(step.color, 0.1)} 0%, ${alpha(theme.palette.background.paper, 0.4)} 100%)` 
                  : `linear-gradient(180deg, ${alpha(step.color, 0.05)} 0%, #fff 100%)` 
              }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Avatar sx={{ bgcolor: alpha(step.color, 0.2), color: step.color, borderRadius: 3 }}>{step.icon}</Avatar>
                    <Chip label={step.value} sx={{ bgcolor: step.color, color: '#fff', fontWeight: 'bold' }} size="small" />
                  </Box>
                  <Typography variant="subtitle2" color="text.secondary">{step.label}</Typography>
                  <Typography variant="h5" fontWeight="800">{step.amount}</Typography>
                  
                  {index < steps.length - 1 && (
                     <Box sx={{ display: { xs: 'none', md: 'block' }, position: 'absolute', right: -12, top: '40%', zIndex: 10 }}>
                        <ArrowForward sx={{ color: 'text.disabled', opacity: 0.3 }} />
                     </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

// 3. Executive: Risk Radar
const RiskRadar = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const iconMap = {
        LocalShipping: LocalShipping,
        AttachMoney: AttachMoney,
        Warning: Warning
    };

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

   useEffect(() => {
       const fetchData = async () => {
           try {
               const response = await api.get(API_ENDPOINTS.DASHBOARD.RISKS);
               const data: AlertProcessed[] = (response.data as AlertRaw[]).map((alert: AlertRaw) => ({
                   ...alert,
                   icon: React.createElement(iconMap[alert.icon as keyof typeof iconMap] || Warning, { color: alert.color as any })
               }));
               setAlerts(data);
           } catch (err) {
               console.error('Failed to fetch risks data', err);
           }
       };
       fetchData();
   }, []);

   // Ensure cards inside have readable backgrounds regardless of theme
   const cardBg = theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.6) : '#fff';

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${theme.palette.warning.light}`,
        bgcolor: alpha(theme.palette.warning.main, 0.05),
        height: '100%',
        boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)'
      }}
      aria-label="Risk alerts and notifications"
    >
      <CardContent>
        <Box display="flex" alignItems="center" gap={2} mb={3}>
          <Box p={1} borderRadius="50%" bgcolor={alpha(theme.palette.warning.main, 0.1)}>
            <Warning color="warning" />
          </Box>
          <Typography variant="h6" fontWeight="bold" color="text.primary">{t('dashboard.riskAlerts')}</Typography>
        </Box>
        <Stack spacing={2}>
          {alerts.map((alert) => (
            <Box
              key={alert.id}
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              p={2}
              bgcolor={cardBg}
              borderRadius={3}
              sx={{
                boxShadow: theme.shadows[1],
                border: `1px solid ${alpha((theme.palette as any)[alert.color].main, 0.1)}`,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': { transform: 'translateY(-2px)' }
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                {alert.icon}
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" color="text.primary">{t(alert.title)}</Typography>
                  <Typography variant="caption" color="text.secondary">{t(alert.description)}</Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                color={alert.color as any}
                size="small"
                sx={{ minWidth: 'auto', px: 2 }}
                aria-label={t('dashboard.viewAlertDetails', { title: t(alert.title) })}
              >
                {t(alert.action)}
              </Button>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

// 4. Executive: Profit Chart
const ProfitChart = () => {
    const theme = useTheme();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any[]>([]);

    const barColors = [
        (theme.palette as any).financial.chart.primary,
        (theme.palette as any).financial.chart.secondary,
        (theme.palette as any).financial.chart.tertiary,
        (theme.palette as any).financial.chart.quaternary,
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.get(API_ENDPOINTS.DASHBOARD.PROFIT_CHART);
                setData(response.data);
                setError(null);
            } catch (err) {
                setError(t('dashboard.errorLoadingProfitChart'));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [t]);

    if (loading) {
        return (
            <Card
                sx={{
                    height: '100%',
                    minHeight: 300,
                    borderRadius: 3,
                    p: 2,
                    boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
                    border: `1px solid ${theme.palette.divider}`,
                }}
                aria-label={t('common.loading')}
            >
                <Box display="flex" justifyContent="center" alignItems="center" height={250}>
                    <CircularProgress />
                </Box>
            </Card>
        );
    }

    if (error) {
        return (
            <Card
                sx={{
                    height: '100%',
                    minHeight: 300,
                    borderRadius: 3,
                    p: 2,
                    boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
                    border: `1px solid ${theme.palette.divider}`,
                }}
                aria-label={t('dashboard.error')}
            >
                <Alert severity="error">{error}</Alert>
            </Card>
        );
    }

    return (
        <Card
            sx={{
                height: '100%',
                minHeight: 300,
                borderRadius: 3,
                p: 2,
                boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
                border: `1px solid ${theme.palette.divider}`,
                transition: 'box-shadow 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.4)',
                }
            }}
            aria-label={t('dashboard.profitChartVisualization')}
        >
            <Box mb={2}>
                <Typography variant="h6" fontWeight="bold">{t('dashboard.netProfitIndex')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('dashboard.monthlyPerformanceSummary')}</Typography>
            </Box>
            {data.length === 0 ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={250}>
                    <Typography color="text.secondary">{t('dashboard.noDataAvailable')}</Typography>
                </Box>
            ) : (
                <Box height={250} width="100%" minWidth={300}>
                    <ResponsiveContainer width="100%" height={250} minWidth={300}>
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
                            />
                            <RechartsTooltip
                                cursor={{ fill: 'rgba(0,0,0,0.1)' }}
                                contentStyle={{
                                    borderRadius: 8,
                                    border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    backgroundColor: theme.palette.background.paper,
                                    color: theme.palette.text.primary
                                }}
                            />
                            <Bar dataKey="val" radius={[4, 4, 0, 0]}>
                                {data.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Box>
            )}
        </Card>
    );
};

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

const OperationalStatCard = ({ title, value, icon, color }: any) => {
    const theme = useTheme();
    const { t } = useTranslation();
    return (
        <Card
            sx={{
                p: 2,
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                boxShadow: theme.palette.mode === 'light' ? '0 1px 3px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.3)',
                transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: theme.palette.mode === 'light' ? '0 4px 6px rgba(0,0,0,0.1)' : '0 4px 6px rgba(0,0,0,0.3)',
                    transform: 'translateY(-2px)',
                },
            }}
            aria-label={`${t(title)}: ${value}`}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <Avatar variant="rounded" sx={{ bgcolor: alpha(color, 0.1), color: color, width: 48, height: 48 }}>
                    {icon}
                </Avatar>
                <Box>
                    <Typography variant="h5" fontWeight="800">{value}</Typography>
                    <Typography variant="body2" color="text.secondary">{t(title)}</Typography>
                </Box>
            </Stack>
        </Card>
    )
}

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
                const response = await api.get(API_ENDPOINTS.DASHBOARD.STATS);
                setStats(response.data);
            } catch (err) {
                console.error('Failed to fetch dashboard stats', err);
            }
        };
        fetchStats();
    }, []);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Box display="flex" alignItems="center" gap={1} mb={3}>
                <NotificationsActive color="primary" />
                <Typography variant="h5" fontWeight="bold">{t('dashboard.dailyOperations')}</Typography>
            </Box>

            <Grid container spacing={2} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.tasksToday" value={stats.tasks_today.toString()} icon={<AccessTime />} color={theme.palette.primary.main} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.reviewPending" value={stats.review_pending.toString()} icon={<Warning />} color={theme.palette.secondary.main} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.arriving" value={stats.arriving.toString()} icon={<LocalShipping />} color={theme.palette.info.main} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <OperationalStatCard title="dashboard.payRequests" value={stats.pay_requests.toString()} icon={<AttachMoney />} color={theme.palette.error.main} />
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card
                        sx={{
                            borderRadius: 3,
                            boxShadow: theme.palette.mode === 'light' ? '0 2px 8px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.3)',
                            border: `1px solid ${theme.palette.divider}`,
                            transition: 'box-shadow 0.2s ease-in-out',
                            '&:hover': {
                                boxShadow: theme.palette.mode === 'light' ? '0 4px 12px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.4)',
                            }
                        }}
                        aria-label={t("dashboard.recentMovementsTable")}
                    >
                        <Box p={2} borderBottom={`1px solid ${theme.palette.divider}`} display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight="bold">{t('dashboard.recentMovements')}</Typography>
                            <Button variant="outlined" size="small" aria-label={t("dashboard.viewAllMovements")}>{t('dashboard.viewAll')}</Button>
                        </Box>
                        {loading ? (
                            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                                <CircularProgress />
                            </Box>
                        ) : error ? (
                            <Box p={2}>
                                <Alert severity="error">{error}</Alert>
                            </Box>
                        ) : operationalData.length === 0 ? (
                            <Box display="flex" justifyContent="center" alignItems="center" p={4}>
                                <Typography color="text.secondary">{t('dashboard.noOperationalData')}</Typography>
                            </Box>
                        ) : (
                            <TableContainer>
                                <Table>
                                    <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                                        <TableRow>
                                            <TableCell>{t('common.id')}</TableCell>
                                            <TableCell>{t('common.type')}</TableCell>
                                            <TableCell>{t('common.counterparty')}</TableCell>
                                            <TableCell>{t('common.date')}</TableCell>
                                            <TableCell>{t('common.status')}</TableCell>
                                            <TableCell align="right">{t('common.action')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {operationalData.map((row) => (
                                            <TableRow key={row.id} hover>
                                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{row.id}</TableCell>
                                                <TableCell>{t(row.type)}</TableCell>
                                                <TableCell>{row.party}</TableCell>
                                                <TableCell sx={{ color: 'text.secondary' }}>{row.date}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={t(row.status)}
                                                        size="small"
                                                        color={row.status === 'Active' ? 'success' : row.status === 'Pending' ? 'warning' : row.status === 'Completed' ? 'info' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <IconButton size="small"><MoreVert /></IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Card>
                </Grid>
            </Grid>
        </motion.div>
    )
};

// --- MAIN DASHBOARD WRAPPER ---

const Dashboard = () => {
  const [isOwnerMode, setIsOwnerMode] = useState(true);
  const { t } = useTranslation();

  return (
    <Container maxWidth={false}>
      <Box display="flex" justifyContent="flex-end" mb={2}>
         <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color={!isOwnerMode ? 'primary' : 'text.secondary'} fontWeight={!isOwnerMode ? 'bold' : 'normal'}>
                {t('dashboard.operationalMode')}
            </Typography>
            <Switch 
                checked={isOwnerMode} 
                onChange={() => setIsOwnerMode(!isOwnerMode)} 
                color="primary"
            />
             <Typography variant="body2" color={isOwnerMode ? 'primary' : 'text.secondary'} fontWeight={isOwnerMode ? 'bold' : 'normal'}>
                {t('dashboard.executiveMode')}
            </Typography>
         </Stack>
      </Box>
      
      {isOwnerMode ? <ExecutiveDashboard /> : <OperationalDashboard />}
    </Container>
  );
};

export default Dashboard;