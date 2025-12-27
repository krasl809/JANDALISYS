export const PERMISSIONS = {
    VIEW_DASHBOARD: 'view_dashboard',
    VIEW_CONTRACTS: 'read_contracts',
    VIEW_PRICING: 'read_pricing', // Mapping to existing or new? using existing functional if possible, or new view
    VIEW_PAYMENTS: 'read_payments',
    VIEW_REPORTS: 'view_reports',
    VIEW_INVENTORY: 'view_inventory',
    VIEW_SETTINGS: 'view_settings',
    VIEW_HR: 'view_hr',
    MANAGE_HR: 'manage_hr', // For devices and sync
};

export const ROUTE_PERMISSIONS: Record<string, string> = {
    '/': PERMISSIONS.VIEW_DASHBOARD,
    '/contracts': PERMISSIONS.VIEW_CONTRACTS,
    '/pricing': PERMISSIONS.VIEW_PRICING,
    '/payments': PERMISSIONS.VIEW_PAYMENTS,
    '/reports': PERMISSIONS.VIEW_REPORTS,
    '/inventory/warehouses': PERMISSIONS.VIEW_INVENTORY,
    '/inventory/stock': PERMISSIONS.VIEW_INVENTORY,
    '/inventory/movements': PERMISSIONS.VIEW_INVENTORY,
    '/settings': PERMISSIONS.VIEW_SETTINGS,
    '/hr': PERMISSIONS.VIEW_HR, // HR Dashboard
    '/hr/attendance': PERMISSIONS.VIEW_HR,
    '/hr/shifts': PERMISSIONS.VIEW_HR,
    '/hr/devices': PERMISSIONS.MANAGE_HR,
    '/employees': PERMISSIONS.VIEW_HR,
    '/employees/import': PERMISSIONS.MANAGE_HR,
    '/employees/add': PERMISSIONS.MANAGE_HR,
    '/employees/edit/:id': PERMISSIONS.MANAGE_HR,
    '/employees/:id': PERMISSIONS.VIEW_HR,
};
