-- PostgreSQL 15+ Schema for Templegate Accounts Payable (AP) Automation Software

CREATE TABLE IF NOT EXISTS core_vendor (
    id BIGSERIAL PRIMARY KEY,
    vendor_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    category VARCHAR(100) NOT NULL DEFAULT 'General Supplier',
    contact_person VARCHAR(150),
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(30),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    gstin VARCHAR(20),
    pan VARCHAR(20),
    gst_verified BOOLEAN NOT NULL DEFAULT FALSE,
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    account_type VARCHAR(30) NOT NULL DEFAULT 'Current',
    bank_verified BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_purchaseorder (
    id BIGSERIAL PRIMARY KEY,
    po_number VARCHAR(60) NOT NULL UNIQUE,
    vendor_id BIGINT NOT NULL REFERENCES core_vendor(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_date DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    payment_terms VARCHAR(100) NOT NULL DEFAULT 'Net 30',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_purchaseorderitem (
    id BIGSERIAL PRIMARY KEY,
    po_id BIGINT NOT NULL REFERENCES core_purchaseorder(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL DEFAULT 1,
    item_code VARCHAR(60),
    description VARCHAR(255) NOT NULL,
    hsn_sac VARCHAR(20),
    quantity_ordered NUMERIC(10, 2) NOT NULL,
    quantity_received NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quantity_billed NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
    unit_price NUMERIC(12, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    total_amount NUMERIC(14, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS core_goodsreceiptnote (
    id BIGSERIAL PRIMARY KEY,
    grn_number VARCHAR(60) NOT NULL UNIQUE,
    po_id BIGINT NOT NULL REFERENCES core_purchaseorder(id) ON DELETE CASCADE,
    vendor_id BIGINT NOT NULL REFERENCES core_vendor(id) ON DELETE CASCADE,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    delivery_challan_no VARCHAR(80),
    received_by VARCHAR(120) NOT NULL DEFAULT 'Warehouse Officer',
    warehouse_location VARCHAR(120) NOT NULL DEFAULT 'Bangalore Central Hub',
    status VARCHAR(30) NOT NULL DEFAULT 'VERIFIED',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_goodsreceiptnoteitem (
    id BIGSERIAL PRIMARY KEY,
    grn_id BIGINT NOT NULL REFERENCES core_goodsreceiptnote(id) ON DELETE CASCADE,
    po_item_id BIGINT REFERENCES core_purchaseorderitem(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity_received NUMERIC(10, 2) NOT NULL,
    quantity_accepted NUMERIC(10, 2) NOT NULL,
    quantity_rejected NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    inspection_remarks VARCHAR(255) NOT NULL DEFAULT 'Quality Inspected'
);

CREATE TABLE IF NOT EXISTS core_invoice (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(80),
    vendor_id BIGINT REFERENCES core_vendor(id) ON DELETE SET NULL,
    vendor_name_raw VARCHAR(255),
    po_id BIGINT REFERENCES core_purchaseorder(id) ON DELETE SET NULL,
    grn_id BIGINT REFERENCES core_goodsreceiptnote(id) ON DELETE SET NULL,
    invoice_date DATE,
    due_date DATE,
    payment_terms VARCHAR(60) NOT NULL DEFAULT 'Net 30',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    sgst NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    igst NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    file VARCHAR(255),
    file_name VARCHAR(255),
    file_type VARCHAR(30) NOT NULL DEFAULT 'PDF',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    source VARCHAR(30) NOT NULL DEFAULT 'MANUAL_UPLOAD',
    ocr_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ocr_confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    ocr_raw_text TEXT,
    ocr_extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
    gst_validated BOOLEAN NOT NULL DEFAULT FALSE,
    amount_validated BOOLEAN NOT NULL DEFAULT FALSE,
    vendor_validated BOOLEAN NOT NULL DEFAULT FALSE,
    matching_type VARCHAR(30) NOT NULL DEFAULT 'THREE_WAY',
    matching_status VARCHAR(30) NOT NULL DEFAULT 'UNMATCHED',
    matching_discrepancy_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    approval_tier VARCHAR(20) NOT NULL DEFAULT 'TIER_1',
    approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
    current_approver_role VARCHAR(30) NOT NULL DEFAULT 'AP_CLERK',
    is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_reason TEXT,
    escalated_at TIMESTAMP WITH TIME ZONE,
    payment_status VARCHAR(30) NOT NULL DEFAULT 'UNPAID',
    payment_scheduled_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_invoicelineitem (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES core_invoice(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL DEFAULT 1,
    item_description VARCHAR(255) NOT NULL,
    hsn_sac VARCHAR(20),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_of_measure VARCHAR(30) NOT NULL DEFAULT 'PCS',
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    matched_po_item_id INTEGER
);

CREATE TABLE IF NOT EXISTS core_workflowapprovalaction (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES core_invoice(id) ON DELETE CASCADE,
    approver_name VARCHAR(120) NOT NULL,
    approver_role VARCHAR(60) NOT NULL,
    action VARCHAR(40) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'TIER_1',
    comments TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_paymentrecord (
    id BIGSERIAL PRIMARY KEY,
    payment_reference VARCHAR(80) NOT NULL UNIQUE,
    invoice_id BIGINT NOT NULL REFERENCES core_invoice(id) ON DELETE CASCADE,
    vendor_id BIGINT NOT NULL REFERENCES core_vendor(id) ON DELETE CASCADE,
    amount_paid NUMERIC(14, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(30) NOT NULL DEFAULT 'NEFT',
    transaction_utr VARCHAR(100),
    bank_batch_id VARCHAR(80),
    status VARCHAR(30) NOT NULL DEFAULT 'SETTLED',
    beneficiary_account VARCHAR(50),
    beneficiary_ifsc VARCHAR(20),
    notes TEXT,
    payment_advice_generated BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core_auditlog (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT REFERENCES core_invoice(id) ON DELETE SET NULL,
    vendor_id BIGINT REFERENCES core_vendor(id) ON DELETE SET NULL,
    action_type VARCHAR(40) NOT NULL,
    actor_name VARCHAR(120) NOT NULL DEFAULT 'System Automation',
    actor_role VARCHAR(60) NOT NULL DEFAULT 'System',
    ip_address VARCHAR(50) NOT NULL DEFAULT '127.0.0.1',
    description TEXT NOT NULL,
    delta_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_vendor ON core_invoice(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON core_invoice(approval_status);
CREATE INDEX IF NOT EXISTS idx_invoice_payment ON core_invoice(payment_status);
CREATE INDEX IF NOT EXISTS idx_lineitem_invoice ON core_invoicelineitem(invoice_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON core_auditlog(timestamp DESC);
