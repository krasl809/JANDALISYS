import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import BackButton from '../common/BackButton';
import { 
  Autocomplete, useTheme, alpha, Stepper, Step, StepLabel, 
  Tabs, Tab, Box, Tooltip, SxProps, Theme 
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import Grid from '@mui/material/Grid2';
import { 
  Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, IconButton, TextField, MenuItem,
  CircularProgress, Card, CardContent, Stack, Snackbar, Chip, 
  Radio, RadioGroup, FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Divider, InputAdornment,
  Alert
} from '@mui/material';
import {
  AddCircleOutline, Remove, Print, Save, Send, Delete, 
  Business, AttachMoney, Description, Anchor, ArrowForward, ImportExport, ReceiptLong,
  Map, PriceCheck, LocalShipping, Receipt, Payment, AccountBalanceWallet, Folder,
  Event, EditCalendar, Add, Error
} from '@mui/icons-material';

// --- Sub-Pages Imports ---
import PricingForm from '../pages/PricingForm';
import DeliveryForm from '../pages/DeliveryForm';
import PaymentForm from '../pages/PaymentForm';
import Invoices from '../pages/Invoices'; 
import Documents from '../pages/Documents'; 
import AddEntityDialog from './AddEntityDialog'; 

import SectionHeader from '../common/SectionHeader';

import {
  ContractItem,
  CharterPartyItem,
  FinancialTransaction,
  ContractLists,
  NotificationState
} from '../../types/contracts';

interface ContractFormProps {
  mode?: 'export' | 'import';
}

// --- Helper Components ---
const TabPanel = (props: { children?: React.ReactNode; index: number; value: number }) => {
  const { children, value, index, ...other } = props;
  return <div role="tabpanel" hidden={value !== index} {...other} style={{ width: '100%' }}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>;
};

interface AutocompleteWithAddProps {
  options: any[];
  value: any;
  onChange: (event: React.SyntheticEvent, value: any) => void;
  getOptionLabel: (option: any) => string;
  entityType: 'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm';
  onAddClick: (entityType: 'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm') => void;
  renderInput: (params: any) => React.ReactNode;
  placeholder?: string;
}

const AutocompleteWithAdd: React.FC<AutocompleteWithAddProps> = ({
  options,
  value,
  onChange,
  getOptionLabel,
  entityType,
  onAddClick,
  renderInput,
  placeholder
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Autocomplete
        size="small"
        options={options}
        value={value}
        onChange={onChange}
        getOptionLabel={getOptionLabel}
        renderInput={(params) => renderInput({ ...params, placeholder })}
        sx={{ flexGrow: 1 }}
        noOptionsText={
          <Box sx={{ textAlign: 'center', py: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('No {{entityType}}s found', { entityType: t(entityType.charAt(0).toUpperCase() + entityType.slice(1)) })}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => onAddClick(entityType)}
              sx={{ mt: 1 }}
            >
              {t('Add New {{entityType}}', { entityType: t(entityType.charAt(0).toUpperCase() + entityType.slice(1)) })}
            </Button>
          </Box>
        }
      />
      <Tooltip title={t('Add new {{entityType}}', { entityType: t(entityType) })}>
        <IconButton
          size="small"
          onClick={() => onAddClick(entityType)}
          sx={{
            color: theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.2),
            },
          }}
        >
          <Add fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};


