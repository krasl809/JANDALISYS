import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, CardHeader, Typography, Grid, Box,
  Button, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper,
  TextField, MenuItem, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
  IconButton, Switch, FormControlLabel, Alert,
  Avatar, Divider, List, ListItem, ListItemText, ListItemIcon, Tabs, Tab
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Pending as PendingIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { format } from 'date-fns';

interface LeaveRequest {
  id: string;
  request_number: string;
  employee_id: string;
  employee_name?: string;
  employee_code?: string;
  leave_type_id: string;
  leave_type_name?: string;
  leave_type_color?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  created_at: string;
  approval_info?: {
    id: string;
    current_step: number;
    total_steps: number;
    approval_status: string;
    step_history: Array<{
      step: number;
      approver_id: string;
      status: string;
      timestamp: string;
      notes?: string;
    }>;
  };
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function LeaveApprovalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [processedRequests, setProcessedRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Approval form
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/leave/leave/requests/pending-approval-v2');
      setPendingRequests(res.data);
    } catch (err: any) {
      console.error('Error fetching pending requests:', err);
      // Fall back to old endpoint
      try {
        const res = await api.get('/leave/leave/requests/pending-approval');
        setPendingRequests(res.data);
      } catch (err2) {
        console.error('Error fetching pending requests (old):', err2);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessedRequests = async () => {
    try {
      const res = await api.get('/leave/leave/requests', {
        params: {
          status_filter: 'approved,rejected'
        }
      });
      setProcessedRequests(res.data.items || []);
    } catch (err: any) {
      console.error('Error fetching processed requests:', err);
    }
  };

  const handleViewRequest = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
    setApprovalNotes('');
    setRejectionReason('');
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);
      setError('');

      await api.put(`/leave/leave/requests/${selectedRequest.id}/approve-v2`, {
        action: 'approve',
        notes: approvalNotes
      });

      setSuccess(t('request_approved', 'Leave request approved successfully'));
      setDetailDialogOpen(false);
      fetchPendingRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.response?.data?.detail || t('error_approving', 'Error approving request'));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!rejectionReason) {
      setError(t('rejection_reason_required', 'Rejection reason is required'));
      return;
    }

    try {
      setProcessing(true);
      setError('');

      await api.put(`/leave/leave/requests/${selectedRequest.id}/approve-v2`, {
        action: 'reject',
        rejection_reason: rejectionReason,
        notes: approvalNotes
      });

      setSuccess(t('request_rejected', 'Leave request rejected'));
      setDetailDialogOpen(false);
      fetchPendingRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      setError(err.response?.data?.detail || t('error_rejecting', 'Error rejecting request'));
    } finally {
      setProcessing(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1 && processedRequests.length === 0) {
      fetchProcessedRequests();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
      case 'approved_level_1':
      case 'approved_level_2':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t('pending', 'Pending');
      case 'approved':
        return t('approved', 'Approved');
      case 'approved_level_1':
        return t('level_1_approved', 'Level 1 Approved');
      case 'approved_level_2':
        return t('level_2_approved', 'Level 2 Approved');
      case 'rejected':
        return t('rejected', 'Rejected');
      case 'cancelled':
        return t('cancelled', 'Cancelled');
      default:
        return status;
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight="bold">
              {t('leave_approvals', 'Leave Approvals')}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/hr/leave/workflow-settings')}
              size="small"
            >
              {t('workflow_settings', 'Workflow Settings')}
            </Button>
          </Box>
        </Grid>

        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
          </Grid>
        )}

        {success && (
          <Grid item xs={12}>
            <Alert severity="success" onClose={() => setSuccess('')}>{success}</Alert>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab 
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <PendingIcon />
                    {t('pending_approval', 'Pending Approval')}
                    <Chip size="small" label={pendingRequests.length} color="warning" />
                  </Box>
                } 
              />
              <Tab 
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <ApprovedIcon />
                    {t('processed', 'Processed')}
                  </Box>
                } 
              />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : pendingRequests.length === 0 ? (
                <Box textAlign="center" p={4}>
                  <PendingIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography color="text.secondary">
                    {t('no_pending_requests', 'No pending leave requests')}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('request_number', 'Request #')}</TableCell>
                        <TableCell>{t('employee', 'Employee')}</TableCell>
                        <TableCell>{t('leave_type', 'Leave Type')}</TableCell>
                        <TableCell>{t('dates', 'Dates')}</TableCell>
                        <TableCell>{t('days', 'Days')}</TableCell>
                        <TableCell>{t('status', 'Status')}</TableCell>
                        <TableCell align="center">{t('actions', 'Actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id} hover>
                          <TableCell>
                            <Typography fontWeight="medium">
                              {request.request_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Avatar sx={{ width: 32, height: 32 }}>
                                {request.employee_name?.charAt(0) || 'E'}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {request.employee_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {request.employee_code}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={request.leave_type_name}
                              size="small"
                              style={{ 
                                backgroundColor: request.leave_type_color || '#3B82F6',
                                color: 'white'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {format(new Date(request.start_date), 'dd/MM/yyyy')}
                              {' - '}
                              {format(new Date(request.end_date), 'dd/MM/yyyy')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight="medium">
                              {request.total_days}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusLabel(request.status)}
                              size="small"
                              color={getStatusColor(request.status)}
                            />
                            {request.approval_info && (
                              <Typography variant="caption" display="block" color="text.secondary">
                                {t('step', 'Step')} {request.approval_info.current_step}/{request.approval_info.total_steps}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Button 
                              size="small" 
                              variant="outlined"
                              startIcon={<ViewIcon />}
                              onClick={() => handleViewRequest(request)}
                            >
                              {t('review', 'Review')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {processedRequests.length === 0 ? (
                <Box textAlign="center" p={4}>
                  <Typography color="text.secondary">
                    {t('no_processed_requests', 'No processed requests')}
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('request_number', 'Request #')}</TableCell>
                        <TableCell>{t('employee', 'Employee')}</TableCell>
                        <TableCell>{t('leave_type', 'Leave Type')}</TableCell>
                        <TableCell>{t('dates', 'Dates')}</TableCell>
                        <TableCell>{t('days', 'Days')}</TableCell>
                        <TableCell>{t('status', 'Status')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {processedRequests.map((request) => (
                        <TableRow key={request.id} hover>
                          <TableCell>{request.request_number}</TableCell>
                          <TableCell>{request.employee_name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={request.leave_type_name}
                              size="small"
                              style={{ 
                                backgroundColor: request.leave_type_color || '#3B82F6',
                                color: 'white'
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {format(new Date(request.start_date), 'dd/MM/yyyy')} - {format(new Date(request.end_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{request.total_days}</TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusLabel(request.status)}
                              size="small"
                              color={getStatusColor(request.status)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>
          </Paper>
        </Grid>
      </Grid>

      {/* Request Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={() => setDetailDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {t('leave_request_details', 'Leave Request Details')}
            </Typography>
            <Chip 
              label={selectedRequest?.request_number}
              color="primary"
              variant="outlined"
            />
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Grid container spacing={3}>
              {/* Employee Info */}
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('employee_information', 'Employee Information')}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={2} mb={2}>
                      <Avatar sx={{ width: 48, height: 48 }}>
                        {selectedRequest.employee_name?.charAt(0) || 'E'}
                      </Avatar>
                      <Box>
                        <Typography fontWeight="bold">
                          {selectedRequest.employee_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('code', 'Code')}: {selectedRequest.employee_code}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Leave Info */}
              <Grid item xs={12} sm={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('leave_information', 'Leave Information')}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <DescriptionIcon fontSize="small" color="action" />
                      <Typography>
                        <strong>{t('leave_type', 'Leave Type')}:</strong> {selectedRequest.leave_type_name}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <CalendarIcon fontSize="small" color="action" />
                      <Typography>
                        <strong>{t('dates', 'Dates')}:</strong> {format(new Date(selectedRequest.start_date), 'dd/MM/yyyy')} - {format(new Date(selectedRequest.end_date), 'dd/MM/yyyy')}
                      </Typography>
                    </Box>
                    <Typography>
                      <strong>{t('total_days', 'Total Days')}:</strong> {selectedRequest.total_days}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Reason */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('reason', 'Reason')}
                    </Typography>
                    <Typography>
                      {selectedRequest.reason || t('no_reason_provided', 'No reason provided')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Approval Status */}
              {selectedRequest.approval_info && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('approval_progress', 'Approval Progress')}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2} mb={2}>
                        <Chip 
                          label={`${t('step', 'Step')} ${selectedRequest.approval_info.current_step} ${t('of', 'of')} ${selectedRequest.approval_info.total_steps}`}
                          color="primary"
                        />
                        <Chip 
                          label={getStatusLabel(selectedRequest.approval_info.approval_status)}
                          color={getStatusColor(selectedRequest.approval_info.approval_status)}
                        />
                      </Box>
                      
                      {selectedRequest.approval_info.step_history && selectedRequest.approval_info.step_history.length > 0 && (
                        <List dense>
                          {selectedRequest.approval_info.step_history.map((step, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                {step.status === 'approved' ? (
                                  <ApprovedIcon color="success" />
                                ) : (
                                  <RejectedIcon color="error" />
                                )}
                              </ListItemIcon>
                              <ListItemText 
                                primary={`${t('step', 'Step')} ${step.step}: ${step.status}`}
                                secondary={step.notes || step.timestamp}
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {/* Approval Actions */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('take_action', 'Take Action')}
                </Typography>
                
                <Box display="flex" gap={2} mb={2}>
                  <Button
                    variant={approvalAction === 'approve' ? 'contained' : 'outlined'}
                    color="success"
                    startIcon={<CheckIcon />}
                    onClick={() => setApprovalAction('approve')}
                  >
                    {t('approve', 'Approve')}
                  </Button>
                  <Button
                    variant={approvalAction === 'reject' ? 'contained' : 'outlined'}
                    color="error"
                    startIcon={<CloseIcon />}
                    onClick={() => setApprovalAction('reject')}
                  >
                    {t('reject', 'Reject')}
                  </Button>
                </Box>

                {approvalAction === 'approve' && (
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label={t('approval_notes', 'Approval Notes (Optional)')}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                  />
                )}

                {approvalAction === 'reject' && (
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label={t('rejection_reason', 'Rejection Reason')}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                    error={!rejectionReason}
                    helperText={!rejectionReason ? t('rejection_reason_required', 'Rejection reason is required') : ''}
                  />
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>
            {t('cancel', 'Cancel')}
          </Button>
          {approvalAction === 'approve' ? (
            <Button 
              onClick={handleApprove} 
              variant="contained" 
              color="success"
              disabled={processing}
            >
              {processing ? <CircularProgress size={20} /> : t('approve', 'Approve')}
            </Button>
          ) : (
            <Button 
              onClick={handleReject} 
              variant="contained" 
              color="error"
              disabled={processing || !rejectionReason}
            >
              {processing ? <CircularProgress size={20} /> : t('reject', 'Reject')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
