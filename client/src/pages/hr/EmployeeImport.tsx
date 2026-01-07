import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Box, Typography, Button, Stepper, Step, StepLabel,
  CircularProgress, Snackbar, Alert, AlertColor, Chip, Stack, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
  FormControl, Select, MenuItem,
  LinearProgress, Divider, IconButton, Tooltip
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Error, Warning, ArrowBack,
  Description, PlayArrow, Cancel, Refresh, Delete, ChevronRight, ChevronLeft
} from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

import api from '../../services/api';
import BackButton from '../../components/common/BackButton';

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
    gradientInfo: 'linear-gradient(135deg, #11CDEF 0%, #1171EF 100%)',
    gradientWarning: 'linear-gradient(135deg, #FB6340 0%, #FBB140 100%)',
    gradientError: 'linear-gradient(135deg, #F5365C 0%, #F56036 100%)',
};

const SHADOWS = {
    xs: '0 1px 5px rgba(0, 0, 0, 0.05)',
    sm: '0 3px 8px rgba(0, 0, 0, 0.08)',
    md: '0 7px 14px rgba(50, 50, 93, 0.1)',
    lg: '0 15px 35px rgba(50, 50, 93, 0.1)',
};

interface ImportData {
  headers: string[];
  preview_rows: any[][];
  total_rows: number;
  valid_rows?: number;
  invalid_rows?: number;
  errors: string[];
  suggested_mappings?: { [key: string]: number };
}

interface ColumnMapping {
  excelColumn: string;
  dbField: string;
  required: boolean;
  sampleData: string[];
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  details?: any[];
}

