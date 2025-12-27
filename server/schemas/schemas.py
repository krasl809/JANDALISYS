from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict
from datetime import date, datetime
import uuid
from enum import Enum

# Enums for contract validation
class ContractDirection(str, Enum):
    IMPORT = "import"
    EXPORT = "export"

class ContractStatus(str, Enum):
    DRAFT = "draft"
    POSTED = "posted"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PRICING_PENDING = "pricing_pending"

class ContractType(str, Enum):
    FIXED_PRICE = "fixed_price"
    STOCK_MARKET = "stock_market"

class PricingStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# --- Brokers ---
class BrokerBase(BaseModel):
    contact_name: str
    address: Optional[str] = None
    post_box: Optional[str] = None
    tel: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    code: Optional[str] = None 

class BrokerCreate(BrokerBase):
    pass

class Broker(BrokerBase):
    id: uuid.UUID
    created_at: datetime
    class Config:
        from_attributes = True

# --- Conveyors (الناقلين) ---
class ConveyorBase(BaseModel):
    contact_name: str
    address: Optional[str] = None
    post_box: Optional[str] = None
    tel: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None

class ConveyorCreate(ConveyorBase):
    pass

class Conveyor(ConveyorBase):
    id: uuid.UUID
    created_at: datetime
    class Config:
        from_attributes = True

# --- Entities (Common) ---
class Entity(BaseModel):
    id: uuid.UUID
    contact_name: str
    address: Optional[str] = None
    post_box: Optional[str] = None
    tel: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    seller_code: Optional[str] = None
    code: Optional[str] = None

    class Config:
        from_attributes = True

class SellerBase(BaseModel):
    contact_name: str
    address: Optional[str] = None
    post_box: Optional[str] = None
    tel: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None
    seller_code: str 

class SellerCreate(SellerBase):
    pass

class Seller(SellerBase):
    id: uuid.UUID
    created_at: datetime
    class Config:
        from_attributes = True

class BuyerBase(BaseModel):
    contact_name: str
    address: Optional[str] = None
    post_box: Optional[str] = None
    tel: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None

class BuyerCreate(BuyerBase):
    pass

class Buyer(BuyerBase):
    id: uuid.UUID
    created_at: datetime
    class Config:
        from_attributes = True

class ShipperBase(BaseModel):
    contact_name: str
    address: Optional[str] = None
    post_box: Optional[str] = None
    tel: Optional[str] = None
    fax: Optional[str] = None
    email: Optional[str] = None

class ShipperCreate(ShipperBase):
    pass

class Shipper(ShipperBase):
    id: uuid.UUID
    created_at: datetime
    class Config:
        from_attributes = True

# --- Articles ---
class ArticleEntity(BaseModel):
    id: uuid.UUID
    article_name: str
    uom: str
    item_code: str
    class Config:
        from_attributes = True

# --- Users ---
class UserBase(BaseModel):
    name: str
    email: str
    role: str = "user"
    is_active: bool = True
    language: str = "en"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: uuid.UUID
    created_at: datetime
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(UserCreate):
    pass

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    language: Optional[str] = None

# --- Contract Items ---
class ContractItemBase(BaseModel):
    article_id: uuid.UUID = Field(..., description="Article ID")
    # الكميات
    quantity: Optional[float] = Field(None, ge=0, le=1000000, description="Total quantity")
    qty_lot: Optional[float] = Field(None, ge=0, le=1000000, description="Quantity in lot units")
    qty_ton: Optional[float] = Field(None, ge=0, le=1000000, description="Quantity in tons")
    
    packing: Optional[str] = Field(None, max_length=255, description="Packing information")
    
    # الأسعار
    price: Optional[float] = Field(None, ge=0, le=1000000, description="Unit price")
    premium: Optional[float] = Field(0, ge=0, le=10000, description="Premium amount")
    
    @field_validator('quantity', 'qty_lot', 'qty_ton', 'price', 'premium')
    @classmethod
    def validate_positive_numbers(cls, v):
        if v is not None and v < 0:
            raise ValueError('Value must be non-negative')
        return v

class ContractItemCreate(ContractItemBase):
    id: Optional[uuid.UUID] = None

class ContractItem(ContractItemBase):
    id: uuid.UUID
    total: float
    # نحتاج الاسم للعرض في الفرونت
    article_name: Optional[str] = None 
    article: Optional[ArticleEntity] = None

    class Config:
        from_attributes = True

