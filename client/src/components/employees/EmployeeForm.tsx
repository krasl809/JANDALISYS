import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, Button, IconButton, Tabs, Tab,
  Stepper, Step, StepLabel, CircularProgress, Snackbar, Alert, AlertColor,
  Chip, Stack, Tooltip, useTheme, alpha
} from '@mui/material';
import {
  Person, Work, AccountBalance, Folder, Preview, CheckCircle,
  Save, Send, ArrowBack, Business, Description
} from '@mui/icons-material';

import api from '../../services/api';
import BackButton from '../common/BackButton';

// Import sub-sections
import PersonalInfoSection from './PersonalInfoSection';
import EmploymentInfoSection from './EmploymentInfoSection';
import DocumentsSection from './DocumentsSection';
import SystemAccessSection from './SystemAccessSection';
import PreviewSection from './PreviewSection';
import SuccessModal from './SuccessModal';

interface EmployeeFormData {
  // User Basic Info
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  department?: string;
  position?: string;
  hire_date?: string;
  employee_id?: string;
  manager_id?: string;
  phone?: string;
  address?: string;
  is_active: boolean;

  // Employment Information
  employment_type: string;
  job_title?: string;
  reporting_to?: string;
  work_location?: string;
  work_schedule?: string;

  // Status
  status: string;

  // Personal Information
  personal_info?: {
    first_name_arabic?: string;
    middle_name_arabic?: string;
    last_name_arabic?: string;
    full_name_arabic?: string;
    first_name_english?: string;
    middle_name_english?: string;
    last_name_english?: string;
    full_name_english?: string;
    date_of_birth?: string;
    place_of_birth?: string;
    nationality?: string;
    gender?: string;
    national_id?: string;
    passport_number?: string;
    passport_expiry?: string;
    personal_email?: string;
    personal_phone?: string;
    mobile_primary?: string;
    mobile_secondary?: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state_province?: string;
    postal_code?: string;
    country?: string;
    marital_status?: string;
    spouse_name?: string;
    spouse_employment?: string;
    number_of_children?: number;
    blood_type?: string;
    medical_conditions?: string;
    allergies?: string;
  };

  // Bank Information
  bank_info?: {
    bank_name?: string;
    bank_account?: string;
    iban?: string;
    swift_code?: string;
    primary_account: boolean;
  };

  // Emergency Contacts
  emergency_contacts: Array<{
    full_name: string;
    relationship?: string;
    phone_primary?: string;
    phone_secondary?: string;
    email?: string;
    address?: string;
    primary_contact: boolean;
  }>;

  // Salary Information
  salary_info?: {
    basic_salary: number;
    currency: string;
    housing_allowance: number;
    transport_allowance: number;
    food_allowance: number;
    medical_allowance: number;
    other_allowances: number;
    tax_deduction: number;
    insurance_deduction: number;
    other_deductions: number;
    effective_date?: string;
  };

  // System Access
  system_access?: {
    system_role: string;
    permissions?: string;
    can_access_hr: boolean;
    can_access_finance: boolean;
    can_access_inventory: boolean;
    can_access_contracts: boolean;
    can_access_reports: boolean;
  };

  // Documents
  documents: Array<{
    document_type: string;
    document_name: string;
    file_path?: string;
    file_size?: number;
    mime_type?: string;
    issue_date?: string;
    expiry_date?: string;
    issuing_authority?: string;
    document_number?: string;
  }>;

  // Work History
  work_history: Array<{
    company_name?: string;
    position?: string;
    department?: string;
    start_date?: string;
    end_date?: string;
    is_current: boolean;
    salary?: number;
    currency: string;
    reason_for_leaving?: string;
    contact_person?: string;
    contact_phone?: string;
  }>;
}

interface NotificationState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface EmployeeFormProps {
  mode?: 'create' | 'edit';
}

const TabPanel = (props: { children?: React.ReactNode; index: number; value: number }) => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const SectionHeader = ({ title, icon }: { title: string, icon: React.ReactNode }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      mb: 2,
      pb: 1,
      borderBottom: `1px solid ${theme.palette.divider}`
    }}>
      <Box sx={{
        color: theme.palette.primary.main,
        display: 'flex',
        p: 0.5,
        borderRadius: 1,
        bgcolor: alpha(theme.palette.primary.main, 0.1)
      }}>
        {icon}
      </Box>
      <Typography variant="subtitle1" fontWeight="700" color="text.primary">
        {title}
      </Typography>
    </Box>
  );
};

