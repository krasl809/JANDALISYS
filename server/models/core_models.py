from sqlalchemy import Column, Integer, String, Text, DateTime, Date, Boolean, ForeignKey, DECIMAL, Enum as SqlEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
import enum
from core.database import Base

# Note: ContractDirection enum was removed - direction field uses String directly

class Conveyor(Base):
    __tablename__ = "conveyors"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_name = Column(String(255), nullable=False)
    address = Column(Text)
    post_box = Column(String(100))
    tel = Column(String(50))
    fax = Column(String(50))
    email = Column(String(255))
    created_at = Column(DateTime, default=func.now())

class Broker(Base):
    __tablename__ = "brokers"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_name = Column(String(255), nullable=False)
    address = Column(Text)
    post_box = Column(String(100))
    tel = Column(String(50))
    fax = Column(String(50))
    email = Column(String(255))
    code = Column(String(50), nullable=True) 
    created_at = Column(DateTime, default=func.now())

class Agent(Base):
    __tablename__ = "agents"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_name = Column(String(255), nullable=False)
    address = Column(Text)
    phone = Column(String(50))
    email = Column(String(255))
    code = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=func.now())

class User(Base):
    __tablename__ = "users"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), default="user")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    language = Column(String(10), default="en")
    # employee_id removed - separate Employee table used now

class Buyer(Base):
    __tablename__ = "buyers"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_name = Column(String(255), nullable=False)
    address = Column(Text)
    post_box = Column(String(100))
    tel = Column(String(50))
    fax = Column(String(50))
    email = Column(String(255))
    created_at = Column(DateTime, default=func.now())

class Seller(Base):
    __tablename__ = "sellers"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_name = Column(String(255), nullable=False)
    address = Column(Text)
    post_box = Column(String(100))
    tel = Column(String(50))
    fax = Column(String(50))
    email = Column(String(255))
    seller_code = Column(String(4), unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now())

class Shipper(Base):
    __tablename__ = "shippers"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contact_name = Column(String(255), nullable=False)
    address = Column(Text)
    post_box = Column(String(100))
    tel = Column(String(50))
    fax = Column(String(50))
    email = Column(String(255))
    created_at = Column(DateTime, default=func.now())

class ExchangeQuoteUnit(Base):
    """
    Units used in market exchanges (e.g., CBOT, ICE) and their conversion factors to $/MT.
    Factor is what you multiply the quote by to get $/MT (if quote is in $/unit) 
    or what you use to convert quote to $/MT.
    """
    __tablename__ = "exchange_quote_units"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False) # e.g., cents/lb, $/short ton
    symbol = Column(String(20))
    factor = Column(DECIMAL(20, 10), nullable=False) # Factor to convert to MT
    description = Column(String(255))
    created_at = Column(DateTime, default=func.now())

class Article(Base):
    __tablename__ = "articles"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_name = Column(String(255), nullable=False)
    uom = Column(String(50), nullable=False)
    item_code = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now())

class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_no = Column(String(255), unique=True)
    
    # Contract direction (Export/Import) - uses String for simplicity
    direction = Column(String(20), default="export")

    status = Column(String(50), default="draft")
    issue_date = Column(Date, default=func.current_date())
    shipment_date = Column(Date, nullable=True)
    shipment_period = Column(String(255), nullable=True)
    payment_terms = Column(Text)
    incoterms = Column(Text)
    bank_details = Column(Text)
    insurance = Column(Text)
    marks = Column(Text)
    consignee = Column(Text)
    destination = Column(Text)
    documents = Column(Text)
    # Port of Loading (POL)
    port_of_loading = Column(Text)
    # Additional fields
    place_of_origin = Column(Text, nullable=True)
    place_of_delivery = Column(Text, nullable=True)
    contract_currency = Column(String(3), default="USD")
    pricing_status = Column(String(50), default="pending")

    seller_contract_ref_no = Column(String(255), nullable=True)
    seller_contract_date = Column(Date, nullable=True)
    actual_shipped_quantity = Column(DECIMAL(10, 2), default=0)
    vessel_name = Column(String(255), nullable=True)
    ata_date = Column(Date, nullable=True)
    ata_time = Column(String(10), nullable=True)

    contract_type = Column(String(50), default="fixed_price")
    demurrage_rate = Column(Text)
    discharge_rate = Column(Text)
    dispatch_rate = Column(Text)
    laycan_date_from = Column(Date)
    laycan_date_to = Column(Date)

    # Links
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True) # Default warehouse for reservation
    seller_id = Column(UUID(as_uuid=True), ForeignKey("sellers.id"))
    shipper_id = Column(UUID(as_uuid=True), ForeignKey("shippers.id"))
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("buyers.id"))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    broker_id = Column(UUID(as_uuid=True), ForeignKey("brokers.id"))
    conveyor_id = Column(UUID(as_uuid=True), ForeignKey("conveyors.id"))
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"))

    posted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    posted_date = Column(DateTime)
    modified_date = Column(DateTime, default=func.now(), onupdate=func.now())
    version = Column(Integer, default=1, nullable=False)

    finance_notified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    finance_notified_at = Column(DateTime)
    
    items = relationship("ContractItem", back_populates="contract", cascade="all, delete-orphan")
    seller = relationship("Seller")
    shipper = relationship("Shipper")
    buyer = relationship("Buyer")
    broker = relationship("Broker")
    conveyor = relationship("Conveyor")
    agent = relationship("Agent")
    warehouse = relationship("Warehouse")
    poster = relationship("User", foreign_keys=[posted_by])
    finance_notifier = relationship("User", foreign_keys=[finance_notified_by])
    creator = relationship("User", foreign_keys=[created_by])

    @property
    def created_by_name(self):
        return self.creator.name if self.creator else None

    @property
    def posted_by_name(self):
        return self.poster.name if self.poster else None

    @property
    def finance_notified_by_name(self):
        return self.finance_notifier.name if self.finance_notifier else None

