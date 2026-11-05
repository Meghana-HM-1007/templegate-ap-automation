from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    VendorViewSet, PurchaseOrderViewSet,
    GoodsReceiptNoteViewSet, InvoiceViewSet,
    PaymentViewSet, dashboard_stats,
    reports_hub, seed_demo_data
)

router = DefaultRouter()
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'grns', GoodsReceiptNoteViewSet, basename='grn')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/stats/', dashboard_stats, name='dashboard-stats'),
    path('reports/', reports_hub, name='reports-hub'),
    path('seed-demo-data/', seed_demo_data, name='seed-demo-data'),
]