const EmployeeForm: React.FC<EmployeeFormProps> = ({ mode: propMode }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Initialization ---
  const initialMode = propMode || (location.state as any)?.mode || 'create';
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({ open: false, message: '', severity: 'success' });
  const [successModalOpen, setSuccessModalOpen] = useState(false);

  // --- Form State ---
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: '',
    email: '',
    role: 'employee',
    is_active: true,
    employment_type: 'full_time',
    status: 'active',
    emergency_contacts: [],
    documents: [],
    work_history: []
  });

  const [canEditEmployee, setCanEditEmployee] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  // --- Effects ---
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check user permissions
        const role = localStorage.getItem('user_role') || 'admin';
        setCanEditEmployee(['admin', 'hr_manager'].includes(role));

        if (id) {
          // Load existing employee data
          const res = await api.get(`/hr/employees/${id}`);
          const data = res.data;

          setFormData({
            ...data,
            // Ensure arrays exist
            emergency_contacts: data.emergency_contacts || [],
            documents: data.documents || [],
            work_history: data.work_history || []
          });
        }
      } catch (err) {
        console.error("Failed to load employee data", err);
        setNotification({
          open: true,
          message: 'Failed to load employee data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && id) {
      const tabsMap: any = {
        personal: 0,
        employment: 1,
        system: 2,
        documents: 3,
        preview: 4
      };
      setActiveTab(tabsMap[tabParam] || 0);
    }
  }, [searchParams, id]);

  const handleTabChange = (_: any, newValue: number) => {
    setActiveTab(newValue);
    const tabs = ['personal', 'employment', 'system', 'documents', 'preview'];
    setSearchParams({ tab: tabs[newValue] });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof EmployeeFormData] as any),
        [field]: value
      }
    }));
  };

  const handleGenerateEmployeeId = async () => {
    setIsGeneratingId(true);
    try {
      // Generate employee ID based on current date
      const currentYear = new Date().getFullYear().toString().slice(-2);
      const timestamp = Date.now().toString().slice(-3);
      const employeeId = `EMP${currentYear}${timestamp}`;
      handleInputChange('employee_id', employeeId);
    } catch (err) {
      console.error("Failed to generate employee ID", err);
    } finally {
      setIsGeneratingId(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name?.trim()) errors.push('Name is required');
    if (!formData.email?.trim()) errors.push('Email is required');

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.push('Invalid email format');
    }

    // Hire date validation
    if (formData.hire_date && new Date(formData.hire_date) > new Date()) {
      errors.push('Hire date cannot be in the future');
    }

    // Personal info validation
    if (formData.personal_info?.date_of_birth) {
      const birthDate = new Date(formData.personal_info.date_of_birth);
      const today = new Date();
      const age = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

      if (birthDate > today) {
        errors.push('Date of birth cannot be in the future');
      } else if (age < 16) {
        errors.push('Employee must be at least 16 years old');
      }
    }

    if (errors.length > 0) {
      setNotification({
        open: true,
        message: `Validation errors: ${errors.join(', ')}`,
        severity: 'error'
      });
      return false;
    }

    return true;
  };

  const handleSave = async (status: 'draft' | 'active') => {
    if (!validateForm()) return;

    try {
      const payload = {
        ...formData,
        status: status === 'active' ? 'active' : formData.status
      };

      if (id) {
        await api.put(`/hr/employees/${id}`, payload);
        setNotification({ open: true, message: 'Employee updated successfully', severity: 'success' });
      } else {
        const res = await api.post('/hr/employees', payload);
        setNotification({ open: true, message: 'Employee created successfully', severity: 'success' });
        setSuccessModalOpen(true);

        if (res.data.id) {
          setTimeout(() => {
            navigate(`/employees/${res.data.id}?tab=personal`, {
              replace: true,
              state: { mode: 'edit' }
            });
          }, 2000);
        }
      }
    } catch (err: any) {
      let msg = 'Error saving employee.';
      if (err.response?.status === 403) {
        msg = 'Access denied. Insufficient permissions.';
        setCanEditEmployee(false);
      } else if (err.response?.data?.detail) {
        const d = err.response.data.detail;
        msg = Array.isArray(d) ? d.map((e: any) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ') : d;
      }
      setNotification({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await api.delete(`/hr/employees/${id}`);
      setNotification({ open: true, message: 'Employee deleted successfully', severity: 'success' });
      setTimeout(() => navigate('/employees'), 1000);
    } catch (err: any) {
      setNotification({ open: true, message: 'Delete failed', severity: 'error' });
    }
  };

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: [
        ...prev.emergency_contacts,
        {
          full_name: '',
          relationship: '',
          phone_primary: '',
          phone_secondary: '',
          email: '',
          address: '',
          primary_contact: prev.emergency_contacts.length === 0
        }
      ]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.filter((_, i) => i !== index)
    }));
  };

  const updateEmergencyContact = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      emergency_contacts: prev.emergency_contacts.map((contact, i) =>
        i === index ? { ...contact, [field]: value } : contact
      )
    }));
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" p={10}>
      <CircularProgress />
    </Box>
  );

  const steps = ['Personal Info', 'Employment', 'System Access', 'Documents', 'Preview'];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 12 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <BackButton />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h4" fontWeight="800" color="text.primary">
                {id ? formData.name : 'New Employee Registration'}
              </Typography>
              <Chip
                label={formData.status?.toUpperCase() || 'DRAFT'}
                size="small"
                sx={{
                  bgcolor: formData.status === 'active'
                    ? alpha(theme.palette.success.main, 0.1)
                    : alpha(theme.palette.warning.main, 0.1),
                  color: formData.status === 'active'
                    ? 'success.main'
                    : 'warning.main',
                  fontWeight: 'bold',
                  borderRadius: '6px'
                }}
                icon={formData.status === 'active' ? <CheckCircle /> : <Person />}
              />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Comprehensive Employee Management System
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 350 }}>
          <Stepper activeStep={activeTab} alternativeLabel>
            {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
          </Stepper>
        </Box>
      </Box>

      {/* Tabs Header */}
      <Paper elevation={0} sx={{
        mb: 3,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden'
      }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ '& .MuiTab-root': { minHeight: 60, fontWeight: 700, textTransform: 'none', fontSize: '0.9rem' } }}
        >
          <Tab icon={<Person fontSize="small" />} iconPosition="start" label="Personal Information" />
          <Tab icon={<Work fontSize="small" />} iconPosition="start" label="Employment Details" />
          <Tab icon={<Business fontSize="small" />} iconPosition="start" label="System Access" />
          <Tab icon={<Folder fontSize="small" />} iconPosition="start" label="Documents" />
          <Tab icon={<Preview fontSize="small" />} iconPosition="start" label="Preview & Submit" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <PersonalInfoSection
          formData={formData}
          onInputChange={handleInputChange}
          onNestedInputChange={handleNestedInputChange}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <EmploymentInfoSection
          formData={formData}
          onInputChange={handleInputChange}
          onNestedInputChange={handleNestedInputChange}
          onGenerateEmployeeId={handleGenerateEmployeeId}
          isGeneratingId={isGeneratingId}
          emergencyContacts={formData.emergency_contacts}
          onAddEmergencyContact={addEmergencyContact}
          onRemoveEmergencyContact={removeEmergencyContact}
          onUpdateEmergencyContact={updateEmergencyContact}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <SystemAccessSection
          formData={formData}
          onInputChange={handleInputChange}
          onNestedInputChange={handleNestedInputChange}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <DocumentsSection
          formData={formData}
          onInputChange={handleInputChange}
          onNestedInputChange={handleNestedInputChange}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <PreviewSection formData={formData} />
      </TabPanel>

      {/* Floating Actions */}
      {activeTab < 4 && (
        <Paper elevation={4} sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          py: 2,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${theme.palette.divider}`
        }}>
          <Container maxWidth="xl">
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              <Box>
                {id && (
                  <Button
                    color="error"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete Employee
                  </Button>
                )}
              </Box>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => handleSave('draft')}
                  disabled={!canEditEmployee}
                >
                  Save Draft
                </Button>
                <Button
                  variant="contained"
                  onClick={() => handleSave('active')}
                  disabled={!canEditEmployee}
                  sx={{ px: 4 }}
                >
                  {id ? 'Update Employee' : 'Create Employee'}
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Paper>
      )}

      {/* Success Modal */}
      <SuccessModal
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        employeeName={formData.name}
      />

      {/* Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
      >
        <Alert severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmployeeForm;