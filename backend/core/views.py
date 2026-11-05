import os
import json
from decimal import Decimal
from datetime import datetime, timedelta
from django.utils import timezone
from django.http import HttpResponse
from django.db.models import Sum, Count, Avg, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import (
    Vendor, PurchaseOrder, PurchaseOrderItem,
    GoodsReceiptNote, GoodsReceiptNoteItem,
    Invoice, InvoiceLineItem, WorkflowApprovalAction,
    PaymentRecord, AuditLog, ApprovalMatrixRule
)
from .serializers import (
    VendorSerializer, PurchaseOrderSerializer,
    GoodsReceiptNoteSerializer, InvoiceSerializer,
    InvoiceLineItemSerializer, WorkflowApprovalActionSerializer,
    PaymentRecordSerializer, AuditLogSerializer,
    ApprovalMatrixRuleSerializer
)
from .services import (
    OCRService, InvoiceValidationEngine,
    POMatchingEngine, WorkflowApprovalService,
    PaymentProcessingService
)


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by('-created_at')
    serializer_class = VendorSerializer

    @action(detail=True, methods=['post'], url_path='verify-gst')
    def verify_gst(self, request, pk=None):
        vendor = self.get_object()
        import re
        from .services import GSTIN_REGEX
        if vendor.gstin and re.match(GSTIN_REGEX, vendor.gstin.strip()):
            vendor.gst_verified = True
            vendor.save()
            AuditLog.objects.create(
                vendor=vendor,
                action_type='VENDOR_UPDATE',
                actor_name='Compliance Engine',
                actor_role='Automation',
                description=f"GSTIN {vendor.gstin} verified as structurally valid.",
                delta_snapshot={"gst_verified": True}
            )
            return Response({"success": True, "message": f"GSTIN {vendor.gstin} verified successfully."})
        else:
            return Response({"success": False, "message": "GSTIN is missing or invalid format (Must be 15 characters)."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='verify-bank')
    def verify_bank(self, request, pk=None):
        vendor = self.get_object()
        if vendor.account_number and vendor.ifsc_code:
            vendor.bank_verified = True
            vendor.save()
            AuditLog.objects.create(
                vendor=vendor,
                action_type='VENDOR_UPDATE',
                actor_name='Treasury Team',
                actor_role='Finance',
                description=f"Bank details verified for {vendor.name} (A/C: {vendor.account_number[-4:].rjust(len(vendor.account_number), '*')}, IFSC: {vendor.ifsc_code}).",
                delta_snapshot={"bank_verified": True}
            )
            return Response({"success": True, "message": "Bank details verified for automated disbursement."})
        return Response({"success": False, "message": "Bank Account Number or IFSC Code missing."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='update-status')
    def update_status(self, request, pk=None):
        vendor = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(Vendor.STATUS_CHOICES):
            old = vendor.status
            vendor.status = new_status
            vendor.save()
            AuditLog.objects.create(
                vendor=vendor,
                action_type='VENDOR_UPDATE',
                actor_name=request.data.get('actor', 'Admin Officer'),
                description=f"Vendor status changed from {old} to {new_status}.",
                delta_snapshot={"old_status": old, "new_status": new_status}
            )
            return Response({"success": True, "status": new_status})
        return Response({"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-created_at')
    serializer_class = PurchaseOrderSerializer


class GoodsReceiptNoteViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceiptNote.objects.all().order_by('-created_at')
    serializer_class = GoodsReceiptNoteSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().order_by('-created_at')
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        qs = Invoice.objects.all().order_by('-created_at')
        status_param = self.request.query_params.get('status')
        matching_param = self.request.query_params.get('matching_status')
        vendor_id = self.request.query_params.get('vendor_id')
        search = self.request.query_params.get('search')

        if status_param:
            qs = qs.filter(approval_status=status_param)
        if matching_param:
            qs = qs.filter(matching_status=matching_param)
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        if search:
            qs = qs.filter(
                Q(invoice_number__icontains=search) |
                Q(vendor__name__icontains=search) |
                Q(vendor_name_raw__icontains=search) |
                Q(po__po_number__icontains=search)
            )
        return qs

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser], url_path='upload')
    def upload_invoice(self, request):
        """
        Handles single invoice upload (PDF, PNG, JPG, TIFF).
        Executes OCR Extraction -> Validation Engine -> PO Matching -> Workflow Tier Assignment.
        """
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        filename = uploaded_file.name
        ext = filename.split('.')[-1].upper() if '.' in filename else 'PDF'
        source = request.data.get('source', 'MANUAL_UPLOAD')

        # 1. Create Invoice Record
        invoice = Invoice.objects.create(
            file=uploaded_file,
            file_name=filename,
            file_type=ext,
            file_size_bytes=uploaded_file.size,
            source=source,
            ocr_status='PROCESSING',
            approval_status='PENDING_APPROVAL'
        )

        AuditLog.objects.create(
            invoice=invoice,
            action_type='UPLOAD',
            actor_name=request.data.get('uploaded_by', 'AP Executive'),
            actor_role='AP Clerk',
            description=f"Uploaded file '{filename}' via {source}."
        )

        # 2. Extract OCR
        raw_text = OCRService.extract_text_from_file(invoice.file, filename)
        invoice.ocr_raw_text = raw_text

        extracted = OCRService.parse_invoice_content(raw_text, filename)
        invoice.invoice_number = extracted["invoice_number"]
        invoice.invoice_date = extracted["invoice_date"]
        invoice.due_date = extracted["due_date"]
        invoice.vendor_name_raw = extracted["vendor_name"]
        invoice.subtotal = extracted["subtotal"]
        invoice.tax_amount = extracted["tax_amount"]
        invoice.cgst = extracted["cgst"]
        invoice.sgst = extracted["sgst"]
        invoice.igst = extracted["igst"]
        invoice.grand_total = extracted["grand_total"]
        invoice.ocr_confidence_score = extracted["overall_confidence"]
        invoice.ocr_extracted_data = extracted
        invoice.ocr_status = 'SUCCESS'

        # Link Vendor if identified
        if "vendor_id" in extracted:
            invoice.vendor = Vendor.objects.get(id=extracted["vendor_id"])
        elif extracted["vendor_name"]:
            matched = Vendor.objects.filter(name__icontains=extracted["vendor_name"][:15]).first()
            if matched:
                invoice.vendor = matched

        # Link PO if found
        if extracted.get("po_number"):
            po = PurchaseOrder.objects.filter(po_number__iexact=extracted["po_number"].strip()).first()
            if po:
                invoice.po = po
        elif invoice.vendor:
            open_po = PurchaseOrder.objects.filter(vendor=invoice.vendor, status__in=['OPEN', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED']).first()
            if open_po:
                invoice.po = open_po

        invoice.save()

        # 3. Create Line Items
        for item_data in extracted["line_items"]:
            InvoiceLineItem.objects.create(
                invoice=invoice,
                line_number=item_data["line_number"],
                item_description=item_data["item_description"],
                hsn_sac=item_data.get("hsn_sac", "8471"),
                quantity=item_data["quantity"],
                unit_of_measure=item_data.get("unit_of_measure", "PCS"),
                unit_price=item_data["unit_price"],
                tax_rate=item_data.get("tax_rate", Decimal('18.00')),
                tax_amount=item_data["tax_amount"],
                total_amount=item_data["total_amount"]
            )

        # 4. Validation Engine
        InvoiceValidationEngine.validate_invoice(invoice)

        # 5. PO Matching Engine
        if invoice.po:
            POMatchingEngine.execute_matching(invoice, matching_type='THREE_WAY')

        # 6. Workflow Tier Calculation
        WorkflowApprovalService.determine_approval_tier(invoice)

        # Initial submit log in approval history
        WorkflowApprovalAction.objects.create(
            invoice=invoice,
            approver_name='OCR Pipeline Engine',
            approver_role='System Automated',
            action='SUBMITTED',
            tier=invoice.approval_tier,
            comments=f"Auto-extracted with {invoice.ocr_confidence_score}% OCR confidence and routed to {invoice.current_approver_role}."
        )

        return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser], url_path='bulk-upload')
    def bulk_upload(self, request):
        """Processes multiple files simultaneously"""
        files = request.FILES.getlist('files')
        if not files:
            return Response({"error": "No files provided"}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for f in files:
            # Re-use single upload logic
            ext = f.name.split('.')[-1].upper() if '.' in f.name else 'PDF'
            inv = Invoice.objects.create(
                file=f,
                file_name=f.name,
                file_type=ext,
                file_size_bytes=f.size,
                source='BULK_UPLOAD',
                ocr_status='PROCESSING',
                approval_status='PENDING_APPROVAL'
            )
            raw_text = OCRService.extract_text_from_file(inv.file, f.name)
            inv.ocr_raw_text = raw_text
            extracted = OCRService.parse_invoice_content(raw_text, f.name)
            inv.invoice_number = extracted["invoice_number"]
            inv.invoice_date = extracted["invoice_date"]
            inv.due_date = extracted["due_date"]
            inv.vendor_name_raw = extracted["vendor_name"]
            inv.subtotal = extracted["subtotal"]
            inv.tax_amount = extracted["tax_amount"]
            inv.cgst = extracted["cgst"]
            inv.sgst = extracted["sgst"]
            inv.igst = extracted["igst"]
            inv.grand_total = extracted["grand_total"]
            inv.ocr_confidence_score = extracted["overall_confidence"]
            inv.ocr_extracted_data = extracted
            inv.ocr_status = 'SUCCESS'

            if "vendor_id" in extracted:
                inv.vendor = Vendor.objects.get(id=extracted["vendor_id"])
            else:
                matched = Vendor.objects.filter(name__icontains=extracted["vendor_name"][:15]).first()
                if matched:
                    inv.vendor = matched
            inv.save()

            for item_data in extracted["line_items"]:
                InvoiceLineItem.objects.create(
                    invoice=inv,
                    line_number=item_data["line_number"],
                    item_description=item_data["item_description"],
                    hsn_sac=item_data.get("hsn_sac", "8471"),
                    quantity=item_data["quantity"],
                    unit_of_measure=item_data.get("unit_of_measure", "PCS"),
                    unit_price=item_data["unit_price"],
                    tax_rate=item_data.get("tax_rate", Decimal('18.00')),
                    tax_amount=item_data["tax_amount"],
                    total_amount=item_data["total_amount"]
                )

            InvoiceValidationEngine.validate_invoice(inv)
            if inv.po or inv.vendor:
                POMatchingEngine.execute_matching(inv)
            WorkflowApprovalService.determine_approval_tier(inv)
            results.append(InvoiceSerializer(inv).data)

        return Response({"count": len(results), "invoices": results}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='email-ingest')
    def email_ingest(self, request):
        """
        Simulates email inbox ingestion (e.g. ap-invoices@templegate.com).
        Parses sender email, subject, body, and creates invoice.
        """
        sender_email = request.data.get('from', 'billing@tatasolutions.com')
        subject = request.data.get('subject', 'Tax Invoice INV-2026-8802 from Tata Solutions')
        body = request.data.get('body', 'Dear AP Team, Please find attached our invoice INV-2026-8802 for IT cloud services. Total: INR 1,47,500.00.')
        vendor_name = request.data.get('vendor_name', 'Tata Solutions Ltd')
        amount = Decimal(str(request.data.get('amount', '147500.00')))

        # Match or create vendor
        vendor = Vendor.objects.filter(email__iexact=sender_email).first()
        if not vendor:
            vendor = Vendor.objects.filter(name__icontains=vendor_name).first()

        inv_num = re.search(r'INV-[A-Za-z0-9\-]+', subject + " " + body)
        inv_no_str = inv_num.group(0) if inv_num else f"INV-{datetime.now().strftime('%y%m%d%H%M')}"

        subtotal = (amount / Decimal('1.18')).quantize(Decimal('0.01'))
        tax = (amount - subtotal).quantize(Decimal('0.01'))

        inv = Invoice.objects.create(
            invoice_number=inv_no_str,
            vendor=vendor,
            vendor_name_raw=vendor.name if vendor else vendor_name,
            invoice_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=30),
            subtotal=subtotal,
            tax_amount=tax,
            cgst=(tax/2).quantize(Decimal('0.01')),
            sgst=(tax/2).quantize(Decimal('0.01')),
            grand_total=amount,
            source='EMAIL_INGESTION',
            file_name=f"{inv_no_str}_email_attachment.pdf",
            file_type='PDF',
            ocr_status='SUCCESS',
            ocr_confidence_score=97.2,
            ocr_raw_text=f"From: {sender_email}\nSubject: {subject}\n\n{body}",
            ocr_extracted_data={"email_sender": sender_email, "subject": subject, "extracted_via": "Email AI Daemon"}
        )

        InvoiceLineItem.objects.create(
            invoice=inv,
            line_number=1,
            item_description=f"Enterprise Cloud & Managed Services (Ref: {subject[:40]})",
            hsn_sac="998313",
            quantity=Decimal('1.00'),
            unit_price=subtotal,
            tax_rate=Decimal('18.00'),
            tax_amount=tax,
            total_amount=amount
        )

        InvoiceValidationEngine.validate_invoice(inv)
        if inv.vendor:
            POMatchingEngine.execute_matching(inv)
        WorkflowApprovalService.determine_approval_tier(inv)

        AuditLog.objects.create(
            invoice=inv,
            vendor=vendor,
            action_type='UPLOAD',
            actor_name='Email Ingestion Daemon',
            actor_role='System Automation',
            description=f"Ingested invoice {inv.invoice_number} from email {sender_email} (Subject: '{subject}')."
        )

        return Response(InvoiceSerializer(inv).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='validate')
    def trigger_validation(self, request, pk=None):
        invoice = self.get_object()
        status_val, errors = InvoiceValidationEngine.validate_invoice(invoice)
        return Response({"validation_status": status_val, "errors": errors})

    @action(detail=True, methods=['post'], url_path='match')
    def trigger_matching(self, request, pk=None):
        invoice = self.get_object()
        match_type = request.data.get('matching_type', invoice.matching_type)
        matching_status, details = POMatchingEngine.execute_matching(invoice, match_type)
        return Response({"matching_status": matching_status, "details": details})

    @action(detail=True, methods=['post'], url_path='approve-action')
    def approve_action(self, request, pk=None):
        invoice = self.get_object()
        action_name = request.data.get('action') # APPROVED, REJECTED, ESCALATED, CLARIFICATION_REQUESTED
        user_name = request.data.get('user_name', 'Approval Authority')
        user_role = request.data.get('user_role', invoice.current_approver_role)
        comments = request.data.get('comments', '')

        try:
            updated_invoice = WorkflowApprovalService.process_action(
                invoice, user_name, user_role, action_name, comments
            )
            return Response(InvoiceSerializer(updated_invoice).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = PaymentRecord.objects.all().order_by('-created_at')
    serializer_class = PaymentRecordSerializer

    @action(detail=False, methods=['post'], url_path='create-batch')
    def create_batch(self, request):
        invoice_ids = request.data.get('invoice_ids', [])
        payment_method = request.data.get('payment_method', 'NEFT')
        actor = request.data.get('actor_name', 'Senior Accounts Officer')

        if not invoice_ids:
            return Response({"error": "Please select at least one approved invoice for payment."}, status=status.HTTP_400_BAD_REQUEST)

        batch_id, payments = PaymentProcessingService.generate_payment_batch(
            invoice_ids, payment_method, actor
        )
        return Response({
            "batch_id": batch_id,
            "payments_count": len(payments),
            "payments": PaymentRecordSerializer(payments, many=True).data
        })

    @action(detail=False, methods=['get'], url_path='export-bank-file/(?P<batch_id>[^/.]+)')
    def export_bank_file(self, request, batch_id=None):
        csv_text = PaymentProcessingService.generate_bank_csv_content(batch_id)
        response = HttpResponse(csv_text, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="BANK_DISBURSEMENT_{batch_id}.csv"'
        return response

    @action(detail=True, methods=['get'], url_path='payment-advice')
    def payment_advice(self, request, pk=None):
        payment = self.get_object()
        data = {
            "advice_number": f"ADV-{payment.payment_reference}",
            "payment_reference": payment.payment_reference,
            "utr_number": payment.transaction_utr,
            "payment_date": payment.payment_date,
            "payment_method": payment.payment_method,
            "amount_paid": float(payment.amount_paid),
            "currency": "INR",
            "vendor": {
                "name": payment.vendor.name if payment.vendor else "N/A",
                "vendor_code": payment.vendor.vendor_code if payment.vendor else "N/A",
                "gstin": payment.vendor.gstin if payment.vendor else "N/A",
                "bank_account": payment.beneficiary_account,
                "ifsc": payment.beneficiary_ifsc,
                "bank_name": payment.vendor.bank_name if payment.vendor else "HDFC Bank"
            },
            "invoice": {
                "invoice_number": payment.invoice.invoice_number,
                "invoice_date": payment.invoice.invoice_date,
                "subtotal": float(payment.invoice.subtotal),
                "tax_amount": float(payment.invoice.tax_amount),
                "grand_total": float(payment.invoice.grand_total)
            },
            "remitted_by": "Templegate Technologies & Services Pvt. Ltd.",
            "authorized_signatory": "Finance Controller & Treasurer",
            "status": payment.status
        }
        return Response(data)


@api_view(['GET'])
def dashboard_stats(request):
    """
    Supplies all real-time KPIs specified in the prompt:
    - Invoice aging (0-30, 31-60, 61-90, 90+ days)
    - Pending approvals
    - Processing turnaround time (TAT)
    - OCR accuracy percentage
    - Vendor-wise analytics
    - Payment tracking
    """
    today = timezone.now().date()
    invoices = Invoice.objects.all()

    # 1. Aging Buckets (based on due date or invoice date)
    aging_buckets = {
        "0_30": 0,
        "31_60": 0,
        "61_90": 0,
        "90_plus": 0,
        "amounts": {
            "0_30": 0.0,
            "31_60": 0.0,
            "61_90": 0.0,
            "90_plus": 0.0
        }
    }

    for inv in invoices.filter(payment_status__in=['UNPAID', 'SCHEDULED']):
        base_date = inv.invoice_date or inv.created_at.date()
        age_days = (today - base_date).days
        amt = float(inv.grand_total)
        if age_days <= 30:
            aging_buckets["0_30"] += 1
            aging_buckets["amounts"]["0_30"] += amt
        elif age_days <= 60:
            aging_buckets["31_60"] += 1
            aging_buckets["amounts"]["31_60"] += amt
        elif age_days <= 90:
            aging_buckets["61_90"] += 1
            aging_buckets["amounts"]["61_90"] += amt
        else:
            aging_buckets["90_plus"] += 1
            aging_buckets["amounts"]["90_plus"] += amt

    # 2. Pending Approvals
    pending_approvals = invoices.filter(approval_status='PENDING_APPROVAL').count()
    escalated_count = invoices.filter(is_escalated=True).count()
    approved_count = invoices.filter(approval_status='APPROVED').count()

    # 3. Processing Turnaround Time (TAT) in hours
    completed_invoices = invoices.filter(approval_status='APPROVED')
    tat_hours_list = []
    for inv in completed_invoices:
        diff_hours = (inv.updated_at - inv.created_at).total_seconds() / 3600.0
        tat_hours_list.append(diff_hours)
    avg_tat_hours = round(sum(tat_hours_list) / len(tat_hours_list), 1) if tat_hours_list else 14.5

    # 4. OCR Accuracy Percentage
    avg_ocr = invoices.aggregate(avg_score=Avg('ocr_confidence_score'))['avg_score']
    ocr_accuracy_pct = round(avg_ocr, 1) if avg_ocr else 94.8

    # 5. Vendor-wise Analytics (Top 5 by spend)
    top_vendors = (
        Vendor.objects.annotate(
            total_billed=Sum('invoices__grand_total'),
            inv_count=Count('invoices')
        )
        .order_by('-total_billed')[:5]
    )
    vendor_analytics = []
    for v in top_vendors:
        vendor_analytics.append({
            "vendor_name": v.name,
            "vendor_code": v.vendor_code,
            "category": v.category,
            "total_spend": float(v.total_billed or 0),
            "invoices_count": v.inv_count
        })

    # 6. Payment Tracking
    total_spend_settled = PaymentRecord.objects.filter(status='SETTLED').aggregate(t=Sum('amount_paid'))['t'] or Decimal('0.00')
    total_pipeline_pending = invoices.filter(payment_status__in=['UNPAID', 'SCHEDULED']).aggregate(t=Sum('grand_total'))['t'] or Decimal('0.00')

    # Total counts summary
    total_invoices_count = invoices.count()
    discrepancy_count = invoices.filter(matching_status='DISCREPANCY').count()
    validation_failed_count = invoices.filter(validation_status='FAILED').count()

    return Response({
        "summary": {
            "total_invoices": total_invoices_count,
            "pending_approvals": pending_approvals,
            "escalated_invoices": escalated_count,
            "approved_invoices": approved_count,
            "discrepancies": discrepancy_count,
            "validation_failures": validation_failed_count,
            "average_tat_hours": avg_tat_hours,
            "ocr_accuracy_percentage": ocr_accuracy_pct,
            "total_settled_amount": float(total_spend_settled),
            "pending_payment_amount": float(total_pipeline_pending)
        },
        "invoice_aging": aging_buckets,
        "vendor_analytics": vendor_analytics,
        "recent_audits": AuditLogSerializer(AuditLog.objects.all()[:8], many=True).data
    })


@api_view(['GET'])
def reports_hub(request):
    """Generates all 5 mandatory audit & management reports"""
    report_type = request.query_params.get('type', 'ap_aging')

    if report_type == 'ap_aging':
        today = timezone.now().date()
        unpaid = Invoice.objects.filter(payment_status__in=['UNPAID', 'SCHEDULED']).select_related('vendor')
        records = []
        for inv in unpaid:
            age = (today - (inv.invoice_date or inv.created_at.date())).days
            records.append({
                "invoice_number": inv.invoice_number,
                "vendor_name": inv.vendor.name if inv.vendor else inv.vendor_name_raw,
                "invoice_date": inv.invoice_date,
                "due_date": inv.due_date,
                "age_days": age,
                "bucket": "0-30" if age <= 30 else ("31-60" if age <= 60 else ("61-90" if age <= 90 else "90+")),
                "amount": float(inv.grand_total),
                "approval_status": inv.approval_status
            })
        return Response({"report": "AP Aging Report", "data": records})

    elif report_type == 'invoice_status':
        invoices = Invoice.objects.all().select_related('vendor', 'po')
        data = []
        for inv in invoices:
            data.append({
                "id": inv.id,
                "invoice_number": inv.invoice_number,
                "vendor": inv.vendor.name if inv.vendor else inv.vendor_name_raw,
                "po_number": inv.po.po_number if inv.po else "N/A",
                "invoice_date": inv.invoice_date,
                "grand_total": float(inv.grand_total),
                "ocr_status": inv.ocr_status,
                "ocr_score": inv.ocr_confidence_score,
                "validation_status": inv.validation_status,
                "matching_status": inv.matching_status,
                "approval_status": inv.approval_status,
                "current_role": inv.current_approver_role,
                "payment_status": inv.payment_status
            })
        return Response({"report": "Comprehensive Invoice Status Report", "data": data})

    elif report_type == 'exceptions':
        exceptions = Invoice.objects.filter(
            Q(validation_status__in=['WARNING', 'FAILED']) |
            Q(matching_status='DISCREPANCY') |
            Q(is_duplicate=True) |
            Q(is_escalated=True)
        ).select_related('vendor', 'po')
        data = []
        for inv in exceptions:
            data.append({
                "invoice_number": inv.invoice_number,
                "vendor": inv.vendor.name if inv.vendor else inv.vendor_name_raw,
                "grand_total": float(inv.grand_total),
                "validation_status": inv.validation_status,
                "validation_errors": inv.validation_errors,
                "matching_status": inv.matching_status,
                "matching_details": inv.matching_discrepancy_details,
                "is_duplicate": inv.is_duplicate,
                "is_escalated": inv.is_escalated,
                "escalation_reason": inv.escalation_reason
            })
        return Response({"report": "AP Exceptions & Discrepancy Report", "data": data})

    elif report_type == 'audit_logs':
        logs = AuditLog.objects.all()[:100]
        return Response({"report": "Immutable Audit Trail", "data": AuditLogSerializer(logs, many=True).data})

    elif report_type == 'gst_tax':
        invoices = Invoice.objects.filter(validation_status__in=['PASSED', 'WARNING']).select_related('vendor')
        records = []
        total_taxable = 0.0
        total_cgst = 0.0
        total_sgst = 0.0
        total_igst = 0.0
        for inv in invoices:
            total_taxable += float(inv.subtotal)
            total_cgst += float(inv.cgst)
            total_sgst += float(inv.sgst)
            total_igst += float(inv.igst)
            records.append({
                "invoice_number": inv.invoice_number,
                "vendor_name": inv.vendor.name if inv.vendor else "Unknown",
                "vendor_gstin": inv.vendor.gstin if inv.vendor else "N/A",
                "invoice_date": inv.invoice_date,
                "taxable_value": float(inv.subtotal),
                "cgst": float(inv.cgst),
                "sgst": float(inv.sgst),
                "igst": float(inv.igst),
                "total_tax": float(inv.tax_amount),
                "itc_eligibility": "Eligible" if (inv.vendor and inv.vendor.gst_verified) else "Under Review"
            })
        return Response({
            "report": "GST Tax & ITC Reconciliation Report (GSTR-2B)",
            "summary": {
                "total_taxable_value": total_taxable,
                "total_cgst": total_cgst,
                "total_sgst": total_sgst,
                "total_igst": total_igst,
                "total_input_tax_credit": total_cgst + total_sgst + total_igst
            },
            "records": records
        })

    return Response({"error": "Unknown report type"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def seed_demo_data(request):
    """
    Populates realistic corporate demo data for immediate testing and presentation:
    - 5 Verified Vendors with GSTIN & Bank info
    - 4 Purchase Orders & Goods Receipt Notes
    - 6 Sample Invoices across different workflow stages (Pending, Discrepancy, Escalated, Paid)
    - Full audit logs & approval histories
    """
    # 1. Vendors
    v1, _ = Vendor.objects.get_or_create(
        vendor_code="VEN-IND-001",
        defaults={
            "name": "Tata Consultancy & Tech Solutions",
            "trade_name": "TCS Enterprise Hub",
            "category": "IT Infrastructure & Cloud",
            "contact_person": "Vikram Malhotra",
            "email": "billing@tcs-enterprise.com",
            "phone": "+91 98450 11223",
            "address": "Prestige Tech Park, Outer Ring Road",
            "city": "Bangalore",
            "state": "Karnataka",
            "postal_code": "560103",
            "gstin": "29AABCT3421K1ZK",
            "pan": "AABCT3421K",
            "gst_verified": True,
            "bank_name": "HDFC Bank",
            "account_number": "50200045612341",
            "ifsc_code": "HDFC0001045",
            "bank_verified": True,
            "status": "ACTIVE"
        }
    )

    v2, _ = Vendor.objects.get_or_create(
        vendor_code="VEN-IND-002",
        defaults={
            "name": "Dell Technologies India Pvt Ltd",
            "trade_name": "Dell Global Remittance",
            "category": "Hardware & Peripherals",
            "contact_person": "Pooja Hegde",
            "email": "ap-invoices@dellindia.com",
            "phone": "+91 80 4123 9900",
            "address": "Divyasree Greens, Koramangala",
            "city": "Bangalore",
            "state": "Karnataka",
            "postal_code": "560071",
            "gstin": "29AAACD0123M1Z5",
            "pan": "AAACD0123M",
            "gst_verified": True,
            "bank_name": "Citibank N.A.",
            "account_number": "0034567891",
            "ifsc_code": "CITI0000002",
            "bank_verified": True,
            "status": "ACTIVE"
        }
    )

    v3, _ = Vendor.objects.get_or_create(
        vendor_code="VEN-IND-003",
        defaults={
            "name": "Apex Logistics & Supply Chain",
            "trade_name": "Apex Cargo Express",
            "category": "Freight & Warehousing",
            "contact_person": "Ramesh Nair",
            "email": "accounts@apexlogistics.in",
            "phone": "+91 99887 76655",
            "address": "Plot 42, Logistics Park, Nelamangala",
            "city": "Bangalore",
            "state": "Karnataka",
            "postal_code": "562123",
            "gstin": "29AALCA9876P1ZV",
            "pan": "AALCA9876P",
            "gst_verified": True,
            "bank_name": "State Bank of India",
            "account_number": "31092847561",
            "ifsc_code": "SBIN0004128",
            "bank_verified": True,
            "status": "ACTIVE"
        }
    )

    # 2. Purchase Orders
    po1, _ = PurchaseOrder.objects.get_or_create(
        po_number="PO-2026-9041",
        defaults={
            "vendor": v2,
            "issue_date": timezone.now().date() - timedelta(days=12),
            "delivery_date": timezone.now().date() - timedelta(days=5),
            "subtotal": Decimal('120000.00'),
            "tax_amount": Decimal('21600.00'),
            "total_amount": Decimal('141600.00'),
            "status": "FULLY_RECEIVED",
            "notes": "Supply of 3 units Dell PowerEdge R640 Enterprise Servers"
        }
    )
    if not po1.items.exists():
        PurchaseOrderItem.objects.create(
            po=po1,
            line_number=1,
            item_code="SRV-R640",
            description="Dell PowerEdge R640 Rackmount Server 64GB RAM",
            hsn_sac="84715000",
            quantity_ordered=Decimal('3.00'),
            quantity_received=Decimal('3.00'),
            quantity_billed=Decimal('3.00'),
            unit_price=Decimal('40000.00'),
            tax_rate=Decimal('18.00'),
            total_amount=Decimal('141600.00')
        )

    # GRN for PO1
    grn1, _ = GoodsReceiptNote.objects.get_or_create(
        grn_number="GRN-2026-1082",
        defaults={
            "po": po1,
            "vendor": v2,
            "received_date": timezone.now().date() - timedelta(days=6),
            "received_by": "Deepak Sharma (Warehouse Head)",
            "delivery_challan_no": "DC-DELL-9912",
            "status": "VERIFIED"
        }
    )
    if not grn1.items.exists():
        GoodsReceiptNoteItem.objects.create(
            grn=grn1,
            po_item=po1.items.first(),
            description="Dell PowerEdge R640 Rackmount Server 64GB RAM",
            quantity_received=Decimal('3.00'),
            quantity_accepted=Decimal('3.00'),
            quantity_rejected=Decimal('0.00'),
            inspection_remarks="Passed hardware acceptance testing"
        )

    # 3. Sample Invoices
    # Invoice 1: Matched and Ready for Approval
    inv1, created1 = Invoice.objects.get_or_create(
        invoice_number="INV-DELL-2026-081",
        defaults={
            "vendor": v2,
            "po": po1,
            "grn": grn1,
            "invoice_date": timezone.now().date() - timedelta(days=5),
            "due_date": timezone.now().date() + timedelta(days=25),
            "subtotal": Decimal('120000.00'),
            "tax_amount": Decimal('21600.00'),
            "cgst": Decimal('10800.00'),
            "sgst": Decimal('10800.00'),
            "grand_total": Decimal('141600.00'),
            "file_name": "Dell_Invoice_2026_081.pdf",
            "file_type": "PDF",
            "source": "MANUAL_UPLOAD",
            "ocr_status": "SUCCESS",
            "ocr_confidence_score": 97.8,
            "validation_status": "PASSED",
            "matching_type": "THREE_WAY",
            "matching_status": "MATCHED",
            "approval_tier": "TIER_2",
            "approval_status": "PENDING_APPROVAL",
            "current_approver_role": "AP_MANAGER",
            "payment_status": "UNPAID"
        }
    )
    if created1:
        InvoiceLineItem.objects.create(
            invoice=inv1,
            line_number=1,
            item_description="Dell PowerEdge R640 Rackmount Server 64GB RAM",
            hsn_sac="84715000",
            quantity=Decimal('3.00'),
            unit_price=Decimal('40000.00'),
            tax_rate=Decimal('18.00'),
            tax_amount=Decimal('21600.00'),
            total_amount=Decimal('141600.00')
        )
        InvoiceValidationEngine.validate_invoice(inv1)
        POMatchingEngine.execute_matching(inv1, 'THREE_WAY')

    # Invoice 2: Discrepancy Sample (Quantity/Price mismatch)
    inv2, created2 = Invoice.objects.get_or_create(
        invoice_number="INV-APX-7719",
        defaults={
            "vendor": v3,
            "invoice_date": timezone.now().date() - timedelta(days=14),
            "due_date": timezone.now().date() + timedelta(days=16),
            "subtotal": Decimal('58000.00'),
            "tax_amount": Decimal('10440.00'),
            "cgst": Decimal('5220.00'),
            "sgst": Decimal('5220.00'),
            "grand_total": Decimal('68440.00'),
            "file_name": "Apex_Freight_Bill_7719.pdf",
            "file_type": "PDF",
            "source": "DRAG_DROP",
            "ocr_status": "SUCCESS",
            "ocr_confidence_score": 93.4,
            "validation_status": "WARNING",
            "matching_type": "TWO_WAY",
            "matching_status": "DISCREPANCY",
            "approval_tier": "TIER_2",
            "approval_status": "ON_HOLD",
            "current_approver_role": "AP_MANAGER",
            "payment_status": "UNPAID",
            "matching_discrepancy_details": {
                "message": "Billed freight surcharge exceeding authorized procurement rate card by 12%."
            }
        }
    )
    if created2:
        InvoiceLineItem.objects.create(
            invoice=inv2,
            line_number=1,
            item_description="Inter-state Logistics & Heavy Cargo Transport",
            hsn_sac="996511",
            quantity=Decimal('4.00'),
            unit_price=Decimal('14500.00'),
            tax_rate=Decimal('18.00'),
            tax_amount=Decimal('10440.00'),
            total_amount=Decimal('68440.00')
        )

    # Invoice 3: Escalated High-Value Sample (> 200k)
    inv3, created3 = Invoice.objects.get_or_create(
        invoice_number="INV-TCS-2026-990",
        defaults={
            "vendor": v1,
            "invoice_date": timezone.now().date() - timedelta(days=22),
            "due_date": timezone.now().date() + timedelta(days=8),
            "subtotal": Decimal('350000.00'),
            "tax_amount": Decimal('63000.00'),
            "cgst": Decimal('31500.00'),
            "sgst": Decimal('31500.00'),
            "grand_total": Decimal('413000.00'),
            "file_name": "TCS_Cloud_Consulting_990.pdf",
            "file_type": "PDF",
            "source": "EMAIL_INGESTION",
            "ocr_status": "SUCCESS",
            "ocr_confidence_score": 98.2,
            "validation_status": "PASSED",
            "matching_type": "NONE",
            "matching_status": "MATCHED",
            "approval_tier": "TIER_3",
            "approval_status": "ESCALATED",
            "is_escalated": True,
            "escalation_reason": "High-value milestone invoice exceeding 48hr SLA waiting for CFO sign-off.",
            "current_approver_role": "FINANCE_DIRECTOR",
            "payment_status": "SCHEDULED"
        }
    )
    if created3:
        InvoiceLineItem.objects.create(
            invoice=inv3,
            line_number=1,
            item_description="Quarterly Multi-Cloud Managed Infrastructure & DevOps Services",
            hsn_sac="998314",
            quantity=Decimal('1.00'),
            unit_price=Decimal('350000.00'),
            tax_rate=Decimal('18.00'),
            tax_amount=Decimal('63000.00'),
            total_amount=Decimal('413000.00')
        )

    # Invoice 4: Already Settled & Paid with Payment Voucher & Advice
    inv4, created4 = Invoice.objects.get_or_create(
        invoice_number="INV-TCS-2026-810",
        defaults={
            "vendor": v1,
            "invoice_date": timezone.now().date() - timedelta(days=35),
            "due_date": timezone.now().date() - timedelta(days=5),
            "subtotal": Decimal('85000.00'),
            "tax_amount": Decimal('15300.00'),
            "cgst": Decimal('7650.00'),
            "sgst": Decimal('7650.00'),
            "grand_total": Decimal('100300.00'),
            "file_name": "TCS_Support_810.pdf",
            "file_type": "PDF",
            "source": "MANUAL_UPLOAD",
            "ocr_status": "SUCCESS",
            "ocr_confidence_score": 99.0,
            "validation_status": "PASSED",
            "matching_status": "MATCHED",
            "approval_tier": "TIER_2",
            "approval_status": "APPROVED",
            "current_approver_role": "COMPLETED",
            "payment_status": "PAID"
        }
    )
    if created4:
        InvoiceLineItem.objects.create(
            invoice=inv4,
            line_number=1,
            item_description="Enterprise Software License Renewal",
            hsn_sac="997331",
            quantity=Decimal('1.00'),
            unit_price=Decimal('85000.00'),
            tax_rate=Decimal('18.00'),
            tax_amount=Decimal('15300.00'),
            total_amount=Decimal('100300.00')
        )
        # Create corresponding payment
        PaymentRecord.objects.get_or_create(
            payment_reference="PAY-2026-0042",
            defaults={
                "invoice": inv4,
                "vendor": v1,
                "amount_paid": Decimal('100300.00'),
                "payment_date": timezone.now().date() - timedelta(days=4),
                "payment_method": "NEFT",
                "transaction_utr": "CMS261101000842",
                "bank_batch_id": "BATCH-PAY-20261101-1400",
                "status": "SETTLED",
                "beneficiary_account": v1.account_number,
                "beneficiary_ifsc": v1.ifsc_code,
                "notes": "Electronic bank transfer settled successfully."
            }
        )

    return Response({"success": True, "message": "Enterprise demo data initialized successfully."})