class ContractItem(Base):
    __tablename__ = "contract_items"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"))
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"))
    
    quantity = Column(DECIMAL(10, 2))
    qty_lot = Column(DECIMAL(10, 2))
    qty_ton = Column(DECIMAL(10, 2))
    premium = Column(DECIMAL(10, 2))
    
    packing = Column(String(255))
    price = Column(DECIMAL(10, 2))
    total = Column(DECIMAL(10, 2))
    
    contract = relationship("Contract", back_populates="items")
    article = relationship("Article")
    specifications = relationship("ContractItemSpecification", back_populates="contract_item", cascade="all, delete-orphan")

    @property
    def article_name(self):
        return self.article.article_name if self.article else None

class PaymentTerm(Base):
    __tablename__ = "payment_terms"
    __table_args__ = {'extend_existing': True}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())

class Incoterm(Base):
    __tablename__ = "incoterms"
    __table_args__ = {'extend_existing': True}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(10), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=func.now())

class DocumentType(Base):
    __tablename__ = "document_types"
    __table_args__ = {'extend_existing': True}
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

# Enums for Inventory
class DeliveryNoteType(str, enum.Enum):
    INBOUND = "inbound"   # Receipt (From Supplier)
    OUTBOUND = "outbound" # Delivery (To Customer)
    TRANSFER = "transfer" # Internal

class DeliveryNoteStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# --- Inventory & Warehouse Models ---

class Warehouse(Base):
    __tablename__ = "warehouses"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    location = Column(Text)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    stock = relationship("Inventory", back_populates="warehouse")
    manager = relationship("User")

class Inventory(Base):
    """
    Represents Current Stock Level per Article per Warehouse
    (Snapshot Table)
    """
    __tablename__ = "inventory"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False)
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"), nullable=False)
    
    quantity_on_hand = Column(DECIMAL(10, 2), default=0)
    reserved_quantity = Column(DECIMAL(10, 2), default=0) # For committed sales
    
    # Min/Max for alerts
    min_stock = Column(DECIMAL(10, 2), default=0)
    max_stock = Column(DECIMAL(10, 2), default=0)

    warehouse = relationship("Warehouse", back_populates="stock")
    article = relationship("Article")

class DeliveryNote(Base):
    """
    The Document responsible for moving stock (Receipt, Delivery, Transfer)
    Linked to Contracts for commercial validation.
    """
    __tablename__ = "delivery_notes"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_number = Column(String(50), unique=True) # Auto-generated
    
    type = Column(String(20), nullable=False) # inbound, outbound, transfer
    status = Column(String(20), default="draft")
    date = Column(Date, default=func.current_date())
    
    # Links
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=True)
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=False) # Source or Destination depending on type
    target_warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"), nullable=True) # For Transfers
    
    # Parties (Denormalized for quick access, or derived from Contract)
    entity_id = Column(UUID(as_uuid=True), nullable=True) # Buyer ID or Seller ID
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    notes = Column(Text)
    
    items = relationship("DeliveryNoteItem", back_populates="note", cascade="all, delete-orphan")
    warehouse = relationship("Warehouse", foreign_keys=[warehouse_id])

