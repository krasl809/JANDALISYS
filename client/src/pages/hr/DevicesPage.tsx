import React, { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, IconButton, Card, CardContent, Divider, Alert, LinearProgress, alpha, Stack, Fade
} from '@mui/material';
import { Add, Sync, Dns, Delete, Edit, CheckBox, CheckBoxOutlineBlank, Close, Router } from '@mui/icons-material';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

// Material Dashboard 2 Pro Style Constants
const COLORS = {
    primary: '#5E72E4',
    secondary: '#8392AB',
    info: '#11CDEF',
    success: '#2DCE89',
    warning: '#FB6340',
    error: '#F5365C',
    dark: '#344767',
    light: '#E9ECEF',
    bg: '#F8F9FA',
    white: '#FFFFFF',
    gradientPrimary: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
    gradientSuccess: 'linear-gradient(135deg, #2DCE89 0%, #2DCECC 100%)',
    gradientError: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)',
};

const SHADOWS = {
    xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
    sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
    md: '0 7px 14px rgba(50, 50, 93, 0.1)',
    lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
};

const DevicesPage: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { confirm } = useConfirm();
    const isRtl = i18n.language === 'ar';
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
            const res = await api.get('hr/devices');
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
            await api.post(`hr/devices/${id}/ping`);
            // Wait for animation to complete if not yet
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                await new Promise(resolve => setTimeout(resolve, duration - elapsed));
            }
            // Refresh devices to get updated status
            const res = await api.get('hr/devices');
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
            await api.post('hr/devices', newDevice);
            setOpenAdd(false);
            setNewDevice({ name: '', ip_address: '192.168.1.201', port: 4370, location: '' });
            fetchDevices();
            setFeedback({ type: 'success', msg: t('Device added successfully') });
        } catch (error) {
            setFeedback({ type: 'error', msg: t('Failed to add device') });
        }
    };

    const handleEdit = (device: any) => {
        setEditingDevice(device);
        setOpenEdit(true);
    };

    const handleUpdate = async () => {
        try {
            await api.put(`hr/devices/${editingDevice.id}`, editingDevice);
            setOpenEdit(false);
            setEditingDevice(null);
            fetchDevices();
            setFeedback({ type: 'success', msg: t('Device updated successfully') });
        } catch (error) {
            setFeedback({ type: 'error', msg: t('Failed to update device') });
        }
    };

    const handleDelete = async (deviceId: number) => {
        if (await confirm({ message: t('Are you sure you want to delete this device?') })) {
            try {
                await api.delete(`hr/devices/${deviceId}`);
                fetchDevices();
                setFeedback({ type: 'success', msg: t('Device deleted successfully') });
            } catch (error) {
                setFeedback({ type: 'error', msg: t('Failed to delete device') });
            }
        }
    };

    const handleSync = async (id: number) => {
        setSyncing(id);
        setFeedback(null);
        try {
            const res = await api.post(`hr/devices/${id}/sync`);
            if (res.data.status === 'success' || res.data.status === 'warning') {
                setFeedback({ type: 'success', msg: t(res.data.message) || res.data.message });
            } else {
                setFeedback({ type: 'error', msg: t(res.data.message) || res.data.message });
            }
            fetchDevices();
        } catch (error) {
            setFeedback({ type: 'error', msg: t("Sync failed (Network Error)") });
        } finally {
            setSyncing(null);
        }
    };

    const handleSyncMultiple = async (all: boolean = false) => {
        const deviceIds = all ? devices.map(d => d.id) : Array.from(selectedDevices);
        
        if (deviceIds.length === 0) {
            setFeedback({ type: 'error', msg: t('No devices selected') });
            return;
        }

        setMultiSyncing(true);
        setFeedback({ type: 'info', msg: t('Syncing multiple devices...') });
        
        try {
            const res = await api.post('hr/devices/sync-multiple', { device_ids: deviceIds });
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
                        msg: t('Synced some devices, but some failed. Total new logs: {{total}} (Failed: {{failedNames}})', { total, failedNames })
                    });
                } else {
                    setFeedback({ 
                        type: 'success', 
                        msg: t('Successfully synced devices. Total new logs: {{total}}', { total })
                    });
                }
                fetchDevices();
            }
        } catch (error) {
            setFeedback({ type: 'error', msg: t('Collective sync failed') });
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
        <Box sx={{ 
            p: { xs: 2, md: 4 }, 
            bgcolor: COLORS.bg, 
            minHeight: '100vh',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            {/* Header Section */}
            <Box sx={{ 
                mb: 5, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: 3 
            }}>
                <Box>
                    <Typography variant="h4" sx={{ 
                        fontWeight: 800, 
                        color: COLORS.dark,
                        letterSpacing: '-0.5px',
                        mb: 0.5
                    }}>
                        {t('Biometric Devices')}
                    </Typography>
                    <Typography variant="body2" sx={{ color: COLORS.secondary, fontWeight: 500 }}>
                        {t('Manage ZKTeco SpeedFace connections')}
                    </Typography>
                </Box>
                
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    {devices.length > 0 && (
                        <>
                            <Button 
                                variant="outlined" 
                                startIcon={multiSyncing ? <Sync sx={{ animation: 'spin 1s linear infinite' }} /> : <Sync />}
                                onClick={() => handleSyncMultiple(false)}
                                disabled={multiSyncing || selectedDevices.size === 0}
                                sx={{
                                    borderRadius: '10px',
                                    borderColor: alpha(COLORS.secondary, 0.3),
                                    color: COLORS.dark,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 2,
                                    '&:hover': { borderColor: COLORS.secondary, bgcolor: alpha(COLORS.secondary, 0.05) }
                                }}
                            >
                                {t('Sync Selected')} ({selectedDevices.size})
                            </Button>
                            <Button 
                                variant="outlined" 
                                startIcon={multiSyncing ? <Sync sx={{ animation: 'spin 1s linear infinite' }} /> : <Sync />}
                                onClick={() => handleSyncMultiple(true)}
                                disabled={multiSyncing}
                                sx={{
                                    borderRadius: '10px',
                                    borderColor: alpha(COLORS.secondary, 0.3),
                                    color: COLORS.dark,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    px: 2,
                                    '&:hover': { borderColor: COLORS.secondary, bgcolor: alpha(COLORS.secondary, 0.05) }
                                }}
                            >
                                {t('Sync All')}
                            </Button>
                            <Button 
                                variant="text" 
                                onClick={selectAll}
                                sx={{ 
                                    color: COLORS.primary, 
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    '&:hover': { bgcolor: alpha(COLORS.primary, 0.05) }
                                }}
                            >
                                {selectedDevices.size === devices.length ? t('Deselect All') : t('Select All')}
                            </Button>
                        </>
                    )}
                    <Button 
                        variant="contained" 
                        startIcon={<Add />} 
                        onClick={() => setOpenAdd(true)}
                        sx={{
                            borderRadius: '10px',
                            background: COLORS.gradientPrimary,
                            boxShadow: SHADOWS.sm,
                            textTransform: 'none',
                            fontWeight: 700,
                            px: 3,
                            '&:hover': { boxShadow: SHADOWS.md, transform: 'translateY(-1px)' },
                            transition: 'all 0.2s'
                        }}
                    >
                        {t('Add Device')}
                    </Button>
                </Stack>
            </Box>

            {feedback && (
                <Fade in={!!feedback}>
                    <Alert 
                        severity={feedback.type} 
                        sx={{ 
                            mb: 4, 
                            borderRadius: '12px',
                            boxShadow: SHADOWS.xs,
                            '& .MuiAlert-icon': { fontSize: '1.5rem' },
                            fontWeight: 600
                        }} 
                        onClose={() => setFeedback(null)}
                    >
                        {feedback.msg}
                    </Alert>
                </Fade>
            )}

            <Grid container spacing={3}>
                {devices.map((device) => (
                    <Grid item xs={12} md={6} lg={4} key={device.id}>
                        <Card sx={{ 
                            borderRadius: '16px', 
                            position: 'relative', 
                            overflow: 'visible',
                            border: 'none',
                            boxShadow: selectedDevices.has(device.id) ? SHADOWS.lg : SHADOWS.md,
                            transform: selectedDevices.has(device.id) ? 'scale(1.02)' : 'none',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            bgcolor: COLORS.white,
                            '&::before': selectedDevices.has(device.id) ? {
                                content: '""',
                                position: 'absolute',
                                inset: -2,
                                borderRadius: '18px',
                                background: COLORS.gradientPrimary,
                                zIndex: -1
                            } : {}
                        }}>
                            {/* Selection Checkbox */}
                            <IconButton 
                                sx={{ 
                                    position: 'absolute', 
                                    top: -12, 
                                    insetInlineStart: -12, 
                                    bgcolor: COLORS.white, 
                                    boxShadow: SHADOWS.sm, 
                                    width: 36,
                                    height: 36,
                                    '&:hover': { bgcolor: COLORS.bg },
                                    zIndex: 10
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSelect(device.id);
                                }}
                            >
                                {selectedDevices.has(device.id) ? 
                                    <CheckBox sx={{ color: COLORS.primary }} /> : 
                                    <CheckBoxOutlineBlank sx={{ color: alpha(COLORS.secondary, 0.4) }} />
                                }
                            </IconButton>

                            {/* Status Indicator */}
                            <Box sx={{
                                position: 'absolute', 
                                top: 20, 
                                insetInlineEnd: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                bgcolor: alpha(device.status === 'online' ? COLORS.success : COLORS.error, 0.1),
                                px: 1.5,
                                py: 0.5,
                                borderRadius: '20px'
                            }}>
                                <Box sx={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    bgcolor: device.status === 'online' ? COLORS.success : COLORS.error,
                                    boxShadow: `0 0 8px ${device.status === 'online' ? COLORS.success : COLORS.error}`
                                }} />
                                <Typography variant="caption" sx={{ 
                                    fontWeight: 800, 
                                    color: device.status === 'online' ? COLORS.success : COLORS.error,
                                    textTransform: 'uppercase',
                                    fontSize: '0.65rem'
                                }}>
                                    {device.status === 'online' ? t('Online') : t('Offline')}
                                </Typography>
                            </Box>

                            <CardContent onClick={() => toggleSelect(device.id)} sx={{ cursor: 'pointer', p: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                    <Box sx={{ 
                                        p: 1.5, 
                                        borderRadius: '12px', 
                                        background: COLORS.gradientPrimary,
                                        color: COLORS.white, 
                                        marginInlineEnd: 2,
                                        boxShadow: '0 4px 10px rgba(94, 114, 228, 0.3)'
                                    }}>
                                        <Router />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" sx={{ fontWeight: 800, color: COLORS.dark, lineHeight: 1.2 }}>
                                            {device.name}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: 600 }}>
                                            {device.location || t('No location set')}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ 
                                    bgcolor: alpha(COLORS.bg, 0.5), 
                                    borderRadius: '12px', 
                                    p: 2, 
                                    mb: 3,
                                    border: `1px solid ${alpha(COLORS.secondary, 0.05)}`
                                }}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: 700, display: 'block', mb: 0.5 }}>
                                                {t('IP Address')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.dark, fontFamily: 'monospace' }}>
                                                {device.ip_address}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="caption" sx={{ color: COLORS.secondary, fontWeight: 700, display: 'block', mb: 0.5 }}>
                                                {t('Last Sync')}
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: COLORS.dark }}>
                                                {device.last_sync ? format(parseISO(device.last_sync), 'p', { locale: i18n.language === 'ar' ? ar : undefined }) : t('Never')}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {pinging.has(device.id) && (
                                    <Box sx={{ mt: -2, mb: 2 }}>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={progress[device.id] || 0} 
                                            sx={{ 
                                                height: 4, 
                                                borderRadius: 2,
                                                bgcolor: alpha(COLORS.primary, 0.1),
                                                '& .MuiLinearProgress-bar': { background: COLORS.gradientPrimary }
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', textAlign: 'center', color: COLORS.primary, fontWeight: 800 }}>
                                            {t('Testing Connection...')} {Math.round(progress[device.id] || 0)}%
                                        </Typography>
                                    </Box>
                                )}

                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        startIcon={syncing === device.id ? <Sync sx={{ animation: 'spin 1s linear infinite' }} /> : <Sync />}
                                        onClick={(e) => { e.stopPropagation(); handleSync(device.id); }}
                                        disabled={syncing === device.id}
                                        sx={{
                                            borderRadius: '10px',
                                            background: COLORS.gradientPrimary,
                                            boxShadow: SHADOWS.sm,
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            '&:hover': { boxShadow: SHADOWS.md },
                                            '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } }
                                        }}
                                    >
                                        {syncing === device.id ? t('Syncing...') : t('Sync Now')}
                                    </Button>
                                    <IconButton
                                        onClick={(e) => { e.stopPropagation(); handleEdit(device); }}
                                        sx={{ 
                                            borderRadius: '10px', 
                                            bgcolor: alpha(COLORS.info, 0.1), 
                                            color: COLORS.info,
                                            '&:hover': { bgcolor: alpha(COLORS.info, 0.2) }
                                        }}
                                    >
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        onClick={(e) => { e.stopPropagation(); handleDelete(device.id); }}
                                        sx={{ 
                                            borderRadius: '10px', 
                                            bgcolor: alpha(COLORS.error, 0.1), 
                                            color: COLORS.error,
                                            '&:hover': { bgcolor: alpha(COLORS.error, 0.2) }
                                        }}
                                    >
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Add/Edit Dialogs */}
            {[
                { open: openAdd, close: () => setOpenAdd(false), title: t('Add ZKTeco Device'), action: handleAdd, data: newDevice, setData: setNewDevice, btn: t('Add Device') },
                { open: openEdit, close: () => setOpenEdit(false), title: t('Edit ZKTeco Device'), action: handleUpdate, data: editingDevice, setData: setEditingDevice, btn: t('Update Device') }
            ].map((dialog, idx) => (
                <Dialog 
                    key={idx}
                    open={dialog.open} 
                    onClose={dialog.close} 
                    maxWidth="xs" 
                    fullWidth
                    PaperProps={{
                        sx: { borderRadius: '16px', p: 1, boxShadow: SHADOWS.lg }
                    }}
                >
                    <DialogTitle sx={{ pb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" fontWeight="800" color={COLORS.dark}>{dialog.title}</Typography>
                            <IconButton onClick={dialog.close} size="small" sx={{ color: COLORS.secondary }}>
                                <Close fontSize="small" />
                            </IconButton>
                        </Box>
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            <TextField 
                                label={t('Device Name')} 
                                fullWidth 
                                variant="standard"
                                value={dialog.data?.name || ''} 
                                onChange={(e) => dialog.setData({ ...dialog.data, name: e.target.value })} 
                                InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: COLORS.secondary } }}
                                inputProps={{ sx: { fontWeight: 600, color: COLORS.dark, py: 1 } }}
                            />
                            <TextField 
                                label={t('IP Address')} 
                                fullWidth 
                                variant="standard"
                                value={dialog.data?.ip_address || ''} 
                                onChange={(e) => dialog.setData({ ...dialog.data, ip_address: e.target.value })} 
                                InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: COLORS.secondary } }}
                                inputProps={{ sx: { fontWeight: 600, color: COLORS.dark, py: 1, fontFamily: 'monospace' } }}
                            />
                            <TextField 
                                label={t('Port')} 
                                type="number" 
                                fullWidth 
                                variant="standard"
                                value={dialog.data?.port || 4370} 
                                onChange={(e) => dialog.setData({ ...dialog.data, port: Number(e.target.value) })} 
                                InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: COLORS.secondary } }}
                                inputProps={{ sx: { fontWeight: 600, color: COLORS.dark, py: 1 } }}
                            />
                            <TextField 
                                label={t('Location')} 
                                fullWidth 
                                variant="standard"
                                value={dialog.data?.location || ''} 
                                onChange={(e) => dialog.setData({ ...dialog.data, location: e.target.value })} 
                                InputLabelProps={{ shrink: true, sx: { fontWeight: 700, color: COLORS.secondary } }}
                                inputProps={{ sx: { fontWeight: 600, color: COLORS.dark, py: 1 } }}
                            />
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 1 }}>
                        <Button onClick={dialog.close} sx={{ color: COLORS.secondary, fontWeight: 700 }}>{t('Cancel')}</Button>
                        <Button 
                            onClick={dialog.action} 
                            variant="contained"
                            sx={{
                                borderRadius: '10px',
                                background: COLORS.gradientPrimary,
                                boxShadow: SHADOWS.sm,
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 3,
                                '&:hover': { boxShadow: SHADOWS.md }
                            }}
                        >
                            {dialog.btn}
                        </Button>
                    </DialogActions>
                </Dialog>
            ))}
        </Box>
    );
};

export default DevicesPage;
