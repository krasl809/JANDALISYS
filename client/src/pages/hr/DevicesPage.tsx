import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Paper, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Chip, IconButton, Card, CardContent, Divider, Alert, LinearProgress
} from '@mui/material';
import { Add, Sync, Dns, Circle, Delete, Edit, CheckBox, CheckBoxOutlineBlank } from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

const DevicesPage: React.FC = () => {
    const { t } = useTranslation();
    const [devices, setDevices] = useState<any[]>([]);
    const [selectedDevices, setSelectedDevices] = useState<Set<number>>(new Set());
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [editingDevice, setEditingDevice] = useState<any>(null);
    const [newDevice, setNewDevice] = useState({ name: '', ip_address: '192.168.1.201', port: 4370, location: '' });
    const [syncing, setSyncing] = useState<number | null>(null);
    const [multiSyncing, setMultiSyncing] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info' | 'warning', msg: string } | null>(null);
    const [pinging, setPinging] = useState<Set<number>>(new Set());
    const [progress, setProgress] = useState<{ [key: number]: number }>({});

    const fetchDevices = async () => {
        try {
            const res = await api.get('/hr/devices');
            setDevices(res.data);
            // Ping all devices
            res.data.forEach((device: any) => pingDevice(device.id));
        } catch (error) {
            console.error(error);
        }
    };

    const pingDevice = async (id: number) => {
        setPinging(prev => new Set(prev).add(id));
        setProgress(prev => ({ ...prev, [id]: 0 }));
        // Animate progress from 0 to 100 in 1 second
        const startTime = Date.now();
        const duration = 1000; // 1 second
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progressValue = Math.min((elapsed / duration) * 100, 100);
            setProgress(prev => ({ ...prev, [id]: progressValue }));
            if (progressValue >= 100) {
                clearInterval(interval);
            }
        }, 50);
        try {
            await api.post(`/hr/devices/${id}/ping`);
            // Wait for animation to complete if not yet
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                await new Promise(resolve => setTimeout(resolve, duration - elapsed));
            }
            // Refresh devices to get updated status
            const res = await api.get('/hr/devices');
            setDevices(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setPinging(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleAdd = async () => {
        try {
            await api.post('/hr/devices', newDevice);
            setOpenAdd(false);
            setNewDevice({ name: '', ip_address: '192.168.1.201', port: 4370, location: '' });
            fetchDevices();
            setFeedback({ type: 'success', msg: 'Device added successfully' });
        } catch (error) {
            setFeedback({ type: 'error', msg: 'Failed to add device' });
        }
    };

    const handleEdit = (device: any) => {
        setEditingDevice(device);
        setOpenEdit(true);
    };

    const handleUpdate = async () => {
        try {
            await api.put(`/hr/devices/${editingDevice.id}`, editingDevice);
            setOpenEdit(false);
            setEditingDevice(null);
            fetchDevices();
            setFeedback({ type: 'success', msg: 'Device updated successfully' });
        } catch (error) {
            setFeedback({ type: 'error', msg: 'Failed to update device' });
        }
    };

    const handleDelete = async (deviceId: number) => {
        if (window.confirm('Are you sure you want to delete this device?')) {
            try {
                await api.delete(`/hr/devices/${deviceId}`);
                fetchDevices();
                setFeedback({ type: 'success', msg: 'Device deleted successfully' });
            } catch (error) {
                setFeedback({ type: 'error', msg: 'Failed to delete device' });
            }
        }
    };

    const handleSync = async (id: number) => {
        setSyncing(id);
        setFeedback(null);
        try {
            const res = await api.post(`/hr/devices/${id}/sync`);
            if (res.data.status === 'success' || res.data.status === 'warning') {
                setFeedback({ type: 'success', msg: res.data.message });
            } else {
                setFeedback({ type: 'error', msg: res.data.message });
            }
            fetchDevices();
        } catch (error) {
            setFeedback({ type: 'error', msg: "Sync failed (Network Error)" });
        } finally {
            setSyncing(null);
        }
    };

    const handleSyncMultiple = async (all: boolean = false) => {
        const deviceIds = all ? devices.map(d => d.id) : Array.from(selectedDevices);
        
        if (deviceIds.length === 0) {
            setFeedback({ type: 'error', msg: 'No devices selected' });
            return;
        }

        setMultiSyncing(true);
        setFeedback({ type: 'info', msg: 'Syncing multiple devices...' });
        
        try {
            const res = await api.post('/hr/devices/sync-multiple', { device_ids: deviceIds });
            if (res.data.status === 'success') {
                const total = res.data.total_new_logs;
                const details = res.data.details || [];
                const failedDetails = details.filter((d: any) => d.status === 'error');
                const failed = failedDetails.length;
                const succeeded = details.filter((d: any) => d.status === 'success' || d.status === 'warning').length;

                if (failed > 0 && succeeded === 0) {
                    setFeedback({ 
                        type: 'error', 
                        msg: t('Sync failed for all devices. Check connections.')
                    });
                } else if (failed > 0) {
                    // Get names of failed devices
                    const failedNames = failedDetails.map((fd: any) => {
                        const device = devices.find(d => d.id === fd.device_id);
                        return device ? device.name : fd.device_id;
                    }).join(', ');

                    setFeedback({ 
                        type: 'warning', 
                        msg: `${t('Synced some devices, but some failed. Total new logs: ')} ${total} (${t('Failed')}: ${failedNames})` 
                    });
                } else {
                    setFeedback({ 
                        type: 'success', 
                        msg: `${t('Successfully synced devices. Total new logs: ')} ${total}` 
                    });
                }
                fetchDevices();
            }
        } catch (error) {
            setFeedback({ type: 'error', msg: 'Collective sync failed' });
        } finally {
            setMultiSyncing(false);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedDevices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const selectAll = () => {
        if (selectedDevices.size === devices.length) {
            setSelectedDevices(new Set());
        } else {
            setSelectedDevices(new Set(devices.map(d => d.id)));
        }
    };

    return (
        <Box sx={{ p: 3, overflowX: 'hidden', boxSizing: 'border-box', width: '100%' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold">{t('Biometric Devices')}</Typography>
                    <Typography variant="body2" color="text.secondary">{t('Manage ZKTeco SpeedFace connections')}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {devices.length > 0 && (
                        <>
                            <Button 
                                variant="outlined" 
                                color="secondary"
                                startIcon={multiSyncing ? <Sync sx={{ animation: 'spin 1s linear infinite' }} /> : <Sync />}
                                onClick={() => handleSyncMultiple(false)}
                                disabled={multiSyncing || selectedDevices.size === 0}
                            >
                                {t('Sync Selected')} ({selectedDevices.size})
                            </Button>
                            <Button 
                                variant="outlined" 
                                startIcon={multiSyncing ? <Sync sx={{ animation: 'spin 1s linear infinite' }} /> : <Sync />}
                                onClick={() => handleSyncMultiple(true)}
                                disabled={multiSyncing}
                            >
                                {t('Sync All')}
                            </Button>
                            <Button variant="outlined" onClick={selectAll}>
                                {selectedDevices.size === devices.length ? t('Deselect All') : t('Select All')}
                            </Button>
                        </>
                    )}
                    <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAdd(true)}>
                        {t('Add Device')}
                    </Button>
                </Box>
            </Box>

            {feedback && <Alert severity={feedback.type} sx={{ mb: 3 }} onClose={() => setFeedback(null)}>{feedback.msg}</Alert>}

            <Grid container spacing={3} sx={{ overflowX: 'hidden' }}>
                {devices.map((device) => (
                    <Grid item xs={12} md={6} lg={4} key={device.id}>
                        <Card elevation={3} sx={{ 
                            borderRadius: 3, 
                            position: 'relative', 
                            overflow: 'visible',
                            border: selectedDevices.has(device.id) ? '2px solid' : 'none',
                            borderColor: 'primary.main'
                        }}>
                            <IconButton 
                                sx={{ position: 'absolute', top: -10, left: -10, bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'background.paper' } }}
                                onClick={() => toggleSelect(device.id)}
                                color={selectedDevices.has(device.id) ? "primary" : "default"}
                            >
                                {selectedDevices.has(device.id) ? <CheckBox /> : <CheckBoxOutlineBlank />}
                            </IconButton>
                            <Box sx={{
                                position: 'absolute', top: 16, right: 16,
                                width: 12, height: 12, borderRadius: '50%',
                                bgcolor: device.status === 'online' ? '#00e676' : '#ff1744',
                                boxShadow: `0 0 10px ${device.status === 'online' ? '#00e676' : '#ff1744'}`
                            }} />
                            <CardContent onClick={() => toggleSelect(device.id)} sx={{ cursor: 'pointer' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'white', mr: 2 }}>
                                        <Dns />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight="bold">{device.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{device.location}</Typography>
                                    </Box>
                                </Box>

                                <Divider sx={{ my: 2 }} />

                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">IP Address</Typography>
                                        <Typography variant="body2" fontWeight="medium" fontFamily="monospace">{device.ip_address}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="text.secondary">Last Sync</Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                            {device.last_sync ? new Date(device.last_sync).toLocaleTimeString() : 'Never'}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                {pinging.has(device.id) && (
                                    <Box sx={{ mt: 2 }}>
                                        <LinearProgress variant="determinate" value={progress[device.id] || 0} />
                                        <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center' }}>
                                            {Math.round(progress[device.id] || 0)}%
                                        </Typography>
                                    </Box>
                                )}
                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                    <Button
                                        variant="outlined"
                                        startIcon={syncing === device.id ? <Sync sx={{ animation: 'spin 1s linear infinite' }} /> : <Sync />}
                                        onClick={() => handleSync(device.id)}
                                        disabled={syncing === device.id}
                                        sx={{
                                            flex: 1,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            fontWeight: 'bold',
                                            '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
                                        }}
                                    >
                                        {syncing === device.id ? 'Syncing...' : 'Sync'}
                                    </Button>
                                    <IconButton
                                        color="primary"
                                        onClick={() => handleEdit(device)}
                                        sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2 }}
                                    >
                                        <Edit />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(device.id)}
                                        sx={{ border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}
                                    >
                                        <Delete />
                                    </IconButton>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Add Dialog */}
            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('Add ZKTeco Device')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Device Name" fullWidth value={newDevice.name} onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })} />
                        <TextField label="IP Address" fullWidth value={newDevice.ip_address} onChange={(e) => setNewDevice({ ...newDevice, ip_address: e.target.value })} />
                        <TextField label="Port" type="number" fullWidth value={newDevice.port} onChange={(e) => setNewDevice({ ...newDevice, port: Number(e.target.value) })} />
                        <TextField label="Location" fullWidth value={newDevice.location} onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAdd(false)}>{t('Cancel')}</Button>
                    <Button onClick={handleAdd} variant="contained">{t('Add Device')}</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{t('Edit ZKTeco Device')}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField label="Device Name" fullWidth value={editingDevice?.name || ''} onChange={(e) => setEditingDevice({ ...editingDevice, name: e.target.value })} />
                        <TextField label="IP Address" fullWidth value={editingDevice?.ip_address || ''} onChange={(e) => setEditingDevice({ ...editingDevice, ip_address: e.target.value })} />
                        <TextField label="Port" type="number" fullWidth value={editingDevice?.port || 4370} onChange={(e) => setEditingDevice({ ...editingDevice, port: Number(e.target.value) })} />
                        <TextField label="Location" fullWidth value={editingDevice?.location || ''} onChange={(e) => setEditingDevice({ ...editingDevice, location: e.target.value })} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenEdit(false)}>{t('Cancel')}</Button>
                    <Button onClick={handleUpdate} variant="contained">{t('Update Device')}</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default DevicesPage;