class DeliveryNoteItem(Base):
    __tablename__ = "delivery_note_items"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("delivery_notes.id"))
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"))
    
    quantity = Column(DECIMAL(10, 2), nullable=False)
    batch_number = Column(String(50)) # Optional: for tracking batches
    
    note = relationship("DeliveryNote", back_populates="items")
    article = relationship("Article")

class StockMovement(Base):
    """
    The Ledger/Log of all movements (The History)
    Immutable table.
    """
    __tablename__ = "stock_movements"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(DateTime, default=func.now())
    
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id"))
    warehouse_id = Column(UUID(as_uuid=True), ForeignKey("warehouses.id"))
    
    movement_type = Column(String(10)) # 'IN' or 'OUT'
    quantity = Column(DECIMAL(10, 2)) # Always positive
    
    # Snapshot of stock after this move
    balance_after = Column(DECIMAL(10, 2)) 
    
    # Reference
    reference_type = Column(String(50)) # 'delivery_note', 'adjustment'
    reference_id = Column(UUID(as_uuid=True)) # e.g. DeliveryNote ID
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))

class ContractView(Base):
    __tablename__ = "contract_views"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    viewed_at = Column(DateTime, default=func.now())

    # Relationships
    contract = relationship("Contract", backref="views")
    user = relationship("User", backref="contract_views")

class FinancialTransaction(Base):
    __tablename__ = "financial_transactions"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)

    transaction_date = Column(Date, default=func.current_date())
    type = Column(String(50))  # Invoice, Payment, Debit Note, Credit Note, Partial Pricing
    description = Column(String(255))
    reference = Column(String(100)) # Invoice No or Check No

    amount = Column(DECIMAL(15, 2), nullable=False)
    is_credit = Column(Boolean, default=False) # True = Payment (Deduct), False = Invoice (Add)

    # New fields for partial pricing - to avoid parsing from description
    item_id = Column(UUID(as_uuid=True), ForeignKey("contract_items.id"), nullable=True)
    qty_priced = Column(DECIMAL(10, 2), nullable=True)  # Quantity priced in this transaction
    unit_price = Column(DECIMAL(10, 2), nullable=True)  # Market price at time of pricing

    # Linking payments to invoices
    linked_transaction_id = Column(UUID(as_uuid=True), ForeignKey("financial_transactions.id"), nullable=True)

    created_at = Column(DateTime, default=func.now())

    contract = relationship("Contract", backref="financial_ledger")
    item = relationship("ContractItem", backref="pricing_history")
    linked_transaction = relationship("FinancialTransaction", remote_side=[id], backref="linked_payments")

class BankAccount(Base):
    __tablename__ = "bank_accounts"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_name = Column(String(255), nullable=False)
    account_number = Column(String(100), nullable=False)
    bank_name = Column(String(255), nullable=False)
    currency = Column(String(3), default="USD")
    branch = Column(String(255), nullable=True)
    swift_code = Column(String(20), nullable=True)
    iban = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())

class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # contract_created, contract_updated, contract_viewed, etc.
    related_id = Column(UUID(as_uuid=True), nullable=True)  # Contract ID or other related entity ID
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())

    # Relationships
    user = relationship("User", backref="notifications")

class ContractDocument(Base):
    __tablename__ = "contract_documents"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    document_type_id = Column(UUID(as_uuid=True), ForeignKey("document_types.id"), nullable=True)

    # File information
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)

    # Document metadata
    document_number = Column(String(100))  # Invoice number, certificate number, etc.
    description = Column(Text)
    expiry_date = Column(Date)  # For certificates, licenses, etc.

    # Status and tracking
    is_required = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    verified_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    verified_at = Column(DateTime)

    # Audit fields
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=func.now())
    modified_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    contract = relationship("Contract")
    document_type = relationship("DocumentType")
    uploader = relationship("User", foreign_keys=[uploaded_by])
    verifier = relationship("User", foreign_keys=[verified_by])

class ContractItemSpecification(Base):
    __tablename__ = "contract_item_specifications"
    __table_args__ = {'extend_existing': True}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_item_id = Column(UUID(as_uuid=True), ForeignKey("contract_items.id"), nullable=False)
    
    spec_key = Column(String(255), nullable=False) # e.g., Moisture, Protein
    spec_value = Column(String(255), nullable=False) # e.g., Max. 14%, min 7.3%
    
    display_order = Column(Integer, default=0)
    
    contract_item = relationship("ContractItem", back_populates="specifications")