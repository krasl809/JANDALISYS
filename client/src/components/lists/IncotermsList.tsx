import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
    Box, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, TextField, Alert,
    Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton, Typography, Card, CardContent, Container,
    InputAdornment, useTheme, alpha, Stack, Divider, CircularProgress
} from '@mui/material';
import { 
    Edit, Delete, Add, Search, Description, 
    Code, Title, Save, Close, FilterListOff 
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import Grid from '@mui/material/Grid2';

// تعريف الواجهة
interface Incoterm {
    id: string;
    code: string;
    name: string;
    description: string;
}

const IncotermsList: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();
    
    // --- States ---
    const [incoterms, setIncoterms] = useState<Incoterm[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [currentIncoterm, setCurrentIncoterm] = useState<Incoterm | null>(null);
    
    // Form State
    const [newIncoterm, setNewIncoterm] = useState<Omit<Incoterm, 'id'>>({ 
        code: '', name: '', description: '' 
    });

    // --- API Calls ---
    useEffect(() => {
        fetchIncoterms();
    }, []);

    const fetchIncoterms = async () => {
        try {
            setLoading(true);
            const response = await api.get('/incoterms/');
            setIncoterms(response.data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching incoterms:', err);
            setError(err.response?.data?.detail || t('errorLoadingData'));
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newIncoterm.code.trim() || !newIncoterm.name.trim()) {
            setError('Please fill in required fields (Code & Name)');
            return;
        }

        try {
            const response = await api.post('/incoterms/', newIncoterm);
            setIncoterms([response.data, ...incoterms]);
            setNewIncoterm({ code: '', name: '', description: '' });
            setError(null);
        } catch (err: any) {
            console.error('Error adding incoterm:', err);
            setError(err.response?.data?.detail || t('errorAddingData'));
        }
    };

    const handleEdit = (incoterm: Incoterm) => {
        setCurrentIncoterm(incoterm);
        setEditDialogOpen(true);
    };

    const handleUpdate = async () => {
        if (!currentIncoterm) return;
        try {
            const response = await api.put(`/incoterms/${currentIncoterm.id}`, currentIncoterm);
            setIncoterms(incoterms.map(inc => inc.id === currentIncoterm.id ? response.data : inc));
            setEditDialogOpen(false);
            setCurrentIncoterm(null);
            setError(null);
        } catch (err: any) {
            console.error('Error updating incoterm:', err);
            setError(err.response?.data?.detail || t('errorUpdatingData'));
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('Are you sure you want to delete this item?'))) return;
        try {
            await api.delete(`/incoterms/${id}`);
            setIncoterms(incoterms.filter(inc => inc.id !== id));
            setError(null);
        } catch (err: any) {
            console.error('Error deleting incoterm:', err);
            setError(err.response?.data?.detail || t('errorDeletingData'));
        }
    };

    // --- Search Logic ---
    const filteredIncoterms = useMemo(() => {
        return incoterms.filter(inc => 
            inc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inc.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [incoterms, searchQuery]);

    // --- Styles ---
    const tableHeadSx = {
        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.05) : '#F8FAFC',
        color: theme.palette.text.secondary,
        fontWeight: 700,
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: 2
    };

    if (loading) return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
        </Box>
    );

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
            
            {/* 1. Header Section */}
            <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2, color: 'primary.main' }}>
                        <Description fontSize="large" />
                    </Box>
                    <Box>
                        <Typography variant="h4" fontWeight="800" color="text.primary">
                            {t('Incoterms')}
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            Manage International Commercial Terms definitions.
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* 2. Add New & Search Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Form Card */}
                <Grid size={{ xs: 12, md: 8 }}>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" fontWeight="700" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Add fontSize="small" color="primary" /> {t('Add New Incoterm')}
                            </Typography>
                            
                            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{t(error)}</Alert>}

                            <Grid container spacing={2} alignItems="flex-end">
                                <Grid size={{ xs: 12, sm: 3 }}>
                                    <TextField
                                        label={t('Code')}
                                        placeholder="e.g. FOB"
                                        value={newIncoterm.code}
                                        onChange={(e) => setNewIncoterm({ ...newIncoterm, code: e.target.value.toUpperCase() })}
                                        fullWidth size="small"
                                        InputProps={{ startAdornment: <InputAdornment position="start"><Code fontSize="small" /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 5 }}>
                                    <TextField
                                        label={t('Name')}
                                        placeholder="e.g. Free On Board"
                                        value={newIncoterm.name}
                                        onChange={(e) => setNewIncoterm({ ...newIncoterm, name: e.target.value })}
                                        fullWidth size="small"
                                        InputProps={{ startAdornment: <InputAdornment position="start"><Title fontSize="small" /></InputAdornment> }}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Button 
                                        variant="contained" 
                                        fullWidth 
                                        onClick={handleAdd}
                                        startIcon={<Add />}
                                        sx={{ 
                                            bgcolor: 'primary.main', 
                                            color: '#fff', 
                                            fontWeight: 600,
                                            boxShadow: theme.shadows[2] 
                                        }}
                                    >
                                        {t('Add to List')}
                                    </Button>
                                </Grid>
                                <Grid size={{ xs: 12 }}>
                                    <TextField
                                        label={t('Description')}
                                        placeholder="Optional description..."
                                        value={newIncoterm.description}
                                        onChange={(e) => setNewIncoterm({ ...newIncoterm, description: e.target.value })}
                                        fullWidth size="small" multiline rows={1}
                                    />
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Search Card */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', height: '100%', display: 'flex', alignItems: 'center' }}>
                        <CardContent sx={{ width: '100%' }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom fontWeight="700">
                                SEARCH LIST
                            </Typography>
                            <TextField
                                placeholder="Search by Code or Name..."
                                fullWidth
                                variant="outlined"
                                size="small"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><Search color="action" /></InputAdornment>,
                                    sx: { borderRadius: 2, bgcolor: theme.palette.background.default }
                                }}
                            />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 3. Data Table */}
            <TableContainer component={Card} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={tableHeadSx}>{t('Code')}</TableCell>
                            <TableCell sx={tableHeadSx}>{t('Name')}</TableCell>
                            <TableCell sx={tableHeadSx}>{t('Description')}</TableCell>
                            <TableCell sx={{ ...tableHeadSx, textAlign: 'right' }}>{t('Actions')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <AnimatePresence>
                            {filteredIncoterms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                                        <FilterListOff sx={{ fontSize: 40, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                                        <Typography color="text.secondary">No Incoterms found.</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredIncoterms.map((incoterm) => (
                                    <TableRow 
                                        key={incoterm.id} 
                                        component={motion.tr}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        layout
                                        hover 
                                        sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}
                                    >
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="700" color="primary.main" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), px: 1, py: 0.5, borderRadius: 1, display: 'inline-block' }}>
                                                {incoterm.code}
                                            </Typography>
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>{incoterm.name}</TableCell>
                                        <TableCell sx={{ color: 'text.secondary', maxWidth: 400 }}>{incoterm.description}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleEdit(incoterm)}
                                                    sx={{ color: theme.palette.info.main, bgcolor: alpha(theme.palette.info.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.2) } }}
                                                >
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handleDelete(incoterm.id)}
                                                    sx={{ color: theme.palette.error.main, bgcolor: alpha(theme.palette.error.main, 0.1), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.2) } }}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </TableContainer>

            {/* 4. Edit Dialog */}
            <Dialog 
                open={editDialogOpen} 
                onClose={() => setEditDialogOpen(false)} 
                maxWidth="sm" 
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Edit color="primary" /> {t('Edit Incoterm')}
                    </Box>
                    <IconButton size="small" onClick={() => setEditDialogOpen(false)}><Close /></IconButton>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label={t('Code')}
                            value={currentIncoterm?.code || ''}
                            onChange={(e) => setCurrentIncoterm(currentIncoterm ? { ...currentIncoterm, code: e.target.value.toUpperCase() } : null)}
                            fullWidth size="small"
                        />
                        <TextField
                            label={t('Name')}
                            value={currentIncoterm?.name || ''}
                            onChange={(e) => setCurrentIncoterm(currentIncoterm ? { ...currentIncoterm, name: e.target.value } : null)}
                            fullWidth size="small"
                        />
                        <TextField
                            label={t('Description')}
                            value={currentIncoterm?.description || ''}
                            onChange={(e) => setCurrentIncoterm(currentIncoterm ? { ...currentIncoterm, description: e.target.value } : null)}
                            fullWidth size="small" multiline rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
                    <Button onClick={() => setEditDialogOpen(false)} color="inherit" variant="text">{t('Cancel')}</Button>
                    <Button onClick={handleUpdate} variant="contained" startIcon={<Save />} disableElevation>{t('Save Changes')}</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default IncotermsList;