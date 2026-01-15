import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import BackButton from '../common/BackButton';
import { 
  useTheme, alpha, Stepper, Step, StepLabel, 
  Tabs, Tab, Box, Tooltip, SxProps, Theme 
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  Container, Paper,
  Typography, Button,
  CircularProgress, Stack, Snackbar, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Alert
} from '@mui/material';
import {
  Print, Save, Send, Delete,
  Description, ArrowForward, 
  PriceCheck, LocalShipping, Receipt, Payment, AccountBalanceWallet, Folder,
  EditCalendar, Error, Anchor, ImportExport
} from '@mui/icons-material';

// --- Sub-Pages Imports ---
import PricingForm from '../pages/PricingForm';
import DeliveryForm from '../pages/DeliveryForm';
import PaymentForm from '../pages/PaymentForm';
import Invoices from '../pages/Invoices'; 
import Documents from '../pages/Documents'; 
import ShipmentStatus from './ShipmentStatus';
import StatementOfAccount from './StatementOfAccount';
import AddEntityDialog from './AddEntityDialog'; 
import ContractDetails from './ContractDetails';
import SpecificationsTab from './SpecificationsTab';
import TabPanel from '../common/TabPanel';

import { useAuth } from '../../context/AuthContext';
import { usePresence } from '../../hooks/usePresence';

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


// --- Memoized Sub-components for Tabs ---


const getInitialFormData = (direction: 'export' | 'import' = 'export') => ({
  contract_no: '',
  contract_type: 'fixed_price',
  direction: direction,
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
  insurance: '', marks: '', consignee: '',
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
  
  status: 'draft', pricing_status: 'pending',
  version: null as number | null 
});

const getInitialItems = (): ContractItem[] => [
  { id: '1', article_id: '', article_name: '', qty_lot: '', qty_ton: '', packing: '', price: '', premium: '', total: 0 }
];

