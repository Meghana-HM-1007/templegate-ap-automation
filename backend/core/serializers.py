from rest_framework import serializers
from .models import (
    Vendor, PurchaseOrder, PurchaseOrderItem,
    GoodsReceiptNote, GoodsReceiptNoteItem,
    Invoice, InvoiceLineItem, WorkflowApprovalAction,
    PaymentRecord, AuditLog, ApprovalMatrixRule
)


class VendorSerializer(serializers.ModelSerializer):
    invoices_count = serializers.SerializerMethodField()
    total_spend = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = '__all__'

    def get_invoices_count(self, obj):
        return obj.invoices.count()

    def get_total_spend(self, obj):
        total = sum((inv.grand_total for inv in obj.invoices.filter(payment_status='PAID')), 0)
        return float(total)


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'


class GoodsReceiptNoteItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoodsReceiptNoteItem
        fields = '__all__'


class GoodsReceiptNoteSerializer(serializers.ModelSerializer):
    items = GoodsReceiptNoteItemSerializer(many=True, read_only=True)
    po_number = serializers.CharField(source='po.po_number', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = GoodsReceiptNote
        fields = '__all__'


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLineItem
        fields = '__all__'


class WorkflowApprovalActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkflowApprovalAction
        fields = '__all__'


class PaymentRecordSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = PaymentRecord
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'


class InvoiceSerializer(serializers.ModelSerializer):
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    approval_history = WorkflowApprovalActionSerializer(many=True, read_only=True)
    vendor_details = VendorSerializer(source='vendor', read_only=True)
    po_details = PurchaseOrderSerializer(source='po', read_only=True)
    grn_details = GoodsReceiptNoteSerializer(source='grn', read_only=True)
    payments = PaymentRecordSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'


class ApprovalMatrixRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApprovalMatrixRule
        fields = '__all__'
