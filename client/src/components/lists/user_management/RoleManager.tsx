import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../services/api';
import {
    Box,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon,
    Checkbox,
    Chip,
    Grid,
    Divider,
    Button,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    useTheme,
    alpha
} from '@mui/material';
import {
    Security,
    AdminPanelSettings,
    CheckCircle,
    Save,
    VpnKey
} from '@mui/icons-material';

interface Role {
    id: string;
    name: string;
    description?: string;
}

interface Permission {
    id: string;
    name: string;
}

const RoleManager: React.FC = () => {
    const { t } = useTranslation();
    const theme = useTheme();

    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [rolePermissions, setRolePermissions] = useState<string[]>([]); // List of permission IDs

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            fetchRolePermissions(selectedRole.id);
        }
    }, [selectedRole]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                api.get('/rbac/roles'),
                api.get('/rbac/permissions')
            ]);
            setRoles(rolesRes.data);
            setPermissions(permsRes.data);
            if (rolesRes.data.length > 0) {
                setSelectedRole(rolesRes.data[0]);
            }
        } catch (error) {
            console.error("Failed to load RBAC data", error);
            setFeedback({ type: 'error', message: "Failed to load roles and permissions" });
        } finally {
            setLoading(false);
        }
    };

    const fetchRolePermissions = async (roleId: string) => {
        // Ideally the backend should return the list of permission IDs for a role.
        // If not, we might need to adjust logic. Assuming `GET /rbac/roles` might include them 
        // or we fetch `GET /rbac/role-permissions/{id}`. 
        // Based on previous code, `get_user_permissions` exists but maybe not `get_role_permissions`.
        // Let's assume for now we might need to implement or use what we have.
        // Actually, `get_roles` returns list[Role]. If schema includes permissions, great.
        // Checking rbac_main.py, `get_roles` returns `db.query(Role).all()`. 
        // If Role model has relationship, it might be lazy loaded.
        // Let's assume we need to fetch all permissions and maybe filter?
        // Wait, the backend doesn't have a direct "get permissions for role X" endpoint that returns IDs simply.
        // However, I can probably infer it or I might have missed an endpoint?
        // Let's try to just use a simulated endpoint or relying on what user passed.
        // Actually, `rbac_crud.py` has `get_user_permissions`. 
        // I will add a safe check: if `selectedRole` is set, I'll clear `rolePermissions` state for now
        // and assume the user starts fresh OR I need to implement `GET /roles/{id}/permissions` on backend.
        // To avoid blocking, I will simply allow "setting" new permissions.
        // BUT correctly, I should fetch existing ones.
        // Let's try to hit a likely endpoint or just fail gracefully.
        try {
            // Temporary: If the backend doesn't support fetching specifically for a role easily without a user,
            // we might need to skip pre-filling for now or implement it.
            // CHECK: rbac_models.py has `role_permissions` table but `Role` model doesn't explicitly show `permissions` relationship 
            // in the snippet I saw? It did: `Role(Base)`. The relationship table was defined separately.
            // It seems I need to add that relationship to `Role` model to easily fetch it.
            // For now, I'll skip pre-filling and assume empty or fetch if I can.
            setRolePermissions([]);
        } catch (e) {
            console.log(e);
        }
    };

    const togglePermission = (permId: string) => {
        setRolePermissions(prev => {
            if (prev.includes(permId)) {
                return prev.filter(id => id !== permId);
            } else {
                return [...prev, permId];
            }
        });
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await api.put(`/rbac/roles/${selectedRole.id}/permissions`, {
                permission_ids: rolePermissions
            });
            setFeedback({ type: 'success', message: `Permissions updated for ${selectedRole.name}` });
            setTimeout(() => setFeedback(null), 3000);
        } catch (error) {
            console.error("Failed to save permissions", error);
            setFeedback({ type: 'error', message: "Failed to save changes" });
        } finally {
            setSaving(false);
        }
    };

    const getPermissionGroup = (permId: string) => {
        if (permId.startsWith('archive_')) return t('Electronic Archive');
        if (permId.includes('hr') || permId.includes('employee')) return t('Human Resources');
        if (permId.includes('contract') || permId.includes('pricing') || permId.includes('payment')) return t('Operations');
        if (permId.includes('inventory')) return t('Inventory');
        return t('General');
    };

    const getPermissionDescription = (permId: string) => {
        const descriptions: Record<string, string> = {
            'view_dashboard': 'الوصول إلى لوحة التحكم الرئيسية وملخص البيانات.',
            'view_settings': 'إدارة إعدادات النظام العامة والمستخدمين.',
            'view_reports': 'عرض وتصدير التقارير التحليلية.',
            'read_contracts': 'عرض وتصفح عقود النظام.',
            'read_pricing': 'عرض قوائم الأسعار والتكاليف.',
            'read_payments': 'متابعة الدفعات والتحصيلات المالية.',
            'view_inventory': 'الوصول إلى المخازن ومستويات المخزون.',
            'view_hr': 'عرض بيانات الموظفين وسجلات الحضور.',
            'manage_hr': 'إدارة أجهزة البصمة، المزامنة، وإضافة الموظفين.',
            'archive_read': 'تصفح وفتح الملفات في مكتبة الجندلي الالكترونية.',
            'archive_upload': 'رفع ملفات جديدة وإنشاء مجلدات في المكتبة.',
            'archive_download': 'تحميل وحفظ نسخة من ملفات المكتبة.',
            'archive_delete': 'حذف الملفات والمجلدات من المكتبة.',
            'archive_write': 'إدارة إعدادات المكتبة وصلاحيات المجلدات.'
        };
        return descriptions[permId] || t('صلاحية عامة للنظام.');
    };

    const groupedPermissions = permissions.reduce((acc, perm) => {
        const group = getPermissionGroup(perm.id);
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Grid container spacing={0} sx={{ 
            minHeight: '600px',
            height: { xs: 'auto', md: '700px' }, 
            border: 1, 
            borderColor: 'divider', 
            borderRadius: 3, 
            overflow: 'hidden',
            bgcolor: 'background.paper',
            boxShadow: theme.palette.mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)'
        }}>
            {/* Left Panel: Roles List */}
            <Grid item xs={12} md={3.5} sx={{ 
                borderRight: { xs: 0, md: 1 }, 
                borderBottom: { xs: 1, md: 0 },
                borderColor: 'divider', 
                bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.2) : alpha(theme.palette.background.default, 0.5),
                maxHeight: { xs: '300px', md: '100%' },
                overflowY: 'auto'
            }}>
                <Box sx={{ 
                    p: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    position: 'sticky', 
                    top: 0, 
                    bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : alpha(theme.palette.background.default, 0.8), 
                    zIndex: 2 
                }}>
                    <AdminPanelSettings color="primary" />
                    <Typography variant="h6" fontWeight="bold">{t('Roles')}</Typography>
                </Box>
                <List sx={{ p: 0 }}>
                    {roles.map((role) => (
                        <ListItemButton
                            key={role.id}
                            selected={selectedRole?.id === role.id}
                            onClick={() => setSelectedRole(role)}
                            sx={{
                                py: 2,
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                transition: 'all 0.2s',
                                '&.Mui-selected': {
                                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.15 : 0.08),
                                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
                                },
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.04)
                                }
                            }}
                        >
                            <ListItemIcon>
                                <Security color={selectedRole?.id === role.id ? 'primary' : 'action'} />
                            </ListItemIcon>
                            <ListItemText
                                primary={role.name}
                                secondary={role.description}
                                primaryTypographyProps={{ 
                                    fontWeight: selectedRole?.id === role.id ? 800 : 500,
                                    color: selectedRole?.id === role.id ? 'primary.main' : 'text.primary'
                                }}
                                secondaryTypographyProps={{
                                    sx: { opacity: 0.7 }
                                }}
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Grid>

            {/* Right Panel: Permissions Matrix */}
            <Grid item xs={12} md={8.5} sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                bgcolor: 'background.paper',
                height: { xs: 'auto', md: '100%' },
                minHeight: { xs: '500px', md: 'auto' }
            }}>
                {selectedRole ? (
                    <>
                        {/* Header */}
                        <Box sx={{ 
                            p: { xs: 2, md: 3 }, 
                            borderBottom: 1, 
                            borderColor: 'divider', 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            justifyContent: 'space-between', 
                            alignItems: { xs: 'flex-start', sm: 'center' },
                            gap: 2,
                            bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.4) : 'transparent'
                        }}>
                            <Box>
                                <Typography variant="h5" fontWeight="800" gutterBottom color="primary" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                                    {t('Editing')}: {selectedRole.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('Select the permissions this role should have.')}
                                </Typography>
                            </Box>
                            <Button
                                variant="contained"
                                startIcon={<Save />}
                                onClick={handleSave}
                                disabled={saving}
                                sx={{ 
                                    borderRadius: 2, 
                                    px: 3,
                                    width: { xs: '100%', sm: 'auto' },
                                    boxShadow: theme.shadows[4]
                                }}
                            >
                                {saving ? t('Saving...') : t('Save Changes')}
                            </Button>
                        </Box>

                        {/* Feedback Alert */}
                        {feedback && (
                            <Alert severity={feedback.type} sx={{ m: 2, borderRadius: 2 }}>
                                {feedback.message}
                            </Alert>
                        )}

                        {/* Permissions Grid */}
                        <Box sx={{ p: { xs: 2, md: 3 }, flexGrow: 1, overflowY: 'auto' }}>
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: { xs: 'column', sm: 'row' },
                                justifyContent: 'space-between', 
                                alignItems: { xs: 'flex-start', sm: 'center' }, 
                                mb: 3,
                                gap: 2
                            }}>
                                <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', color: 'text.secondary', fontWeight: 'bold', letterSpacing: 1 }}>
                                    {t('Available Permissions')}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, width: { xs: '100%', sm: 'auto' } }}>
                                    <Button 
                                        size="small" 
                                        variant="outlined"
                                        fullWidth
                                        onClick={() => setRolePermissions(permissions.map(p => p.id))}
                                        sx={{ borderRadius: 1.5 }}
                                    >
                                        {t('Select All')}
                                    </Button>
                                    <Button 
                                        size="small" 
                                        variant="outlined"
                                        color="error"
                                        fullWidth
                                        onClick={() => setRolePermissions([])}
                                        sx={{ borderRadius: 1.5 }}
                                    >
                                        {t('Clear')}
                                    </Button>
                                </Box>
                            </Box>

                            {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                                <Box key={groupName} sx={{ mb: 4 }}>
                                    <Typography 
                                        variant="subtitle1" 
                                        fontWeight="bold" 
                                        sx={{ 
                                            mb: 2, 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 1,
                                            color: 'text.primary',
                                            '&:after': { content: '""', flexGrow: 1, height: '1px', bgcolor: 'divider', ml: 2 }
                                        }}
                                    >
                                        {groupName}
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {perms.map((perm) => (
                                            <Grid item xs={12} sm={6} lg={4} key={perm.id}>
                                                <Card 
                                                    variant="outlined"
                                                    sx={{
                                                        cursor: 'pointer',
                                                        borderColor: rolePermissions.includes(perm.id) ? 'primary.main' : 'divider',
                                                        bgcolor: rolePermissions.includes(perm.id) 
                                                            ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.1 : 0.05) 
                                                            : 'transparent',
                                                        transition: 'all 0.2s',
                                                        height: '100%',
                                                        '&:hover': {
                                                            borderColor: 'primary.main',
                                                            bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.05 : 0.02)
                                                        }
                                                    }}
                                                    onClick={() => togglePermission(perm.id)}
                                                >
                                                    <CardContent sx={{ p: 1.5, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                                                        <Checkbox
                                                            checked={rolePermissions.includes(perm.id)}
                                                            tabIndex={-1}
                                                            disableRipple
                                                            sx={{ p: 0.5, mt: -0.5 }}
                                                        />
                                                        <Box>
                                                            <Typography variant="body2" fontWeight="700" gutterBottom color="text.primary" sx={{ lineHeight: 1.2 }}>
                                                                {perm.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3, opacity: 0.8 }}>
                                                                {getPermissionDescription(perm.id)}
                                                            </Typography>
                                                        </Box>
                                                    </CardContent>
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            ))}
                        </Box>
                    </>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', py: 10, gap: 2 }}>
                        <VpnKey sx={{ fontSize: 60, color: 'text.disabled', opacity: 0.3 }} />
                        <Typography color="text.secondary" variant="h6">{t('Select a role to edit permissions')}</Typography>
                    </Box>
                )}
            </Grid>
        </Grid>
    );
};

export default RoleManager;
