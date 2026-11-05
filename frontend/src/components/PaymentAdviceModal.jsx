import React from 'react';
import { X, Printer, Download, CheckCircle2, Building2 } from 'lucide-react';

export default function PaymentAdviceModal({ adviceData, onClose }) {
  if (!adviceData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', background: '#0a0f1d' }}>
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={20} style={{ color: '#818cf8' }} />
            <h2 style={{ fontSize: '1.15rem' }}>Official Bank Payment Advice Voucher</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={14} />
              <span>Print Advice</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '2rem' }}>
          {/* Document Header */}
          <div style={{ borderBottom: '2px solid rgba(255, 255, 255, 0.15)', paddingBottom: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', color: '#f8fafc', marginBottom: '0.2rem' }}>TEMPLEGATE TECHNOLOGIES</h1>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>& Services Private Limited</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                Corporate Finance & Treasury Division • Bangalore, India
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-success" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                PAYMENT DISBURSED
              </span>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                Voucher Ref: {adviceData.payment_reference}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Date: {adviceData.payment_date}</div>
            </div>
          </div>

          {/* Remittance Summary Banner */}
          <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, textTransform: 'uppercase' }}>
                Electronic Remittance UTR Number
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f8fafc' }}>
                {adviceData.utr_number}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Settled via {adviceData.payment_method} Inter-Bank Clearing</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>NET DISBURSED AMOUNT</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                ₹{adviceData.amount_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Beneficiary & Payer Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '0.85rem', color: '#818cf8', marginBottom: '0.5rem' }}>Beneficiary (Vendor) Details</h3>
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div><strong>Vendor:</strong> {adviceData.vendor?.name}</div>
                <div><strong>Vendor Code:</strong> {adviceData.vendor?.vendor_code}</div>
                <div><strong>GSTIN:</strong> {adviceData.vendor?.gstin}</div>
                <div><strong>Bank Name:</strong> {adviceData.vendor?.bank_name}</div>
                <div><strong>Bank Account:</strong> {adviceData.vendor?.bank_account}</div>
                <div><strong>IFSC:</strong> {adviceData.vendor?.ifsc}</div>
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '0.85rem', color: '#818cf8', marginBottom: '0.5rem' }}>Remitter Details</h3>
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div><strong>Company:</strong> Templegate Technologies & Services Pvt Ltd</div>
                <div><strong>Debit Account:</strong> CORP-AP-9901827461 (HDFC Bank CMS)</div>
                <div><strong>Payment Purpose:</strong> Trade Accounts Payable Settlement</div>
                <div><strong>Authorized By:</strong> Finance Controller & Treasury Lead</div>
                <div><strong>Status:</strong> RBI Real-Time Net Settlement Successful</div>
              </div>
            </div>
          </div>

          {/* Invoices Remitted Breakdown */}
          <table className="custom-table" style={{ marginBottom: '1.5rem' }}>
            <thead>
              <tr>
                <th>Invoice Ref</th>
                <th>Invoice Date</th>
                <th>Taxable Value</th>
                <th>GST / Tax</th>
                <th style={{ textAlign: 'right' }}>Total Remitted</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 700 }}>{adviceData.invoice?.invoice_number}</td>
                <td>{adviceData.invoice?.invoice_date}</td>
                <td>₹{adviceData.invoice?.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td>₹{adviceData.invoice?.tax_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  ₹{adviceData.invoice?.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature Block */}
          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              System generated electronic remittance advice.<br />
              Valid without physical signature under IT Act 2000.
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc' }}>
                TEMPLEGATE TREASURY OFFICER
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10b981' }}>✓ Digitally Signed & Authenticated</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
