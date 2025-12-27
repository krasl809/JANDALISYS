import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Box, Typography, Button, Paper, Alert, LinearProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, IconButton, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridToolbar, GridRenderCellParams, GridRowSelectionModel } from '@mui/x-data-grid';
import { CloudUpload, Refresh, PersonAdd, Delete, Edit, Save } from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

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
    const [rows, setRows] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);
    const [selectionModel, setSelectionModel] = useState<any>({ type: 'include', ids: new Set() });
    const [gridKey, setGridKey] = useState(0);

    // Edit Dialog
    const [editOpen, setEditOpen] = useState(false);
    const [editUser, setEditUser] = useState<Employee | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            console.log('Fetching employees from API...');
            const res = await api.get('/hr/employees');
            console.log('API Response:', res.data);
            if (Array.isArray(res.data)) {
                console.log('Setting rows with data:', res.data);
                console.log('Sample employee data:', res.data[0]);
                setRows(res.data);
            } else {
                console.error("API returned non-array data", res.data);
                setRows([]);
            }
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setFeedback(null);

        try {
            const res = await api.post('/hr/employees/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFeedback({
                type: 'success',
                msg: `Imported ${res.data.imported_count} employees successfully.` + (res.data.errors.length > 0 ? ` Errors: ${res.data.errors.length}` : '')
            });
            fetchEmployees();
        } catch (error: any) {
            setFeedback({
                type: 'error',
                msg: error.response?.data?.detail || "Failed to import file"
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        const idsArray = selectionModel.ids instanceof Set ? Array.from(selectionModel.ids) : (Array.isArray(selectionModel) ? selectionModel : []);
        if (!window.confirm(t('Are you sure you want to delete ${count} employees?', { count: idsArray.length }))) return;

        try {
            await api.delete('/hr/employees', { data: idsArray });
            setFeedback({ type: 'success', msg: t('Employees deleted successfully') });
            setSelectionModel({ type: 'include', ids: new Set() });
            setGridKey(prev => prev + 1); // Force reset
            fetchEmployees();
        } catch (error: any) {
            setFeedback({ type: 'error', msg: t('Failed to delete employees') });
        }
    };

    const handleEditClick = () => {
        const idsArray = selectionModel.ids instanceof Set ? Array.from(selectionModel.ids) : (Array.isArray(selectionModel) ? selectionModel : []);
        if (idsArray.length !== 1) return;
        const user = rows.find(r => r.id === idsArray[0]);
        if (user) {
            setEditUser({ ...user });
            setEditOpen(true);
        }
    };

    const handleSaveEdit = async () => {
        if (!editUser) return;
        try {
            await api.put(`/hr/employees/${editUser.id}`, editUser);
            setFeedback({ type: 'success', msg: t('Employee updated successfully') });
            setEditOpen(false);
            fetchEmployees();
        } catch (error: any) {
            setFeedback({ type: 'error', msg: t('Failed to update employee') });
        }
    };

    const columns: GridColDef[] = useMemo(() => {
        console.log('Creating columns with translation function:', t);
        const cols: GridColDef[] = [
            { field: 'code', headerName: t('Code'), width: 100 },
            { field: 'full_name', headerName: t('Full Name'), width: 250, flex: 1 },
            { field: 'company', headerName: t('Company'), width: 150 },
            { field: 'department', headerName: t('Department'), width: 150 },
            { field: 'position', headerName: t('Position'), width: 180 },
            { field: 'work_email', headerName: t('Work Email'), width: 250 },
            { field: 'status', headerName: t('Status'), width: 120 },
            {
                field: 'has_system_access',
                headerName: t('System Access'),
                width: 150,
                renderCell: (params: GridRenderCellParams) => (
                    <Chip
                        label={params.value ? "Yes" : "No"}
                        size="small"
                        color={params.value ? 'success' : 'default'}
                    />
                )
            },
        ];
        console.log('Created columns:', cols);
        return cols;
    }, [t]);

    const selectionCount = useMemo(() => {
        if (selectionModel.ids instanceof Set) return selectionModel.ids.size;
        if (Array.isArray(selectionModel)) return selectionModel.length;
        if (selectionModel.ids && Array.isArray(selectionModel.ids)) return selectionModel.ids.length;
        return 0;
    }, [selectionModel]);

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
                        if (Array.isArray(newSelection)) {
                            setSelectionModel({ type: 'include', ids: new Set(newSelection) });
                        } else {
                            setSelectionModel(newSelection);
                        }
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
