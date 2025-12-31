import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { validateContractAccess } from '../../services/api';
import {
  Box, Container, Typography, Tabs, Tab, Button, Card,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, InputAdornment, TextField, IconButton, Stack, LinearProgress,
  Menu, MenuItem, ListItemIcon, ListItemText, Badge, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Add, Search, FilterList, MoreVert, ArrowUpward, ArrowDownward, 
  KeyboardArrowDown, Edit, Visibility, DeleteOutline, ContentCopy, Timeline,
  ChevronLeft, ChevronRight 
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { ContractSummary } from '../../types/contracts';
import MetricStrip from '../common/MetricStrip';

const ContractList = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  
  // --- States ---
  const [currentTab, setCurrentTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Contract Menu State (Drop down for Import/Export)
  const [createAnchorEl, setCreateAnchorEl] = useState<null | HTMLElement>(null);
  
  // Row Actions Menu State (For the Three Dots)
  const [actionAnchorEl, setActionAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);

  // Delete Confirmation Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<ContractSummary | null>(null);

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
      const response = await api.get(`/contracts/?skip=${skip}&limit=${pagination.per_page}&search=${searchQuery}&tab=${currentTab}`);
      
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

  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return;
    
    try {
      await api.delete(`/contracts/${contractToDelete.id}`);
      // Remove from local state
      setContracts(prev => prev.filter(c => c.id !== contractToDelete.id));
      // Close dialog
      setDeleteDialogOpen(false);
      setContractToDelete(null);
      // Contract deleted successfully
    } catch (error: unknown) {
      console.error('Failed to delete contract:', error);
      const apiError = error as { response?: { data?: { detail?: string } }; message?: string };
      // Close dialog on error
      setDeleteDialogOpen(false);
      setContractToDelete(null);
      // Show error message to user
      alert(`Failed to delete contract: ${apiError.response?.data?.detail || apiError.message || 'Unknown error'}`);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setContractToDelete(null);
  };

  const handleAction = (action: string) => {
    if (!selectedContractId) return;
    
    // Logic based on action
    if (action === 'lifecycle') navigate(`/contracts/${selectedContractId}/lifecycle`); // Executive View
    if (action === 'view') navigate(`/contracts/${selectedContractId}`); // Normal View
    if (action === 'edit') navigate(`/contracts/${selectedContractId}/edit`); // Edit View
    if (action === 'delete') {
      const contract = contracts.find(c => c.id === selectedContractId);
      if (contract) {
        setContractToDelete(contract);
        setDeleteDialogOpen(true);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
           <Typography variant="h4" fontWeight="800" color="text.primary">{t('Contract Management')}</Typography>
           <Typography variant="body2" color="text.secondary">{t('Track, manage and analyze your trade agreements')}</Typography>
        </Box>
        
        <Box>
            <Button 
                variant="contained" 
                startIcon={<Add />} 
                endIcon={<KeyboardArrowDown />}
                onClick={handleCreateMenuOpen}
                sx={{ borderRadius: 3, px: 3, py: 1, boxShadow: theme.shadows[3] }}
            >
              {t('New Contract')}
            </Button>
            <Menu
                anchorEl={createAnchorEl}
                open={Boolean(createAnchorEl)}
                onClose={handleCreateMenuClose}
                PaperProps={{ sx: { minWidth: 200, borderRadius: 2, mt: 1 } }}
            >
                <MenuItem onClick={() => handleCreate('import')}>
                    <ListItemIcon><ArrowDownward fontSize="small" color="secondary" /></ListItemIcon>
                    <ListItemText primary={t('Import Contract')} secondary={t('Buy from suppliers')} />
                </MenuItem>
                <MenuItem onClick={() => handleCreate('export')}>
                    <ListItemIcon><ArrowUpward fontSize="small" color="primary" /></ListItemIcon>
                    <ListItemText primary={t('Export Contract')} secondary={t('Sell to customers')} />
                </MenuItem>
            </Menu>
        </Box>
      </Box>

      {/* 2. Smart Tabs & Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 2 }}>
          <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} textColor="primary" indicatorColor="primary">
            <Tab label={t('All Contracts')} sx={{ fontWeight: 600 }} />
            <Tab 
                label={
                    <Stack direction="row" alignItems="center" gap={1}>
                        {t('Action Required')} 
                        <Badge badgeContent={contracts.filter(c => c.status === 'Pending' || c.status === 'Draft').length} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }} />
                    </Stack>
                } 
                sx={{ fontWeight: 600 }} 
            />
            <Tab label={t('Active / Shipping')} sx={{ fontWeight: 600 }} />
            <Tab label={t('Completed')} sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>
        
        {/* Search Bar & Metrics */}
        <Box p={2} display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField 
                size="small" 
                placeholder={t('Search contract no, client, item...')} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{ 
                    startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                    sx: { borderRadius: 2, bgcolor: alpha(theme.palette.background.default, 0.5) }
                }}
                sx={{ width: { xs: '100%', md: 350 } }}
            />
            <Button variant="outlined" startIcon={<FilterList />} sx={{ borderRadius: 2, borderColor: theme.palette.divider, color: 'text.secondary' }}>
                {t('Filters')}
            </Button>
            
            <Box flexGrow={1} />
            <MetricStrip totalVol={metrics.totalVol} totalVal={metrics.totalVal} /> 
        </Box>
      </Card>

      {/* 3. Data Grid */}
      <TableContainer component={Card} sx={{ borderRadius: 3, boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('Contract No')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('Type')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('Counterparty')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('Commodity')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('Value')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('Status')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{t('Progress')}</TableCell>
                    <TableCell></TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                            <Typography color="text.secondary">{t('Loading contracts...')}</Typography>
                        </TableCell>
                    </TableRow>
                ) : error ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                            <Typography color="error" variant="body1">{t(error)}</Typography>
                            <Button variant="outlined" onClick={() => fetchContracts()} sx={{ mt: 2 }}>
                                {t('Retry')}
                            </Button>
                        </TableCell>
                    </TableRow>
                ) : filteredContracts.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                            <Typography color="text.secondary">{t('No contracts found matching your filters.')}</Typography>
                        </TableCell>
                    </TableRow>
                ) : (
                    filteredContracts.map((row) => (
                        <TableRow
                            key={row.id}
                            hover
                            sx={{ cursor: 'pointer', transition: '0.2s' }}
                            onClick={async () => {
                              try {
                                // Validate contract access before navigation
                                const isValid = await validateContractAccess(row.id);
                                if (isValid) {
                                  navigate(`/contracts/${row.id}`);
                                } else {
                                  // Show error message if contract is not accessible
                                  console.warn(`Contract ${row.id} is not accessible`);
                                  // The ContractForm will handle the error when it tries to load the contract
                                  navigate(`/contracts/${row.id}`);
                                }
                              } catch (error) {
                                console.error('Error validating contract access:', error);
                                // Navigate anyway - the ContractForm will handle the error
                                navigate(`/contracts/${row.id}`);
                              }
                            }}
                        >
                            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'monospace' }}>
                                {row.no}
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    icon={row.type === 'Import' ? <ArrowDownward fontSize="small" /> : <ArrowUpward fontSize="small" />}
                                    label={t(row.type)} 
                                    size="small" 
                                    sx={{ 
                                        borderRadius: 1,
                                        height: 24,
                                        bgcolor: row.type === 'Import' ? alpha(theme.palette.secondary.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                                        color: row.type === 'Import' ? theme.palette.secondary.main : theme.palette.primary.main,
                                        fontWeight: 'bold'
                                    }} 
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{row.client}</TableCell>
                            <TableCell>
                                {row.commodity} 
                                <Typography variant="caption" display="block" color="text.secondary">
                                    {row.qty.toLocaleString()} MT
                                </Typography>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                                ${row.value.toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <Chip 
                                    label={t(row.status)} 
                                    size="small" 
                                    color={getStatusColor(row.status) as any}
                                    variant={row.status === 'Draft' ? 'outlined' : 'filled'}
                                    sx={{ borderRadius: 1.5, fontWeight: 600, minWidth: 80 }}
                                />
                            </TableCell>
                            <TableCell sx={{ width: 140 }}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={row.progress} 
                                        sx={{ 
                                            flexGrow: 1, 
                                            borderRadius: 2, 
                                            height: 6,
                                            bgcolor: alpha(theme.palette.text.secondary, 0.1)
                                        }} 
                                        color={row.progress === 100 ? "success" : "primary"}
                                    />
                                    <Typography variant="caption" fontWeight="bold">{row.progress}%</Typography>
                                </Box>
                            </TableCell>
                            <TableCell align="right">
                                {/* Action Button */}
                                <IconButton size="small" onClick={(e) => handleActionOpen(e, row.id)}>
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
        PaperProps={{ sx: { minWidth: 180, borderRadius: 2, boxShadow: theme.shadows[3] } }}
      >
        {/* Executive View Option */}
        <MenuItem onClick={() => handleAction('lifecycle')} sx={{ color: theme.palette.secondary.main, bgcolor: alpha(theme.palette.secondary.main, 0.05) }}>
            <ListItemIcon><Timeline fontSize="small" color="secondary" /></ListItemIcon>
            <ListItemText primary={t('Executive View')} primaryTypographyProps={{ fontWeight: 'bold' }} />
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => handleAction('view')}>
            <ListItemIcon><Visibility fontSize="small" /></ListItemIcon>
            <ListItemText>{t('Open Contract')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('edit')}>
            <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
            <ListItemText>{t('Edit Details')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('duplicate')}>
            <ListItemIcon><ContentCopy fontSize="small" /></ListItemIcon>
            <ListItemText>{t('Duplicate')}</ListItemText>
        </MenuItem>
        <Divider />
        {hasPermission('delete_contracts') && (
          <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteOutline fontSize="small" color="error" /></ListItemIcon>
              <ListItemText>{t('Delete')}</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <Box display="flex" justifyContent="between" alignItems="center" mt={2} px={2} py={1}>
          <Typography variant="body2" color="text.secondary">
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
            >
              {t('Previous')}
            </Button>
            <Typography variant="body2" color="text.secondary">
              {t('Page {{page}} of {{pages}}', { page: pagination.page, pages: pagination.pages })}
            </Typography>
            <Button
              size="small"
              onClick={() => fetchContracts(pagination.page + 1)}
              disabled={pagination.page === pagination.pages || loading || !!error}
              endIcon={<ChevronRight />}
            >
              {t('Next')}
            </Button>
          </Box>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('Delete Contract')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('confirmDeleteContract', { no: contractToDelete?.no })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>{t('Cancel')}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default ContractList;