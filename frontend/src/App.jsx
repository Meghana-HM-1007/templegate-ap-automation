import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import InvoiceCaptureView from './components/InvoiceCaptureView';
import InvoiceListView from './components/InvoiceListView';
import POMatchingView from './components/POMatchingView';
import ApprovalsWorkflowView from './components/ApprovalsWorkflowView';
import VendorManagementView from './components/VendorManagementView';
import PaymentProcessingView from './components/PaymentProcessingView';
import ReportsView from './components/ReportsView';
import InvoiceDetailModal from './components/InvoiceDetailModal';
import { 
  fetchDashboardStats, 
  fetchInvoices, 
  fetchVendors, 
  fetchPayments, 
  seedDemoData 
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('AP_MANAGER'); // AP_CLERK, AP_MANAGER, FINANCE_DIRECTOR, ADMIN
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, invoicesRes, vendorsRes, paymentsRes] = await Promise.all([
        fetchDashboardStats(),
        fetchInvoices(),
        fetchVendors(),
        fetchPayments()
      ]);
      setStats(statsRes);
      setInvoices(invoicesRes);
      setVendors(vendorsRes);
      setPayments(paymentsRes);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetSeed = async () => {
    setIsLoading(true);
    try {
      await seedDemoData();
      await loadData();
      setToastMessage('Fresh enterprise demo data re-seeded successfully!');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err) {
      console.error('Error seeding data:', err);
      setIsLoading(false);
    }
  };

  const handleInvoiceUpdated = async (updatedInvoice) => {
    if (updatedInvoice) {
      setSelectedInvoice(updatedInvoice);
    }
    await loadData();
  };

  const pendingApprovalsCount = invoices.filter(
    inv => inv.approval_status === 'PENDING_APPROVAL' || inv.is_escalated
  ).length;

  return (
    <div>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        onResetSeed={handleResetSeed}
        pendingCount={pendingApprovalsCount}
      />

      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#10b981',
          color: '#ffffff',
          padding: '0.75rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          fontWeight: 600,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <span>✓ {toastMessage}</span>
        </div>
      )}

      <main className="app-container">
        {activeTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            onNavigate={(tab) => setActiveTab(tab)}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          />
        )}

        {activeTab === 'capture' && (
          <InvoiceCaptureView
            onUploadComplete={loadData}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceListView
            invoices={invoices}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onRefresh={loadData}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'matching' && (
          <POMatchingView
            invoices={invoices}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsWorkflowView
            invoices={invoices}
            userRole={userRole}
            onSelectInvoice={(inv) => setSelectedInvoice(inv)}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'vendors' && (
          <VendorManagementView
            vendors={vendors}
            onRefresh={loadData}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentProcessingView
            invoices={invoices}
            payments={payments}
            onRefresh={loadData}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView />
        )}
      </main>

      {/* Invoice Detailed Inspection Modal */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          userRole={userRole}
          onClose={() => setSelectedInvoice(null)}
          onUpdate={handleInvoiceUpdated}
        />
      )}
    </div>
  );
}
