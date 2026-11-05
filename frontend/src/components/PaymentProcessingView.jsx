import React, { useState } from 'react';
import { 
  CreditCard, 
  Download, 
  CheckCircle2, 
  Building2, 
  DollarSign, 
  Send, 
  FileCheck, 
  FileText, 
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  createPaymentBatch, 
  fetchPaymentAdvice 
} from '../api';
import PaymentAdviceModal from './PaymentAdviceModal';

export default function PaymentProcessingView({ 
  invoices = [], 
  payments = [], 
  onRefresh, 
  isLoading 
}) {
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('NEFT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState(null);
  const [selectedAdvice, setSelectedAdvice] = useState(null);

  // Filter approved invoices ready for payment
  const payableInvoices = invoices.filter(
    inv => inv.approval_status === 'APPROVED' && inv.payment_status !== 'PAID'
  );

  const toggleSelectInvoice = (id) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedInvoiceIds.length === payableInvoices.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(payableInvoices.map(i => i.id));
    }
  };

  const totalSelectedAmount = payableInvoices
    .filter(i => selectedInvoiceIds.includes(i.id))
    .reduce((sum, curr) => sum + Number(curr.grand_total), 0);

  const handleDisburseBatch = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setIsProcessing(true);
    setBatchResult(null);
    try {
      const res = await createPaymentBatch(selectedInvoiceIds, paymentMethod);
      setIsProcessing(false);
      setBatchResult(res);
      setSelectedInvoiceIds([]);
      onRefresh && onRefresh();
    } catch (err) {
      setIsProcessing(false);
      setBatchResult({ error: err.message });
    }
  };

  const handleOpenAdvice = async (paymentId) => {
    try {
      const advice = await fetchPaymentAdvice(paymentId);
      setSelectedAdvice(advice);
    } catch (err) {
      alert(`Could not load payment advice: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>Payment Processing & Bank Remittance Gateway</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Batch payment generation, electronic fund transfer (NEFT/RTGS), bank file export, and official payment advice vouchers.
          </p>
        </div>

        <button 
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh Treasury</span>
        </button>
      </div>

      {batchResult && (
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>
              ✓ Disbursement Batch Created: {batchResult.batch_id}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
              Settled {batchResult.payments_count} payment vouchers with assigned bank UTR references.
            </div>
          </div>
          <a
            href={`http://127.0.0.1:8000/api/payments/export-bank-file/${batchResult.batch_id}/`}
            className="btn btn-primary btn-sm"
            download
          >
            <Download size={14} />
            <span>Download Bank Payout File</span>
          </a>
        </div>
      )}

      {/* Action Tray: Payable Invoices */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>Approved Invoices Ready for Settlement</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Select invoices to schedule corporate payment batch</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Transfer Mode:</span>
              <select
                className="form-select"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="NEFT">NEFT (Standard Batch)</option>
                <option value="RTGS">RTGS (High Value Real-time)</option>
                <option value="IMPS">IMPS (Immediate 24x7)</option>
              </select>
            </div>

            <button
              id="btn-disburse-batch"
              className="btn btn-primary btn-sm"
              onClick={handleDisburseBatch}
              disabled={isProcessing || selectedInvoiceIds.length === 0}
            >
              <CreditCard size={14} />
              <span>
                {isProcessing ? 'Settling with Gateway...' : `Disburse Selected (₹${totalSelectedAmount.toLocaleString('en-IN')})`}
              </span>
            </button>
          </div>
        </div>

        {payableInvoices.length > 0 ? (
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedInvoiceIds.length === payableInvoices.length && payableInvoices.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Invoice #</th>
                <th>Vendor Name</th>
                <th>Beneficiary Bank / IFSC</th>
                <th>Approval Date</th>
                <th>Net Payable Amount</th>
              </tr>
            </thead>
            <tbody>
              {payableInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedInvoiceIds.includes(inv.id)}
                      onChange={() => toggleSelectInvoice(inv.id)}
                    />
                  </td>
                  <td style={{ fontWeight: 700 }}>{inv.invoice_number}</td>
                  <td>{inv.vendor?.name || inv.vendor_name_raw}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {inv.vendor?.bank_name || 'HDFC Bank'} • <span style={{ fontFamily: 'var(--font-mono)' }}>{inv.vendor?.ifsc_code || 'HDFC0001045'}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{inv.updated_at?.slice(0, 10)}</td>
                  <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    ₹{Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.85rem' }}>
            No approved invoices currently waiting for payment disbursement.
          </div>
        )}
      </div>

      {/* Disbursed Payments History */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Settled Payment Records & Remittance Vouchers</h2>
        <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '1.25rem' }}>
          Historical record of electronic fund settlements, bank UTR tracking, and official payment advice receipts.
        </p>

        <table className="custom-table">
          <thead>
            <tr>
              <th>Voucher Ref</th>
              <th>Invoice #</th>
              <th>Vendor</th>
              <th>Settlement UTR</th>
              <th>Method</th>
              <th>Amount Settled</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Remittance Voucher</th>
            </tr>
          </thead>
          <tbody>
            {payments && payments.length > 0 ? (
              payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.payment_reference}</td>
                  <td>{p.invoice_number}</td>
                  <td>{p.vendor_name}</td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#818cf8', fontSize: '0.78rem' }}>
                      {p.transaction_utr || 'CMS261101992'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info">{p.payment_method}</span>
                  </td>
                  <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    ₹{Number(p.amount_paid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{p.payment_date}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleOpenAdvice(p.id)}
                    >
                      <FileCheck size={14} />
                      <span>View Payment Advice</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  No historical payment records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Advice Modal */}
      {selectedAdvice && (
        <PaymentAdviceModal
          adviceData={selectedAdvice}
          onClose={() => setSelectedAdvice(null)}
        />
      )}
    </div>
  );
}
