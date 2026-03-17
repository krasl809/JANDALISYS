import React, { useMemo, useState } from 'react';
import {
    Box, Typography, Paper, Avatar, TablePagination,
    useTheme, IconButton, Tooltip, Divider, Theme,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Grid, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { format, parseISO } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { 
    CheckCircle, 
    Cancel, 
    Warning, 
    AccessTime,
    DeviceHub,
    Person,
    Edit,
    Delete,
    Add
} from '@mui/icons-material';
import api from '../../services/api';

// --- Theme-Aware Utilities ---
const getAttendanceColors = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    return {
        primary: theme.palette.primary.main,
        secondary: theme.palette.text.secondary,
        info: theme.palette.info.main,
        success: theme.palette.success.main,
        warning: theme.palette.warning.main,
        error: theme.palette.error.main,
        dark: isDark ? theme.palette.text.primary : '#344767',
        light: isDark ? theme.palette.grey[800] : '#E9ECEF',
        bg: theme.palette.background.default,
        white: theme.palette.background.paper,
        pureWhite: '#FFFFFF',
    };
};

const getAttendanceShadows = (theme: Theme) => {
    const isDark = theme.palette.mode === 'dark';
    const shadowColor = isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(50, 50, 93, 0.1)';
    return {
        xs: isDark ? '0 1px 5px rgba(0, 0, 0, 0.3)' : '0 1px 5px rgba(0, 0, 0, 0.05)',
        sm: isDark ? '0 3px 8px rgba(0, 0, 0, 0.4)' : '0 3px 8px rgba(0, 0, 0, 0.08)',
        md: `0 7px 14px ${shadowColor}`,
        lg: `0 15px 35px ${shadowColor}`,
    };
};

export interface TransactionRecord {
    id: string;
    employee_id: string;
    employee_pk?: string;
    employee_name: string;
    timestamp: string;
    type: string;
    status: string;
    device: string;
}

interface TransactionsViewProps {
    transactions: TransactionRecord[];
    loading?: boolean;
    page: number;
    rowsPerPage: number;
    totalTransactions: number;
    handlePageChange: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
    handleRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onEdit?: (transaction: TransactionRecord) => void;
    onRefresh?: () => void;
    preSelectedEmployee?: string; // New prop for pre-selected employee
}

