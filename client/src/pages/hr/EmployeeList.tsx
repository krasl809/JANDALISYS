import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Box, Typography, Button, Paper, Alert, LinearProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { CloudUpload, Refresh, Delete, Edit, Save } from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';

interface Employee {
    id: string;
    code: string;
    full_name: string;
    first_name: string;
    last_name: string;
    work_email: string;
    department: string;
    position: string;
    status: string;
    joining_date: string;
    has_system_access: boolean;
    user_id: string | null;
}

const EmployeeList: React.FC = () => {
    const { t } = useTranslation();
    const { confirm } = useConfirm();
    const [rows, setRows] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);
    const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([] as unknown as GridRowSelectionModel);
    const [gridKey, setGridKey] = useState(0);

    const selectionCount = useMemo(() => {
        if (Array.isArray(selectionModel)) return selectionModel.length;
        // @ts-ignore - handle potential object structure in newer versions
        if (selectionModel && typeof selectionModel === 'object' && 'ids' in selectionModel) {
            return (selectionModel as any).ids.length;
        }
        return 0;
    }, [selectionModel]);

    // Edit Dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editUser, setEditUser] = useState<Employee | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        try {
            console.log('Fetching employees from API...');
            const res = await api.get('hr/employees');
            console.log('API Response:', res.data);
            
            // Handle both array and object response formats
            let employeeData = [];
            if (Array.isArray(res.data)) {
                employeeData = res.data;
            } else if (res.data && Array.isArray(res.data.employees)) {
                employeeData = res.data.employees;
            } else {
                console.error("API returned unexpected data format", res.data);
            }
            
            if (employeeData.length > 0) {
                console.log('Setting rows with data:', employeeData);
                setRows(employeeData);
            } else {
                setRows([]);
            }
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const handleImportClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setFeedback(null);

        try {
            const res = await api.post('hr/employees/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFeedback({
                type: 'success',
                msg: t('Imported {{count}} employees successfully.', { count: res.data.imported_count }) + 
                     (res.data.errors.length > 0 ? ` ${t('Errors')}: ${res.data.errors.length}` : '')
            });
            fetchEmployees();
        } catch (error: any) {
            setFeedback({
                type: 'error',
                msg: error.response?.data?.detail || error.message || t('Failed to import employees')
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [fetchEmployees, t]);

    const handleDelete = useCallback(async () => {
        if (selectionCount === 0) return;

        const confirmed = await confirm({
            title: t('Confirm Delete'),
            message: t('Are you sure you want to delete {{count}} employees?', { count: selectionCount }),
            confirmText: t('Delete'),
            type: 'error'
        });

        if (confirmed) {
            setLoading(true);
            try {
                await api.post('hr/employees/bulk-delete', { ids: selectionModel });
                setFeedback({ type: 'success', msg: t('Deleted successfully') });
                setSelectionModel([] as unknown as GridRowSelectionModel);
                setGridKey(prev => prev + 1);
                fetchEmployees();
            } catch (error: any) {
                setFeedback({ type: 'error', msg: error.response?.data?.detail || t('Delete failed') });
            } finally {
                setLoading(false);
            }
        }
    }, [selectionCount, selectionModel, confirm, fetchEmployees, t]);

    const handleEditClick = useCallback(() => {
        if (selectionCount !== 1) return;
        const selectedId = Array.isArray(selectionModel) ? selectionModel[0] : null;
        const user = rows.find(r => r.id === selectedId);
        if (user) {
            setEditUser({ ...user });
            setEditOpen(true);
        }
    }, [selectionCount, selectionModel, rows]);

    const handleSaveEdit = useCallback(async () => {
        if (!editUser) return;
        setLoading(true);
        try {
            await api.put(`hr/employees/${editUser.id}`, editUser);
            setFeedback({ type: 'success', msg: t('Employee updated successfully') });
            setEditOpen(false);
            fetchEmployees();
        } catch (error: any) {
            setFeedback({ type: 'error', msg: error.response?.data?.detail || t('Failed to update employee') });
        } finally {
            setLoading(false);
        }
    }, [editUser, fetchEmployees, t]);

    const columns: GridColDef[] = useMemo(() => [
        { field: 'code', headerName: t('Code'), width: 100 },
        { field: 'full_name', headerName: t('Full Name'), width: 200 },
        { field: 'work_email', headerName: t('Email'), width: 200 },
        { field: 'department', headerName: t('Department'), width: 150 },
        { field: 'position', headerName: t('Position'), width: 150 },
        { 
            field: 'status', 
            headerName: t('Status'), 
            width: 120,
            renderCell: (params: GridRenderCellParams) => (
                <Chip 
                    label={params.value} 
                    color={params.value === 'active' ? 'success' : 'default'} 
                    size="small" 
                />
            )
        }
    ], [t]);

    return (
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', flexGrow: 1, overflowX: 'hidden', boxSizing: 'border-box', width: '100%' }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">
                        {t('Employee Directory')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('Manage system users and employees')}
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    {selectionCount > 0 && (
                        <>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<Delete />}
                                onClick={handleDelete}
                            >
                                {t('Delete')} ({selectionCount})
                            </Button>
                            {selectionCount === 1 && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<Edit />}
                                    onClick={handleEditClick}
                                >
                                    {t('Edit')}
                                </Button>
                            )}
                        </>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".xlsx"
                        onChange={handleFileChange}
                    />
                    <Button
                        variant="contained"
                        startIcon={<CloudUpload />}
                        onClick={handleImportClick}
                        disabled={uploading}
                    >
                        {uploading ? t('Importing...') : t('Import Excel')}
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchEmployees}
                    >
                        {t('Refresh')}
                    </Button>
                </Box>
            </Box>

            {feedback && (
                <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
                    {feedback.msg}
                </Alert>
            )}

            {uploading && <LinearProgress sx={{ mb: 2 }} />}

            <Paper sx={{ flexGrow: 1, boxShadow: 3, borderRadius: 2, overflowX: 'hidden', boxSizing: 'border-box', width: '100%' }}>
                <DataGrid
                    key={gridKey}
                    rows={rows}
                    columns={columns}
                    loading={loading}
                    slots={{ toolbar: GridToolbar }}
                    checkboxSelection
                    rowSelectionModel={selectionModel}
                    onRowSelectionModelChange={(newSelection) => {
                        setSelectionModel(newSelection);
                    }}
                    disableRowSelectionOnClick
                    density="comfortable"
                    getRowId={(row) => row.id}
                    initialState={{
                        pagination: { paginationModel: { pageSize: 20, page: 0 } },
                    }}
                    pageSizeOptions={[20, 50, 100]}
                    hideFooter
                />
            </Paper>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('Edit Employee')}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label={t('First Name')}
                            value={editUser?.first_name || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, first_name: e.target.value } : null)}
                            fullWidth
                        />
                        <TextField
                            label={t('Last Name')}
                            value={editUser?.last_name || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, last_name: e.target.value } : null)}
                            fullWidth
                        />
                        <TextField
                            label={t('Work Email')}
                            value={editUser?.work_email || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, work_email: e.target.value } : null)}
                            fullWidth
                        />
                        <TextField
                            label={t('Department')}
                            value={editUser?.department || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, department: e.target.value } : null)}
                            fullWidth
                        />
                        <TextField
                            label={t('Position')}
                            value={editUser?.position || ''}
                            onChange={(e) => setEditUser(prev => prev ? { ...prev, position: e.target.value } : null)}
                            fullWidth
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>{t('Cancel')}</Button>
                    <Button onClick={handleSaveEdit} variant="contained" startIcon={<Save />}>{t('Save')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default EmployeeList;
