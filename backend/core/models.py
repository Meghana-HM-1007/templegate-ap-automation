import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone


class Vendor(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING_REVIEW', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('ACTIVE', 'Active'),
        ('SUSPENDED', 'Suspended'),
    ]

    vendor_code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    trade_name = models.CharField(max_length=255, blank=True, null=True)
    category = models.CharField(max_length=100, default='General Supplier')
    contact_person = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, default='India')

    # Tax & Compliance
    gstin = models.CharField(max_length=20, blank=True, null=True, help_text="15-character GSTIN/TIN")
    pan = models.CharField(max_length=20, blank=True, null=True)
    gst_verified = models.BooleanField(default=False)

    # Banking Details
    bank_name = models.CharField(max_length=150, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    ifsc_code = models.CharField(max_length=20, blank=True, null=True)
    account_type = models.CharField(max_length=30, default='Current')
    bank_verified = models.BooleanField(default=False)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='ACTIVE')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.vendor_code} - {self.name}"


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('PARTIALLY_RECEIVED', 'Partially Received'),
        ('FULLY_RECEIVED', 'Fully Received'),
        ('BILLED', 'Billed'),
        ('CLOSED', 'Closed'),
        ('CANCELLED', 'Cancelled'),
    ]

    po_number = models.CharField(max_length=60, unique=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders')
    issue_date = models.DateField(default=timezone.now)
    delivery_date = models.DateField(blank=True, null=True)
    currency = models.CharField(max_length=10, default='INR')
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='OPEN')
    payment_terms = models.CharField(max_length=100, default='Net 30')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.po_number} - {self.vendor.name}"


class PurchaseOrderItem(models.Model):
    po = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    line_number = models.PositiveIntegerField(default=1)
    item_code = models.CharField(max_length=60, blank=True, null=True)
    description = models.CharField(max_length=255)
    hsn_sac = models.CharField(max_length=20, blank=True, null=True)
    quantity_ordered = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_received = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    quantity_billed = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    unit_of_measure = models.CharField(max_length=30, default='PCS')
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2)

    def __str__(self):
        return f"{self.po.po_number} Item {self.line_number}: {self.description}"


class GoodsReceiptNote(models.Model):
    STATUS_CHOICES = [
        ('RECEIVED', 'Received'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
    ]

    grn_number = models.CharField(max_length=60, unique=True)
    po = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='grns')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='grns')
    received_date = models.DateField(default=timezone.now)
    delivery_challan_no = models.CharField(max_length=80, blank=True, null=True)
    received_by = models.CharField(max_length=120, default='Warehouse Officer')
    warehouse_location = models.CharField(max_length=120, default='Bangalore Central Hub')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='VERIFIED')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.grn_number} for PO {self.po.po_number}"


class GoodsReceiptNoteItem(models.Model):
    grn = models.ForeignKey(GoodsReceiptNote, on_delete=models.CASCADE, related_name='items')
    po_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255)
    quantity_received = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_accepted = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_rejected = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    inspection_remarks = models.CharField(max_length=255, default='Inspected & quality verified')

    def __str__(self):
        return f"{self.grn.grn_number} - {self.description}"


