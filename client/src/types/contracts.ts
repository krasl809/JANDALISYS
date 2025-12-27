// Contract-related TypeScript interfaces for production readiness

export interface Entity {
  id: string;
  contact_name: string;
  seller_code?: string;
  code?: string;
}

export interface Article {
  id: string;
  article_name: string;
  uom: string;
  item_code: string;
}

export interface IncotermEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export interface ContractItem {
  id: string;
  article_id: string;
  article_name: string;
  qty_lot: string;
  qty_ton: string;
  packing: string;
  price: string;
  premium: string;
  total: number;
}

export interface CharterPartyItem {
  id: string;
  article_id: string;
  article_name: string;
  qty_ton: string;
  freight: string;
  loading_rate: string;
}

export interface FinancialTransaction {
  id: string;
  transaction_date: string;
  type: string;
  description?: string;
  reference?: string;
  amount: number;
  is_credit: boolean;
  debit?: number;
  credit?: number;
  balance?: number;
  linked_transaction_id?: string;
}

export interface ContractSummary {
  id: string;
  no: string;
  type: 'Import' | 'Export';
  client: string;
  commodity: string;
  qty: number;
  value: number;
  status: 'Active' | 'Pending' | 'Draft' | 'Completed' | 'Cancelled';
  progress: number;
}

export interface ContractFormData {
  contract_no: string;
  contract_type: 'fixed_price' | 'stock_market';
  direction: 'export' | 'import';
  issue_date: string | null;
  shipment_date: string | null;
  shipment_period: string;
  actual_shipped_quantity: string;
  seller_id: string;
  shipper_id: string;
  buyer_id: string;
  broker_id: string;
  conveyor_id: string;
  agent_id: string;
  posted_by: string;
  finance_notified_by: string;
  posted_date: string;
  modified_date: string;
  place_of_origin: string;
  port_of_loading: string;
  destination: string;
  place_of_delivery: string;
  payment_terms: string;
  incoterms: string;
  bank_details: string;
  insurance: string;
  marks: string;
  consignee: string;
  documents: string;
  contract_currency: string;
  vessel_name: string;
  demurrage_rate: string;
  discharge_rate: string;
  dispatch_rate: string;
  laycan_date_from: string | null;
  laycan_date_to: string | null;
  ata_date: string;
  ata_time: string;
  arrival_loading_port_date: string;
  arrival_loading_port_time: string;
  nor_date: string;
  nor_time: string;
  loading_start_date: string;
  loading_start_time: string;
  loading_end_date: string;
  loading_end_time: string;
  status: 'draft' | 'pending' | 'active' | 'posted' | 'completed' | 'cancelled';
  pricing_status: 'pending' | 'in_review' | 'approved' | 'rejected';
}

export interface ContractLists {
  sellers: Entity[];
  buyers: Entity[];
  brokers: Entity[];
  shippers: Entity[];
  conveyors: Entity[];
  agents: Entity[];
  articles: Article[];
  warehouses: Warehouse[];
  incoterms: IncotermEntity[];
}

export interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

export interface ContractDetailsTabProps {
  formData: ContractFormData;
  items: ContractItem[];
  mode: 'export' | 'import';
  isShipmentDate: boolean;
  lists: ContractLists;
  isFixedPrice: boolean;
  totalAmount: number;
  handleInputChange: (field: string, value: any) => void;
  handleItemChange: (id: string, field: string, value: any) => void;
  handleAddItem: () => void;
  handleRemoveItem: (id: string) => void;
  setIsShipmentDate: (value: boolean) => void;
  canEditContract: boolean;
  handleSave: (status: 'draft' | 'posted') => void;
  handleGenerateNumber: (sellerId: string) => void;
  isGeneratingNo: boolean;
  id?: string;
  navigate: (path: string, options?: any) => void;
  setDeleteDialogOpen: (value: boolean) => void;
}

export interface ContractFormProps {
  mode?: 'export' | 'import';
}

export type EntityType = 'seller' | 'buyer' | 'shipper' | 'broker' | 'agent' | 'conveyor' | 'article' | 'warehouse' | 'incoterm';

export interface Contract extends ContractFormData {
  id: string;
  items: ContractItem[];
}

export interface ContractPricingReview {
  id: string;
  contract_no: string;
  status: string;
  buyer_name: string;
  destination: string;
  financial_value?: number;
  issue_date: string;
  pricing_status: 'pending' | 'in_review' | 'approved' | 'rejected';
  currency: string;
}