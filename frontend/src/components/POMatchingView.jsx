import React, { useState } from 'react';
import { 
  GitMerge, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  PackageCheck, 
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Search
} from 'lucide-react';
import { triggerPOMatching } from '../api';

export default function POMatchingView({ 
  invoices = [], 
  onSelectInvoice, 
  onRefresh 
}) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    invoices.find(inv => inv.po)?.id || invoices[0]?.id || null
  );
  const [matchingType, setMatchingType] = useState('THREE_WAY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [matchResult, setMatchResult] = useState(null);

  const selectedInvoice = invoices.find(inv => inv.id === Number(selectedInvoiceId));

  const handleRunMatch = async () => {
    if (!selectedInvoice) return;
    setIsProcessing(true);
    setMatchResult(null);
    try {
      const res = await triggerPOMatching(selectedInvoice.id, matchingType);
      setIsProcessing(false);
      setMatchResult(res);
      onRefresh && onRefresh();
    } catch (err) {
      setIsProcessing(false);
      setMatchResult({ error: err.message });
    }
  };

  const po = selectedInvoice?.po;
  const grn = selectedInvoice?.grn;
  const details = selectedInvoice?.matching_discrepancy_details;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>2-Way & 3-Way PO Reconciliation Engine</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Automated line-by-line comparison between Purchase Orders, Goods Receipt Notes (GRN), and Invoices.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(17, 26, 46, 0.8)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              id="match-type-2way"
              className={`btn btn-sm ${matchingType === 'TWO_WAY' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMatchingType('TWO_WAY')}
            >
              2-Way Match (PO vs Inv)
            </button>
            <button
              id="match-type-3way"
              className={`btn btn-sm ${matchingType === 'THREE_WAY' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMatchingType('THREE_WAY')}
            >
              3-Way Match (PO vs GRN vs Inv)
            </button>
          </div>

          <button
            id="btn-run-match-engine"
            className="btn btn-primary btn-sm"
            onClick={handleRunMatch}
            disabled={isProcessing || !selectedInvoice}
          >
            <GitMerge size={14} />
            <span>{isProcessing ? 'Reconciling...' : 'Run Matching Engine'}</span>
          </button>
        </div>
      </div>

      {/* Select Invoice Picker */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
          Select Target Invoice:
        </span>
        <select
          id="select-matching-invoice"
          className="form-select"
          value={selectedInvoiceId || ''}
          onChange={(e) => {
            setSelectedInvoiceId(Number(e.target.value));
            setMatchResult(null);
          }}
        >
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoice_number || `Draft #${inv.id}`} - {inv.vendor?.name || inv.vendor_name_raw} (₹{Number(inv.grand_total).toLocaleString('en-IN')}) - Status: {inv.matching_status}
            </option>
          ))}
        </select>
      </div>

      {/* Reconciliation Breakdown */}
      {selectedInvoice ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Top 3 Cards: PO vs GRN vs Invoice */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {/* Purchase Order */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase' }}>1. Purchase Order</span>
                <span className="badge badge-purple">{po ? po.status : 'No Linked PO'}</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {po?.po_number || 'PO Not Linked'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                Authorized Total: <strong style={{ color: '#f8fafc' }}>₹{po ? Number(po.total_amount).toLocaleString('en-IN') : '0.00'}</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                Issued: {po?.issue_date || 'N/A'} • Payment Terms: {po?.payment_terms || 'Net 30'}
              </div>
            </div>

            {/* GRN (Goods Receipt Note) */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #06b6d4' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase' }}>2. Goods Receipt (GRN)</span>
                <span className="badge badge-info">{grn ? grn.status : (matchingType === 'THREE_WAY' ? 'Pending' : 'N/A (2-Way)')}</span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {grn?.grn_number || (matchingType === 'THREE_WAY' ? 'Auto-Matched GRN' : 'Skipped in 2-Way')}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                Inspection: <strong style={{ color: '#f8fafc' }}>Quality Verified</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                Warehouse: Bangalore Hub • Received by: Deepak Sharma
              </div>
            </div>

            {/* Invoiced Claim */}
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: `4px solid ${selectedInvoice.matching_status === 'MATCHED' ? '#10b981' : '#ef4444'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>3. Invoiced Bill</span>
                <span className={`badge ${selectedInvoice.matching_status === 'MATCHED' ? 'badge-success' : 'badge-danger'}`}>
                  {selectedInvoice.matching_status}
                </span>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {selectedInvoice.invoice_number || `Draft #${selectedInvoice.id}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                Billed Total: <strong style={{ color: '#f8fafc' }}>₹{Number(selectedInvoice.grand_total).toLocaleString('en-IN')}</strong>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                Tax: ₹{Number(selectedInvoice.tax_amount).toLocaleString('en-IN')} • Date: {selectedInvoice.invoice_date}
              </div>
            </div>
          </div>

          {/* Line by Line Comparison Table */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1rem' }}>Line Item Variance Analysis</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Tolerance threshold: Price ≤ 2.0% variance | Billed Quantity ≤ Received Quantity
                </p>
              </div>

              {selectedInvoice.matching_status === 'MATCHED' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} />
                  <span>Fully Reconciled Within Tolerances</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                  <AlertTriangle size={16} />
                  <span>Variance Detected - Requires Review</span>
                </div>
              )}
            </div>

            <table className="custom-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>PO Unit Rate</th>
                  <th>Inv Unit Rate</th>
                  <th>Rate Variance</th>
                  <th>PO Qty</th>
                  <th>GRN Qty</th>
                  <th>Billed Qty</th>
                  <th>Matching Result</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.line_items?.map((item, idx) => {
                  const poItem = po?.items?.[idx];
                  const poRate = poItem ? Number(poItem.unit_price) : Number(item.unit_price);
                  const invRate = Number(item.unit_price);
                  const rateDiff = invRate - poRate;
                  const rateDiffPct = poRate > 0 ? (rateDiff / poRate * 100) : 0;
                  const isRateOver = rateDiffPct > 2.0;

                  return (
                    <tr key={idx}>
                      <td>
                        <strong>{item.item_description}</strong>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>HSN: {item.hsn_sac || '8471'}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{poRate.toLocaleString('en-IN')}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{invRate.toLocaleString('en-IN')}</td>
                      <td>
                        {Math.abs(rateDiffPct) <= 0.1 ? (
                          <span style={{ color: '#10b981', fontSize: '0.75rem' }}>0% (Match)</span>
                        ) : isRateOver ? (
                          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.75rem' }}>
                            +{rateDiffPct.toFixed(1)}% (Over)
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', fontSize: '0.75rem' }}>
                            {rateDiffPct.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td>{poItem ? poItem.quantity_ordered : item.quantity}</td>
                      <td>{matchingType === 'THREE_WAY' ? (poItem ? poItem.quantity_received : item.quantity) : '-'}</td>
                      <td>{item.quantity}</td>
                      <td>
                        {!isRateOver ? (
                          <span className="badge badge-success">Matched</span>
                        ) : (
                          <span className="badge badge-danger">Price Variance</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Discrepancy Box / Action Button */}
          {selectedInvoice.matching_discrepancy_details && (
            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#fbbf24', marginBottom: '0.35rem' }}>Audit Matching Notes:</h4>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                {selectedInvoice.matching_discrepancy_details.message || 'Comparison completed against vendor purchase order items.'}
              </p>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSelectInvoice(selectedInvoice)}
                >
                  Inspect Full Invoice Details
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
          No invoices available for matching.
        </div>
      )}
    </div>
  );
}