const TransactionsView: React.FC<TransactionsViewProps> = React.memo(({
    transactions,
    loading,
    page,
    rowsPerPage,
    totalTransactions,
    handlePageChange,
    handleRowsPerPageChange,
    onEdit,
    onRefresh,
    preSelectedEmployee
}) => {
    const theme = useTheme();
    const COLORS = useMemo(() => getAttendanceColors(theme), [theme]);
    const SHADOWS = useMemo(() => getAttendanceShadows(theme), [theme]);

    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const dateLocale = isRtl ? ar : enUS;
    
    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editReason, setEditReason] = useState('');
    const [saving, setSaving] = useState(false);
    
    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingTransaction, setDeletingTransaction] = useState<TransactionRecord | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [deleting, setDeleting] = useState(false);
    
    // Add manual log dialog state
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addEmployeeId, setAddEmployeeId] = useState('');
    const [addDate, setAddDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [addTime, setAddTime] = useState(format(new Date(), 'HH:mm:ss'));
    const [addType, setAddType] = useState<'check_in' | 'check_out'>('check_in');
    const [addReason, setAddReason] = useState('');
    const [adding, setAdding] = useState(false);
    
    const handleOpenEditDialog = (transaction: TransactionRecord) => {
        setEditingTransaction(transaction);
        const timestamp = parseISO(transaction.timestamp);
        setEditDate(format(timestamp, 'yyyy-MM-dd'));
        setEditTime(format(timestamp, 'HH:mm:ss'));
        setEditReason('');
        setEditDialogOpen(true);
    };
    
    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
        setEditingTransaction(null);
        setEditReason('');
    };
    
    const handleSaveEdit = async () => {
        if (!editingTransaction || !editDate || !editTime) return;
        
        setSaving(true);
        try {
            const newTimestamp = `${editDate}T${editTime}`;
            await api.put(`/hr/attendance/${editingTransaction.id}/edit`, {
                new_timestamp: newTimestamp,
                edit_reason: editReason || undefined
            });
            handleCloseEditDialog();
            if (onRefresh) onRefresh();
            if (onEdit) onEdit(editingTransaction);
        } catch (error) {
            console.error('Error editing transaction:', error);
        } finally {
            setSaving(false);
        }
    };
    
    const handleOpenDeleteDialog = (transaction: TransactionRecord) => {
        setDeletingTransaction(transaction);
        setDeleteReason('');
        setDeleteDialogOpen(true);
    };
    
    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setDeletingTransaction(null);
        setDeleteReason('');
    };
    
    const handleConfirmDelete = async () => {
        if (!deletingTransaction) return;
        
        setDeleting(true);
        try {
            await api.delete(`/hr/attendance/${deletingTransaction.id}`, {
                data: { reason: deleteReason }
            });
            handleCloseDeleteDialog();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error deleting transaction:', error);
        } finally {
            setDeleting(false);
        }
    };
    
    const handleOpenAddDialog = () => {
        setAddEmployeeId(preSelectedEmployee || '');
        setAddDate(format(new Date(), 'yyyy-MM-dd'));
        setAddTime(format(new Date(), 'HH:mm:ss'));
        setAddType('check_in');
        setAddReason('');
        setAddDialogOpen(true);
    };
    
    const handleCloseAddDialog = () => {
        setAddDialogOpen(false);
    };
    
    const handleConfirmAdd = async () => {
        if (!addEmployeeId || !addDate || !addTime) return;
        
        setAdding(true);
        try {
            const newTimestamp = `${addDate}T${addTime}`;
            await api.post(`/hr/attendance/manual`, {
                employee_id: addEmployeeId,
                timestamp: newTimestamp,
                type: addType,
                reason: addReason || 'إضافة يدوية'
            });
            handleCloseAddDialog();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error adding manual log:', error);
        } finally {
            setAdding(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'check_in':
            case 'in':
                return <CheckCircle sx={{ color: COLORS.success, fontSize: 18 }} />;
            case 'check_out':
            case 'out':
                return <Cancel sx={{ color: COLORS.error, fontSize: 18 }} />;
            default:
                return <AccessTime sx={{ color: COLORS.warning, fontSize: 18 }} />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'check_in':
            case 'in':
                return COLORS.success;
            case 'check_out':
            case 'out':
                return COLORS.error;
            default:
                return COLORS.warning;
        }
    };

    const getStatusChip = (status: string) => {
        const statusLC = status?.toLowerCase() || '';
        let color = COLORS.secondary;
        let bgColor = alpha(COLORS.secondary, 0.1);
        let label = status;

        if (statusLC.includes('success') || statusLC.includes('ok')) {
            color = COLORS.success;
            bgColor = alpha(COLORS.success, 0.1);
            label = t('Success');
        } else if (statusLC.includes('fail')) {
            color = COLORS.error;
            bgColor = alpha(COLORS.error, 0.1);
            label = t('Failed');
        } else if (statusLC.includes('timeout')) {
            color = COLORS.warning;
            bgColor = alpha(COLORS.warning, 0.1);
            label = t('Timeout');
        }

        return (
            <Box sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.5,
                py: 0.5,
                borderRadius: '6px',
                bgcolor: bgColor,
                color: color,
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
            }}>
                {label}
            </Box>
        );
    };

    const columns: GridColDef[] = useMemo(() => [
        {
            field: 'employee',
            headerName: t('Employee'),
            flex: 1.5,
            minWidth: 180,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: params.row.is_manually_edited 
                            ? alpha('#FF9800', 0.2)  // Orange for edited
                            : alpha(COLORS.primary, 0.1),
                        color: params.row.is_manually_edited 
                            ? '#FF9800' 
                            : COLORS.primary,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                    }}>
                        {params.row.employee_name?.[0] || '?'}
                    </Avatar>
                    <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight="700" sx={{ color: COLORS.dark, fontSize: '0.85rem' }}>
                                {params.row.employee_name}
                            </Typography>
                            {params.row.is_manually_edited && (
                                <Tooltip title={t('Manually Edited')}>
                                    <Edit sx={{ fontSize: 14, color: '#FF9800' }} />
                                </Tooltip>
                            )}
                        </Box>
                        <Typography variant="caption" sx={{ color: COLORS.secondary, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {params.row.employee_id}
                        </Typography>
                    </Box>
                </Box>
            ),
        },
        {
            field: 'timestamp',
            headerName: t('Time'),
            flex: 1,
            minWidth: 150,
            renderCell: (params) => {
                try {
                    const date = parseISO(params.value);
                    return (
                        <Box>
                            <Typography variant="body2" fontWeight="700" sx={{ color: COLORS.dark, fontSize: '0.85rem' }}>
                                {format(date, 'PP', { locale: dateLocale })}
                            </Typography>
                            <Typography variant="caption" sx={{ color: COLORS.secondary, fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 700 }}>
                                {format(date, 'HH:mm:ss')}
                            </Typography>
                        </Box>
                    );
                } catch {
                    return <Typography variant="body2">{params.value}</Typography>;
                }
            },
        },
        {
            field: 'type',
            headerName: t('Type'),
            flex: 0.8,
            minWidth: 100,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getTypeIcon(params.value)}
                    <Typography variant="body2" fontWeight="700" sx={{ color: getTypeColor(params.value), fontSize: '0.8rem' }}>
                        {params.value === 'check_in' ? t('Check In') : 
                         params.value === 'check_out' ? t('Check Out') : 
                         params.value?.toUpperCase() || '-'}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'status',
            headerName: t('Status'),
            flex: 0.8,
            minWidth: 100,
            renderCell: (params) => getStatusChip(params.value),
        },
        {
            field: 'device',
            headerName: t('Device'),
            flex: 1,
            minWidth: 120,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DeviceHub sx={{ color: COLORS.info, fontSize: 16 }} />
                    <Typography variant="body2" sx={{ color: COLORS.dark, fontSize: '0.8rem' }}>
                        {params.value || t('Manual')}
                    </Typography>
                </Box>
            ),
        },
        {
            field: 'actions',
            headerName: t('Actions'),
            flex: 0.8,
            minWidth: 120,
            sortable: false,
            renderCell: (params) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title={t('Edit')}>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditDialog(params.row);
                            }}
                            sx={{ 
                                color: COLORS.primary,
                                '&:hover': { backgroundColor: alpha(COLORS.primary, 0.1) }
                            }}
                        >
                            <Edit fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('Delete')}>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDeleteDialog(params.row);
                            }}
                            sx={{ 
                                color: COLORS.error,
                                '&:hover': { backgroundColor: alpha(COLORS.error, 0.1) }
                            }}
                        >
                            <Delete fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            ),
        },
    ], [t, COLORS, dateLocale]);

    return (
        <Box sx={{ mt: 2, width: '100%', overflowX: 'auto' }}>
            <Paper 
                elevation={0}
                sx={{
                    borderRadius: '16px',
                    overflow: 'visible',
                    backgroundColor: COLORS.white,
                    boxShadow: SHADOWS.md,
                    border: 'none',
                    width: '100%'
                }}
            >
                {/* Header with Add button */}
                <Box sx={{ 
                    p: 2, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: `1px solid ${alpha(COLORS.secondary, 0.1)}`
                }}>
                    <Typography variant="h6" fontWeight={800} sx={{ color: COLORS.dark }}>
                        {t('Attendance Transactions')}
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenAddDialog()}
                        sx={{
                            backgroundColor: COLORS.primary,
                            color: '#fff',
                            fontWeight: 700,
                            textTransform: 'none',
                            borderRadius: '8px',
                            '&:hover': { backgroundColor: alpha(COLORS.primary, 0.8) }
                        }}
                    >
                        {t('Add Manual Log')}
                    </Button>
                </Box>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: 400,
                    height: 'auto',
                    overflow: 'hidden'
                }}>
                    <DataGrid
                        rows={transactions}
                        columns={columns}
                        loading={loading}
                        rowHeight={60}
                        columnHeaderHeight={50}
                        disableRowSelectionOnClick
                        autoHeight
                        pagination
                        paginationMode="server"
                        paginationModel={{ page, pageSize: rowsPerPage }}
                        rowCount={totalTransactions}
                        onPaginationModelChange={(model) => {
                            if (model.page !== page) {
                                handlePageChange(null, model.page);
                            }
                            if (model.pageSize !== rowsPerPage) {
                                handleRowsPerPageChange({ target: { value: model.pageSize } } as any);
                            }
                        }}
                        pageSizeOptions={[10, 25, 50, 100]}
                        sx={{
                            border: 'none',
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: alpha(COLORS.primary, 0.05),
                                borderBottom: `2px solid ${alpha(COLORS.secondary, 0.1)}`,
                            },
                            '& .MuiDataGrid-columnHeaderTitle': {
                                fontWeight: 800,
                                color: COLORS.dark,
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            },
                            '& .MuiDataGrid-cell': {
                                borderBottom: `1px solid ${alpha(COLORS.secondary, 0.05)}`,
                            },
                            '& .MuiDataGrid-row:hover': {
                                backgroundColor: alpha(COLORS.primary, 0.04),
                            },
                            '& .row-edited': {
                                backgroundColor: alpha('#FF9800', 0.08),
                            },
                            '& .row-edited:hover': {
                                backgroundColor: alpha('#FF9800', 0.12),
                            },
                            '& .MuiDataGrid-footerContainer': {
                                borderTop: `2px solid ${alpha(COLORS.secondary, 0.1)}`,
                            },
                            '& .MuiTablePagination-root': {
                                color: COLORS.secondary,
                            },
                        }}
                        getRowClassName={(params) => {
                            let classes = '';
                            if (params.row.is_manually_edited) {
                                classes += 'row-edited ';
                            }
                            classes += params.indexRelativeToCurrentPage % 2 === 0 ? 'even-row' : 'odd-row';
                            return classes;
                        }}
                    />
                </Box>
            </Paper>
            
            {/* Edit Dialog */}
            <Dialog 
                open={editDialogOpen} 
                onClose={handleCloseEditDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {t('Edit Attendance Record')}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="body2" fontWeight="700" sx={{ mb: 1 }}>
                                    {editingTransaction?.employee_name} ({editingTransaction?.employee_id})
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {editingTransaction?.type === 'check_in' ? t('Check In') : t('Check Out')} - {editingTransaction?.device}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label={t('Date')}
                                    type="date"
                                    fullWidth
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label={t('Time')}
                                    type="time"
                                    fullWidth
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ step: 1 }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label={t('Reason')}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    placeholder={t('Enter reason for edit (optional)')}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseEditDialog} color="inherit">
                        {t('Cancel')}
                    </Button>
                    <Button 
                        onClick={handleSaveEdit} 
                        variant="contained"
                        disabled={saving || !editDate || !editTime}
                    >
                        {saving ? t('Saving...') : t('Save')}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Delete Confirmation Dialog */}
            <Dialog 
                open={deleteDialogOpen} 
                onClose={handleCloseDeleteDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700, color: COLORS.error }}>
                    {t('Delete Attendance Record')}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {t('Are you sure you want to delete this attendance record?')}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="body2" fontWeight="700">
                                    {deletingTransaction?.employee_name} ({deletingTransaction?.employee_id})
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {deletingTransaction?.type === 'check_in' ? t('Check In') : t('Check Out')} - {deletingTransaction?.timestamp}
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label={t('Reason')}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    placeholder={t('Enter reason for deletion (optional)')}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="inherit">
                        {t('Cancel')}
                    </Button>
                    <Button 
                        onClick={handleConfirmDelete} 
                        variant="contained"
                        color="error"
                        disabled={deleting}
                    >
                        {deleting ? t('Deleting...') : t('Delete')}
                    </Button>
                </DialogActions>
            </Dialog>
            
            {/* Add Manual Log Dialog */}
            <Dialog 
                open={addDialogOpen} 
                onClose={handleCloseAddDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {t('Add Manual Attendance Record')}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    label={t('Employee ID')}
                                    fullWidth
                                    value={addEmployeeId}
                                    onChange={(e) => setAddEmployeeId(e.target.value)}
                                    placeholder={t('Enter employee ID')}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label={t('Date')}
                                    type="date"
                                    fullWidth
                                    value={addDate}
                                    onChange={(e) => setAddDate(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    label={t('Time')}
                                    type="time"
                                    fullWidth
                                    value={addTime}
                                    onChange={(e) => setAddTime(e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ step: 1 }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>{t('Type')}</InputLabel>
                                    <Select
                                        value={addType}
                                        onChange={(e) => setAddType(e.target.value as 'check_in' | 'check_out')}
                                        label={t('Type')}
                                    >
                                        <MenuItem value="check_in">{t('Check In')}</MenuItem>
                                        <MenuItem value="check_out">{t('Check Out')}</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label={t('Reason')}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    value={addReason}
                                    onChange={(e) => setAddReason(e.target.value)}
                                    placeholder={t('Enter reason for adding (optional)')}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAddDialog} color="inherit">
                        {t('Cancel')}
                    </Button>
                    <Button 
                        onClick={handleConfirmAdd} 
                        variant="contained"
                        disabled={adding || !addEmployeeId || !addDate || !addTime}
                    >
                        {adding ? t('Adding...') : t('Add')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
});

export default TransactionsView;
