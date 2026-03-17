import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Card, CardContent, CardHeader, Typography, Grid, Box, 
  Button, Chip, Avatar, List, ListItem, ListItemAvatar, 
  ListItemText, Divider, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, MenuItem, CircularProgress,
  LinearProgress, Tabs, Tab, Badge
} from '@mui/material';
import { 
  EventAvailable as LeaveIcon, 
  Pending as PendingIcon, 
  CheckCircle as ApprovedIcon, 
  Cancel as RejectedIcon,
  Add as AddIcon,
  CalendarMonth as CalendarIcon,
  Assessment as ReportsIcon,
  People as PeopleIcon,
  TrendingUp as TrendingIcon,
  AccessTime as TimeIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Leave status colors
const statusColors: Record<string, string> = {
  draft: 'default',
  pending: 'warning',
  approved_level_1: 'info',
  approved_level_2: 'info',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default'
};

// Leave type category colors
const categoryColors: Record<string, string> = {
  annual: '#3B82F6',
  sick: '#EF4444',
  personal: '#8B5CF6',
  maternity: '#EC4899',
  paternity: '#06B6D4',
  bereavement: '#6B7280',
  marriage: '#F59E0B',
  unpaid: '#9CA3AF',
  emergency: '#DC2626',
  business: '#059669'
};

interface DashboardStats {
  total_employees: number;
  on_leave_today: number;
  pending_requests: number;
  approved_this_month: number;
  rejected_this_month: number;
  total_annual_allocated: number;
  total_annual_used: number;
  total_annual_remaining: number;
}

interface LeaveRequest {
  id: string;
  request_number: string;
  employee_name: string;
  employee_code: string;
  leave_type_name: string;
  leave_type_color: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  created_at: string;
}

interface LeaveBalance {
  leave_type_name: string;
  leave_type_code: string;
  leave_type_color: string;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
}

export default function LeaveDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<LeaveRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [myBalances, setMyBalances] = useState<LeaveBalance[]>([]);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsRes = await api.get('/leave/leave/dashboard/stats');
      setStats(statsRes.data);
      
      // Fetch recent requests
      const requestsRes = await api.get('/leave/leave/requests', {
        params: { page_size: 5 }
      });
      setRecentRequests(requestsRes.data.items);
      
      // Fetch pending approval requests
      const pendingRes = await api.get('/leave/leave/requests/pending-approval');
      setPendingRequests(pendingRes.data);
      
      // Fetch my balances
      const balancesRes = await api.get('/leave/leave/balances/me');
      setMyBalances(balancesRes.data.balances || []);
      
    } catch (error) {
      console.error('Error fetching leave dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon, 
    color, 
    subtitle 
  }: { 
    title: string; 
    value: number | string; 
    icon: React.ReactNode; 
    color: string;
    subtitle?: string;
  }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: color, mt: 1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}20`, color: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: t('leave.status.draft'),
      pending: t('leave.status.pending'),
      approved_level_1: t('leave.status.approved_level_1'),
      approved_level_2: t('leave.status.approved_level_2'),
      approved: t('leave.status.approved'),
      rejected: t('leave.status.rejected'),
      cancelled: t('leave.status.cancelled')
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {t('leave.dashboard.title', 'Leave Management')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            startIcon={<SettingsIcon />}
            onClick={() => navigate('/hr/leave/workflow-settings')}
          >
            {t('leave.workflow_settings', 'Workflow')}
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<CalendarIcon />}
            onClick={() => navigate('/hr/leave/calendar')}
          >
            {t('leave.calendar', 'Calendar')}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/hr/leave/new')}
            sx={{ bgcolor: '#3B82F6' }}
          >
            {t('leave.request_new', 'New Request')}
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={t('leave.stats.total_employees', 'Total Employees')}
            value={stats?.total_employees || 0}
            icon={<PeopleIcon />}
            color="#3B82F6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={t('leave.stats.on_leave_today', 'On Leave Today')}
            value={stats?.on_leave_today || 0}
            icon={<LeaveIcon />}
            color="#EF4444"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={t('leave.stats.pending', 'Pending Requests')}
            value={stats?.pending_requests || 0}
            icon={<PendingIcon />}
            color="#F59E0B"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title={t('leave.stats.approved_this_month', 'Approved This Month')}
            value={stats?.approved_this_month || 0}
            icon={<ApprovedIcon />}
            color="#10B981"
          />
        </Grid>
      </Grid>

      {/* Annual Leave Balance Overview */}
      {stats && stats.total_annual_allocated > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardHeader 
            title={t('leave.annual_balance_overview', 'Annual Leave Balance Overview')}
            avatar={<TrendingIcon color="primary" />}
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#3B82F6' }}>
                    {stats.total_annual_allocated.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('leave.allocated', 'Allocated')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#EF4444' }}>
                    {stats.total_annual_used.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('leave.used', 'Used')}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#10B981' }}>
                    {stats.total_annual_remaining.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('leave.remaining', 'Remaining')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={stats.total_annual_allocated > 0 ? (stats.total_annual_used / stats.total_annual_allocated) * 100 : 0}
                sx={{ height: 10, borderRadius: 5 }}
                color={stats.total_annual_remaining < 5 ? 'error' : 'primary'}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different sections */}
      <Paper>
        <Tabs 
          value={tabValue} 
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={t('leave.my_requests', 'My Requests')} />
          <Tab 
            label={
              <Badge badgeContent={pendingRequests.length} color="warning">
                {t('leave.pending_approval', 'Pending Approval')}
              </Badge>
            } 
          />
          <Tab label={t('leave.my_balances', 'My Balances')} />
        </Tabs>

        {/* My Requests Tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('leave.request_number', 'Request #')}</TableCell>
                    <TableCell>{t('leave.leave_type', 'Leave Type')}</TableCell>
                    <TableCell>{t('leave.start_date', 'Start Date')}</TableCell>
                    <TableCell>{t('leave.end_date', 'End Date')}</TableCell>
                    <TableCell>{t('leave.days', 'Days')}</TableCell>
                    <TableCell>{t('leave.status', 'Status')}</TableCell>
                    <TableCell>{t('leave.actions', 'Actions')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="textSecondary">
                          {t('leave.no_requests', 'No leave requests yet')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.request_number}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box 
                              sx={{ 
                                width: 12, 
                                height: 12, 
                                borderRadius: '50%', 
                                bgcolor: request.leave_type_color || '#3B82F6' 
                              }} 
                            />
                            {request.leave_type_name}
                          </Box>
                        </TableCell>
                        <TableCell>{formatDate(request.start_date)}</TableCell>
                        <TableCell>{formatDate(request.end_date)}</TableCell>
                        <TableCell>{request.total_days}</TableCell>
                        <TableCell>
                          <Chip 
                            label={getStatusLabel(request.status)} 
                            color={statusColors[request.status] as any}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            onClick={() => navigate(`/hr/leave/${request.id}`)}
                          >
                            {t('leave.view', 'View')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {recentRequests.length > 0 && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Button onClick={() => navigate('/hr/leave/requests')}>
                  {t('leave.view_all', 'View All Requests')}
                </Button>
              </Box>
            )}
          </Box>
        )}

        {/* Pending Approval Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            {pendingRequests.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ApprovedIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography color="textSecondary">
                  {t('leave.no_pending', 'No pending requests to approve')}
                </Typography>
              </Box>
            ) : (
              <List>
                {pendingRequests.map((request, index) => (
                  <Box key={request.id}>
                    <ListItem
                      secondaryAction={
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            variant="contained" 
                            color="success" 
                            size="small"
                            onClick={() => navigate(`/hr/leave/approve/${request.id}`)}
                          >
                            {t('leave.approve', 'Approve')}
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small"
                            onClick={() => navigate(`/hr/leave/reject/${request.id}`)}
                          >
                            {t('leave.reject', 'Reject')}
                          </Button>
                        </Box>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: request.leave_type_color || '#3B82F6' }}>
                          <LeaveIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">{request.employee_name}</Typography>
                            <Chip 
                              label={request.request_number} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="textSecondary">
                              {request.leave_type_name} • {request.total_days} {t('leave.days', 'days')}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatDate(request.start_date)} - {formatDate(request.end_date)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < pendingRequests.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* My Balances Tab */}
        {tabValue === 2 && (
          <Box sx={{ p: 2 }}>
            {myBalances.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="textSecondary">
                  {t('leave.no_balances', 'No leave balances available')}
                </Typography>
                <Button 
                  variant="contained" 
                  sx={{ mt: 2 }}
                  onClick={() => navigate('/hr/leave/settings')}
                >
                  {t('leave.configure_entitlements', 'Configure Entitlements')}
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {myBalances.map((balance) => (
                  <Grid item xs={12} sm={6} md={4} key={balance.leave_type_code}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Box 
                            sx={{ 
                              width: 16, 
                              height: 16, 
                              borderRadius: '50%', 
                              bgcolor: balance.leave_type_color || '#3B82F6' 
                            }} 
                          />
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {balance.leave_type_name}
                          </Typography>
                        </Box>
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ color: '#3B82F6' }}>
                                {balance.allocated_days.toFixed(1)}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {t('leave.allocated', 'Allocated')}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ color: '#EF4444' }}>
                                {balance.used_days.toFixed(1)}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {t('leave.used', 'Used')}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="h6" sx={{ color: '#10B981' }}>
                                {balance.remaining_days.toFixed(1)}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {t('leave.remaining', 'Remaining')}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                        {balance.pending_days > 0 && (
                          <Box sx={{ mt: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="warning.main">
                              {balance.pending_days.toFixed(1)} {t('leave.pending', 'pending')}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Paper>

      {/* Quick Actions */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => navigate('/hr/leave/requests')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <ReportsIcon sx={{ fontSize: 40, color: '#3B82F6' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {t('leave.all_requests', 'All Requests')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('leave.view_all_requests', 'View and manage all leave requests')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => navigate('/hr/leave/calendar')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CalendarIcon sx={{ fontSize: 40, color: '#10B981' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {t('leave.calendar_view', 'Calendar View')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('leave.view_team_calendar', 'View team leave calendar')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card 
            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
            onClick={() => navigate('/hr/leave/settings')}
          >
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TimeIcon sx={{ fontSize: 40, color: '#F59E0B' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {t('leave.settings', 'Leave Settings')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {t('leave.configure_types_policies', 'Configure types and policies')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