const ContractForm: React.FC<ContractFormProps> = ({ mode: propMode }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const { palette, boxShadows } = theme as any;
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const activeUsers = usePresence(id, user?.name);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Initialization ---
  const initialMode = propMode || (location.state as any)?.mode || 'export';
  const [mode, setMode] = useState<'export' | 'import'>(initialMode);
  const [showDraftAlert, setShowDraftAlert] = useState(false);
  const [draftData, setDraftData] = useState<any>(null);

  const activeTab = useMemo(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
        const tabsMap: any = { 
          details: 0, 
          specifications: 1,
          pricing: 2, 
          delivery: 3, 
          shipment_status: 4, 
          invoices: 5, 
          payments: 6, 
          soa: 7, 
          documents: 8 
        };
        return tabsMap[tabParam] ?? 0;
    }
    return 0;
  }, [searchParams]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({ open: false, message: '', severity: 'success' });

  // --- Form State ---
  const [formData, setFormData] = useState(getInitialFormData(initialMode));

  // Ensure issue_date is always set to today if not provided
  useEffect(() => {
    if (!formData.issue_date) {
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, issue_date: today }));
    }
  }, []);

  const [isShipmentDate, setIsShipmentDate] = useState(true);
  const [items, setItems] = useState<ContractItem[]>(getInitialItems());

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
  
  const totalAmount = useMemo(() => {
    if (mode === 'export' || formData.contract_type === 'fixed_price') {
        return items.reduce((sum, item) => sum + (item.total || 0), 0);
    }
    return 0;
  }, [items, formData.contract_type, mode]);
  
  // Auto-save and temporary storage states
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Add Entity Dialog State
  const [addEntityDialogOpen, setAddEntityDialogOpen] = useState(false);
  const [currentEntityType, setCurrentEntityType] = useState<'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm'>('seller');

  // --- Styles ---
  const headerSx: SxProps<Theme> = useMemo(() => ({
    backgroundColor: palette.mode === 'light' ? '#f8f9fa' : alpha(palette.background.default, 0.8),
    color: 'text.secondary',
    fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottom: `1px solid ${palette.divider}`, paddingInline: '16px', paddingY: '12px',
  }), [palette]);
  
  const cellSx: SxProps<Theme> = useMemo(() => ({ 
    borderBottom: `1px solid ${palette.divider}`, 
    paddingInline: '12px', paddingY: '8px',
    color: 'text.primary',
    fontSize: '0.875rem'
  }), [palette]);
  
  const inputTableSx: SxProps<Theme> = useMemo(() => ({ 
    '& .MuiInput-root': {
      backgroundColor: palette.mode === 'light' 
        ? alpha(palette.primary.main, 0.04) 
        : alpha(palette.background.paper, 0.4),
      borderRadius: '8px',
      padding: '6px 12px',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      border: `1.5px solid ${palette.mode === 'light' ? alpha(palette.divider, 0.6) : alpha(palette.divider, 0.45)}`,
      '&:before, &:after': { display: 'none' }, 
      '&:hover:not(.Mui-disabled)': {
        backgroundColor: palette.mode === 'light' 
          ? alpha(palette.primary.main, 0.08) 
          : alpha(palette.background.paper, 0.6),
        borderColor: alpha(palette.primary.main, 0.7),
      },
      '&.Mui-focused': {
        backgroundColor: palette.mode === 'light' ? '#FFFFFF' : palette.background.paper,
        borderColor: palette.primary.main,
        borderWidth: '2px',
        boxShadow: `0 0 0 4px ${alpha(palette.primary.main, palette.mode === 'light' ? 0.15 : 0.25)}`,
      },
      '&.Mui-disabled': {
        backgroundColor: alpha(palette.action.disabledBackground, 0.1),
        borderColor: alpha(palette.divider, 0.2),
      }
    },
    '& .MuiInput-input': {
      padding: '4px 0',
      fontSize: '0.875rem',
      fontWeight: 500,
      color: palette.text.primary,
      '&::placeholder': {
        color: palette.text.secondary,
        opacity: 0.7,
        fontStyle: 'italic',
        fontSize: '0.8rem',
      }
    },
    '& .MuiInputAdornment-root .MuiTypography-root': {
      fontSize: '0.75rem',
      fontWeight: 600,
      color: palette.primary.main,
    }
  }), [palette]);

  // --- Handlers & Helpers ---
  const fetchLedger = useCallback(async (contractId: string) => {
    try {
      const res = await api.get(`contracts/${contractId}/ledger`);
      setLedger(res.data);
    } catch (error) { 
      console.error("Failed to load ledger", error); 
    }
  }, []);

  // --- Temporary storage functions ---
  const checkForDraft = useCallback(() => {
    if (id) return;
    try {
      const stored = localStorage.getItem(`contract_temp_${mode}_new`);
      if (stored) {
        const tempData = JSON.parse(stored);
        const age = Date.now() - (tempData.timestamp || 0);
        if (age < 24 * 60 * 60 * 1000) {
          setDraftData(tempData);
          setShowDraftAlert(true);
        }
      }
    } catch (error) {
      console.warn('Failed to check for draft:', error);
    }
  }, [mode, id]);

  const restoreDraft = useCallback(() => {
    if (draftData) {
      setFormData(prev => ({ ...prev, ...draftData.formData }));
      setItems(draftData.items || []);
      setCharterItems(draftData.charterItems || []);
      setShowDraftAlert(false);
      setNotification({ open: true, message: t('Draft restored'), severity: 'success' });
    }
  }, [draftData, t]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(`contract_temp_${mode}_new`);
    setDraftData(null);
    setShowDraftAlert(false);
  }, [mode]);

  const loadFromTemporaryStorage = useCallback(() => {
    // This is now replaced by checkForDraft + restoreDraft
    return false;
  }, []);

  const saveToTemporaryStorage = useCallback(() => {
    if (id) return;
    
    const tempData = {
      formData,
      items,
      charterItems,
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(`contract_temp_${mode}_new`, JSON.stringify(tempData));
    } catch (error) {
      console.warn('Failed to save to temporary storage:', error);
    }
  }, [formData, items, charterItems, mode, id]);

  // --- Effects ---
  // 1. Fetch metadata (lists) only once
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [s, sh, b, br, ag, a, w, c, i] = await Promise.all([
          api.get('sellers/'), api.get('shippers/'), api.get('buyers/'),
          api.get('brokers/'), api.get('agents/'), api.get('articles/'),
          api.get('inventory/warehouses/'), api.get('conveyors/'), api.get('incoterms/')
        ]);
        
        const naOption = { id: 'NA', contact_name: t('N/A') };
        const addNA = (list: any[]) => [naOption, ...list];
        
        setLists({ 
          sellers: addNA(s.data), 
          shippers: addNA(sh.data), 
          buyers: addNA(b.data), 
          brokers: addNA(br.data), 
          conveyors: addNA(c.data), 
          agents: addNA(ag.data), 
          articles: a.data, 
          warehouses: addNA(w.data), 
          incoterms: i.data 
        });

        // Set user permissions
        const role = localStorage.getItem('user_role') || 'admin';
        setCanEditPricing(['admin', 'pricing_manager', 'finance', 'contracts_admin'].includes(role));
        setCanEditContract(['admin', 'contract_creator', 'contracts_admin'].includes(role) || !id);
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    };
    fetchMetadata();
  }, [t, id]); // Re-run if ID changes to update canEditContract, but metadata is usually fast enough. Actually, metadata could be fetched once.

  // 2. Fetch specific contract data
  useEffect(() => {
    const loadContractData = async () => {
      if (!id) {
        setMode(initialMode);
        // Reset state to initial values for a new contract
        setFormData(getInitialFormData(initialMode));
        setItems(getInitialItems());
        setCharterItems([]);
        setLedger([]);
        setIsShipmentDate(true);
        
        checkForDraft();
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await api.get(`contracts/${id}`);
        const data = res.data;
        
        // Sanitization
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
          seller_id: safeData.seller_id || 'NA',
          buyer_id: safeData.buyer_id || 'NA',
          shipper_id: safeData.shipper_id || 'NA',
          broker_id: safeData.broker_id || 'NA',
          agent_id: safeData.agent_id || 'NA',
          conveyor_id: safeData.conveyor_id || 'NA',
          warehouse_id: safeData.warehouse_id || 'NA',
        }));
        
        if (data.items && Array.isArray(data.items)) {
          const mappedItems = data.items.map((item: any) => ({
            id: item.id,
            article_id: item.article_id,
            article_name: item.article_name || '', // Will be enriched once lists are loaded
            qty_lot: (item.qty_lot ?? '').toString(),
            qty_ton: (item.qty_ton ?? item.quantity ?? '').toString(),
            packing: item.packing || '',
            price: (item.price ?? '').toString(),
            premium: (item.premium ?? '').toString(),
            total: item.total ?? 0,
            specifications: item.specifications || []
          }));
          setItems(mappedItems);
        }
        
        if (data.shipment_period) setIsShipmentDate(false);
        setMode(data.direction);
        fetchLedger(id);
      } catch (contractError: any) {
        console.error('Contract load error:', contractError);
        let errorMessage = t('Contract {{id}} not found or invalid.', { id });
        let redirectDelay = 3000;
        
        if (contractError.response?.status === 404) {
          errorMessage = t('Contract {{id}} was not found.', { id });
        } else if (contractError.response?.status === 403) {
          errorMessage = t('Access denied to contract {{id}}.', { id });
          redirectDelay = 4000;
        }
        
        setNotification({
          open: true,
          message: t('{{errorMessage}} Redirecting...', { errorMessage }),
          severity: 'error'
        });
        
        setTimeout(() => navigate('/contracts', { replace: true }), redirectDelay);
      } finally {
        setLoading(false);
      }
    };

    loadContractData();
  }, [id, initialMode, t, navigate, fetchLedger, checkForDraft]);

  // 3. Enrich item article names once lists are loaded
  useEffect(() => {
    if (lists.articles.length > 0 && items.some(i => i.article_id && !i.article_name)) {
      setItems(prev => prev.map(item => {
        if (item.article_id && !item.article_name) {
          const article = lists.articles.find((a: any) => a.id === item.article_id);
          if (article) return { ...item, article_name: article.article_name };
        }
        return item;
      }));
    }
  }, [lists.articles, items]);

  
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

  const cleanFormData = useCallback((data: any) => {
    const cleanedData = { ...data };
    const nullableFields = [
      'shipment_date', 'laycan_date_from', 'laycan_date_to', 
      'broker_id', 'conveyor_id', 'shipper_id', 'warehouse_id',             
      'place_of_origin', 'place_of_delivery',                
      'port_of_loading', 'destination',
      'ata_date', 'arrival_loading_port_date', 'nor_date',
      'loading_start_date', 'loading_end_date'
    ];

    nullableFields.forEach((field) => {
      if (cleanedData[field] === '' || cleanedData[field] === undefined) {
        cleanedData[field] = null;
      }
    });

    const dateFields = [
      'issue_date', 'shipment_date', 'laycan_date_from', 'laycan_date_to', 
      'seller_contract_date', 'ata_date', 'arrival_loading_port_date', 
      'nor_date', 'loading_start_date', 'loading_end_date'
    ];
    dateFields.forEach(field => {
      const value = cleanedData[field];
      if (field === 'issue_date') {
        if (!value || typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          cleanedData[field] = new Date().toISOString().split('T')[0];
        }
      } else if (value && typeof value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        cleanedData[field] = null;
      } else if (!value) {
        cleanedData[field] = null;
      }
    });

    if (!isShipmentDate) {
      cleanedData.shipment_date = null;
      if (!cleanedData.shipment_period?.trim()) {
        cleanedData.shipment_period = 'Prompt Shipment';
      }
    } else {
      cleanedData.shipment_period = '';
    }

    cleanedData.payment_terms = cleanedData.payment_terms || '';
    cleanedData.incoterms = cleanedData.incoterms || '';
    cleanedData.bank_details = cleanedData.bank_details || '';
    if (!cleanedData.destination && mode === 'export') cleanedData.destination = '';

    return cleanedData;
  }, [isShipmentDate, mode]);

  const preparePayload = useCallback((status: string) => {
    const cleanedData = cleanFormData(formData);
    const uuidOrNull = (value: string) => (value === 'NA' || !value) ? null : value;

    // Filter items: must have a valid article_id (UUID format usually 36 chars)
    const itemsToSave = items
      .filter(item => item.article_id && typeof item.article_id === 'string' && item.article_id.length === 36)
      .map(i => ({
        id: i.id && i.id.length > 20 ? i.id : undefined, // Keep real UUIDs, discard temp IDs
        article_id: i.article_id,
        qty_lot: Number(i.qty_lot) || 0,
        qty_ton: Number(i.qty_ton) || 0,
        quantity: Number(i.qty_ton) || 0, // Legacy field support
        packing: i.packing || null,
        price: Number(i.price) || 0,
        premium: Number(i.premium) || 0,
        specifications: (i.specifications || []).map((s: any) => ({
          spec_key: s.spec_key,
          spec_value: s.spec_value,
          display_order: s.display_order
        }))
      }));

    return {
      direction: cleanedData.direction,
      issue_date: cleanedData.issue_date,
      shipment_date: cleanedData.shipment_date,
      shipment_period: cleanedData.shipment_period,
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
      warehouse_id: null,
      contract_currency: cleanedData.contract_currency,
      seller_id: cleanedData.seller_id,
      shipper_id: uuidOrNull(cleanedData.shipper_id),
      buyer_id: cleanedData.buyer_id,
      broker_id: uuidOrNull(cleanedData.broker_id),
      agent_id: uuidOrNull(cleanedData.agent_id),
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
      actual_shipped_quantity: Number(cleanedData.actual_shipped_quantity) || 0,
      vessel_name: cleanedData.vessel_name,
      ata_date: cleanedData.ata_date,
      ata_time: cleanedData.ata_time,
      status: status,
      contract_no: cleanedData.contract_no,
      version: formData.version,
      items: itemsToSave
    };
  }, [formData, items, cleanFormData]);

  const performAutoSave = useCallback(async () => {
    // Only auto-save if contract exists, has changes, AND is in draft status
    // Also prevent concurrent saves
    if (!hasUnsavedChanges || !id || formData.status !== 'draft' || autoSaveStatus === 'saving') return;
    
    setAutoSaveStatus('saving');
    
    try {
      // Enhanced validation before sending
      if (!formData.seller_id || formData.seller_id === 'NA' || !formData.buyer_id || formData.buyer_id === 'NA') {
        console.warn('Auto-save skipped: Missing required seller/buyer');
        setAutoSaveStatus('idle');
        return;
      }
      
      const payload = preparePayload('draft');
      
      // Only send if we have valid items
      if (payload.items.length === 0) {
        console.warn('Auto-save skipped: No valid items to save');
        setAutoSaveStatus('idle');
        return;
      }
      
      const res = await api.put(`contracts/${id}`, payload);
      setFormData(prev => ({ 
        ...prev, 
        version: res.data.version,
        modified_date: res.data.modified_date || prev.modified_date
      }));
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
      } else if (error.response?.status === 409) {
        setNotification({ 
          open: true, 
          message: t('Concurrency conflict: This contract was updated by another user. Please refresh to see changes.'), 
          severity: 'error' 
        });
        // Stop further auto-saves until refresh
        setHasUnsavedChanges(false);
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
  }, [id, hasUnsavedChanges, formData, items, cleanFormData, t, autoSaveStatus]);

  // Debounced auto-save trigger
  const triggerAutoSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performAutoSave();
    }, 10000); // Auto-save after 10 seconds of inactivity
  }, [performAutoSave]);

  const triggerTempSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      saveToTemporaryStorage();
    }, 5000); // Temp save after 5 seconds of inactivity
  }, [saveToTemporaryStorage]);

  const handleDiscardDraft = useCallback(() => {
    if (window.confirm(t('Are you sure you want to discard this draft? All unsaved changes will be lost.'))) {
      localStorage.removeItem(`contract_temp_${mode}_new`);
      // Use navigate to same route to refresh state without full page reload if possible
      // but reload is more reliable for a full reset of all complex states
      window.location.reload();
    }
  }, [mode, t]);

  const handleSavePricingSuccess = useCallback(() => {
    if (id) fetchLedger(id);
  }, [id, fetchLedger]);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    const tabs = ['details', 'specifications', 'pricing', 'delivery', 'shipment_status', 'invoices', 'payments', 'soa', 'documents'];
    setSearchParams({ tab: tabs[newValue] }, { replace: true });
    
    // Save to temporary storage only for new contracts
    if (!id && newValue !== 0) {
      saveToTemporaryStorage();
    }
  }, [id, setSearchParams, saveToTemporaryStorage]);

  useEffect(() => {
    // Sync charter items with contract items - one charter item per unique article
    if (mode === 'import' && items.length > 0) {
      const uniqueArticlesMap = new Map<string, any>();
      items.forEach(item => {
        if (item.article_id && !uniqueArticlesMap.has(item.article_id)) {
          uniqueArticlesMap.set(item.article_id, item);
        }
      });

      if (uniqueArticlesMap.size === 0) return;

      setCharterItems(prev => {
        const prevMap = new Map(prev.map(c => [c.article_id, c]));
        
        let hasChanges = prev.length !== uniqueArticlesMap.size;
        
        if (!hasChanges) {
          for (const [articleId, item] of uniqueArticlesMap) {
            const existing = prevMap.get(articleId);
            if (!existing || existing.qty_ton !== item.qty_ton || existing.article_name !== item.article_name) {
              hasChanges = true;
              break;
            }
          }
        }

        if (!hasChanges) return prev;

        const newCharterItems: any[] = [];
        let index = 0;
        for (const [articleId, item] of uniqueArticlesMap) {
          const existing = prevMap.get(articleId);
          if (existing) {
            newCharterItems.push({ ...existing, qty_ton: item.qty_ton, article_name: item.article_name });
          } else {
            newCharterItems.push({
              id: `charter-${articleId}-${index++}`, 
              article_id: articleId,
              article_name: item.article_name,
              qty_ton: item.qty_ton,
              freight: '',
              loading_rate: ''
            });
          }
        }
        return newCharterItems;
      });
    }
  }, [items, mode]);



  const handleGenerateNumber = useCallback(async (sellerId: string) => {
    setIsGeneratingNo(true);
    try {
      const seller = lists.sellers.find((s: any) => s.id === sellerId);
      if (!seller || !seller.seller_code || seller.seller_code === 'NA') {
        setNotification({ open: true, message: t('Please select a seller with a valid code first'), severity: 'warning' });
        return;
      }

      const sellerCode = seller.seller_code;
      const issueDate = formData.issue_date || new Date().toISOString().split('T')[0];
      
      let generatedNo = '';
      try {
          const res = await api.get(`contracts/next-number?seller_code=${sellerCode}&issue_date=${issueDate}`);
          generatedNo = res.data.full_no;
      } catch (e) {
          console.warn('Failed to fetch next number, constructing manually');
          const dateObj = new Date(issueDate);
          const year = dateObj.getFullYear().toString().slice(-2); // Get last 2 digits (e.g., "26")
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          generatedNo = `${sellerCode}${year}${month}0001`;
      }

      setFormData(prev => ({...prev, contract_no: generatedNo})); 
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error generating contract number:', error);
      setNotification({ open: true, message: t('Failed to generate contract number. Please try again.'), severity: 'error' });
    } finally { 
      setIsGeneratingNo(false); 
    }
  }, [lists.sellers, t]);

  const handleSave = async (status: 'draft' | 'posted') => {
    // Prevent manual save if auto-save is currently running
    if (autoSaveStatus === 'saving') return;

    if (!formData.seller_id || formData.seller_id === 'NA' || !formData.buyer_id || formData.buyer_id === 'NA') {
      return setNotification({ open: true, message: t('Seller and Buyer are required and cannot be N/A'), severity: 'error' });
    }

    let currentContractNo = formData.contract_no;
    
    // Auto-generate contract number on Post if missing
    if (status === 'posted' && !currentContractNo) {
      const seller = lists.sellers.find((s: any) => s.id === formData.seller_id);
      if (seller && seller.seller_code && seller.seller_code !== 'NA') {
        const sellerCode = seller.seller_code;
        const issueDate = formData.issue_date || new Date().toISOString().split('T')[0];
        
        try {
          const res = await api.get(`contracts/next-number?seller_code=${sellerCode}&issue_date=${issueDate}`);
          currentContractNo = res.data.full_no;
          setFormData(prev => ({...prev, contract_no: currentContractNo}));
        } catch (e) {
          console.warn('Failed to fetch next number during post');
          // Backend will handle it if still missing, or we could construct it here
        }
      }
    }

    const finalStatus = status === 'posted' ? (canEditPricing ? 'posted' : 'pricing_pending') : status;
    const payload = { ...preparePayload(finalStatus), contract_no: currentContractNo };

    if (finalStatus !== 'draft' && payload.items.length === 0) {
      return setNotification({ open: true, message: t('At least one item with a selected article is required to post the contract.'), severity: 'error' });
    }
    
    try {
        if (id) {
          const res = await api.put(`contracts/${id}`, payload);
          setFormData(prev => ({ 
            ...prev, 
            version: res.data.version, 
            status: finalStatus,
            modified_date: res.data.modified_date || prev.modified_date 
          }));
          setHasUnsavedChanges(false);
          setAutoSaveStatus('saved');
          setLastAutoSave(new Date());
          setNotification({ open: true, message: t('Updated successfully'), severity: 'success' });
      } else {
          const res = await api.post('contracts/', payload);
          setFormData(prev => ({ 
            ...prev, 
            version: res.data.version, 
            status: finalStatus,
            modified_date: res.data.modified_date || prev.modified_date
          }));
          setHasUnsavedChanges(false);
          // Clear temporary storage on successful save
          localStorage.removeItem(`contract_temp_${mode}_new`);
          setNotification({ open: true, message: t('Created successfully'), severity: 'success' });
          if(res.data.id) navigate(`/contracts/${res.data.id}?tab=details`, { replace: true, state: { mode: formData.direction } });
      }
        
        // Clear saved status after 3 seconds
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
        
    } catch (err: any) {
        let msg = t('Error saving contract.');
        if (err.response?.status === 403) {
            msg = t('Access denied. Insufficient permissions.');
            setCanEditContract(false);
            setCanEditPricing(false);
        } else if (err.response?.status === 409) {
            msg = t('Concurrency conflict: This contract was updated by another user. Please refresh the page to get the latest version before saving your changes.');
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

  // --- Handlers ---
  const checkEditable = useCallback(() => {
    if (!canEditContract || formData.status !== 'draft') {
      if (formData.status !== 'draft') {
        setNotification({ 
          open: true, 
          message: t('This contract is already posted and cannot be edited.'), 
          severity: 'info' 
        });
      }
      return false;
    }
    return true;
  }, [canEditContract, formData.status, t]);

  const handleInputChange = useCallback((field: string, value: any) => {
    if (!checkEditable()) return;
    
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Sync mode state with direction field if it changes
    if (field === 'direction') {
      setMode(value);
    }

    setHasUnsavedChanges(true);
    setAutoSaveStatus('idle');
    
    if (id) {
      if (formData.status === 'draft') triggerAutoSave();
    } else {
      triggerTempSave();
    }
  }, [checkEditable, formData.status, id, triggerAutoSave, triggerTempSave]);
  
  const handleItemChange = useCallback((itemId: string, field: string, value: any) => {
    if (!checkEditable()) return;
    
    setItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        const updated = { ...item, [field]: value };
        if (field === 'article_id') {
          const selectedArticle = lists.articles.find(a => a.id === value);
          updated.article_name = selectedArticle?.article_name || '';
        }
        
        const qty = parseFloat(updated.qty_ton) || 0;
        const price = parseFloat(updated.price) || 0;
        const premium = parseFloat(updated.premium) || 0;
        updated.total = qty * (price + premium);
        return updated;
    }));
    setHasUnsavedChanges(true);
    setAutoSaveStatus('idle');
    
    if (id) {
      if (formData.status === 'draft') triggerAutoSave();
    } else {
      triggerTempSave();
    }
  }, [checkEditable, lists.articles, formData.status, id, triggerAutoSave, triggerTempSave]);

  const handleAddItem = useCallback(() => {
    if (!checkEditable()) return;
    
    const newId = Date.now().toString();
    setItems(prev => [...prev, { id: newId, article_id: '', article_name: '', qty_lot: '', qty_ton: '', packing: '', price: '', premium: '', total: 0 }]);
    setHasUnsavedChanges(true);
    
    if (id) {
      if (formData.status === 'draft') triggerAutoSave();
    } else {
      triggerTempSave();
    }
  }, [checkEditable, formData.status, id, triggerAutoSave, triggerTempSave]);

  const handleRemoveItem = useCallback((itemId: string) => {
    if (!checkEditable()) return;
    
    if (items.length > 1) {
      setItems(prev => prev.filter(i => i.id !== itemId));
      setHasUnsavedChanges(true);
      
      if (id) {
        if (formData.status === 'draft') triggerAutoSave();
      } else {
        triggerTempSave();
      }
    }
  }, [checkEditable, formData.status, items.length, id, triggerAutoSave, triggerTempSave]);

  const handleAddEntity = useCallback((entityType: 'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm') => {
    setCurrentEntityType(entityType);
    setAddEntityDialogOpen(true);
  }, []);

  const handleEntityAdded = useCallback((entity: any) => {
    const naOption = { id: 'NA', contact_name: t('N/A') };
    setLists(prev => {
      const newList = { ...prev };
      switch (currentEntityType) {
        case 'seller': newList.sellers = [naOption, ...prev.sellers.filter(x => x.id !== 'NA'), entity]; break;
        case 'buyer': newList.buyers = [naOption, ...prev.buyers.filter(x => x.id !== 'NA'), entity]; break;
        case 'shipper': newList.shippers = [naOption, ...prev.shippers.filter(x => x.id !== 'NA'), entity]; break;
        case 'broker': newList.brokers = [naOption, ...prev.brokers.filter(x => x.id !== 'NA'), entity]; break;
        case 'agent': newList.agents = [naOption, ...prev.agents.filter(x => x.id !== 'NA'), entity]; break;
        case 'conveyor': newList.conveyors = [naOption, ...prev.conveyors.filter(x => x.id !== 'NA'), entity]; break;
        case 'article': newList.articles = [...prev.articles, entity]; break;
        case 'incoterm': newList.incoterms = [...prev.incoterms, entity]; break;
        case 'warehouse': newList.warehouses = [naOption, ...prev.warehouses.filter(x => x.id !== 'NA'), entity]; break;
      }
      return newList;
    });
    setAddEntityDialogOpen(false);
  }, [currentEntityType, t]);

  // Helpers for render
  const isFixedPrice = formData.contract_type === 'fixed_price';
  const isStockMarket = formData.contract_type === 'stock_market';

  const { filteredLedger, totalDebit, totalCredit, netBalance } = useMemo(() => {
    const isImport = mode === 'import';
    let list: FinancialTransaction[] = [...ledger];
    
    // Add virtual invoice for import fixed price if no real invoices exist
    if (isImport && !isStockMarket && totalAmount > 0 && !list.some(t => t.type === 'Invoice')) {
      list.push({
        id: 'contract-invoice',
        transaction_date: (formData.issue_date || new Date().toISOString()).split('T')[0],
        type: 'Invoice',
        description: t("Contract Invoice - Total Contract Value ({{contractNo}})", { contractNo: formData.contract_no || t('TEMP') }),
        reference: `INV-${formData.contract_no || t('TEMP')}`,
        amount: totalAmount,
        is_credit: false
      });
    }

    // Sort by date
    list.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    let debit = 0;
    let credit = 0;
    let runningBalance = 0;
    
    const processed = list.map(item => {
        let d = 0;
        let c = 0;

        if (isImport) {
          if (item.type === 'Invoice') {
            d = item.amount;
          } else if (item.type === 'Payment') {
            c = item.amount;
          } else {
            d = item.is_credit ? 0 : item.amount;
            c = item.is_credit ? item.amount : 0;
          }
          runningBalance += c - d;
        } else {
          d = item.is_credit ? 0 : item.amount;
          c = item.is_credit ? item.amount : 0;
          runningBalance += d - c;
        }

        debit += d;
        credit += c;
        
        return { ...item, debit: d, credit: c, balance: runningBalance };
    });

    return { 
        filteredLedger: processed, 
        totalDebit: debit, 
        totalCredit: credit, 
        netBalance: isImport ? credit - debit : debit - credit
    };
  }, [ledger, isStockMarket, mode, totalAmount, formData.issue_date, formData.contract_no, t]);

  if (loading) return <Box display="flex" justifyContent="center" p={10}><CircularProgress /></Box>;
  
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 12 }}> 
      
      {/* Draft Recovery Alert */}
      {showDraftAlert && (
        <Alert 
          severity="info" 
          sx={{ mb: 3, borderRadius: '12px', boxShadow: boxShadows.sm }}
          action={
            <Stack direction="row" spacing={1}>
              <Button color="primary" size="small" onClick={restoreDraft} variant="contained" sx={{ fontWeight: 'bold' }}>
                {t('Restore Draft')}
              </Button>
              <Button color="inherit" size="small" onClick={discardDraft}>
                {t('Discard')}
              </Button>
            </Stack>
          }
        >
          <Typography variant="body2" fontWeight="500">
            {t('You have an unsaved draft for a new {{mode}} contract. Would you like to restore it?', { mode: t(mode) })}
          </Typography>
        </Alert>
      )}

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
                {/* Presence Indicator */}
                {activeUsers.length > 0 && (
                  <Tooltip title={t('Users currently viewing/editing this contract: {{users}}', { users: activeUsers.join(', ') })}>
                    <Chip 
                      size="small"
                      icon={<EditCalendar />}
                      label={t('{{count}} other user(s) editing', { count: activeUsers.length })}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 'bold', borderRadius: '6px' }}
                    />
                  </Tooltip>
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
            <Tab icon={<EditCalendar fontSize="small"/>} iconPosition="start" label={t('Specifications')} />
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
         <ContractDetails 
            formData={formData}
            mode={mode}
            isGeneratingNo={isGeneratingNo}
            isShipmentDate={isShipmentDate}
            items={items}
            charterItems={charterItems}
            lists={lists}
            totalAmount={totalAmount}
            isFixedPrice={isFixedPrice}
            handleInputChange={handleInputChange}
            handleItemChange={handleItemChange}
            handleAddItem={handleAddItem}
            handleRemoveItem={handleRemoveItem}
            handleGenerateNumber={handleGenerateNumber}
            handleAddEntity={handleAddEntity}
            setIsShipmentDate={setIsShipmentDate}
            setCharterItems={setCharterItems}
            t={t}
            theme={theme}
            palette={palette}
            boxShadows={boxShadows}
            headerSx={headerSx}
            cellSx={cellSx}
            inputTableSx={inputTableSx}
         />
      </TabPanel>

      {/* TAB 2: Specifications */}
      <TabPanel value={activeTab} index={1}>
          <SpecificationsTab 
            items={items} 
            onItemChange={handleItemChange}
            disabled={!canEditContract || (id ? formData.status !== 'draft' : false)}
          />
      </TabPanel>

      {/* TAB 3: Pricing */}
      <TabPanel value={activeTab} index={2}>
          <PricingForm contractId={id} onSaveSuccess={handleSavePricingSuccess} />
      </TabPanel>

      {/* TAB 4: Delivery & Execution */}
      <TabPanel value={activeTab} index={3}>
          <DeliveryForm contractId={id} />
      </TabPanel>

      {/* TAB 5: Shipment Status */}
      <TabPanel value={activeTab} index={4}>
          <ShipmentStatus 
            formData={formData} 
            handleInputChange={handleInputChange} 
            t={t} 
            theme={theme} 
          />
      </TabPanel>

      {/* TAB 6: Invoices */}
      <TabPanel value={activeTab} index={5}>
          <Invoices contractId={id} ledger={ledger} onRefresh={() => fetchLedger(id!)} />
      </TabPanel>

      {/* TAB 7: Payments */}
      <TabPanel value={activeTab} index={6}>
          <PaymentForm contractId={id} ledger={ledger} onRefresh={() => fetchLedger(id!)} onSaveSuccess={handleSavePricingSuccess} />
      </TabPanel>

      {/* TAB 8: SOA (Real Ledger Data) */}
      <TabPanel value={activeTab} index={7}>
          <StatementOfAccount 
            mode={mode}
            formData={formData}
            totalAmount={totalAmount}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            netBalance={netBalance}
            filteredLedger={filteredLedger}
            ledger={ledger}
            isFixedPrice={isFixedPrice}
            t={t}
            theme={theme}
            palette={palette}
            boxShadows={boxShadows}
          />
      </TabPanel>

      {/* TAB 9: Documents */}
      <TabPanel value={activeTab} index={8}>
          <Documents contractId={id} />
      </TabPanel>

      {/* Floating Actions */}
      {activeTab === 0 && (
        <Paper elevation={4} sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100, py: 2, bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.background.paper, 0.95) : theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Container maxWidth="xl">
                <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
                    <Box>
                        {id ? (
                            <Button startIcon={<Delete />} color="error" onClick={() => setDeleteDialogOpen(true)}>
                                {t("Delete Contract")}
                            </Button>
                        ) : (
                            <Button startIcon={<Delete />} color="error" onClick={handleDiscardDraft}>
                                {t("Discard Draft")}
                            </Button>
                        )}
                    </Box>
                    <Stack direction="row" spacing={2}>
                        <Button variant="outlined" startIcon={<Print />} disabled={!formData.contract_no}>{t("Print Contract")}</Button>
                        <Button variant="outlined" startIcon={<Receipt />} disabled={!formData.contract_no}>{t("Proforma Invoice")}</Button>
                        <Button variant="outlined" startIcon={<Receipt />} disabled={!formData.contract_no}>{t("Invoice")}</Button>
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