const EmployeeImport: React.FC = () => {
  const navigate = useNavigate();

  // --- State ---
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({ open: false, message: '', severity: 'success' });

  // File Upload
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportData | null>(null);

  // Column Mapping
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Import Options
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(true);

  // Import Progress
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // --- Database Fields ---
  const dbFields = [
    { key: 'code', label: 'الرقم الوظيفي (Code)', required: true },
    { key: 'first_name', label: 'الاسم الأول/الكامل', required: true },
    { key: 'last_name', label: 'الاسم الأخير', required: false },
    { key: 'company', label: 'الشركة', required: false },
    { key: 'work_email', label: 'البريد الإلكتروني', required: false },
    { key: 'department', label: 'القسم', required: false },
    { key: 'position', label: 'المسمى الوظيفي', required: false },
    { key: 'joining_date', label: 'تاريخ التعيين', required: false },
    { key: 'phone', label: 'رقم الهاتف', required: false },
  ];

  const steps = ['رفع الملف', 'ربط الأعمدة', 'معاينة البيانات', 'خيارات الاستيراد', 'التنفيذ'];

  // --- Handlers ---
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setNotification({
        open: true,
        message: 'يجب أن يكون الملف بصيغة Excel (.xlsx)',
        severity: 'error'
      });
      return;
    }

    setUploadedFile(file);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('hr/employees/import/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = response.data as ImportData;
      setImportData(data);

      // Initialize column mappings
      const mappings: ColumnMapping[] = data.headers.map((header: string, index: number) => ({
        excelColumn: header,
        dbField: '',
        required: false,
        sampleData: data.preview_rows ? data.preview_rows.slice(0, 3).map((row: any[]) => row[index] || '') : []
      }));

      setColumnMappings(mappings);
      setActiveStep(1);

      // Auto-map columns using backend suggestions
      setTimeout(() => autoMapColumns(mappings, data.suggested_mappings), 100);

      // Select all valid rows by default
      const validRows = new Set<number>();
      if (data.preview_rows) {
        data.preview_rows.forEach((_: any, index: number) => validRows.add(index));
      }
      setSelectedRows(validRows);

    } catch (error: any) {
      console.error('Import analysis error:', error);
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'فشل في تحليل الملف',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleColumnMapping = (excelColumn: string, dbField: string) => {
    setColumnMappings(prev =>
      prev.map(mapping =>
        mapping.excelColumn === excelColumn
          ? { ...mapping, dbField, required: dbFields.find(f => f.key === dbField)?.required || false }
          : mapping
      )
    );
  };

  const handleRowSelection = (rowIndex: number, selected: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(rowIndex);
      } else {
        newSet.delete(rowIndex);
      }
      return newSet;
    });
  };

  const handleSelectAllRows = (selected: boolean) => {
    if (selected && importData) {
      const allRows = new Set<number>();
      importData.preview_rows.forEach((_, index) => allRows.add(index));
      setSelectedRows(allRows);
    } else {
      setSelectedRows(new Set());
    }
  };

  // Auto-map columns based on header names or backend suggestions
  const autoMapColumns = useCallback((baseMappings: ColumnMapping[], backendSuggestions?: { [key: string]: number }) => {
    console.log('Auto-mapping columns...');
    const suggestions = backendSuggestions || importData?.suggested_mappings || {};

    const newMappings = baseMappings.map((mapping, index) => {
      // 1. Try Backend Suggestion first (It maps db_field -> col_index)
      let matchedField = '';

      // Look for a db_key where the value matches our current column index
      const suggestionEntry = Object.entries(suggestions).find(([_, colIdx]) => colIdx === index);

      if (suggestionEntry) {
        matchedField = suggestionEntry[0];
        console.log(`Backend match for col ${index}: ${matchedField}`);
      } else {
        // 2. Fallback to Frontend Fuzzy Logic
        const header = mapping.excelColumn.toLowerCase().trim();
        if (header.includes('name') || header.includes('الاسم')) matchedField = 'first_name';
        else if (header.includes('email') || header.includes('البريد')) matchedField = 'work_email';
        else if (header.includes('company') || header.includes('الشركة')) matchedField = 'company';
        else if (header.includes('id') || header.includes('رقم') || header.includes('كود')) matchedField = 'code';
        else if (header.includes('department') || header.includes('القسم')) matchedField = 'department';
        else if (header.includes('position') || header.includes('المسمى')) matchedField = 'position';
        else if (header.includes('date') || header.includes('تاريخ')) matchedField = 'joining_date';
        else if (header.includes('phone') || header.includes('هاتف')) matchedField = 'phone';
      }

      // Sync field names with Employee model
      if (matchedField === 'name') matchedField = 'first_name';
      if (matchedField === 'email') matchedField = 'work_email';
      if (matchedField === 'employee_id') matchedField = 'code';
      if (matchedField === 'hire_date') matchedField = 'joining_date';

      return {
        ...mapping,
        dbField: matchedField || '',
        required: matchedField ? dbFields.find(f => f.key === matchedField)?.required || false : false
      };
    });

    setColumnMappings(newMappings);
  }, [importData, dbFields]);

  // Wrapper for manual trigger
  const triggerAutoMap = () => autoMapColumns(columnMappings);

  const validateMappings = (): boolean => {
    const requiredFields = dbFields.filter(f => f.required).map(f => f.key);
    const mappedFields = columnMappings.map(m => m.dbField).filter(f => f);

    console.log('Required fields:', requiredFields);
    console.log('Mapped fields:', mappedFields);
    console.log('Column mappings:', columnMappings);

    return requiredFields.every(field => mappedFields.includes(field));
  };

  const handleImport = async () => {
    if (!importData) return;

    // Check if required fields are mapped
    if (!validateMappings()) {
      setNotification({
        open: true,
        message: 'يجب ربط الحقول المطلوبة (الاسم والبريد الإلكتروني) قبل الاستيراد',
        severity: 'error'
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const selectedData = Array.from(selectedRows).map(index => importData.preview_rows[index]);

      // Convert ColumnMapping[] to { [dbField]: index } for backend
      const backendMappings: { [key: string]: number } = {};
      columnMappings.forEach((m, index) => {
        if (m.dbField) {
          backendMappings[m.dbField] = index;
        }
      });

      const payload = {
        data: selectedData,
        options: {
          mappings: backendMappings,
          skipDuplicates,
          updateExisting,
          autoCreateDepartments: true, // Professional default
          createUsers: false // Keep it safe for now
        }
      };

      const response = await api.post('hr/employees/import/execute', payload, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          setImportProgress(percent);
        }
      });

      setImportResult(response.data);
      setActiveStep(5);

    } catch (error: any) {
      setNotification({
        open: true,
        message: error.response?.data?.detail || 'فشل في الاستيراد',
        severity: 'error'
      });
    } finally {
      setImporting(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // File Upload
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <CloudUpload sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              رفع ملف Excel للموظفين
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              اختر ملف Excel (.xlsx) يحتوي على بيانات الموظفين
            </Typography>

            <input
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button
                variant="contained"
                component="span"
                size="large"
                startIcon={<Description />}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'اختيار الملف'}
              </Button>
            </label>

            {uploadedFile && (
              <Box sx={{ mt: 3 }}>
                <Chip
                  icon={<CheckCircle />}
                  label={`تم رفع: ${uploadedFile.name}`}
                  color="success"
                  variant="outlined"
                />
              </Box>
            )}
          </Box>
        );

      case 1: // Column Mapping
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                ربط أعمدة الملف بأعمدة قاعدة البيانات
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const resetMappings = columnMappings.map(mapping => ({
                      ...mapping,
                      dbField: '',
                      required: false
                    }));
                    setColumnMappings(resetMappings);
                  }}
                  startIcon={<Cancel />}
                  size="small"
                  color="error"
                >
                  إعادة تعيين
                </Button>
                <Button
                  variant="outlined"
                  onClick={triggerAutoMap}
                  startIcon={<Refresh />}
                  size="small"
                >
                  التعيين التلقائي
                </Button>
              </Box>
            </Box>

            <Alert
              severity={validateMappings() ? "success" : "warning"}
              sx={{ mb: 3 }}
            >
              <Typography variant="body2" sx={{ mb: 1 }}>
                {validateMappings()
                  ? "✅ جميع الحقول المطلوبة مربوطة بنجاح. يمكنك المتابعة للخطوة التالية."
                  : "⚠️ بعض الحقول المطلوبة (الكود الوظيفي والاسم) غير مربوطة."
                }
              </Typography>

              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                  الحقول المربوطة: {columnMappings.filter(m => m.dbField).map(m => `${m.excelColumn} → ${dbFields.find(f => f.key === m.dbField)?.label}`).join(', ')}
                </Typography>

                {!validateMappings() && (
                  <Typography variant="caption" color="error" sx={{ display: 'block' }}>
                    الحقول المطلوبة غير المربوطة: {dbFields.filter(f => f.required && !columnMappings.some(m => m.dbField === f.key)).map(f => f.label).join(', ')}
                  </Typography>
                )}
              </Box>
            </Alert>

            <TableContainer component={Paper} sx={{ mt: 3 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>عمود Excel</TableCell>
                    <TableCell>بيانات تجريبية</TableCell>
                    <TableCell>حقل قاعدة البيانات</TableCell>
                    <TableCell>مطلوب</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {columnMappings.map((mapping, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        {mapping.excelColumn}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          {mapping.sampleData.slice(0, 2).map((sample, i) => (
                            <Chip
                              key={i}
                              label={sample || 'فارغ'}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={mapping.dbField}
                            onChange={(e) => handleColumnMapping(mapping.excelColumn, e.target.value)}
                          >
                            <MenuItem value="">
                              <em>لا تربط</em>
                            </MenuItem>
                            {dbFields.map(field => (
                              <MenuItem key={field.key} value={field.key}>
                                {field.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        {mapping.required && (
                          <Chip label="مطلوب" color="error" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );

      case 2: // Data Preview
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              معاينة البيانات
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2">
                  إجمالي الصفوف: {importData?.total_rows}
                </Typography>
                <Chip
                  icon={<CheckCircle />}
                  label={`صالح: ${importData?.valid_rows || importData?.total_rows}`}
                  color="success"
                  size="small"
                />
                <Chip
                  icon={<Error />}
                  label={`خطأ: ${importData?.invalid_rows || 0}`}
                  color="error"
                  size="small"
                />
              </Stack>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRows.size === importData?.preview_rows.length}
                        indeterminate={selectedRows.size > 0 && selectedRows.size < (importData?.preview_rows.length || 0)}
                        onChange={(e) => handleSelectAllRows(e.target.checked)}
                      />
                    </TableCell>
                    {importData?.headers.map((header, index) => (
                      <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                        {header}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importData?.preview_rows.slice(0, 10).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedRows.has(rowIndex)}
                          onChange={(e) => handleRowSelection(rowIndex, e.target.checked)}
                        />
                      </TableCell>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {cell || <Typography variant="body2" color="text.secondary">فارغ</Typography>}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {importData && importData.preview_rows.length > 10 && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                عرض أول 10 صفوف فقط من أصل {importData.preview_rows.length}
              </Typography>
            )}
          </Box>
        );

      case 3: // Import Options
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              خيارات الاستيراد
            </Typography>

            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      سلوك المكررين
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Checkbox
                          checked={skipDuplicates}
                          onChange={(e) => setSkipDuplicates(e.target.checked)}
                        />
                        <Box>
                          <Typography variant="body2">تخطي الموظفين المكررين</Typography>
                          <Typography variant="caption" color="text.secondary">
                            لا تستورد الموظفين الذين لديهم نفس رقم الموظف أو البريد الإلكتروني
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Checkbox
                          checked={updateExisting}
                          onChange={(e) => setUpdateExisting(e.target.checked)}
                        />
                        <Box>
                          <Typography variant="body2">تحديث الموظفين الموجودين</Typography>
                          <Typography variant="caption" color="text.secondary">
                            حدث بيانات الموظفين الموجودين بالبيانات الجديدة
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle1" gutterBottom>
                      ملخص الاستيراد
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        • سيتم استيراد {selectedRows.size} موظف من أصل {importData?.total_rows}
                      </Typography>
                      <Typography variant="body2">
                        • تم ربط {columnMappings.filter(m => m.dbField).length} عمود من أصل {columnMappings.length}
                      </Typography>
                      {columnMappings.filter(m => m.required && !m.dbField).length > 0 && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                          تحذير: بعض الحقول المطلوبة غير مربوطة
                        </Alert>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Box>
        );

      case 4: // Execution
        return (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <PlayArrow sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            <Typography variant="h5" gutterBottom>
              جاهز للاستيراد
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              سيتم استيراد {selectedRows.size} موظف. هل تريد المتابعة؟
            </Typography>

            {!validateMappings() && (
              <Alert severity="error" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
                <Typography variant="body2">
                  ⚠️ لا يمكن بدء الاستيراد: الحقول المطلوبة (الكود الوظيفي والاسم) غير مربوطة.
                  يرجى العودة إلى الخطوة السابقة وربط هذه الحقول.
                </Typography>
              </Alert>
            )}

            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="outlined"
                onClick={() => setActiveStep(3)}
                startIcon={<ArrowBack />}
              >
                رجوع
              </Button>
              <Button
                variant="contained"
                onClick={handleImport}
                disabled={importing || !validateMappings()}
                startIcon={<PlayArrow />}
                size="large"
                title={!validateMappings() ? 'يجب ربط الحقول المطلوبة (الكود والاسم) أولاً' : ''}
              >
                {importing ? <CircularProgress size={24} /> : 'بدء الاستيراد'}
              </Button>
            </Stack>

            {importing && (
              <Box sx={{ mt: 4 }}>
                <Typography variant="body2" gutterBottom>
                  جاري الاستيراد...
                </Typography>
                <LinearProgress variant="determinate" value={importProgress} />
              </Box>
            )}
          </Box>
        );

      case 5: // Results
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              نتائج الاستيراد
            </Typography>

            {importResult && (
              <Card sx={{ mt: 3 }}>
                <CardContent>
                  <Stack spacing={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                      <Typography variant="h5" color="success.main">
                        تم الاستيراد بنجاح
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" gap={1}>
                      <Chip
                        icon={<CheckCircle />}
                        label={`تم الإنشاء: ${importResult.created}`}
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Refresh />}
                        label={`تم التحديث: ${importResult.updated}`}
                        color="info"
                        variant="outlined"
                      />
                      <Chip
                        icon={<Warning />}
                        label={`تم تخطيه: ${importResult.skipped}`}
                        color="warning"
                        variant="outlined"
                      />
                    </Stack>

                    {importResult.errors.length > 0 && (
                      <Alert severity="warning">
                        <Typography variant="subtitle2" gutterBottom>
                          أخطاء أثناء الاستيراد:
                        </Typography>
                        {importResult.errors.map((error, index) => (
                          <Typography key={index} variant="body2">
                            • {error}
                          </Typography>
                        ))}
                      </Alert>
                    )}

                    <Box sx={{ textAlign: 'center', mt: 4 }}>
                      <Button
                        variant="contained"
                        onClick={() => navigate('/employees')}
                        size="large"
                      >
                        عرض الموظفين
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0: return !!importData;
      case 1: return columnMappings.some(m => m.dbField); // At least one column mapped
      case 2: return selectedRows.size > 0;
      case 3: return true;
      case 4: return !importing;
      default: return false;
    }
  };

  return (
    <Box sx={{ bgcolor: COLORS.bg, minHeight: '100vh', py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          mb: 4,
          p: 3,
          borderRadius: '16px',
          background: COLORS.gradientPrimary,
          boxShadow: SHADOWS.lg,
          color: COLORS.white
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BackButton />
            <Box>
              <Typography variant="h4" fontWeight="800">
                استيراد الموظفين
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 500 }}>
                رفع ومزامنة بيانات الموظفين من ملف Excel
              </Typography>
            </Box>
          </Box>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: '16px', 
            boxShadow: SHADOWS.md,
            bgcolor: COLORS.white
          }}
        >
          <Stepper 
            activeStep={activeStep} 
            alternativeLabel 
            sx={{ 
              mb: 5,
              '& .MuiStepLabel-label': { fontWeight: 700, color: COLORS.secondary },
              '& .MuiStepLabel-label.Mui-active': { color: COLORS.primary },
              '& .MuiStepLabel-label.Mui-completed': { color: COLORS.success },
              '& .MuiStepIcon-root': { color: alpha(COLORS.secondary, 0.3) },
              '& .MuiStepIcon-root.Mui-active': { color: COLORS.primary },
              '& .MuiStepIcon-root.Mui-completed': { color: COLORS.success }
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Divider sx={{ mb: 4, opacity: 0.1 }} />

          {renderStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 5, pt: 3, borderTop: `1px solid ${alpha(COLORS.secondary, 0.1)}` }}>
            <Button
              disabled={activeStep === 0 || importing}
              onClick={() => setActiveStep(prev => prev - 1)}
              startIcon={<ChevronRight />}
              sx={{ 
                fontWeight: 700, 
                color: COLORS.secondary,
                borderRadius: '8px',
                '&:hover': { bgcolor: alpha(COLORS.secondary, 0.05) }
              }}
            >
              السابق
            </Button>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {activeStep === 1 && (
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                  color="error"
                  sx={{ borderRadius: '8px', fontWeight: 700 }}
                >
                  إلغاء
                </Button>
              )}

              {activeStep > 0 && activeStep < 4 && (
                <Button
                  variant="contained"
                  onClick={() => setActiveStep(prev => prev + 1)}
                  disabled={activeStep === 1 && !validateMappings()}
                  endIcon={<ChevronLeft />}
                  sx={{ 
                    background: COLORS.gradientPrimary,
                    borderRadius: '8px',
                    fontWeight: 700,
                    boxShadow: SHADOWS.sm,
                    px: 4,
                    '&:hover': { boxShadow: SHADOWS.md, opacity: 0.9 }
                  }}
                >
                  التالي
                </Button>
              )}

              {activeStep === 4 && (
                <Button
                  variant="contained"
                  onClick={handleImport}
                  disabled={importing}
                  startIcon={importing ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
                  sx={{ 
                    background: COLORS.gradientSuccess,
                    borderRadius: '8px',
                    fontWeight: 800,
                    boxShadow: SHADOWS.sm,
                    px: 4,
                    '&:hover': { boxShadow: SHADOWS.md, opacity: 0.9 }
                  }}
                >
                  {importing ? 'جاري الاستيراد...' : 'بدء الاستيراد'}
                </Button>
              )}

              {activeStep === 5 && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/employees')}
                  sx={{ 
                    background: COLORS.gradientPrimary,
                    borderRadius: '8px',
                    fontWeight: 700,
                    px: 4
                  }}
                >
                  الذهاب لقائمة الموظفين
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.severity}
          sx={{ 
            borderRadius: '12px', 
            boxShadow: SHADOWS.lg,
            fontWeight: 600
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployeeImport;