import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Typography,
    Tabs,
    Tab,
    Button,
    Alert,
    Fade,
    Paper
} from '@mui/material';
import {
    Person,
    Security,
    Business,
    Add,
    Groups,
    AdminPanelSettings,
    VerifiedUser
} from '@mui/icons-material';

import UserGrid from './UserGrid';
import RoleManager from './RoleManager';
import UserProfileDrawer from './UserProfileDrawer';
import DepartmentsManager from './DepartmentsManager';
import api from '../../../services/api';
import { useTheme, alpha, Card, CardContent, Grid } from '@mui/material';

const UserManagementNew: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();

    // State
    const [activeTab, setActiveTab] = useState(0);
    const [users, setUsers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [positions, setPositions] = useState<any[]>([]);
    const [openDrawer, setOpenDrawer] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Constants
    const roles = ['admin', 'manager', 'finance', 'user', 'viewer'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, deptsRes, posRes] = await Promise.all([
                api.get('/users/'),
                api.get('/departments'),
                api.get('/positions')
            ]);
            // Ensure we always have arrays
            const usersData = Array.isArray(usersRes.data) ? usersRes.data :
                (usersRes.data?.users || usersRes.data?.data || []);
            setUsers(usersData);
            setDepartments(Array.isArray(deptsRes.data) ? deptsRes.data : (deptsRes.data?.data || []));
            setPositions(Array.isArray(posRes.data) ? posRes.data : (posRes.data?.data || []));
        } catch (err: any) {
            console.error('Failed to load data:', err);
            setError("Failed to load data - you may not have admin permissions");
        }
    };

    const handleEditUser = (user: any) => {
        setSelectedUser(user);
        setOpenDrawer(true);
    };

    const handleCreateUser = () => {
        setSelectedUser(null); // New user mode
        setOpenDrawer(true);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm(t('confirmDeleteUser'))) return;
        try {
            await api.delete('/hr/employees', { data: [userId] });
            setUsers(prev => prev.filter((u: any) => u.id !== userId));
        } catch (err) {
            setError("Failed to delete user");
        }
    };

    const handleSaveUser = async (userData: any) => {
        try {
            if (userData.id) {
                // Update
                const res = await api.put(`/hr/employees/${userData.id}`, userData);
                setUsers(prev => prev.map((u: any) => u.id === userData.id ? res.data : u));
            } else {
                // Create
                // Need to ensure password is set for new users (logic handled inside Drawer mostly or API)
                // For simplicity, we assume simple create here or Drawer handles validation
                const res = await api.post('/auth/register', { ...userData, password: userData.password || '123456' });
                setUsers(prev => [...prev, res.data]);
            }
            fetchData(); // Refresh to be sure
        } catch (err: any) {
            console.error(err);
            throw err; // Propagate to drawer to show error
        }
    };

    const GuideCard = ({ icon, title, description, color }: any) => (
        <Card sx={{
            height: '100%',
            border: '1px solid',
            borderColor: alpha(color, 0.2),
            bgcolor: theme.palette.mode === 'dark' ? alpha(color, 0.05) : alpha(color, 0.02),
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: theme.palette.mode === 'dark' ? `0 12px 30px ${alpha(color, 0.15)}` : theme.shadows[8],
                borderColor: color,
                bgcolor: alpha(color, 0.05)
            }
        }}>
            <CardContent sx={{ display: 'flex', gap: { xs: 1.5, md: 2 }, alignItems: 'flex-start', p: { xs: 2, md: 3 } }}>
                <Box sx={{
                    p: { xs: 1, md: 1.5 },
                    borderRadius: 2,
                    bgcolor: alpha(color, 0.1),
                    color: color,
                    display: 'flex',
                    boxShadow: `0 4px 12px ${alpha(color, 0.2)}`
                }}>
                    {React.cloneElement(icon as React.ReactElement, { sx: { fontSize: { xs: 24, md: 28 } } })}
                </Box>
                <Box>
                    <Typography variant="subtitle1" fontWeight="800" gutterBottom sx={{ fontSize: { xs: '1rem', md: '1.1rem' } }}>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, opacity: 0.8 }}>
                        {description}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{
            width: '100%',
            minHeight: '100vh',
            bgcolor: alpha(theme.palette.background.default, 0.5),
            p: { xs: 1, sm: 2, md: 4 }
        }}>

            {/* Header / Hero Section */}
            <Box sx={{
                mb: 4,
                p: { xs: 2, md: 4 },
                borderRadius: { xs: 2, md: 4 },
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', md: 'center' },
                        gap: 2,
                        mb: 2
                    }}>
                        <Box>
                            <Typography variant="h3" fontWeight="800" gutterBottom sx={{ fontSize: { xs: '1.8rem', md: '3rem' } }}>
                                {t('System Settings')}
                            </Typography>
                            <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, fontSize: { xs: '0.9rem', md: '1.25rem' } }}>
                                {t('Manage users, access controls, and organization structure.')}
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Add />}
                            onClick={handleCreateUser}
                            sx={{
                                bgcolor: 'white',
                                color: 'primary.main',
                                fontWeight: 'bold',
                                borderRadius: 3,
                                px: { xs: 2, md: 4 },
                                py: 1.5,
                                width: { xs: '100%', md: 'auto' },
                                '&:hover': { bgcolor: alpha('#fff', 0.9) }
                            }}
                        >
                            {t('Add New User')}
                        </Button>
                    </Box>
                </Box>
                {/* Decorative Elements */}
                <Security sx={{
                    position: 'absolute',
                    right: -20,
                    bottom: -20,
                    fontSize: { xs: 100, md: 200 },
                    opacity: 0.1,
                    transform: 'rotate(-15deg)'
                }} />
            </Box>

            {/* Explanation Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <GuideCard
                        icon={<Groups />}
                        title={t('Users')}
                        description={t('rbac_users_desc')}
                        color={theme.palette.info.main}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <GuideCard
                        icon={<AdminPanelSettings />}
                        title={t('Roles')}
                        description={t('rbac_roles_desc')}
                        color={theme.palette.warning.main}
                    />
                </Grid>
                <Grid item xs={12} sm={12} md={4}>
                    <GuideCard
                        icon={<VerifiedUser />}
                        title={t('Permissions')}
                        description={t('rbac_perms_desc')}
                        color={theme.palette.success.main}
                    />
                </Grid>
            </Grid>

            {/* Tabs */}
            <Paper sx={{ borderRadius: { xs: 2, md: 3 }, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        '& .MuiTab-root': {
                            py: 2,
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: { xs: '0.875rem', md: '1rem' },
                            minHeight: 64
                        },
                        '& .Mui-selected': {
                            color: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.02)
                        }
                    }}
                >
                    <Tab icon={<Person />} iconPosition="start" label={t('Users Directory')} />
                    <Tab icon={<Security />} iconPosition="start" label={t('Roles & Permissions')} />
                    <Tab icon={<Business />} iconPosition="start" label={t('Departments')} />
                </Tabs>

                {/* Content Area */}
                <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, minHeight: 600 }}>
                    {error && (
                        <Alert
                            severity="error"
                            variant="filled"
                            onClose={() => setError(null)}
                            sx={{ mb: 3, borderRadius: 2 }}
                        >
                            {error}
                        </Alert>
                    )}

                    {activeTab === 0 && (
                        <Fade in={activeTab === 0}>
                            <Box>
                                <UserGrid
                                    users={users}
                                    onEdit={handleEditUser}
                                    onDelete={handleDeleteUser}
                                />
                            </Box>
                        </Fade>
                    )}

                    {activeTab === 1 && (
                        <Fade in={activeTab === 1}>
                            <Box sx={{ overflowX: 'hidden' }}>
                                <RoleManager />
                            </Box>
                        </Fade>
                    )}

                    {activeTab === 2 && (
                        <Fade in={activeTab === 2}>
                            <Box>
                                <DepartmentsManager />
                            </Box>
                        </Fade>
                    )}
                </Box>
            </Paper>

            {/* Profile Drawer */}
            <UserProfileDrawer
                open={openDrawer}
                onClose={() => setOpenDrawer(false)}
                user={selectedUser || {}}
                onSave={handleSaveUser}
                departments={departments}
                positions={positions}
                roles={roles}
            />

        </Box>
    );
};

export default UserManagementNew;