class Invoice(models.Model):
    SOURCE_CHOICES = [
        ('MANUAL_UPLOAD', 'Manual Upload'),
        ('BULK_UPLOAD', 'Bulk Upload'),
        ('EMAIL_INGESTION', 'Email Ingestion'),
        ('DRAG_DROP', 'Drag & Drop'),
    ]

    OCR_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('SUCCESS', 'Success'),
        ('PARTIAL', 'Partial Extraction'),
        ('FAILED', 'Failed'),
    ]

    VALIDATION_STATUS_CHOICES = [
        ('PENDING', 'Pending Validation'),
        ('PASSED', 'Passed'),
        ('WARNING', 'Warning / Discrepancy'),
        ('FAILED', 'Failed Validation'),
    ]

    MATCHING_TYPE_CHOICES = [
        ('NONE', 'No PO Required'),
        ('TWO_WAY', '2-Way Match (PO vs Invoice)'),
        ('THREE_WAY', '3-Way Match (PO vs GRN vs Invoice)'),
    ]

    MATCHING_STATUS_CHOICES = [
        ('UNMATCHED', 'Unmatched'),
        ('MATCHED', 'Fully Matched'),
        ('DISCREPANCY', 'Discrepancy Detected'),
        ('OVERRIDDEN', 'Manually Overridden'),
    ]

    APPROVAL_STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING_APPROVAL', 'Pending Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('ESCALATED', 'Escalated'),
        ('ON_HOLD', 'On Hold'),
    ]

    ROLE_CHOICES = [
        ('AP_CLERK', 'AP Clerk'),
        ('AP_MANAGER', 'AP Manager'),
        ('FINANCE_DIRECTOR', 'Finance Director'),
        ('CFO', 'CFO'),
        ('COMPLETED', 'Approval Completed'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('UNPAID', 'Unpaid'),
        ('SCHEDULED', 'Scheduled'),
        ('PROCESSING', 'Processing in Bank'),
        ('PAID', 'Paid'),
        ('FAILED', 'Failed'),
    ]

    invoice_number = models.CharField(max_length=80, blank=True, null=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    vendor_name_raw = models.CharField(max_length=255, blank=True, null=True)
    po = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    grn = models.ForeignKey(GoodsReceiptNote, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')

    # Dates
    invoice_date = models.DateField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    payment_terms = models.CharField(max_length=60, default='Net 30')

    # Financials
    currency = models.CharField(max_length=10, default='INR')
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    cgst = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    sgst = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    igst = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))

    # Upload & File details
    file = models.FileField(upload_to='invoices/%Y/%m/%d/', blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_type = models.CharField(max_length=30, default='PDF')
    file_size_bytes = models.BigIntegerField(default=0)
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES, default='MANUAL_UPLOAD')

    # OCR extraction
    ocr_status = models.CharField(max_length=30, choices=OCR_STATUS_CHOICES, default='PENDING')
    ocr_confidence_score = models.FloatField(default=0.0)
    ocr_raw_text = models.TextField(blank=True, null=True)
    ocr_extracted_data = models.JSONField(default=dict, blank=True)

    # Validation Engine
    validation_status = models.CharField(max_length=30, choices=VALIDATION_STATUS_CHOICES, default='PENDING')
    validation_errors = models.JSONField(default=list, blank=True)
    is_duplicate = models.BooleanField(default=False)
    gst_validated = models.BooleanField(default=False)
    amount_validated = models.BooleanField(default=False)
    vendor_validated = models.BooleanField(default=False)

    # PO Matching Module
    matching_type = models.CharField(max_length=30, choices=MATCHING_TYPE_CHOICES, default='THREE_WAY')
    matching_status = models.CharField(max_length=30, choices=MATCHING_STATUS_CHOICES, default='UNMATCHED')
    matching_discrepancy_details = models.JSONField(default=dict, blank=True)

    # Workflow & Approvals
    approval_tier = models.CharField(max_length=20, default='TIER_1')
    approval_status = models.CharField(max_length=30, choices=APPROVAL_STATUS_CHOICES, default='PENDING_APPROVAL')
    current_approver_role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='AP_CLERK')
    is_escalated = models.BooleanField(default=False)
    escalation_reason = models.TextField(blank=True, null=True)
    escalated_at = models.DateTimeField(blank=True, null=True)

    # Payment module
    payment_status = models.CharField(max_length=30, choices=PAYMENT_STATUS_CHOICES, default='UNPAID')
    payment_scheduled_date = models.DateField(blank=True, null=True)

    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_approval_tier(self):
        """Calculates Tier based on amount"""
        amount = self.grand_total or Decimal('0.00')
        if amount < Decimal('50000.00'):
            return 'TIER_1', 'AP_CLERK'
        elif amount <= Decimal('200000.00'):
            return 'TIER_2', 'AP_MANAGER'
        else:
            return 'TIER_3', 'FINANCE_DIRECTOR'

    def __str__(self):
        return f"Invoice {self.invoice_number or 'Draft'} - {self.vendor_name_raw or (self.vendor.name if self.vendor else 'Unknown')}"


class InvoiceLineItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='line_items')
    line_number = models.PositiveIntegerField(default=1)
    item_description = models.CharField(max_length=255)
    hsn_sac = models.CharField(max_length=20, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.00'))
    unit_of_measure = models.CharField(max_length=30, default='PCS')
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('18.00'))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    matched_po_item_id = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return f"Line {self.line_number}: {self.item_description} ({self.total_amount})"


class WorkflowApprovalAction(models.Model):
    ACTION_CHOICES = [
        ('SUBMITTED', 'Submitted for Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('ESCALATED', 'Escalated'),
        ('CLARIFICATION_REQUESTED', 'Clarification Requested'),
        ('ON_HOLD', 'Placed on Hold'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='approval_history')
    approver_name = models.CharField(max_length=120)
    approver_role = models.CharField(max_length=60)
    action = models.CharField(max_length=40, choices=ACTION_CHOICES)
    tier = models.CharField(max_length=20, default='TIER_1')
    comments = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.action} by {self.approver_name}"


class PaymentRecord(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('NEFT', 'NEFT - National Electronic Fund Transfer'),
        ('RTGS', 'RTGS - Real Time Gross Settlement'),
        ('IMPS', 'IMPS - Immediate Payment Service'),
        ('ACH', 'Automated Clearing House'),
        ('WIRE', 'Wire Transfer'),
        ('CHECK', 'Corporate Cheque'),
    ]

    STATUS_CHOICES = [
        ('INITIATED', 'Payment Initiated'),
        ('PROCESSING', 'Processing with Bank Gateway'),
        ('SETTLED', 'Settled / Paid'),
        ('FAILED', 'Payment Failed'),
    ]

    payment_reference = models.CharField(max_length=80, unique=True)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='payments')
    amount_paid = models.DecimalField(max_digits=14, decimal_places=2)
    payment_date = models.DateField(default=timezone.now)
    payment_method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES, default='NEFT')
    transaction_utr = models.CharField(max_length=100, blank=True, null=True, help_text="Bank UTR Number")
    bank_batch_id = models.CharField(max_length=80, blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SETTLED')
    beneficiary_account = models.CharField(max_length=50, blank=True, null=True)
    beneficiary_ifsc = models.CharField(max_length=20, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    payment_advice_generated = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment_reference} - {self.vendor.name} ({self.amount_paid})"


class AuditLog(models.Model):
    ACTION_TYPE_CHOICES = [
        ('UPLOAD', 'Invoice Uploaded'),
        ('OCR_EXTRACT', 'OCR AI Extraction'),
        ('VALIDATION', 'Validation Checks Run'),
        ('PO_MATCH', 'PO Matching Executed'),
        ('APPROVAL', 'Approval Action'),
        ('ESCALATION', 'Invoice Escalated'),
        ('PAYMENT', 'Payment Processed'),
        ('VENDOR_UPDATE', 'Vendor Updated'),
        ('SYSTEM_RULE', 'Rule Triggered'),
    ]

    invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    vendor = models.ForeignKey(Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action_type = models.CharField(max_length=40, choices=ACTION_TYPE_CHOICES)
    actor_name = models.CharField(max_length=120, default='System Automation')
    actor_role = models.CharField(max_length=60, default='System')
    ip_address = models.CharField(max_length=50, default='127.0.0.1')
    description = models.TextField()
    delta_snapshot = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.action_type}: {self.description[:50]}"


class ApprovalMatrixRule(models.Model):
    tier_name = models.CharField(max_length=50) # e.g. Tier 1 - Low Value
    min_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    max_amount = models.DecimalField(max_digits=14, decimal_places=2) # e.g. 50000.00
    approver_role = models.CharField(max_length=50) # AP_CLERK, AP_MANAGER, FINANCE_DIRECTOR
    sla_hours = models.IntegerField(default=24)
    auto_escalate = models.BooleanField(default=True)
    escalate_to_role = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.tier_name}: {self.min_amount} - {self.max_amount} -> {self.approver_role}"
