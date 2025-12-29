import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Paper, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, IconButton, Card, CardContent, Divider, Alert,
    Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Add, Delete, Edit, Scanner, Settings as SettingsIcon } from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

const ArchiveSettings: React.FC = () => {
    const { t } = useTranslation();
    const [scanners, setScanners] = useState<any[]>([]);
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editingScanner, setEditingScanner] = useState<any>(null);
    const [newScanner, setNewScanner] = useState({
        name: '',
        device_type: 'WIA',
        connection_string: '',
        settings: { dpi: 300, color_mode: 'color' }
    });
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const fetchScanners = async () => {
        try {
            const res = await api.get('/archive/scanners');
            setScanners(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchScanners();
    }, []);

    const handleAdd = async () => {
        try {
            await api.post('/archive/scanners', newScanner);
            setOpenAdd(false);
            setNewScanner({
                name: '',
                device_type: 'WIA',
                connection_string: '',
                settings: { dpi: 300, color_mode: 'color' }
            });
            fetchScanners();
            setFeedback({ type: 'success', msg: t('Scanner added successfully') });
        } catch (error) {
            setFeedback({ type: 'error', msg: t('Failed to add scanner') });
        }
    };

    const handleEdit = (scanner: any) => {
        setEditingScanner(scanner);
        setOpenEdit(true);
    };

    const handleUpdate = async () => {
        try {
            await api.put(`/archive/scanners/${editingScanner.id}`, editingScanner);
            setOpenEdit(false);
            setEditingScanner(null);
            fetchScanners();
            setFeedback({ type: 'success', msg: t('Scanner updated successfully') });
        } catch (error) {
            setFeedback({ type: 'error', msg: t('Failed to update scanner') });
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm(t('Are you sure you want to delete this scanner?'))) {
            try {
                await api.delete(`/archive/scanners/${id}`);
                fetchScanners();
                setFeedback({ type: 'success', msg: t('Scanner deleted successfully') });
            } catch (error) {
                setFeedback({ type: 'error', msg: t('Failed to delete scanner') });
            }
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">{t('Archive Settings')}</Typography>
                    <Typography variant="body2" color="text.secondary">{t('Manage scanners and archive configuration')}</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAdd(true)}>
                    {t('Add Scanner')}
                </Button>
            </Box>

            {feedback && <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>{feedback.msg}</Alert>}

            <Typography variant="h6" sx={{ mb: 2 }}>{t('Scanner Devices')}</Typography>
            <Grid container spacing={3}>
                {scanners.map((scanner) => (
                    <Grid item xs={12} md={6} lg={4} key={scanner.id}>
                        <Card elevation={3} sx={{ borderRadius: 3 }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Scanner color="primary" />
                                        <Typography variant="h6">{scanner.name}</Typography>
                                    </Box>
                                    <Box>
                                        <IconButton onClick={() => handleEdit(scanner)} size="small">
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton onClick={() => handleDelete(scanner.id)} size="small" color="error">
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="body2" color="text.secondary">
                                    <strong>{t('Type')}:</strong> {scanner.device_type}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    <strong>{t('Connection')}:</strong> {scanner.connection_string || t('Local')}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                    <Chip 
                                        label={scanner.is_active ? t('Active') : t('Inactive')} 
                                        color={scanner.is_active ? 'success' : 'default'} 
                                        size="small" 
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Add Scanner Dialog */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('Add New Scanner')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label={t('Scanner Name')}
                            fullWidth
                            value={newScanner.name}
                            onChange={(e) => setNewScanner({ ...newScanner, name: e.target.value })}
                        />
                        <FormControl fullWidth>
                            <InputLabel>{t('Device Type')}</InputLabel>
                            <Select
                                value={newScanner.device_type}
                                label={t('Device Type')}
                                onChange={(e) => setNewScanner({ ...newScanner, device_type: e.target.value })}
                            >
                                <MenuItem value="WIA">WIA (Windows Image Acquisition)</MenuItem>
                                <MenuItem value="TWAIN">TWAIN</MenuItem>
                                <MenuItem value="Network">Network / IP</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label={t('Connection String / IP')}
                            fullWidth
                            placeholder="e.g. 192.168.1.50 or DeviceID"
                            value={newScanner.connection_string}
                            onChange={(e) => setNewScanner({ ...newScanner, connection_string: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdd(false)}>{t('Cancel')}</Button>
                    <Button onClick={handleAdd} variant="contained">{t('Add')}</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Scanner Dialog */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('Edit Scanner')}</DialogTitle>
                <DialogContent>
                    {editingScanner && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label={t('Scanner Name')}
                                fullWidth
                                value={editingScanner.name}
                                onChange={(e) => setEditingScanner({ ...editingScanner, name: e.target.value })}
                            />
                            <FormControl fullWidth>
                                <InputLabel>{t('Device Type')}</InputLabel>
                                <Select
                                    value={editingScanner.device_type}
                                    label={t('Device Type')}
                                    onChange={(e) => setEditingScanner({ ...editingScanner, device_type: e.target.value })}
                                >
                                    <MenuItem value="WIA">WIA</MenuItem>
                                    <MenuItem value="TWAIN">TWAIN</MenuItem>
                                    <MenuItem value="Network">Network / IP</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField
                                label={t('Connection String / IP')}
                                fullWidth
                                value={editingScanner.connection_string}
                                onChange={(e) => setEditingScanner({ ...editingScanner, connection_string: e.target.value })}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEdit(false)}>{t('Cancel')}</Button>
                    <Button onClick={handleUpdate} variant="contained">{t('Save Changes')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ArchiveSettings;