# --- Contracts ---
class ContractBase(BaseModel):
    # ✅ الحقل الجديد لاتجاه العقد
    direction: ContractDirection = Field(default=ContractDirection.EXPORT, description="Contract direction")

    issue_date: Optional[date] = Field(None, description="Contract issue date")
    shipment_date: Optional[date] = Field(None, description="Shipment date")
    payment_terms: Optional[str] = Field(None, max_length=500, description="Payment terms")
    incoterms: Optional[str] = Field(None, max_length=100, description="Incoterms")
    bank_details: Optional[str] = Field(None, max_length=1000, description="Bank details")
    insurance: Optional[str] = Field(None, max_length=500, description="Insurance information")
    marks: Optional[str] = Field(None, max_length=255, description="Shipping marks")
    consignee: Optional[str] = Field(None, max_length=500, description="Consignee information")
    destination: Optional[str] = Field(None, max_length=255, description="Destination port")
    # ✅ إضافة الحقل هنا للـ Schema
    port_of_loading: Optional[str] = Field(None, max_length=255, description="Port of loading")
    # ✅
    place_of_origin: Optional[str] = Field(None, max_length=255, description="Place of origin")
    place_of_delivery: Optional[str] = Field(None, max_length=255, description="Place of delivery")
    warehouse_id: Optional[uuid.UUID] = Field(None, description="Warehouse ID for stock reservation")
    documents: Optional[str] = Field(None, max_length=1000, description="Required documents")
    contract_currency: str = Field(default="USD", description="Contract currency")
    
    seller_id: uuid.UUID = Field(..., description="Seller ID")
    shipper_id: Optional[uuid.UUID] = Field(None, description="Shipper ID")
    buyer_id: uuid.UUID = Field(..., description="Buyer ID")
    broker_id: Optional[uuid.UUID] = Field(None, description="Broker ID")
    
    # الحقول الجديدة
    conveyor_id: Optional[uuid.UUID] = Field(None, description="Conveyor ID")
    contract_type: ContractType = Field(default=ContractType.FIXED_PRICE, description="Contract type")
    pricing_status: PricingStatus = Field(default=PricingStatus.PENDING, description="Pricing status")
    
    # حقول الشحن
    demurrage_rate: Optional[str] = Field(None, max_length=100, description="Demurrage rate")
    discharge_rate: Optional[str] = Field(None, max_length=100, description="Discharge rate")
    dispatch_rate: Optional[str] = Field(None, max_length=100, description="Dispatch rate")
    laycan_date_from: Optional[date] = Field(None, description="Laycan start date")
    laycan_date_to: Optional[date] = Field(None, description="Laycan end date")
    
    @field_validator('contract_currency')
    @classmethod
    def validate_currency(cls, v):
        if v and len(v) != 3:
            raise ValueError('Currency code must be 3 characters')
        return v.upper()

    @field_validator('laycan_date_to')
    @classmethod
    def validate_laycan_dates(cls, v, info):
        if v and info.data.get('laycan_date_from') and v < info.data['laycan_date_from']:
            raise ValueError('Laycan end date must be after start date')
        return v

    @field_validator('shipment_date')
    @classmethod
    def validate_shipment_date(cls, v, info):
        if v and info.data.get('issue_date') and v < info.data['issue_date']:
            raise ValueError('Shipment date must be after issue date')
        return v

class ContractCreate(ContractBase):
    items: List[ContractItemCreate] = Field(..., min_items=1, max_items=100, description="Contract items")
    status: ContractStatus = Field(default=ContractStatus.DRAFT, description="Contract status")
    contract_no: Optional[str] = Field(None, max_length=50, description="Contract number")
    
    @field_validator('contract_no')
    @classmethod
    def validate_contract_no(cls, v):
        if v:
            import re
            # Contract number should be alphanumeric, max 50 chars
            if not re.match(r'^[A-Z0-9]{4,50}$', v.upper()):
                raise ValueError('Contract number must be alphanumeric (4-50 characters)')
        return v

class Contract(ContractBase):
    id: uuid.UUID
    contract_no: Optional[str]
    status: str
    created_by: uuid.UUID
    posted_date: Optional[datetime] = None
    modified_date: Optional[datetime] = None
    
    # القيم المالية
    financial_value: Optional[float] = 0
    
    items: List[ContractItem] = []

    class Config:
        from_attributes = True

