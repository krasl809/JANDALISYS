import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { validateContractAccess } from '../../services/api';
import {
  Box, Container, Typography, Tabs, Tab, Button, Card,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, InputAdornment, TextField, IconButton, Stack, LinearProgress,
  Menu, MenuItem, ListItemIcon, ListItemText, Badge, Divider
} from '@mui/material';
import { 
  Add, Search, FilterList, MoreVert, ArrowUpward, ArrowDownward, 
  KeyboardArrowDown, Edit, Visibility, DeleteOutline, ContentCopy, Timeline,
  ChevronLeft, ChevronRight 
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../context/ConfirmContext';

import { ContractSummary } from '../../types/contracts';
import MetricStrip from '../common/MetricStrip';

const ContractList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { palette, boxShadows }: any = theme;
  const { t } = useTranslation();
  const { confirm, alert } = useConfirm();
  const { hasPermission } = useAuth();
  
  // --- States ---
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Contract Menu State (Drop down for Import/Export)
  const [createAnchorEl, setCreateAnchorEl] = useState<null | HTMLElement>(null);
  
  // Row Actions Menu State (For the Three Dots)
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // --- Real Data ---
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    per_page: 50,
    pages: 0
  });

  const fetchContracts = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const skip = (page - 1) * pagination.per_page;
      const response = await api.get(`contracts/?skip=${skip}&limit=${pagination.per_page}&search=${searchQuery}&tab=${currentTab}`);
      
      const contractsData: ContractSummary[] = response.data.contracts.map((contract: any) => ({
        id: contract.id,
        no: contract.contract_no || 'N/A',
        type: contract.direction === 'import' ? 'Import' : 'Export',
        client: 'Pending Assignment',
        commodity: contract.items?.[0]?.article_name || 'Multiple Items',
        qty: contract.items?.[0]?.qty_ton || 0,
        value: 0,
        status: contract.status === 'draft' ? 'Draft' :
                contract.status === 'posted' || contract.status === 'confirmed' ? 'Active' :
                contract.status === 'completed' || contract.status === 'executed' ? 'Completed' : 'Pending',
        progress: contract.status === 'completed' || contract.status === 'executed' ? 100 :
                  contract.status === 'posted' || contract.status === 'confirmed' ? 50 : 0
      }));
      
      setContracts(contractsData);
      setPagination(response.data.pagination);
    } catch (error: unknown) {
      console.error('Failed to fetch contracts:', error);
      const apiError = error as { response?: { status?: number } };
      if (apiError.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
      } else if (apiError.response?.status === 403) {
        setError('You do not have permission to view contracts.');
      } else if (apiError.response?.status === 404) {
        setError('Contracts endpoint not found.');
      } else {
        setError('Failed to load contracts. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  // --- Filtering Logic ---
  const filteredContracts = useMemo(() => {
    return contracts.filter(contract => {
      // 1. Filter by Tab
      const status = contract.status.toLowerCase();
      const matchTab = 
        currentTab === 0 ? true :
        currentTab === 1 ? (status === 'pending' || status === 'draft') :
        currentTab === 2 ? (status === 'active' || status === 'posted') :
        currentTab === 3 ? status === 'completed' : true;

      // 2. Filter by Search
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = searchQuery === '' || 
        contract.no.toLowerCase().includes(searchLower) ||
        contract.client.toLowerCase().includes(searchLower) ||
        contract.commodity.toLowerCase().includes(searchLower);

      return matchTab && matchSearch;
    });
  }, [contracts, currentTab, searchQuery]);

  // --- Metrics Calculation ---
  const metrics = useMemo(() => {
    const totalVol = filteredContracts.reduce((acc, c) => acc + c.qty, 0);
    const totalVal = filteredContracts.reduce((acc, c) => acc + c.value, 0);
    return { totalVol, totalVal };
  }, [filteredContracts]);

  // --- Handlers ---
  
  // 1. Create Menu Handlers
  const handleCreateMenuOpen = (event: React.MouseEvent<HTMLElement>) => setCreateAnchorEl(event.currentTarget);
  const handleCreateMenuClose = () => setCreateAnchorEl(null);
  const handleCreate = (type: 'import' | 'export') => {
    handleCreateMenuClose();
    navigate('/contracts/new', { state: { mode: type } });
  };

  // 2. Action Menu Handlers
  const handleActionOpen = (event: React.MouseEvent<HTMLElement>, id: string) => {
    event.stopPropagation(); // Stop row click event
    setActionAnchorEl(event.currentTarget);
    setSelectedContractId(id);
  };
  
  const handleActionClose = () => {
    setActionAnchorEl(null);
    setSelectedContractId(null);
  };

  const handleAction = async (action: string) => {
    if (!selectedContractId) return;
    
    // Logic based on action
    if (action === 'lifecycle') navigate(`/contracts/${selectedContractId}/lifecycle`); // Executive View
    if (action === 'view') navigate(`/contracts/${selectedContractId}`); // Normal View
    if (action === 'edit') navigate(`/contracts/${selectedContractId}/edit`); // Edit View
    if (action === 'delete') {
      const contract = contracts.find(c => c.id === selectedContractId);
      if (contract && await confirm({ 
        title: t('Delete Contract'),
        message: t('confirmDeleteContract', { no: contract.no }) 
      })) {
        try {
          await api.delete(`contracts/${contract.id}`);
          setContracts(prev => prev.filter(c => c.id !== contract.id));
        } catch (error: unknown) {
          console.error('Failed to delete contract:', error);
          const apiError = error as { response?: { data?: { detail?: string } }; message?: string };
          alert(`Failed to delete contract: ${apiError.response?.data?.detail || apiError.message || 'Unknown error'}`, t('Error'), 'error');
        }
      }
    }
    
    // Close menu
    handleActionClose();
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'active':
      case 'posted': return 'success';
      case 'pending': return 'warning';
      case 'draft': return 'default';
      case 'completed': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // --- Render Components ---

  return (
    <Container maxWidth={false}>
      
      {/* 1. Header & Actions */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} mt={2}>
        <Box>
           <Typography variant="h4" fontWeight="600" color="text.primary" sx={{ letterSpacing: -0.5 }}>{t('Contract Management')}</Typography>
           <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, opacity: 0.8 }}>{t('Track, manage and analyze your trade agreements')}</Typography>
        </Box>
        
        <Box>
            <Button 
                variant="contained" 
                startIcon={<Add />} 
                endIcon={<KeyboardArrowDown />}
                onClick={handleCreateMenuOpen}
                sx={{ 
                  borderRadius: '10px', 
                  px: 3, 
                  py: 1.2, 
                  boxShadow: boxShadows.md,
                  bgcolor: palette.gradients.primary.main,
                  '&:hover': {
                    bgcolor: palette.gradients.primary.state,
                    boxShadow: boxShadows.lg
                  }
                }}
            >
              {t('New Contract')}
            </Button>
            <Menu
                anchorEl={createAnchorEl}
                open={Boolean(createAnchorEl)}
                onClose={handleCreateMenuClose}
                PaperProps={{ sx: { minWidth: 200, borderRadius: '12px', mt: 1, boxShadow: boxShadows.lg, border: 'none' } }}
            >
                <MenuItem onClick={() => handleCreate('import')} sx={{ py: 1.5, px: 2, borderRadius: '8px', mx: 1 }}>
                    <ListItemIcon><ArrowDownward fontSize="small" color="secondary" /></ListItemIcon>
                    <ListItemText primary={t('Import Contract')} secondary={t('Buy from suppliers')} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }} secondaryTypographyProps={{ fontSize: '0.75rem' }} />
                </MenuItem>
                <MenuItem onClick={() => handleCreate('export')} sx={{ py: 1.5, px: 2, borderRadius: '8px', mx: 1 }}>
                    <ListItemIcon><ArrowUpward fontSize="small" color="primary" /></ListItemIcon>
                    <ListItemText primary={t('Export Contract')} secondary={t('Sell to customers')} primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem' }} secondaryTypographyProps={{ fontSize: '0.75rem' }} />
                </MenuItem>
            </Menu>
        </Box>
      </Box>

      {/* 2. Smart Tabs & Filters */}
      <Card sx={{ 
        mb: 4, 
        borderRadius: '12px', 
        boxShadow: boxShadows.md, 
        border: 'none',
        background: palette.background.paper
      }}>
        <Box sx={{ borderBottom: 1, borderColor: palette.divider, px: 2, pt: 1 }}>
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} textColor="primary" indicatorColor="primary" sx={{ minHeight: 48 }}>
            <Tab label={t('All Contracts')} sx={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' }} />
            <Tab 
                label={
                    <Stack direction="row" alignItems="center" gap={1}>
                        {t('Action Required')} 
                        <Badge badgeContent={contracts.filter(c => c.status === 'Pending' || c.status === 'Draft').length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }} />
                    </Stack>
                } 
                sx={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' }} 
            />
            <Tab label={t('Active / Shipping')} sx={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' }} />
            <Tab label={t('Completed')} sx={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'none' }} />
          </Tabs>
        </Box>
        
        {/* Search Bar & Metrics */}
        <Box p={2.5} display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField 
                size="small" 
                placeholder={t('Search contract no, client, item...')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ 
                    startAdornment: <InputAdornment position="start"><Search fontSize="small" color="disabled" /></InputAdornment>,
                    sx: { 
                      borderRadius: '8px', 
                      bgcolor: palette.mode === 'light' ? '#f8f9fa' : alpha(palette.background.default, 0.5),
                      '& fieldset': { border: `1px solid ${palette.divider} !important` }
                    }
                }}
                sx={{ width: { xs: '100%', md: 350 } }}
            />
            <Button 
              variant="outlined" 
              startIcon={<FilterList />} 
              sx={{ 
                borderRadius: '8px', 
                borderColor: palette.divider, 
                color: 'text.secondary',
                textTransform: 'none',
                px: 2
              }}
            >
                {t('Filters')}
            </Button>
            
            <Box flexGrow={1} />
            <MetricStrip totalVol={metrics.totalVol} totalVal={metrics.totalVal} /> 
        </Box>
      </Card>

      {/* 3. Data Grid */}
      <TableContainer component={Card} sx={{ 
        borderRadius: '12px', 
        boxShadow: boxShadows.md, 
        border: 'none',
        background: palette.background.paper,
        overflow: 'hidden'
      }}>
        <Table>
            <TableHead sx={{ bgcolor: palette.mode === 'light' ? '#f8f9fa' : alpha(palette.background.default, 0.8) }}>
                <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: `1px solid ${palette.divider}` }}>{t('Contract No')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: `1px solid ${palette.divider}` }}>{t('Type')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: `1px solid ${palette.divider}` }}>{t('Counterparty')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: `1px solid ${palette.divider}` }}>{t('Commodity')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: `1px solid ${palette.divider}` }}>{t('Value')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: `1px solid ${palette.divider}` }}>{t('Status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: `1px solid ${palette.divider}` }}>{t('Progress')}</TableCell>
                    <TableCell sx={{ borderBottom: `1px solid ${palette.divider}` }}></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                            <Typography color="text.secondary" variant="body2">{t('Loading contracts...')}</Typography>
                        </TableCell>
                    </TableRow>
                ) : error ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                            <Typography color="error" variant="body2">{t(error)}</Typography>
                            <Button variant="outlined" size="small" onClick={() => fetchContracts()} sx={{ mt: 2, borderRadius: '8px' }}>
                                {t('Retry')}
                            </Button>
                        </TableCell>
                    </TableRow>
                ) : filteredContracts.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                            <Typography color="text.secondary" variant="body2">{t('No contracts found matching your filters.')}</Typography>
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredContracts.map((row) => (
                        <TableRow
                            key={row.id}
                            hover
                            sx={{ 
                              cursor: 'pointer', 
                              transition: 'all 0.2s',
                              '&:hover': { bgcolor: palette.mode === 'light' ? '#fcfcfc' : alpha(palette.background.default, 0.3) }
                            }}
                            onClick={async () => {
                              try {
                                const isValid = await validateContractAccess(row.id);
                                if (isValid) {
                                  navigate(`/contracts/${row.id}`);
                                } else {
                                  navigate(`/contracts/${row.id}`);
                                }
                              } catch (error) {
                                navigate(`/contracts/${row.id}`);
                              }
                            }}
                        >
                            <TableCell sx={{ fontWeight: 700, color: palette.gradients.primary.main, fontSize: '0.875rem', borderBottom: `1px solid ${palette.divider}` }}>
                                {row.no}
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${palette.divider}` }}>
                                <Chip 
                                    icon={row.type === 'Import' ? <ArrowDownward sx={{ fontSize: '14px !important' }} /> : <ArrowUpward sx={{ fontSize: '14px !important' }} />}
                                    label={t(row.type)} 
                                    size="small" 
                                    sx={{ 
                                        borderRadius: '6px',
                                        height: 22,
                                        fontSize: '0.7rem',
                                        bgcolor: row.type === 'Import' ? alpha(palette.secondary.main, 0.1) : alpha(palette.primary.main, 0.1),
                                        color: row.type === 'Import' ? palette.secondary.main : palette.primary.main,
                                        fontWeight: 700,
                                        '& .MuiChip-icon': { color: 'inherit' }
                                    }} 
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', borderBottom: `1px solid ${palette.divider}` }}>{row.client}</TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${palette.divider}` }}>
                                <Typography variant="body2" fontWeight={600} fontSize="0.875rem">
                                    {row.commodity} 
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                    {row.qty.toLocaleString()} MT
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem', borderBottom: `1px solid ${palette.divider}` }}>
                                ${row.value.toLocaleString()}
                            </TableCell>
                            <TableCell sx={{ borderBottom: `1px solid ${palette.divider}` }}>
                                <Chip 
                                    label={t(row.status)} 
                                    size="small" 
                                    sx={{ 
                                      borderRadius: '6px', 
                                      fontWeight: 700, 
                                      fontSize: '0.7rem',
                                      minWidth: 70,
                                      bgcolor: alpha(palette[getStatusColor(row.status)]?.main || palette.primary.main, 0.1),
                                      color: palette[getStatusColor(row.status)]?.main || palette.primary.main,
                                      border: 'none'
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ width: 140, borderBottom: `1px solid ${palette.divider}` }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={row.progress} 
                                        sx={{ 
                                            flexGrow: 1, 
                                            borderRadius: '4px', 
                                            height: 4,
                                            bgcolor: alpha(palette.text.secondary, 0.1),
                                            '& .MuiLinearProgress-bar': {
                                              borderRadius: '4px',
                                              bgcolor: row.progress === 100 ? palette.success.main : palette.primary.main
                                            }
                                        }} 
                                    />
                                    <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary' }}>{row.progress}%</Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="right" sx={{ borderBottom: `1px solid ${palette.divider}` }}>
                                <IconButton size="small" onClick={(e) => handleActionOpen(e, row.id)} sx={{ color: 'text.secondary' }}>
                                    <MoreVert fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </TableContainer>

      {/* Row Action Menu */}
      <Menu
        anchorEl={actionAnchorEl}
        open={Boolean(actionAnchorEl)}
        onClose={handleActionClose}
        PaperProps={{ sx: { minWidth: 200, borderRadius: '12px', boxShadow: boxShadows.lg, border: 'none', p: 1 } }}
      >
        {/* Executive View Option */}
        <MenuItem onClick={() => handleAction('lifecycle')} sx={{ borderRadius: '8px', mb: 0.5, color: palette.secondary.main, bgcolor: alpha(palette.secondary.main, 0.05), '&:hover': { bgcolor: alpha(palette.secondary.main, 0.1) } }}>
            <ListItemIcon><Timeline fontSize="small" color="secondary" /></ListItemIcon>
            <ListItemText primary={t('Executive View')} primaryTypographyProps={{ fontWeight: 700, fontSize: '0.875rem' }} />
        </MenuItem>
        
        <Divider sx={{ my: 1, borderColor: palette.divider }} />
        
        <MenuItem onClick={() => handleAction('view')} sx={{ borderRadius: '8px', mb: 0.5 }}>
            <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>{t('Open Contract')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('edit')} sx={{ borderRadius: '8px', mb: 0.5 }}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>{t('Edit Details')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('duplicate')} sx={{ borderRadius: '8px', mb: 0.5 }}>
            <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>{t('Duplicate')}</ListItemText>
        </MenuItem>
        <Divider sx={{ my: 1, borderColor: palette.divider }} />
        {hasPermission('delete_contracts') && (
          <MenuItem onClick={() => handleAction('delete')} sx={{ borderRadius: '8px', color: 'error.main', '&:hover': { bgcolor: alpha(palette.error.main, 0.05) } }}>
              <ListItemIcon><DeleteOutline fontSize="small" color="error" /></ListItemIcon>
              <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>{t('Delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={3} px={2} py={2} sx={{ bgcolor: palette.background.paper, borderRadius: '12px', boxShadow: boxShadows.sm }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {t('Showing {{start}} to {{end}} of {{total}} contracts', {
              start: ((pagination.page - 1) * pagination.per_page) + 1,
              end: Math.min(pagination.page * pagination.per_page, pagination.total),
              total: pagination.total
            })}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Button
              size="small"
              onClick={() => fetchContracts(pagination.page - 1)}
              disabled={pagination.page === 1 || loading || !!error}
              startIcon={<ChevronLeft />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {t('Previous')}
            </Button>
            <Box sx={{ px: 2, py: 0.5, borderRadius: '6px', bgcolor: alpha(palette.primary.main, 0.1), color: palette.primary.main }}>
              <Typography variant="caption" fontWeight={700}>
                {pagination.page} / {pagination.pages}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => fetchContracts(pagination.page + 1)}
              disabled={pagination.page === pagination.pages || loading || !!error}
              endIcon={<ChevronRight />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {t('Next')}
            </Button>
          </Box>
        </Box>
      )}

    </Container>
  );
};

export default ContractList;