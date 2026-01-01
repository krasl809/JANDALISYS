import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Drawer,
    Box,
    Typography,
    Avatar,
    IconButton,
    Divider,
    Tabs,
    Tab,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Chip,
    alpha,
    useTheme
} from '@mui/material';
import {
    Close,
    Person,
    Work,
    Badge,
    Email,
    Phone,
    LocationOn,
    Security,
    Save,
    CalendarToday
} from '@mui/icons-material';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    position?: string;
    hire_date?: string;
    employee_id?: string;
    phone?: string;
    address?: string;
    is_active: boolean;
    manager_id?: string;
}

interface UserProfileDrawerProps {
    open: boolean;
    onClose: () => void;
    user: User | null;
    onSave: (updatedUser: any) => Promise<void>;
    departments: any[];
    positions: any[];
    roles: string[];
}

const UserProfileDrawer: React.FC<UserProfileDrawerProps> = ({
    open,
    onClose,
    user,
    onSave,
    departments,
    positions,
    roles
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);
    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({ ...user });
        } else {
            setFormData({});
        }
    }, [user]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error("Failed to save user", error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: { width: { xs: '100%', sm: 500 }, borderRadius: '16px 0 0 16px' }
            }}
        >
            {/* Header with Gradient */}
            <Box sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                p: 3,
                position: 'relative'
            }}>
                <IconButton
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 8, right: 8, color: 'white' }}
                >
                    <Close />
                </IconButton>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                    <Avatar sx={{
                        width: 80,
                        height: 80,
                        mb: 2,
                        bgcolor: 'white',
                        color: 'primary.main',
                        fontSize: '2rem',
                        border: '4px solid rgba(255,255,255,0.3)'
                    }}>
                        {user.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="h5" fontWeight="bold">
                        {user.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        {user.email}
                    </Typography>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Chip
                            label={user.role}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                        />
                        <Chip
                            label={user.is_active ? 'Active' : 'Inactive'}
                            size="small"
                            sx={{
                                bgcolor: user.is_active ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
                                color: user.is_active ? '#66bb6a' : '#ef5350',
                                border: '1px solid currentColor'
                            }}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Content */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
                    <Tab icon={<Person fontSize="small" />} label={t('general')} />
                    <Tab icon={<Work fontSize="small" />} label={t('hr_details')} />
                    <Tab icon={<Security fontSize="small" />} label={t('security')} />
                </Tabs>
            </Box>

            <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>

                {/* General Tab */}
                {tabValue === 0 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Basic Information
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Full Name"
                                fullWidth
                                value={formData.name || ''}
                                onChange={(e) => handleChange('name', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Email Address"
                                fullWidth
                                value={formData.email || ''}
                                onChange={(e) => handleChange('email', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Phone Number"
                                fullWidth
                                value={formData.phone || ''}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                InputProps={{ startAdornment: <Phone color="action" fontSize="small" sx={{ mr: 1 }} /> }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Address"
                                fullWidth
                                multiline
                                rows={2}
                                value={formData.address || ''}
                                onChange={(e) => handleChange('address', e.target.value)}
                                InputProps={{ startAdornment: <LocationOn color="action" fontSize="small" sx={{ mr: 1, mt: 1, alignSelf: 'flex-start' }} /> }}
                            />
                        </Grid>
                    </Grid>
                )}

                {/* HR Details Tab */}
                {tabValue === 1 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Employment Details
                            </Typography>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Employee ID"
                                fullWidth
                                value={formData.employee_id || ''}
                                onChange={(e) => handleChange('employee_id', e.target.value)}
                                InputProps={{ startAdornment: <Badge color="action" fontSize="small" sx={{ mr: 1 }} /> }}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Hire Date"
                                type="date"
                                fullWidth
                                value={formData.hire_date || ''}
                                onChange={(e) => handleChange('hire_date', e.target.value)}
                                InputLabelProps={{ shrink: true }}
                                InputProps={{ startAdornment: <CalendarToday color="action" fontSize="small" sx={{ mr: 1 }} /> }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Department</InputLabel>
                                <Select
                                    value={formData.department || ''}
                                    label="Department"
                                    onChange={(e) => handleChange('department', e.target.value)}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {departments.map(d => (
                                        <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Position</InputLabel>
                                <Select
                                    value={formData.position || ''}
                                    label="Position"
                                    onChange={(e) => handleChange('position', e.target.value)}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {positions.map(p => (
                                        <MenuItem key={p.id} value={p.title}>{p.title}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    </Grid>
                )}

                {/* Security Tab */}
                {tabValue === 2 && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Access Control
                            </Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>System Role</InputLabel>
                                <Select
                                    value={formData.role || ''}
                                    label="System Role"
                                    onChange={(e) => handleChange('role', e.target.value)}
                                >
                                    {roles.map(r => (
                                        <MenuItem key={r} value={r}>{r}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                Changing the role will immediately update the user's permissions.
                            </Typography>
                        </Grid>
                        <Grid item xs={12} sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Reset
                            </Typography>
                            <Button variant="outlined" color="error" fullWidth>
                                Reset Password
                            </Button>
                        </Grid>
                    </Grid>
                )}
            </Box>

            {/* Footer */}
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button
                    variant="contained"
                    fullWidth
                    size="large"
                    startIcon={<Save />}
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </Box>
        </Drawer>
    );
};

export default UserProfileDrawer;