# --- Others ---
class PaymentTerm(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

class PaymentTermCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class Incoterm(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    class Config:
        from_attributes = True

class IncotermCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None

class DocumentType(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    description: Optional[str] = None
    is_required: bool = False
    is_active: bool = True
    class Config:
        from_attributes = True

class DocumentTypeCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    is_required: bool = False
    is_active: bool = True

class DocumentTypeUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None

# ... existing imports ...

# --- Warehouse ---
class WarehouseBase(BaseModel):
    name: str
    location: Optional[str] = None
    manager_id: Optional[uuid.UUID] = None

class WarehouseCreate(WarehouseBase):
    pass

class Warehouse(WarehouseBase):
    id: uuid.UUID
    is_active: bool
    class Config:
        from_attributes = True

# --- Inventory ---
class InventoryBase(BaseModel):
    warehouse_id: uuid.UUID
    article_id: uuid.UUID
    min_stock: float = 0
    max_stock: float = 0

class InventoryUpdate(BaseModel):
    min_stock: Optional[float] = None
    max_stock: Optional[float] = None

class Inventory(InventoryBase):
    id: uuid.UUID
    quantity_on_hand: float
    reserved_quantity: float
    article_name: Optional[str] = None # For UI convenience
    class Config:
        from_attributes = True

# --- Delivery Notes ---
class DeliveryNoteItemBase(BaseModel):
    article_id: uuid.UUID
    quantity: float
    batch_number: Optional[str] = None

class DeliveryNoteItemCreate(DeliveryNoteItemBase):
    pass

class DeliveryNoteItem(DeliveryNoteItemBase):
    id: uuid.UUID
    article_name: Optional[str] = None
    class Config:
        from_attributes = True

class DeliveryNoteBase(BaseModel):
    type: str # inbound, outbound, transfer
    date: date
    warehouse_id: uuid.UUID
    target_warehouse_id: Optional[uuid.UUID] = None
    contract_id: Optional[uuid.UUID] = None
    entity_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None

class DeliveryNoteCreate(DeliveryNoteBase):
    items: List[DeliveryNoteItemCreate]
    status: str = "draft"

class DeliveryNote(DeliveryNoteBase):
    id: uuid.UUID
    note_number: str
    status: str
    created_by: uuid.UUID
    approved_by: Optional[uuid.UUID] = None
    items: List[DeliveryNoteItem] = []
    class Config:
        from_attributes = True

# --- Reporting ---
class StockCardItem(BaseModel):
    date: datetime
    type: str
    quantity: float
    balance: float
    reference: str
    created_by: str    

class FinancialTransactionBase(BaseModel):
    transaction_date: date
    type: str
    description: Optional[str]
    reference: Optional[str]
    amount: float
    is_credit: bool
    contract_id: Optional[uuid.UUID] = None
    linked_transaction_id: Optional[uuid.UUID] = None

class FinancialTransactionCreate(FinancialTransactionBase):
    pass

class FinancialTransaction(FinancialTransactionBase):
    id: uuid.UUID

    class Config:
        from_attributes = True

# --- Pricing Schemas ---
class ContractPricingRequest(BaseModel):
    """Schema for contract pricing requests"""
    prices: Optional[Dict[str, float]] = Field(None, description="Item ID to price mapping")
    status: Optional[PricingStatus] = Field(None, description="New pricing status")

class ContractPartialPricingRequest(BaseModel):
    """Schema for partial pricing requests"""
    item_id: str = Field(..., description="Contract item ID")
    qty_priced: float = Field(..., ge=0, description="Quantity being priced")
    market_price: float = Field(..., ge=0, description="Market price per unit")
    pricing_date: Optional[str] = Field(None, description="Pricing date (YYYY-MM-DD)")

class PricingResponse(BaseModel):
    """Standard response for pricing operations"""
    message: str
    success: bool = True

# --- Contract Views ---
class ContractViewBase(BaseModel):
    contract_id: uuid.UUID
    user_id: uuid.UUID
    viewed_at: datetime

class ContractViewCreate(ContractViewBase):
    pass

class ContractView(ContractViewBase):
    id: uuid.UUID
    user_name: Optional[str] = None  # For display purposes

    class Config:
        from_attributes = True

# --- Notifications ---
class NotificationBase(BaseModel):
    title: str
    message: str
    type: str
    related_id: Optional[uuid.UUID] = None
    is_read: bool = False

class NotificationCreate(NotificationBase):
    user_id: uuid.UUID

class Notification(NotificationBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationUpdate(BaseModel):
    is_read: Optional[bool] = None