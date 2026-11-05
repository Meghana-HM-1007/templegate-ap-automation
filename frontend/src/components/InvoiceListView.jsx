import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  RefreshCw,
  Eye,
  Building2,
  Sparkles
} from 'lucide-react';

export default function InvoiceListView({ 
  invoices = [], 
  onSelectInvoice, 
  onRefresh, 
  isLoading 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.vendor?.name || inv.vendor_name_raw || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.po?.po_number || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PENDING') return inv.approval_status === 'PENDING_APPROVAL';
    if (statusFilter === 'DISCREPANCY') return inv.matching_status === 'DISCREPANCY' || inv.validation_status === 'FAILED';
    if (statusFilter === 'ESCALATED') return inv.is_escalated;
    if (statusFilter === 'APPROVED') return inv.approval_status === 'APPROVED';
    if (statusFilter === 'PAID') return inv.payment_status === 'PAID';
    return true;
  });

  const exportToCSV = () => {
    const headers = ['Invoice Number', 'Vendor', 'PO Number', 'Date', 'Due Date', 'Subtotal', 'Tax', 'Grand Total', 'OCR Score', 'Validation', 'Matching', 'Approval Status', 'Payment Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoice_number,
      `"${(inv.vendor?.name || inv.vendor_name_raw || '').replace(/"/g, '""')}"`,
      inv.po?.po_number || 'N/A',
      inv.invoice_date,
      inv.due_date,
      inv.subtotal,
      inv.tax_amount,
      inv.grand_total,
      inv.ocr_confidence_score,
      inv.validation_status,
      inv.matching_status,
      inv.approval_status,
      inv.payment_status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `templegate_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header bar */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>Accounts Payable Invoices Ledger</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Repository of captured invoices, OCR extraction confidence, 3-way matching, and approval statuses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            id="btn-refresh-invoices"
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh from server"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            id="btn-export-csv"
            className="btn btn-secondary btn-sm"
            onClick={exportToCSV}
            title="Export to CSV Spreadsheet"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            id="search-invoices-input"
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.4rem' }}
            placeholder="Search by invoice #, vendor, or PO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(17, 26, 46, 0.8)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'PENDING', label: 'Pending Approval' },
            { id: 'DISCREPANCY', label: 'Discrepancies' },
            { id: 'ESCALATED', label: 'Escalated' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'PAID', label: 'Paid' },
          ].map((pill) => (
            <button
              key={pill.id}
              className={`btn btn-sm ${statusFilter === pill.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
              onClick={() => setStatusFilter(pill.id)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Vendor Partner</th>
              <th>PO Reference</th>
              <th>Date / Due</th>
              <th>Grand Total</th>
              <th>OCR Confidence</th>
              <th>Validation</th>
              <th>PO Match</th>
              <th>Approval Tier</th>
              <th>Payment</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length > 0 ? (
              filteredInvoices.map((inv) => (
                <tr key={inv.id} id={`invoice-row-${inv.id}`} style={{ cursor: 'pointer' }} onClick={() => onSelectInvoice(inv)}>
                  {/* Invoice # & File */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} style={{ color: '#818cf8' }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                          {inv.invoice_number || `Draft #${inv.id}`}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                          {inv.file_type || 'PDF'} • {inv.source.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Vendor */}
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {inv.vendor?.name || inv.vendor_name_raw || 'Unknown Vendor'}
                    </div>
                    {inv.vendor?.gstin && (
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                        GSTIN: {inv.vendor.gstin}
                      </div>
                    )}
                  </td>

                  {/* PO Reference */}
                  <td>
                    {inv.po ? (
                      <span className="badge badge-info" style={{ fontFamily: 'var(--font-mono)' }}>
                        {inv.po.po_number}
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.75rem' }}>No PO</span>
                    )}
                  </td>

                  {/* Dates */}
                  <td>
                    <div style={{ fontSize: '0.78rem' }}>{inv.invoice_date || 'N/A'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      Due: {inv.due_date || 'Net 30'}
                    </div>
                  </td>

                  {/* Grand Total */}
                  <td>
                    <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                      ₹{Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      Tax: ₹{Number(inv.tax_amount).toLocaleString('en-IN')}
                    </div>
                  </td>

                  {/* OCR Score */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '40px', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${inv.ocr_confidence_score}%`, height: '100%', background: '#a855f7' }} />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#c084fc' }}>
                        {inv.ocr_confidence_score}%
                      </span>
                    </div>
                  </td>

                  {/* Validation Status */}
                  <td>
                    {inv.validation_status === 'PASSED' && <span className="badge badge-success">Passed</span>}
                    {inv.validation_status === 'WARNING' && <span className="badge badge-warning">Notice</span>}
                    {inv.validation_status === 'FAILED' && <span className="badge badge-danger">Failed</span>}
                    {inv.validation_status === 'PENDING' && <span className="badge badge-info">Pending</span>}
                  </td>

                  {/* PO Matching */}
                  <td>
                    {inv.matching_status === 'MATCHED' && <span className="badge badge-success">Matched</span>}
                    {inv.matching_status === 'DISCREPANCY' && <span className="badge badge-danger">Variance</span>}
                    {inv.matching_status === 'UNMATCHED' && <span className="badge badge-info">Unmatched</span>}
                  </td>

                  {/* Approval Tier & Status */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.68rem' }}>
                        {inv.approval_tier}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: inv.is_escalated ? '#ef4444' : '#94a3b8' }}>
                        {inv.is_escalated ? 'Escalated' : inv.current_approver_role.replace('_', ' ')}
                      </div>
                    </div>
                  </td>

                  {/* Payment */}
                  <td>
                    {inv.payment_status === 'PAID' && <span className="badge badge-success">Paid</span>}
                    {inv.payment_status === 'SCHEDULED' && <span className="badge badge-info">Scheduled</span>}
                    {inv.payment_status === 'UNPAID' && <span className="badge badge-warning">Unpaid</span>}
                  </td>

                  {/* Action */}
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectInvoice(inv);
                      }}
                      title="Inspect Invoice Details"
                    >
                      <Eye size={14} />
                      <span>Review</span>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No invoices found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