const FieldLabel = ({ label, required }: { label: string, required?: boolean }) => {
  const theme = useTheme();
  return (
    <Typography variant="caption" sx={{ fontWeight: 700, color: theme.palette.text.secondary, mb: 0.5, display: 'block', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
      {label} {required && <span style={{ color: theme.palette.error.main }}>*</span>}
    </Typography>
  );
};

const ContractForm: React.FC<ContractFormProps> = ({ mode: propMode }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { palette, boxShadows } = theme as any;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Initialization ---
  const initialMode = propMode || (location.state as any)?.mode || 'export';
  const [mode, setMode] = useState<'export' | 'import'>(initialMode);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({ open: false, message: '', severity: 'success' });

  // --- Form State ---
  const [formData, setFormData] = useState({
    contract_no: '',
    contract_type: 'fixed_price',
    direction: initialMode,
    issue_date: new Date().toISOString().split('T')[0] as string | null,
    
    // Seller Contract Information
    seller_contract_ref_no: '',
    seller_contract_date: '' as string | null,
    
    // Shipment Fields
    shipment_date: '' as string | null,
    shipment_period: '', // FTA
    actual_shipped_quantity: '',

    // Parties
    seller_id: 'NA', shipper_id: 'NA', buyer_id: 'NA', broker_id: 'NA', conveyor_id: 'NA', agent_id: 'NA', warehouse_id: 'NA',
    
    // Audit Fields
    posted_by: '', finance_notified_by: '', posted_date: '', modified_date: '',
    
    // Logistics Route
    place_of_origin: '',
    port_of_loading: '',
    destination: '',
    place_of_delivery: '',

    // Terms
    payment_terms: '', incoterms: '', bank_details: '',
    insurance: '', marks: '', consignee: '', documents: '',
    contract_currency: 'USD',
    
    // Import Specific
    vessel_name: '',
    demurrage_rate: '', discharge_rate: '', dispatch_rate: '',
    laycan_date_from: '' as string | null, laycan_date_to: '' as string | null,
    

    

    
    
    // Shipment Status
    ata_date: '', ata_time: '',
    arrival_loading_port_date: '', arrival_loading_port_time: '',
    nor_date: '', nor_time: '',
    loading_start_date: '', loading_start_time: '',
    loading_end_date: '', loading_end_time: '',
    
    status: 'draft', pricing_status: 'pending' 
  });

  // Ensure issue_date is always set to today if not provided
  useEffect(() => {
    if (!formData.issue_date) {
      const today = new Date().toISOString().split('T')[0];
      handleInputChange('issue_date', today);
    }
  }, []);

  const [isShipmentDate, setIsShipmentDate] = useState(true);
  const [items, setItems] = useState<ContractItem[]>([
    { id: '1', article_id: '', article_name: '', qty_lot: '', qty_ton: '', packing: '', price: '', premium: '', total: 0 }
  ]);

  const [charterItems, setCharterItems] = useState<CharterPartyItem[]>([]);



  const [lists, setLists] = useState<ContractLists>({ 
    sellers: [], buyers: [], brokers: [], shippers: [], 
    conveyors: [], agents: [], articles: [], warehouses: [], incoterms: [] 
  });

  const [ledger, setLedger] = useState<FinancialTransaction[]>([]);
  const [canEditContract, setCanEditContract] = useState(true);
  const [canEditPricing, setCanEditPricing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isGeneratingNo, setIsGeneratingNo] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Auto-save and temporary storage states
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tempDataVersion, setTempDataVersion] = useState(0);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Add Entity Dialog State
  const [addEntityDialogOpen, setAddEntityDialogOpen] = useState(false);
  const [currentEntityType, setCurrentEntityType] = useState<'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm'>('seller');

  // --- Styles ---
  const headerSx: SxProps<Theme> = {
    backgroundColor: palette.mode === 'light' ? '#f8f9fa' : alpha(palette.background.default, 0.8),
    color: 'text.secondary',
    fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: `1px solid ${palette.divider}`, paddingInline: '16px', paddingY: '12px',
  };
  
  const cellSx: SxProps<Theme> = { 
    borderBottom: `1px solid ${palette.divider}`, 
    paddingInline: '12px', paddingY: '8px',
    color: 'text.primary',
    fontSize: '0.875rem'
  };
  
  const inputTableSx: SxProps<Theme> = { 
    '& .MuiInput-underline:before': { borderBottomColor: 'transparent' }, 
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: palette.divider }, 
    fontSize: '0.9rem' 
  };

  // --- Effects ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, sh, b, br, ag, a, w, c, i] = await Promise.all([
          api.get('sellers/'), api.get('shippers/'), api.get('buyers/'),
          api.get('brokers/'), api.get('agents/'), api.get('articles/'),
          api.get('inventory/warehouses/'), api.get('conveyors/'), api.get('incoterms/')
        ]);
        
        const articlesList = a.data;

        // Add NA option to all party lists
        const naOption = { id: 'NA', contact_name: t('N/A') };
        
        setLists({ 
          sellers: [naOption, ...s.data], shippers: [naOption, ...sh.data], buyers: [naOption, ...b.data], 
          brokers: [naOption, ...br.data], conveyors: [naOption, ...c.data], agents: [naOption, ...ag.data], 
          articles: articlesList, warehouses: [naOption, ...w.data], incoterms: i.data 
        });

        // Use stored values - server will verify permissions
        const role = localStorage.getItem('user_role') || 'admin';
        setCanEditPricing(['admin', 'pricing_manager', 'finance', 'contracts_admin'].includes(role));
        setCanEditContract(['admin', 'contract_creator', 'contracts_admin'].includes(role) || !id);

        if (id) {
          try {
            const res = await api.get(`contracts/${id}`);
            const data = res.data;
          
          // ✅ Sanitization
          const safeData = Object.keys(data).reduce((acc, key) => {
              acc[key] = data[key] === null ? '' : data[key];
              return acc;
          }, {} as any);

          setFormData(prev => ({ 
              ...prev, 
              ...safeData,
              issue_date: safeData.issue_date?.split('T')[0] || new Date().toISOString().split('T')[0],
              shipment_date: safeData.shipment_date || null,
              laycan_date_from: safeData.laycan_date_from || null,
              laycan_date_to: safeData.laycan_date_to || null,
              // Set default 'NA' for empty party fields
              seller_id: safeData.seller_id || 'NA',
              buyer_id: safeData.buyer_id || 'NA',
              shipper_id: safeData.shipper_id || 'NA',
              broker_id: safeData.broker_id || 'NA',
              agent_id: safeData.agent_id || 'NA',
              conveyor_id: safeData.conveyor_id || 'NA',
              warehouse_id: safeData.warehouse_id || 'NA',
          }));
          
          // ✅ FIX: Map items using the local 'articlesList' variable
          if (data.items && Array.isArray(data.items)) {
             const mappedItems = data.items.map((item: any) => ({
                id: item.id,
                article_id: item.article_id,
                // Look up article name from the list we just fetched
                article_name: item.article_name || articlesList.find((ar: any) => ar.id === item.article_id)?.article_name || '',
                qty_lot: (item.qty_lot ?? '').toString(),
                qty_ton: (item.qty_ton ?? item.quantity ?? '').toString(),
                packing: item.packing || '',
                price: (item.price ?? '').toString(),
                premium: (item.premium ?? '').toString(),
                total: item.total ?? 0
              }));
              setItems(mappedItems);
          }
          
          if (data.shipment_period) setIsShipmentDate(false);
          setMode(data.direction);

            fetchLedger(id, data);
          } catch (contractError: any) {
            console.error('Contract not found or invalid:', contractError);
            
            // Enhanced error handling with specific messages
            let errorMessage = t('Contract {{id}} not found or invalid.', { id });
            let redirectDelay = 3000;
            
            if (contractError.response?.status === 404) {
              errorMessage = t('Contract {{id}} was not found. It may have been deleted or the link is incorrect.', { id });
            } else if (contractError.response?.status === 403) {
              errorMessage = t('Access denied to contract {{id}}. You don\'t have permission to view this contract.', { id });
              redirectDelay = 4000;
            } else if (contractError.response?.status === 400) {
              errorMessage = t('Invalid contract ID format. Please check the URL and try again.');
            } else if (contractError.response?.status === 500) {
              errorMessage = t('Server error while loading contract {{id}}. Please try again later.', { id });
              redirectDelay = 4000;
            }
            
            setNotification({
              open: true,
              message: t('{{errorMessage}} Redirecting to contracts list in {{delay}} seconds...', { errorMessage, delay: redirectDelay/1000 }),
              severity: 'error'
            });
            
            // Add a manual redirect button for better UX
            setTimeout(() => {
              navigate('/contracts', { replace: true });
            }, redirectDelay);
            return;
          }
        } else {
            setMode(initialMode);
            setFormData(prev => ({...prev, direction: initialMode}));
            
            // Load from temporary storage for new contracts
            loadFromTemporaryStorage();
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, initialMode]);
  
  // Cleanup effect
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const fetchLedger = async (contractId: string, contractData?: any) => {
      try {
          const res = await api.get(`contracts/${contractId}/ledger`);
          const rawData: FinancialTransaction[] = res.data;
          
          // Use contractData if provided, otherwise use current items
          const ledgerItems = contractData?.items || items;
          const currentTotal = ledgerItems.reduce((sum: number, item: any) => sum + (parseFloat(item.total) || 0), 0);
          
          const isImportContract = mode === 'import' || (contractData && contractData.direction === 'import');

          let processedLedger: FinancialTransaction[] = rawData.map(item => {
              let debit = 0;
              let credit = 0;

              if (isImportContract) {
                  if (item.type === 'Invoice') {
                      debit = item.amount;
                      credit = 0;
                  } else if (item.type === 'Payment') {
                      debit = 0;
                      credit = item.amount;
                  } else {
                      debit = item.is_credit ? 0 : item.amount;
                      credit = item.is_credit ? item.amount : 0;
                  }
              } else {
                  debit = item.is_credit ? 0 : item.amount;
                  credit = item.is_credit ? item.amount : 0;
              }

              return { ...item, debit, credit };
          });

          // For import contracts, ensure the contract value (Invoice) is represented
          if (isImportContract && currentTotal > 0) {
              // Check if there are ANY invoices already
              const hasAnyInvoice = processedLedger.some(t => t.type === 'Invoice');
              
              if (!hasAnyInvoice) {
                  const contractInvoice: FinancialTransaction = {
                      id: 'contract-invoice',
                      transaction_date: (contractData?.issue_date || formData.issue_date || new Date().toISOString()).split('T')[0],
                      type: 'Invoice',
                      description: t("Contract Invoice - Total Contract Value ({{contractNo}})", { contractNo: contractData?.contract_no || formData.contract_no }),
                      reference: `INV-${contractData?.contract_no || formData.contract_no || t('TEMP')}`,
                      amount: currentTotal,
                      is_credit: false,
                      debit: currentTotal,
                      credit: 0,
                      balance: currentTotal
                  };
                  processedLedger = [contractInvoice, ...processedLedger];
              }
          }

          // Recalculate running balances from 0
          processedLedger.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
          
          let runningBalance = 0;
          processedLedger = processedLedger.map((item) => {
              runningBalance += (item.debit || 0) - (item.credit || 0);
              return { ...item, balance: runningBalance };
          });

          setLedger(processedLedger);
      } catch (error) { console.error("Failed to load ledger", error); }
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && id) {
        const tabsMap: any = { pricing: 1, delivery: 2, shipment_status: 3, invoices: 4, payments: 5, soa: 6, documents: 7 };
        setActiveTab(tabsMap[tabParam] || 0);
    }
  }, [searchParams, id]);

  // Temporary storage functions
  const loadFromTemporaryStorage = useCallback(() => {
    if (id) return; // Don't load from temp storage for existing contracts
    
    try {
      const stored = localStorage.getItem(`contract_temp_${mode}_new`);
      if (stored) {
        const tempData = JSON.parse(stored);
        const age = Date.now() - tempData.timestamp;
        
        // Only load if data is less than 24 hours old
        if (age < 24 * 60 * 60 * 1000) {
          setFormData(prev => ({ ...prev, ...tempData.formData }));
          setItems(tempData.items || []);
          setCharterItems(tempData.charterItems || []);
          setTempDataVersion(tempData.version || 0);
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to load from temporary storage:', error);
    }
    return false;
  }, [id, mode]);

  const saveToTemporaryStorage = useCallback(() => {
    if (id) return; // Don't save to temp storage for existing contracts
    
    const tempData = {
      formData,
      items,
      charterItems,
      timestamp: Date.now(),
      version: tempDataVersion
    };
    
    try {
      localStorage.setItem(`contract_temp_${mode}_${id || 'new'}`, JSON.stringify(tempData));
      setTempDataVersion(prev => prev + 1);
    } catch (error) {
      console.warn('Failed to save to temporary storage:', error);
    }
  }, [formData, items, charterItems, id, mode, tempDataVersion]);

  // Professional auto-save functionality - only for draft contracts
  const performAutoSave = useCallback(async () => {
    // Only auto-save if contract exists, has changes, AND is in draft status
    if (!hasUnsavedChanges || !id || formData.status !== 'draft') return;
    
    setAutoSaveStatus('saving');
    
    try {
      // Enhanced validation before sending
      if (!formData.seller_id || formData.seller_id === 'NA' || !formData.buyer_id || formData.buyer_id === 'NA') {
        console.warn('Auto-save skipped: Missing required seller/buyer');
        setAutoSaveStatus('idle');
        return;
      }
      
      const cleanedData = cleanFormData(formData);
      // Helper function to convert 'NA' to null for optional UUID fields
      const uuidOrNull = (value: string) => value === 'NA' ? null : value;

      const payload = {
        // Only include fields that are in the ContractCreate schema
        direction: cleanedData.direction,
        issue_date: cleanedData.issue_date,
        shipment_date: cleanedData.shipment_date,
        payment_terms: cleanedData.payment_terms,
        incoterms: cleanedData.incoterms,
        bank_details: cleanedData.bank_details,
        insurance: cleanedData.insurance,
        marks: cleanedData.marks,
        consignee: cleanedData.consignee,
        destination: cleanedData.destination,
        port_of_loading: cleanedData.port_of_loading,
        place_of_origin: cleanedData.place_of_origin,
        place_of_delivery: cleanedData.place_of_delivery,
        warehouse_id: null, // Not needed in contract as per user request
        documents: cleanedData.documents,
        contract_currency: cleanedData.contract_currency,
        seller_id: cleanedData.seller_id,
        shipper_id: uuidOrNull(cleanedData.shipper_id),
        buyer_id: cleanedData.buyer_id,
        broker_id: uuidOrNull(cleanedData.broker_id),
        conveyor_id: uuidOrNull(cleanedData.conveyor_id),
        contract_type: cleanedData.contract_type,
        pricing_status: cleanedData.pricing_status,
        demurrage_rate: cleanedData.demurrage_rate,
        discharge_rate: cleanedData.discharge_rate,
        dispatch_rate: cleanedData.dispatch_rate,
        laycan_date_from: cleanedData.laycan_date_from,
        laycan_date_to: cleanedData.laycan_date_to,
        seller_contract_ref_no: cleanedData.seller_contract_ref_no,
        seller_contract_date: cleanedData.seller_contract_date,
        status: 'draft', // Auto-save always as draft
        contract_no: cleanedData.contract_no,
        items: items
            .filter(item => item.article_id && typeof item.article_id === 'string' && item.article_id.length === 36) // Only include items with valid articles
            .map(i => ({
            id: i.id.length > 20 ? i.id : undefined,
            article_id: i.article_id,
            qty_lot: Number(i.qty_lot) || 0,
            qty_ton: Number(i.qty_ton) || 0,
            quantity: Number(i.qty_ton) || 0,
            packing: i.packing || null,
            price: Number(i.price) || 0,
            premium: Number(i.premium) || 0
          }))
      };
      
      // Only send if we have valid items
      if (payload.items.length === 0) {
        console.warn('Auto-save skipped: No valid items to save');
        setAutoSaveStatus('idle');
        return;
      }
      
      await api.put(`contracts/${id}`, payload);
      setAutoSaveStatus('saved');
      setLastAutoSave(new Date());
      setHasUnsavedChanges(false);
      
      // Clear saved status after 3 seconds
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
      
    } catch (error: any) {
      console.error('Auto-save failed:', error);
      
      // Enhanced error logging for debugging
      if (error.response?.status === 422) {
        console.error('Validation errors:', error.response.data?.detail || error.response.data);
        setNotification({ 
          open: true, 
          message: 'Auto-save failed: Please check your input data and try again.', 
          severity: 'warning' 
        });
      } else if (error.response?.status === 403) {
        setNotification({ 
          open: true, 
          message: 'Auto-save failed: Insufficient permissions to edit this contract.', 
          severity: 'error' 
        });
      } else {
        setNotification({ 
          open: true, 
          message: 'Auto-save failed: Network error. Please check your connection.', 
          severity: 'error' 
        });
      }
      
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [id, hasUnsavedChanges, formData, items]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performAutoSave();
    }, 10000); // Auto-save after 10 seconds of inactivity
  }, [performAutoSave]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    // Save to temporary storage before switching tabs
    saveToTemporaryStorage();
    
    setActiveTab(newValue);
    const tabs = ['details', 'pricing', 'delivery', 'shipment_status', 'invoices', 'payments', 'soa', 'documents'];
    setSearchParams({ tab: tabs[newValue] });
    
    // Load from temporary storage when returning to details tab
    if (newValue === 0 && !id) {
      loadFromTemporaryStorage();
    }
  };

  useEffect(() => {
    if (mode === 'export' || formData.contract_type === 'fixed_price') {
        setTotalAmount(items.reduce((sum, item) => sum + (item.total || 0), 0));
    } else {
        setTotalAmount(0);
    }
  }, [items, formData.contract_type, mode]);

  useEffect(() => {
    // Sync charter items with contract items - one charter item per unique article
    if (mode === 'import') {
      const uniqueArticles = items.reduce((acc, item) => {
        if (item.article_id && !acc[item.article_id]) {
          acc[item.article_id] = item;
        }
        return acc;
      }, {} as Record<string, ContractItem>);

      const newCharterItems = Object.values(uniqueArticles).map((item, index) => {
        const existing = charterItems.find(c => c.article_id === item.article_id);
        return existing || {
          id: `charter-${Date.now()}-${index}`, // Ensure unique ID
          article_id: item.article_id,
          article_name: item.article_name,
          qty_ton: item.qty_ton,
          freight: '',
          loading_rate: ''
        };
      });
      setCharterItems(newCharterItems);
    }
  }, [items, mode]);



  const handleGenerateNumber = async (sellerId: string) => {
    setIsGeneratingNo(true);
    try {
      const seller = lists.sellers.find(s => s.id === sellerId);
      if (!seller?.seller_code) {
        setNotification({ open: true, message: 'Seller code not found. Please ensure the seller has a code assigned.', severity: 'warning' });
        return;
      }
      const prefix = `${seller.seller_code}${new Date().getFullYear().toString().slice(-2)}`;
      setFormData(prev => ({...prev, contract_no: `${prefix}001`})); 
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error generating contract number:', error);
      setNotification({ open: true, message: 'Failed to generate contract number. Please try again.', severity: 'error' });
    } finally { 
      setIsGeneratingNo(false); 
    }
  };

  const cleanFormData = (data: typeof formData) => {
    const cleanedData = { ...data };
    const nullableFields = [
      'shipment_date', 'laycan_date_from', 'laycan_date_to', 
      'broker_id', 'conveyor_id', 'shipper_id', 'warehouse_id',             
      'place_of_origin', 'place_of_delivery',                
      'port_of_loading', 'destination'
    ];

    // Handle nullable fields - convert empty strings to null
    nullableFields.forEach((field) => {
      // @ts-ignore
      if (cleanedData[field] === '' || cleanedData[field] === undefined) {
        // @ts-ignore
        cleanedData[field] = null;
      }
    });

    // Handle date fields - ensure they are either null or valid YYYY-MM-DD strings
    const dateFields = ['issue_date', 'shipment_date', 'laycan_date_from', 'laycan_date_to', 'seller_contract_date'];
    dateFields.forEach(field => {
      // @ts-ignore
      const value = cleanedData[field];
      if (field === 'issue_date') {
        // issue_date is required, ensure it has a valid value
        if (!value || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          // @ts-ignore
          cleanedData[field] = new Date().toISOString().split('T')[0];
        }
      } else {
        // Other date fields can be null
        if (value && typeof value === 'string') {
          // Validate date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(value)) {
            console.warn(`Invalid date format for ${field}: ${value}`);
            // @ts-ignore
            cleanedData[field] = null;
          }
        } else if (!value) {
          // @ts-ignore
          cleanedData[field] = null;
        }
      }
    });

    // Handle shipment date vs period logic
    if (!isShipmentDate) {
        // @ts-ignore - shipment_date is in nullableFields and can be null
        cleanedData.shipment_date = null;
        // Ensure shipment_period has a value if in FTA mode
        if (!cleanedData.shipment_period || cleanedData.shipment_period.trim() === '') {
            cleanedData.shipment_period = 'Prompt Shipment'; // Default value
        }
    } else {
        cleanedData.shipment_period = '';
    }

    // Ensure required string fields are not null
    if (!cleanedData.payment_terms) cleanedData.payment_terms = '';
    if (!cleanedData.incoterms) cleanedData.incoterms = '';
    if (!cleanedData.bank_details) cleanedData.bank_details = '';
    if (!cleanedData.destination && mode === 'export') cleanedData.destination = '';

    return cleanedData;
  };

  const handleSave = async (status: 'draft' | 'posted') => {
    if (!formData.seller_id || formData.seller_id === 'NA' || !formData.buyer_id || formData.buyer_id === 'NA') {
      return setNotification({ open: true, message: 'Seller and Buyer are required and cannot be N/A', severity: 'error' });
    }

    const validItems = items.filter(item => item.article_id && typeof item.article_id === 'string' && item.article_id.length === 36);
    if (status === 'posted' && validItems.length === 0) {
      return setNotification({ open: true, message: 'At least one item with a selected article is required to post the contract.', severity: 'error' });
    }
    // For draft saves, remove invalid items from the UI
    if (status === 'draft') {
      setItems(validItems);
    }
    
    // Always filter out empty lines when saving (for both draft and posted)
    const itemsToSave = items.filter(item => item.article_id && item.article_id.trim() !== '');
    if (itemsToSave.length === 0 && status === 'posted') {
      return setNotification({ open: true, message: 'At least one item with a selected article is required to post the contract.', severity: 'error' });
    }
    
    // Warehouse validation removed - field is now hidden as requested
    // if (mode === 'export' && status === 'posted' && !formData.warehouse_id) {
    //     return setNotification({ open: true, message: 'Warehouse is required for export contracts to reserve stock', severity: 'error' });
    // }
    
    try {
        const cleanedData = cleanFormData(formData);
        // Helper function to convert 'NA' to null for optional UUID fields
        const uuidOrNull = (value: string) => value === 'NA' ? null : value;

        const payload = {
            // Only include fields that are in the ContractCreate schema
            direction: cleanedData.direction,
            issue_date: cleanedData.issue_date,
            shipment_date: cleanedData.shipment_date,
            payment_terms: cleanedData.payment_terms,
            incoterms: cleanedData.incoterms,
            bank_details: cleanedData.bank_details,
            insurance: cleanedData.insurance,
            marks: cleanedData.marks,
            consignee: cleanedData.consignee,
            destination: cleanedData.destination,
            port_of_loading: cleanedData.port_of_loading,
            place_of_origin: cleanedData.place_of_origin,
            place_of_delivery: cleanedData.place_of_delivery,
            warehouse_id: null, // Not needed in contract as per user request
            documents: cleanedData.documents,
            contract_currency: cleanedData.contract_currency,
            seller_id: cleanedData.seller_id,
            shipper_id: uuidOrNull(cleanedData.shipper_id),
            buyer_id: cleanedData.buyer_id,
            broker_id: uuidOrNull(cleanedData.broker_id),
            conveyor_id: uuidOrNull(cleanedData.conveyor_id),
            contract_type: cleanedData.contract_type,
            pricing_status: cleanedData.pricing_status,
            demurrage_rate: cleanedData.demurrage_rate,
            discharge_rate: cleanedData.discharge_rate,
            dispatch_rate: cleanedData.dispatch_rate,
            laycan_date_from: cleanedData.laycan_date_from,
            laycan_date_to: cleanedData.laycan_date_to,
            seller_contract_ref_no: cleanedData.seller_contract_ref_no,
            seller_contract_date: cleanedData.seller_contract_date,
            status: status === 'posted' ? (canEditPricing ? 'posted' : 'pricing_pending') : status,
            contract_no: cleanedData.contract_no,
            items: itemsToSave.map(i => ({
                id: i.id.length > 20 ? i.id : undefined, // Check if it's a real UUID or temp ID
                article_id: i.article_id,
                qty_lot: Number(i.qty_lot) || 0,
                qty_ton: Number(i.qty_ton) || 0,
                quantity: Number(i.qty_ton) || 0,
                packing: i.packing || null,
                price: Number(i.price) || 0,
                premium: Number(i.premium) || 0
            }))
        };

        if (id) {
            await api.put(`contracts/${id}`, payload);
            setHasUnsavedChanges(false);
            setAutoSaveStatus('saved');
            setLastAutoSave(new Date());
            setNotification({ open: true, message: 'Updated successfully', severity: 'success' });
        } else {
            const res = await api.post('contracts/', payload);
            setHasUnsavedChanges(false);
            // Clear temporary storage on successful save
            localStorage.removeItem(`contract_temp_${mode}_new`);
            setNotification({ open: true, message: 'Created successfully', severity: 'success' });
            if(res.data.id) navigate(`/contracts/${res.data.id}?tab=details`, { replace: true, state: { mode: formData.direction } });
        }
        
        // Clear saved status after 3 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
        
    } catch (err: any) {
        let msg = 'Error saving contract.';
        if (err.response?.status === 403) {
            msg = 'Access denied. Insufficient permissions.';
            setCanEditContract(false);
            setCanEditPricing(false);
        } else if (err.response?.data?.detail) {
             const d = err.response.data.detail;
             msg = Array.isArray(d) ? d.map((e: any) => `${e.loc[e.loc.length-1]}: ${e.msg}`).join(', ') : d;
        }
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
        setNotification({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`contracts/${id}`);
      setNotification({ open: true, message: 'Contract deleted', severity: 'success' });
      setTimeout(() => navigate('/contracts'), 1000);
    } catch (err: any) {
      setNotification({ open: true, message: 'Delete failed', severity: 'error' });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    // Don't allow changes if contract is not editable or not in draft status
    if (!canEditContract || formData.status !== 'draft') {
      if (formData.status !== 'draft') {
        setNotification({ 
          open: true, 
          message: 'This contract is already posted and cannot be edited.', 
          severity: 'info' 
        });
      }
      return;
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setAutoSaveStatus('idle');
    
    // Trigger auto-save for existing draft contracts
    if (id && formData.status === 'draft') {
      triggerAutoSave();
    }
  };
  
  const handleItemChange = (id: string, field: keyof ContractItem, value: string) => {
    // Don't allow changes if contract is not editable or not in draft status
    if (!canEditContract || formData.status !== 'draft') {
      if (formData.status !== 'draft') {
        setNotification({ 
          open: true, 
          message: 'This contract is already posted and cannot be edited.', 
          severity: 'info' 
        });
      }
      return;
    }
    
    setItems(prev => prev.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'article_id') {
          const selectedArticle = lists.articles.find(a => a.id === value);
          updated.article_name = selectedArticle?.article_name || '';
        }
        
        const qty = parseFloat(updated.qty_ton) || 0;
        const price = parseFloat(updated.price) || 0;
        updated.total = formData.contract_type === 'fixed_price' ? qty * price : 0;
        return updated;
    }));
    
    setHasUnsavedChanges(true);
    setAutoSaveStatus('idle');
    
    // Trigger auto-save for existing draft contracts
    if (id && formData.status === 'draft') {
      triggerAutoSave();
    }
  };

  const handleAddItem = () => {
    // Don't allow changes if contract is not editable or not in draft status
    if (!canEditContract || formData.status !== 'draft') {
      if (formData.status !== 'draft') {
        setNotification({ 
          open: true, 
          message: 'This contract is already posted and cannot be edited.', 
          severity: 'info' 
        });
      }
      return;
    }
    
    const newId = Date.now().toString(); // Use timestamp for unique ID
    setItems(prev => [...prev, { id: newId, article_id: '', article_name: '', qty_lot: '', qty_ton: '', packing: '', price: '', premium: '', total: 0 }]);
    setHasUnsavedChanges(true);
    
    // Trigger auto-save for existing draft contracts
    if (id && formData.status === 'draft') {
      triggerAutoSave();
    }
  };

  const handleRemoveItem = (itemId: string) => {
    // Don't allow changes if contract is not editable or not in draft status
    if (!canEditContract || formData.status !== 'draft') {
      if (formData.status !== 'draft') {
        setNotification({ 
          open: true, 
          message: 'This contract is already posted and cannot be edited.', 
          severity: 'info' 
        });
      }
      return;
    }
    
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== itemId));
      setHasUnsavedChanges(true);
      
      // Trigger auto-save for existing draft contracts
      if (id && formData.status === 'draft') {
        triggerAutoSave();
      }
    }
  };

  const handleAddEntity = (entityType: 'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm') => {
    setCurrentEntityType(entityType);
    setAddEntityDialogOpen(true);
  };

  const handleEntityAdded = (entity: any) => {
    // Add the new entity to the appropriate list
    switch (currentEntityType) {
      case 'seller':
        setLists(prev => ({ ...prev, sellers: [...prev.sellers, entity] }));
        break;
      case 'buyer':
        setLists(prev => ({ ...prev, buyers: [...prev.buyers, entity] }));
        break;
      case 'shipper':
        setLists(prev => ({ ...prev, shippers: [...prev.shippers, entity] }));
        break;
      case 'broker':
        setLists(prev => ({ ...prev, brokers: [...prev.brokers, entity] }));
        break;
      case 'agent':
        setLists(prev => ({ ...prev, agents: [...prev.agents, entity] }));
        break;
      case 'conveyor':
        setLists(prev => ({ ...prev, conveyors: [...prev.conveyors, entity] }));
        break;
      case 'article':
        setLists(prev => ({ ...prev, articles: [...prev.articles, entity] }));
        break;

      case 'incoterm':
        setLists(prev => ({ ...prev, incoterms: [...prev.incoterms, entity] }));
        break;
      case 'warehouse':
        setLists(prev => ({ ...prev, warehouses: [...prev.warehouses, entity] }));
        break;
    }
    setAddEntityDialogOpen(false);
  };

  // Helpers for render
  const isFixedPrice = formData.contract_type === 'fixed_price';
  const isStockMarket = formData.contract_type === 'stock_market';

  const filteredLedger = useMemo(() => {
    let list = ledger;
    if (isStockMarket) {
        // For stock market contracts, we hide the initial "Total Contract Value" invoice
        // because pricing happens separately in the pricing tab.
        list = ledger.filter(item => item.type !== 'Invoice');
    }
    
    // Recalculate running balance for the filtered list to ensure the ledger remains consistent
    let runningBalance = 0;
    return list.map(item => {
        runningBalance += (item.debit || 0) - (item.credit || 0);
        return { ...item, balance: runningBalance };
    });
  }, [ledger, isStockMarket]);

  const totalDebit = filteredLedger.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = filteredLedger.reduce((sum, item) => sum + (item.credit || 0), 0);
  const netBalance = totalDebit - totalCredit;

  if (loading) return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>;
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 12 }}> 
      
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <BackButton />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h4" fontWeight="800" color="text.primary">
                  {id ? formData.contract_no : (mode === 'export' ? t('New Export Contract') : t('New Import Contract'))}
                </Typography>
                <Chip 
                    label={t(mode.toUpperCase())} 
                    size="small"
                    sx={{ 
                        bgcolor: mode === 'export' ? alpha(theme.palette.primary.main, 0.1) : alpha(theme.palette.info.main, 0.1),
                        color: mode === 'export' ? 'primary.main' : 'info.main',
                        fontWeight: 'bold', borderRadius: '6px' 
                    }}
                    icon={mode === 'export' ? <ArrowForward /> : <ImportExport />}
                />
                {/* Contract Status Indicator */}
                {formData.status !== 'draft' && (
                    <Chip 
                        label={formData.status === 'posted' ? t('POSTED') : t(formData.status.toUpperCase())}
                        size="small"
                        sx={{ 
                            bgcolor: formData.status === 'posted' ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.info.main, 0.1),
                            color: formData.status === 'posted' ? 'warning.main' : 'info.main',
                            fontWeight: 'bold', borderRadius: '6px' 
                        }}
                        icon={formData.status === 'posted' ? <Error /> : <Description />}
                    />
                )}
                {/* Auto-save Status Indicator - Only for draft contracts */}
                {id && formData.status === 'draft' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      size="small"
                      icon={autoSaveStatus === 'saving' ? <CircularProgress size={16} /> : 
                            autoSaveStatus === 'saved' ? <Save /> :
                            autoSaveStatus === 'error' ? <Error /> : undefined}
                      label={
                        autoSaveStatus === 'saving' ? t('Auto-saving...') :
                        autoSaveStatus === 'saved' ? t('Auto-saved') :
                        autoSaveStatus === 'error' ? t('Auto-save failed') :
                        hasUnsavedChanges ? t('Unsaved changes') : t('All changes saved')
                      }
                      sx={{
                        bgcolor: autoSaveStatus === 'saving' ? alpha(theme.palette.info.main, 0.1) :
                                autoSaveStatus === 'saved' ? alpha(theme.palette.success.main, 0.1) :
                                autoSaveStatus === 'error' ? alpha(theme.palette.error.main, 0.1) :
                                hasUnsavedChanges ? alpha(theme.palette.warning.main, 0.1) :
                                alpha(theme.palette.success.main, 0.1),
                        color: autoSaveStatus === 'saving' ? 'info.main' :
                              autoSaveStatus === 'saved' ? 'success.main' :
                              autoSaveStatus === 'error' ? 'error.main' :
                              hasUnsavedChanges ? 'warning.main' :
                              'success.main',
                        fontWeight: 'bold', 
                        borderRadius: '6px',
                        minWidth: autoSaveStatus === 'idle' ? 'auto' : 120
                      }}
                    />
                    {lastAutoSave && (
                      <Typography variant="caption" color="text.secondary">
                        {t('Last saved: ')} {lastAutoSave.toLocaleTimeString()}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('360° Contract Management View')}
              </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 350 }}>
            <Stepper 
              activeStep={formData.status === 'completed' ? 4 : formData.status === 'posted' ? 3 : 1} 
              alternativeLabel
              sx={{
                '& .MuiStepIcon-root': {
                  width: 24,
                  height: 24,
                  '&.Mui-active': { color: palette.primary.main },
                  '&.Mui-completed': { color: palette.success.main }
                },
                '& .MuiStepLabel-label': {
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  mt: 0.5,
                  '&.Mui-active': { fontWeight: 700 },
                }
              }}
            >
                {['Draft', 'Pricing Pending', 'Posted', 'Completed'].map((label) => <Step key={label}><StepLabel>{t(label)}</StepLabel></Step>)}
            </Stepper>
        </Box>
      </Box>

      {/* Tabs Header */}
      <Paper elevation={0} sx={{ mb: 3, bgcolor: palette.background.paper, borderRadius: '12px', boxShadow: boxShadows.md, overflow: 'hidden', border: 'none' }}>
        <Tabs 
            value={activeTab} onChange={handleTabChange} 
            variant="scrollable" scrollButtons="auto"
            sx={{ 
              minHeight: 50,
              '& .MuiTabs-indicator': { 
                height: 3, 
                borderRadius: '3px 3px 0 0',
                bgcolor: palette.primary.main
              },
              '& .MuiTab-root': { 
                minHeight: 50, 
                fontWeight: 600, 
                textTransform: 'none', 
                fontSize: '0.85rem',
                color: palette.text.secondary,
                px: 3,
                '&.Mui-selected': { color: palette.primary.main, fontWeight: 700 },
                '&:hover': { color: palette.primary.main, bgcolor: alpha(palette.primary.main, 0.04) }
              } 
            }}
        >
            <Tab icon={<Description fontSize="small"/>} iconPosition="start" label={t('Contract Details')} />
            <Tab icon={<PriceCheck fontSize="small"/>} iconPosition="start" label={t('Pricing')} disabled={!id} />
            <Tab icon={<LocalShipping fontSize="small"/>} iconPosition="start" label={t('Delivery & Execution')} disabled={!id} />
            <Tab icon={<Anchor fontSize="small"/>} iconPosition="start" label={t('Shipment Status')} disabled={!id} />
            <Tab icon={<Receipt fontSize="small"/>} iconPosition="start" label={t('Invoices')} disabled={!id} />
            <Tab icon={<Payment fontSize="small"/>} iconPosition="start" label={t('Payments')} disabled={!id} />
            <Tab icon={<AccountBalanceWallet fontSize="small"/>} iconPosition="start" label={t('SOA')} disabled={!id} />
            <Tab icon={<Folder fontSize="small"/>} iconPosition="start" label={t('Documents')} disabled={!id} />
        </Tabs>
      </Paper>

      {/* TAB 1: Details */}
      <TabPanel value={activeTab} index={0}>
         <Grid container spacing={3}>
            {/* LEFT COLUMN */}
            <Grid size={{ xs: 12, lg: 8 }}>
                
                {/* 1. General Info */}
                <Card elevation={0} sx={{ mb: 3, borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
                    <CardContent sx={{ p: 3 }}>
                    <SectionHeader title={t("General Information")} icon={<Description fontSize="small" />} />
                    <Grid container spacing={3}>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldLabel label={t("Contract Reference No.")} />
                            <TextField 
                              fullWidth 
                              size="small" 
                              value={formData.contract_no} 
                              disabled={isGeneratingNo} 
                              placeholder={t("Auto-generated")} 
                              InputProps={{ 
                                sx: { bgcolor: alpha(palette.primary.main, 0.02), borderRadius: '8px' }, 
                                endAdornment: (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isGeneratingNo && <CircularProgress size={20}/>}
                                    <Button 
                                      size="small" 
                                      variant="outlined" 
                                      disabled={isGeneratingNo || !formData.seller_id || formData.seller_id === 'NA'}
                                      onClick={() => handleGenerateNumber(formData.seller_id)}
                                      sx={{ minWidth: 'auto', px: 1.5, py: 0.5, borderRadius: '6px', textTransform: 'none', fontWeight: 600 }}
                                    >
                                      {t("Generate")}
                                    </Button>
                                  </Box>
                                )
                              }} 
                            />
                        </Grid>
                        {mode === 'import' && (
                            <Grid size={{ xs: 12, md: 6 }}>
                                <FieldLabel label={t("Pricing Model")} />
                                <RadioGroup row value={formData.contract_type} onChange={e => { handleInputChange('contract_type', e.target.value); setItems(items.map(i => ({...i, price: '0', premium: '0', total: 0}))); }}>
                                    <FormControlLabel value="fixed_price" control={<Radio size="small"/>} label={<Typography variant="body2">{t("Fixed Price")}</Typography>} />
                                    <FormControlLabel value="stock_market" control={<Radio size="small"/>} label={<Typography variant="body2">{t("Stock Market")}</Typography>} />
                                </RadioGroup>
                            </Grid>
                        )}
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldLabel label={t("Currency")} />
                            <TextField select fullWidth size="small" value={formData.contract_currency} onChange={e => handleInputChange('contract_currency', e.target.value)}>
                                {['USD', 'EUR', 'SAR', 'GBP'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </TextField>
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldLabel label={t("Issue Date")} required />
                            <TextField type="date" fullWidth size="small" value={formData.issue_date || ''} onChange={e => handleInputChange('issue_date', e.target.value || new Date().toISOString().split('T')[0])} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldLabel label={t("Seller Contract Reference No.")} />
                            <TextField fullWidth size="small" value={formData.seller_contract_ref_no} onChange={e => handleInputChange('seller_contract_ref_no', e.target.value)} placeholder={t("Enter seller's contract reference")} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldLabel label={t("Seller Contract Date")} />
                            <TextField type="date" fullWidth size="small" value={formData.seller_contract_date || ''} onChange={e => handleInputChange('seller_contract_date', e.target.value || null)} />
                        </Grid>
                        <Grid size={{ xs: 12, md: 6 }}>
                            <FieldLabel label={t("Actual Shipped Quantity")} />
                            <TextField
                              type="number"
                              fullWidth
                              size="small"
                              placeholder="0.00"
                              value={formData.actual_shipped_quantity}
                              onChange={e => handleInputChange('actual_shipped_quantity', e.target.value)}
                              InputProps={{
                                endAdornment: <InputAdornment position="end"><Typography variant="caption" fontWeight="600">{t("MT")}</Typography></InputAdornment>
                              }}
                            />
                        </Grid>
                    </Grid>
                    </CardContent>
                </Card>

                {/* 2. Product Details Table */}
                <Card elevation={0} sx={{ mb: 3, overflow: 'hidden' }}>
                    <Box sx={{ p: 2, bgcolor: theme.palette.background.paper }}>
                        <SectionHeader title={t("Product Specifications")} icon={<ReceiptLong fontSize="small" />} />
                    </Box>
                    <TableContainer sx={{ px: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow> 
                                    <TableCell width="25%" sx={headerSx}>{t("Article")}</TableCell>
                                    {mode === 'import' && <TableCell sx={headerSx}>{t("Qty (Lot)")}</TableCell>}
                                    <TableCell sx={headerSx}>{mode === 'export' ? t('Quantity (MT)') : t('Qty (Ton)')}</TableCell>
                                    <TableCell sx={headerSx}>{t("Packing")}</TableCell>
                                    {mode === 'import' && !isFixedPrice ? (
                                        <TableCell sx={headerSx}>{t("Premium")}</TableCell>
                                    ) : (
                                        <TableCell sx={headerSx}>{t("Price")}</TableCell>
                                    )}
                                    {isFixedPrice && <TableCell align="right" sx={headerSx}>{t("Total")}</TableCell>}
                                    <TableCell width="40px" sx={headerSx}></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id} sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}>
                                        <TableCell sx={cellSx}>
                                            <AutocompleteWithAdd 
                                                options={lists.articles} 
                                                value={lists.articles.find(a => a.id === item.article_id) || null} 
                                                onChange={(_, val) => handleItemChange(item.id, 'article_id', val?.id || '')} 
                                                getOptionLabel={(opt) => `${opt.article_name}`} 
                                                entityType="article"
                                                onAddClick={handleAddEntity}
                                                renderInput={(params) => <TextField {...params} variant="standard" placeholder={t("Select")} sx={inputTableSx} />}
                                            />
                                        </TableCell>
                                        {mode === 'import' && <TableCell sx={cellSx}><TextField variant="standard" type="number" value={item.qty_lot} onChange={e => handleItemChange(item.id, 'qty_lot', e.target.value)} sx={inputTableSx} /></TableCell>}
                                        <TableCell sx={cellSx}><TextField variant="standard" type="number" value={item.qty_ton} onChange={e => handleItemChange(item.id, 'qty_ton', e.target.value)} sx={inputTableSx} InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption">{t("MT")}</Typography></InputAdornment> }} /></TableCell>
                                        <TableCell sx={cellSx}><TextField fullWidth variant="standard" value={item.packing} onChange={e => handleItemChange(item.id, 'packing', e.target.value)} sx={inputTableSx} /></TableCell>
                                        {mode === 'import' && !isFixedPrice ? (
                                            <TableCell sx={cellSx}><TextField fullWidth variant="standard" type="number" value={item.premium} onChange={e => handleItemChange(item.id, 'premium', e.target.value)} sx={inputTableSx} /></TableCell>
                                        ) : (
                                            <TableCell sx={cellSx}><TextField fullWidth variant="standard" type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', e.target.value)} sx={inputTableSx} /></TableCell>
                                        )}
                                        {isFixedPrice && (
                                            <TableCell align="right" sx={{ ...cellSx, fontWeight: 'bold', color: theme.palette.primary.main }}>
                                                {item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        )}
                                        <TableCell><IconButton size="small" onClick={() => handleRemoveItem(item.id)} sx={{ color: theme.palette.error.main }}><Remove fontSize="small" /></IconButton></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                        <Button startIcon={<AddCircleOutline />} onClick={handleAddItem} size="small" variant="text">{t("Add Line Item")}</Button>
                        {isFixedPrice && (
                            <Box textAlign="right">
                                <Typography variant="caption" color="text.secondary">{t("GRAND TOTAL")} ({formData.contract_currency})</Typography>
                                <Typography variant="h5" fontWeight="800" color="primary.main">{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</Typography>
                            </Box>
                        )}
                    </Box>
                </Card>

                {/* 3. Charter Party (Import Only) */}
                {mode === 'import' && (
                    <Card elevation={0} sx={{ mb: 3 }}>
                        <CardContent>
                        <SectionHeader title={t("Charter Party")} icon={<Anchor fontSize="small" />} />
                        <Grid container spacing={3}>
                            <Grid size={{ xs: 12 }}><FieldLabel label={t("Vessel Name")} /><TextField size="small" fullWidth value={formData.vessel_name} onChange={e => handleInputChange('vessel_name', e.target.value)} placeholder={t("Enter vessel name")} /></Grid>
                            <Grid size={{ xs: 12, md: 4 }}><FieldLabel label={t("Demurrage Rate")} /><TextField size="small" fullWidth value={formData.demurrage_rate} onChange={e => handleInputChange('demurrage_rate', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">{formData.contract_currency}/WWD</InputAdornment> }} /></Grid>
                            <Grid size={{ xs: 12, md: 4 }}><FieldLabel label={t("Discharge Rate")} /><TextField size="small" fullWidth value={formData.discharge_rate} onChange={e => handleInputChange('discharge_rate', e.target.value)} InputProps={{ endAdornment: <InputAdornment position="end">{t("MT/WWD")}</InputAdornment> }} /></Grid>
                            <Grid size={{ xs: 12, md: 4 }}><FieldLabel label={t("Dispatch Rate")} /><TextField select size="small" fullWidth value={formData.dispatch_rate || ''} onChange={e => {
                              const val = e.target.value;
                              if (val === 'half' && formData.demurrage_rate) {
                                handleInputChange('dispatch_rate', (parseFloat(formData.demurrage_rate) / 2).toString());
                              } else if (val === 'free') {
                                handleInputChange('dispatch_rate', 'free');
                              } else if (val === '') {
                                handleInputChange('dispatch_rate', '');
                              }
                            }} SelectProps={{ 
                              displayEmpty: true, 
                              renderValue: (value: unknown): React.ReactNode => {
                                if (value === '' || value === null || value === undefined) return t('Select Option');
                                if (value === 'free') return t('Free');
                                return String(value);
                              }
                            }} InputProps={{ endAdornment: <InputAdornment position="end">{formData.contract_currency}{t("/WWD")}</InputAdornment> }}>
                              <MenuItem value="free">{t("Free")}</MenuItem>
                              <MenuItem value="half">{t("Half Demurrage Rate")}</MenuItem>
                              {formData.dispatch_rate && formData.dispatch_rate !== 'free' && formData.dispatch_rate !== 'half' && (
                                <MenuItem value={formData.dispatch_rate} sx={{ display: 'none' }}>{formData.dispatch_rate}</MenuItem>
                              )}
                            </TextField></Grid>
                            <Grid size={{ xs: 12, md: 6 }}><FieldLabel label={t("Laycan Date (From)")} /><TextField type="date" size="small" fullWidth value={formData.laycan_date_from || ''} onChange={e => handleInputChange('laycan_date_from', e.target.value || null)} /></Grid>
                            <Grid size={{ xs: 12, md: 6 }}><FieldLabel label={t("Laycan Date (To)")} /><TextField type="date" size="small" fullWidth value={formData.laycan_date_to || ''} onChange={e => handleInputChange('laycan_date_to', e.target.value || null)} /></Grid>
                        </Grid>
                        
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 2 }}>{t("FREIGHT DETAILS")}</Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={headerSx}>{t("Article")}</TableCell>
                                  <TableCell sx={headerSx}>{t("Qty (MT)")}</TableCell>
                                  <TableCell sx={headerSx}>{t("Freight Rate")}</TableCell>
                                  <TableCell sx={headerSx}>{t("Loading Rate")}</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {charterItems.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell sx={cellSx}><Typography variant="body2" fontWeight="600">{item.article_name || t('N/A')}</Typography></TableCell>
                                    <TableCell sx={cellSx}><Typography variant="body2">{item.qty_ton} {t("MT")}</Typography></TableCell>
                                    <TableCell sx={cellSx}>
                                      <TextField 
                                        variant="standard" 
                                        type="number" 
                                        placeholder="0.00"
                                        value={item.freight} 
                                        onChange={e => setCharterItems(prev => prev.map(c => c.id === item.id ? {...c, freight: e.target.value} : c))}
                                        sx={{...inputTableSx, '& input::placeholder': { opacity: 0.5 }}}
                                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption">{formData.contract_currency}/MT</Typography></InputAdornment> }}
                                      />
                                    </TableCell>
                                    <TableCell sx={cellSx}>
                                      <TextField 
                                        variant="standard" 
                                        type="number" 
                                        placeholder="0"
                                        value={item.loading_rate} 
                                        onChange={e => setCharterItems(prev => prev.map(c => c.id === item.id ? {...c, loading_rate: e.target.value} : c))}
                                        sx={{...inputTableSx, '& input::placeholder': { opacity: 0.5 }}}
                                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption">{t("MT/Day")}</Typography></InputAdornment> }}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                        </CardContent>
                    </Card>
                )}

            </Grid>

            {/* RIGHT COLUMN: Parties & Terms */}
            <Grid size={{ xs: 12, lg: 4 }}>
                <Stack spacing={3}>
                    {/* 4. Parties */}
                    <Card elevation={0}>
                        <CardContent>
                        <SectionHeader title={t("Business Parties")} icon={<Business fontSize="small" />} />
                        <Stack spacing={2}>
                            <Box>
                                <FieldLabel label={t("Seller")} required />
                                <AutocompleteWithAdd 
                                    options={lists.sellers} 
                                    getOptionLabel={opt => opt.id === 'NA' ? t('N/A') : opt.contact_name} 
                                    value={lists.sellers.find(x => x.id === formData.seller_id) || null} 
                                    onChange={(_, val) => handleInputChange('seller_id', val?.id || 'NA')} 
                                    entityType="seller"
                                    onAddClick={handleAddEntity}
                                    renderInput={params => <TextField {...params} size="small" placeholder={params.placeholder} />}
                                />
                            </Box>
                            {/* Warehouse field hidden as requested */}
                            {/* <Box><FieldLabel label="Warehouse (Stock Reservation)" required={mode === 'export'} /><Autocomplete options={lists.warehouses} getOptionLabel={opt => opt.name} value={lists.warehouses.find(x => x.id === formData.warehouse_id) || null} onChange={(_, val) => handleInputChange('warehouse_id', val?.id || '')} renderInput={params => <TextField {...params} size="small" placeholder="Select Warehouse" />} /></Box> */}
                            <Box>
                                <FieldLabel label={t("Buyer")} required />
                                <AutocompleteWithAdd 
                                    options={lists.buyers} 
                                    getOptionLabel={opt => opt.id === 'NA' ? t('N/A') : opt.contact_name} 
                                    value={lists.buyers.find(x => x.id === formData.buyer_id) || null} 
                                    onChange={(_, val) => handleInputChange('buyer_id', val?.id || 'NA')} 
                                    entityType="buyer"
                                    onAddClick={handleAddEntity}
                                    renderInput={params => <TextField {...params} size="small" placeholder={params.placeholder} />}
                                />
                            </Box>
                            <Box>
                                <FieldLabel label={t("Shipper")} />
                                <AutocompleteWithAdd 
                                    options={lists.shippers} 
                                    getOptionLabel={opt => opt.id === 'NA' ? t('N/A') : opt.contact_name} 
                                    value={lists.shippers.find(x => x.id === formData.shipper_id) || null} 
                                    onChange={(_, val) => handleInputChange('shipper_id', val?.id || 'NA')} 
                                    entityType="shipper"
                                    onAddClick={handleAddEntity}
                                    renderInput={params => <TextField {...params} size="small" placeholder={t("Select Shipper")} />}
                                />
                            </Box>
                            {mode === 'import' && (
                                <>
                                    <Box>
                                        <FieldLabel label={t("Broker")} />
                                        <AutocompleteWithAdd 
                                            options={lists.brokers} 
                                            getOptionLabel={opt => opt.id === 'NA' ? t('N/A') : opt.contact_name} 
                                            value={lists.brokers.find(x => x.id === formData.broker_id) || null} 
                                            onChange={(_, val) => handleInputChange('broker_id', val?.id || 'NA')} 
                                            entityType="broker"
                                            onAddClick={handleAddEntity}
                                            renderInput={params => <TextField {...params} size="small" placeholder={t("Select Broker")} />}
                                        />
                                    </Box>
                                    <Box>
                                        <FieldLabel label={t("Agent")} />
                                        <AutocompleteWithAdd 
                                            options={lists.agents} 
                                            getOptionLabel={opt => opt.id === 'NA' ? t('N/A') : opt.contact_name} 
                                            value={lists.agents.find(x => x.id === formData.agent_id) || null} 
                                            onChange={(_, val) => handleInputChange('agent_id', val?.id || 'NA')} 
                                            entityType="agent"
                                            onAddClick={handleAddEntity}
                                            renderInput={params => <TextField {...params} size="small" placeholder={t("Select Agent")} />}
                                        />
                                    </Box>
                                    <Box>
                                        <FieldLabel label={t("Conveyor")} />
                                        <AutocompleteWithAdd 
                                            options={lists.conveyors} 
                                            getOptionLabel={opt => opt.id === 'NA' ? t('N/A') : opt.contact_name} 
                                            value={lists.conveyors.find(x => x.id === formData.conveyor_id) || null} 
                                            onChange={(_, val) => handleInputChange('conveyor_id', val?.id || 'NA')} 
                                            entityType="conveyor"
                                            onAddClick={handleAddEntity}
                                            renderInput={params => <TextField {...params} size="small" placeholder={t("Select Conveyor")} />}
                                        />
                                    </Box>
                                </>
                            )}
                        </Stack>
                        </CardContent>
                    </Card>
                    
                    <Card elevation={0} sx={{ borderRadius: '12px', boxShadow: boxShadows.md, border: 'none' }}>
                        <CardContent sx={{ p: 3 }}>
                            <SectionHeader title={t("Commercial Terms")} icon={<AttachMoney fontSize="small" />} />
                            <Grid container spacing={2}>
                                <Grid size={{ xs: 12 }}><FieldLabel label={t("Payment Terms")} /><TextField fullWidth size="small" value={formData.payment_terms} onChange={e => handleInputChange('payment_terms', e.target.value)} /></Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FieldLabel label={t("Incoterms")} />
                                    <AutocompleteWithAdd 
                                        options={lists.incoterms} 
                                        getOptionLabel={opt => opt.code ? `${opt.code} - ${opt.name}` : ''} 
                                        value={lists.incoterms.find(x => x.id === formData.incoterms || x.code === formData.incoterms) || null} 
                                        onChange={(_, val) => handleInputChange('incoterms', val?.code || val?.id || '')} 
                                        entityType="incoterm"
                                        onAddClick={handleAddEntity}
                                        renderInput={params => <TextField {...params} size="small" placeholder={t("Select Incoterm")} />}
                                    />
                                </Grid>
                                <Grid size={{ xs: 12, md: 6 }}>
                                    <FieldLabel label={mode === 'export' ? t("Shipment Date *") : (isShipmentDate ? t("Shipment Date *") : t("Shipment Period (FTA) *"))} required />
                                    {mode === 'export' ? (
                                        <TextField type="date" fullWidth size="small" value={formData.shipment_date || ''} onChange={e => handleInputChange('shipment_date', e.target.value || null)} />
                                    ) : isShipmentDate ? (
                                        <TextField type="date" fullWidth size="small" value={formData.shipment_date || ''} onChange={e => { handleInputChange('shipment_date', e.target.value || null); handleInputChange('shipment_period', ''); }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title={t("Switch to FTA")}><IconButton size="small" onClick={() => setIsShipmentDate(false)} sx={{ color: 'primary.main' }}><EditCalendar fontSize="small" /></IconButton></Tooltip></InputAdornment>) }} />
                                    ) : (
                                        <TextField type="text" fullWidth size="small" placeholder={t("e.g. Prompt Shipment")} value={formData.shipment_period || ''} onChange={e => { handleInputChange('shipment_period', e.target.value); handleInputChange('shipment_date', null); }} sx={{ '& .MuiOutlinedInput-root': { bgcolor: alpha(palette.info.main, 0.03) } }} InputProps={{ endAdornment: (<InputAdornment position="end"><Tooltip title={t("Switch to Date")}><IconButton size="small" onClick={() => setIsShipmentDate(true)} sx={{ color: 'primary.main' }}><Event fontSize="small" /></IconButton></Tooltip></InputAdornment>) }} />
                                    )}
                                </Grid>
                                {mode === 'export' ? (
                                    <Grid size={{ xs: 12 }}><FieldLabel label={t("Destination")} /><TextField fullWidth size="small" value={formData.destination} onChange={e => handleInputChange('destination', e.target.value)} /></Grid>
                                ) : (
                                    <Grid size={{ xs: 12 }}>
                                        <Box sx={{ mt: 1, mb: 1, p: 2, bgcolor: alpha(palette.info.main, 0.05), borderRadius: '12px', border: `1px dashed ${alpha(palette.info.main, 0.3)}` }}>
                                            <Box display="flex" alignItems="center" gap={1} mb={2}><Map fontSize="small" color="info" /><Typography variant="subtitle2" fontWeight="700" color="info.main">{t("Logistics Route")}</Typography></Box>
                                            <Grid container spacing={2}>
                                                <Grid size={{ xs: 12, md: 6 }}><FieldLabel label={t("Port of Loading (POL)")} /><TextField fullWidth size="small" value={formData.port_of_loading} onChange={e => handleInputChange('port_of_loading', e.target.value)} /></Grid>
                                                <Grid size={{ xs: 12, md: 6 }}><FieldLabel label={t("Port of Discharge (POD)")} /><TextField fullWidth size="small" value={formData.destination} onChange={e => handleInputChange('destination', e.target.value)} /></Grid>
                                                <Grid size={{ xs: 12, md: 6 }}><FieldLabel label={t("Place of Origin")} required={false} /><TextField fullWidth size="small" value={formData.place_of_origin} onChange={e => handleInputChange('place_of_origin', e.target.value)} /></Grid>
                                                <Grid size={{ xs: 12, md: 6 }}><FieldLabel label={t("Place of Delivery")} required={false} /><TextField fullWidth size="small" value={formData.place_of_delivery} onChange={e => handleInputChange('place_of_delivery', e.target.value)} /></Grid>
                                            </Grid>
                                        </Box>
                                    </Grid>
                                )}
                                <Grid size={{ xs: 12 }}><FieldLabel label={t("Bank Details")} /><TextField fullWidth size="small" multiline rows={2} value={formData.bank_details} onChange={e => handleInputChange('bank_details', e.target.value)} /></Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                    
                    {/* Audit Info */}
                    {id && (
                        <Card elevation={0} sx={{ bgcolor: alpha(palette.info.main, 0.03), border: `1px solid ${alpha(palette.info.main, 0.2)}`, borderRadius: '12px' }}>
                            <CardContent sx={{ p: 3 }}>
                                <SectionHeader title={t("Contract Info")} icon={<Description fontSize="small" />} />
                                <Stack spacing={1.5}>
                                    <Box><Typography variant="caption" color="text.secondary" fontWeight="700">{t("Posted by:")}</Typography><Typography variant="body2" fontWeight={500}>{formData.posted_by || t('N/A')}</Typography></Box>
                                    <Box><Typography variant="caption" color="text.secondary" fontWeight="700">{t("Finance Notified by:")}</Typography><Typography variant="body2" fontWeight={500}>{formData.finance_notified_by || t('N/A')}</Typography></Box>
                                    <Box><Typography variant="caption" color="text.secondary" fontWeight="700">{t("Posted Date:")}</Typography><Typography variant="body2" fontWeight={500}>{formData.posted_date || t('N/A')}</Typography></Box>
                                    <Box><Typography variant="caption" color="text.secondary" fontWeight="700">{t("Modified Date:")}</Typography><Typography variant="body2" fontWeight={500}>{formData.modified_date || t('N/A')}</Typography></Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Stack>
            </Grid>
         </Grid>
      </TabPanel>

      {/* TAB 2: Pricing */}
      <TabPanel value={activeTab} index={1}>
          <PricingForm contractId={id} onSaveSuccess={() => fetchLedger(id!)} />
      </TabPanel>

      {/* TAB 3: Delivery & Execution */}
      <TabPanel value={activeTab} index={2}>
          <DeliveryForm contractId={id} />
      </TabPanel>

      {/* TAB 4: Shipment Status */}
      <TabPanel value={activeTab} index={3}>
          <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 3 }}>
            <CardContent>
              <SectionHeader title={t("Shipment Status Timeline")} icon={<Anchor fontSize="small" />} />
              <Grid container spacing={3}>
                {/* ATA - Actual Time of Arrival */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                    <Typography variant="subtitle2" fontWeight="700" color="primary.main" sx={{ mb: 1.5 }}>{t("ATA - Actual Time of Arrival")}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Date")} />
                        <TextField type="date" fullWidth size="small" value={formData.ata_date} onChange={e => handleInputChange('ata_date', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Time")} />
                        <TextField type="time" fullWidth size="small" value={formData.ata_time} onChange={e => handleInputChange('ata_time', e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* Arrival at Loading Port */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.info.main, 0.2)}` }}>
                    <Typography variant="subtitle2" fontWeight="700" color="info.main" sx={{ mb: 1.5 }}>{t("Arrival at Loading Port")}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Date")} />
                        <TextField type="date" fullWidth size="small" value={formData.arrival_loading_port_date} onChange={e => handleInputChange('arrival_loading_port_date', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Time")} />
                        <TextField type="time" fullWidth size="small" value={formData.arrival_loading_port_time} onChange={e => handleInputChange('arrival_loading_port_time', e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* NOR - Notice of Readiness */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
                    <Typography variant="subtitle2" fontWeight="700" color="success.main" sx={{ mb: 1.5 }}>{t("NOR - Notice of Readiness")}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Date")} />
                        <TextField type="date" fullWidth size="small" value={formData.nor_date} onChange={e => handleInputChange('nor_date', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Time")} />
                        <TextField type="time" fullWidth size="small" value={formData.nor_time} onChange={e => handleInputChange('nor_time', e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* Loading Start */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}` }}>
                    <Typography variant="subtitle2" fontWeight="700" color="warning.main" sx={{ mb: 1.5 }}>{t("Loading Start")}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Date")} />
                        <TextField type="date" fullWidth size="small" value={formData.loading_start_date} onChange={e => handleInputChange('loading_start_date', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Time")} />
                        <TextField type="time" fullWidth size="small" value={formData.loading_start_time} onChange={e => handleInputChange('loading_start_time', e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>

                {/* Loading End */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 2, border: `1px solid ${alpha(theme.palette.error.main, 0.2)}` }}>
                    <Typography variant="subtitle2" fontWeight="700" color="error.main" sx={{ mb: 1.5 }}>{t("Loading End")}</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Date")} />
                        <TextField type="date" fullWidth size="small" value={formData.loading_end_date} onChange={e => handleInputChange('loading_end_date', e.target.value)} />
                      </Grid>
                      <Grid size={{ xs: 12, md: 6 }}>
                        <FieldLabel label={t("Time")} />
                        <TextField type="time" fullWidth size="small" value={formData.loading_end_time} onChange={e => handleInputChange('loading_end_time', e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
      </TabPanel>

      {/* TAB 5: Invoices */}
      <TabPanel value={activeTab} index={4}>
          <Invoices contractId={id} />
      </TabPanel>

      {/* TAB 6: Payments */}
      <TabPanel value={activeTab} index={5}>
          <PaymentForm contractId={id} onSaveSuccess={() => fetchLedger(id!)} />
      </TabPanel>

      {/* TAB 7: SOA (Real Ledger Data) */}
      <TabPanel value={activeTab} index={6}>
          <Grid container spacing={3}>
              {/* Professional SOA Summary */}
              <Grid size={{ xs: 12 }}>
                  <Card elevation={0} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02), border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, borderRadius: 3, mb: 3 }}>
                      <CardContent sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" gap={2} mb={3}>
                              <Box p={1.5} borderRadius={2} bgcolor={alpha(theme.palette.primary.main, 0.1)} color="primary.main">
                                  <AccountBalanceWallet fontSize="large" />
                              </Box>
                              <Box>
                                  <Typography variant="h5" fontWeight="800" color="text.primary">
                                      {t("Statement of Account")} - {mode === 'import' ? t('Import Contract') : t('Export Contract')}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                      {mode === 'import'
                                          ? t('Buyer Perspective: Amounts owed to seller and payments made')
                                          : t('Seller Perspective: Amounts receivable from buyer and payments received')
                                      }
                                  </Typography>
                              </Box>
                          </Box>

                          <Grid container spacing={3}>
                              {/* Contract Info */}
                              <Grid size={{ xs: 12, md: 6 }}>
                                  <Box sx={{ p: 3, bgcolor: alpha(palette.background.paper, 0.8), borderRadius: '12px', border: `1px solid ${palette.divider}` }}>
                                      <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                          {t("Contract Information")}
                                      </Typography>
                                      <Stack spacing={1.5}>
                                          <Box display="flex" justifyContent="space-between">
                                              <Typography variant="body2" color="text.secondary">{t("Contract No")}:</Typography>
                                              <Typography variant="body2" fontWeight="600" color="text.primary">{formData.contract_no || t('N/A')}</Typography>
                                          </Box>
                                          <Box display="flex" justifyContent="space-between">
                                              <Typography variant="body2" color="text.secondary">{t("Currency")}:</Typography>
                                              <Typography variant="body2" fontWeight="600" color="primary.main">{formData.contract_currency}</Typography>
                                          </Box>
                                          {isFixedPrice && (
                                              <Box display="flex" justifyContent="space-between">
                                                  <Typography variant="body2" color="text.secondary">{t("Total Contract Value")}:</Typography>
                                                  <Typography variant="body2" fontWeight="600" color="text.primary">{formData.contract_currency} {totalAmount.toLocaleString()}</Typography>
                                              </Box>
                                          )}
                                      </Stack>
                                  </Box>
                              </Grid>

                              {/* Accounting Summary */}
                              <Grid size={{ xs: 12, md: 6 }}>
                                  <Box sx={{ p: 3, bgcolor: alpha(palette.background.paper, 0.8), borderRadius: '12px', border: `1px solid ${palette.divider}` }}>
                                      <Typography variant="subtitle2" fontWeight="700" color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
                                          {t("Accounting Summary")}
                                      </Typography>
                                      <Stack spacing={1.5}>
                                          <Box display="flex" justifyContent="space-between" alignItems="center">
                                              <Box>
                                                  <Typography variant="body2" color="text.secondary">
                                                      {t("Total Invoiced")}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary">
                                                      {t("Total amount invoiced to date")}
                                                  </Typography>
                                              </Box>
                                              <Typography variant="h6" fontWeight="700" color="text.primary">
                                                  {formData.contract_currency} {totalDebit.toLocaleString()}
                                              </Typography>
                                          </Box>
                                          <Box display="flex" justifyContent="space-between" alignItems="center">
                                              <Box>
                                                  <Typography variant="body2" color="success.main">
                                                      {t("Total Paid")}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary">
                                                      {t("Total payments made/received to date")}
                                                  </Typography>
                                              </Box>
                                              <Typography variant="h6" fontWeight="700" color="success.main">
                                                  ({formData.contract_currency} {totalCredit.toLocaleString()})
                                              </Typography>
                                          </Box>
                                          <Divider sx={{ my: 1 }} />
                                          <Box display="flex" justifyContent="space-between" alignItems="center">
                                              <Box>
                                                  <Typography variant="body2" fontWeight="600" color={netBalance >= 0 ? "error.main" : "success.main"}>
                                                      {t("Outstanding Balance")}
                                                  </Typography>
                                                  <Typography variant="caption" color="text.secondary">
                                                      {netBalance >= 0 ? t('Amount still owed') : t('Overpayment/Credit balance')}
                                                  </Typography>
                                              </Box>
                                              <Typography variant="h5" fontWeight="800" color={netBalance >= 0 ? "error.main" : "success.main"}>
                                                  {formData.contract_currency} {netBalance.toLocaleString()}
                                              </Typography>
                                          </Box>
                                      </Stack>
                                  </Box>
                              </Grid>
                          </Grid>
                      </CardContent>
                  </Card>
              </Grid>

              {/* Detailed Ledger Table */}
              <Grid size={{ xs: 12 }}>
                  <Card elevation={0} sx={{ border: `1px solid ${palette.divider}`, borderRadius: '12px', overflow: 'hidden', boxShadow: boxShadows.md }}>
                      <Box sx={{ p: 2.5, bgcolor: alpha(palette.primary.main, 0.03), borderBottom: `1px solid ${palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                              <Box p={0.8} borderRadius={1.5} bgcolor={alpha(palette.primary.main, 0.1)} color="primary.main">
                                  <ReceiptLong fontSize="small" />
                              </Box>
                              <Box>
                                  <Typography variant="h6" fontWeight="700" color="text.primary">{t("Detailed Transaction Ledger")}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                      {mode === 'import' ? t('Buyer Accounting: Debits = amounts owed, Credits = payments made') : t('Seller Accounting: Debits = amounts receivable, Credits = payments received')}
                                  </Typography>
                              </Box>
                          </Box>
                          <Stack direction="row" spacing={1}>
                              <Button size="small" variant="outlined" startIcon={<Print />} sx={{ borderColor: theme.palette.divider, color: 'text.secondary' }}>
                                  {t("Export PDF")}
                              </Button>
                          </Stack>
                      </Box>
                      <TableContainer>
                          <Table>
                              <TableHead>
                                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 100 }}>{t("Date")}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 120 }}>{t("Reference")}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 100 }}>{t("Type")}</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{t("Description")}</TableCell>
                                    <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 120 }}>
                                        {t("Amount")}
                                        <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', mt: 0.5 }}>
                                            {t("(+ Debit / - Credit)")}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: theme.palette.primary.main, fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', minWidth: 120, borderLeft: `2px solid ${theme.palette.divider}` }}>
                                        {t("Running Balance")}
                                        <Typography variant="caption" display="block" sx={{ fontSize: '0.6rem', mt: 0.5 }}>
                                            {mode === 'import' ? t('Amount Still Owed') : t('Amount Receivable')}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                  {filteredLedger.length > 0 ? (
                                      filteredLedger.map((row: FinancialTransaction, index: number) => (
                                          <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
                                              <TableCell sx={{ fontFamily: 'monospace', color: 'text.primary', fontSize: '0.85rem', py: 1.5 }}>
                                                  {new Date(row.transaction_date).toLocaleDateString()}
                                              </TableCell>
                                              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, color: 'primary.main', fontSize: '0.85rem' }}>
                                                  {row.reference || '-'}
                                              </TableCell>
                                              <TableCell>
                                                  <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                                      {row.type === 'Invoice' ? `⚡ ${t('Invoice')}` : `💸 ${t('Payment')}`}
                                                  </Typography>
                                              </TableCell>
                                              <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem', maxWidth: 200 }}>
                                                  <Box sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    <Typography variant="body2" component="span">
                                                        {row.description || (row.type === 'Invoice' ? t('Initial invoice for contract value') : t('Payment'))}
                                                    </Typography>
                                                    {row.linked_transaction_id && (
                                                        <Typography variant="caption" display="block" color="primary.main">
                                                            {t("Linked to")}: {ledger.find(l => l.id === row.linked_transaction_id)?.reference || t('Invoice')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                              </TableCell>
                                              <TableCell align="right" sx={{
                                                  fontWeight: 700,
                                                  color: row.debit! > 0 ? 'error.main' : row.credit! > 0 ? 'success.main' : 'text.secondary',
                                                  fontSize: '0.9rem',
                                                  fontFamily: 'monospace'
                                              }}>
                                                  {row.debit! > 0 ? `+${formData.contract_currency} ${row.debit!.toLocaleString()}` : row.credit! > 0 ? `-${formData.contract_currency} ${row.credit!.toLocaleString()}` : '-'}
                                              </TableCell>
                                              <TableCell align="right" sx={{
                                                  fontWeight: 800,
                                                  fontSize: '0.95rem',
                                                  fontFamily: 'monospace',
                                                  borderLeft: `2px solid ${alpha(theme.palette.divider, 0.3)}`,
                                                  color: row.balance! === 0 ? theme.palette.success.main :
                                                         row.balance! > 0 ? theme.palette.error.main :
                                                         theme.palette.info.main,
                                                  bgcolor: index % 2 === 0 ? alpha(theme.palette.background.default, 0.3) : 'transparent'
                                              }}>
                                                  {formData.contract_currency} {row.balance!.toLocaleString()}
                                              </TableCell>
                                          </TableRow>
                                      ))
                                  ) : (
                                      <TableRow>
                                          <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                                              <Box textAlign="center">
                                                  <AccountBalanceWallet sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.3, mb: 2 }} />
                                                  <Typography color="text.secondary" variant="h6" gutterBottom>
                                                      {t("No Financial Transactions Yet")}
                                                  </Typography>
                                                  <Typography color="text.secondary" variant="body2">
                                                      {t("Transactions will appear here once invoices are created and payments are recorded.")}
                                                  </Typography>
                                              </Box>
                                          </TableCell>
                                      </TableRow>
                                  )}
                              </TableBody>
                          </Table>
                      </TableContainer>
                  </Card>
              </Grid>
          </Grid>
      </TabPanel>

      {/* TAB 8: Documents */}
      <TabPanel value={activeTab} index={7}>
          <Documents contractId={id} />
      </TabPanel>

      {/* Floating Actions */}
      {activeTab === 0 && (
        <Paper elevation={4} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, py: 2, bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.95) : theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Container maxWidth="xl">
                <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                    <Box>{id && (<Button startIcon={<Delete />} color="error" onClick={() => setDeleteDialogOpen(true)}>{t("Delete Contract")}</Button>)}</Box>
                    <Stack direction="row" spacing={2}>
                        <Button variant="outlined" startIcon={<Print />} disabled={!formData.contract_no}>{t("Print")}</Button>
                        <Button variant="outlined" startIcon={<Save />} onClick={() => handleSave('draft')} disabled={!canEditContract}>{t("Save Draft")}</Button>
                        <Button variant="contained" startIcon={<Send />} onClick={() => handleSave('posted')} disabled={!canEditContract} sx={{ px: 4 }}>{canEditPricing ? t('Post Contract') : t('Submit')}</Button>
                    </Stack>
                </Stack>
            </Container>
        </Paper>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t("Confirm Deletion")}</DialogTitle>
        <DialogContent>{t("Are you sure you want to delete this contract?")}</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t("Cancel")}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">{t("Delete")}</Button>
        </DialogActions>
      </Dialog>

      {/* Add Entity Dialog */}
      <AddEntityDialog 
        open={addEntityDialogOpen}
        onClose={() => setAddEntityDialogOpen(false)}
        entityType={currentEntityType}
        onEntityAdded={handleEntityAdded}
      />

      <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({...notification, open: false})}><Alert severity={notification.severity}>{notification.message}</Alert></Snackbar>
    </Container>
  );
};

export default ContractForm;