import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Scan, 
  Building2, 
  ArrowUpRight,
  ShieldAlert,
  ChevronRight
} from 'lucide-react';

export default function DashboardView({ 
  stats, 
  onNavigate, 
  onSelectInvoice 
}) {
  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <div style={{ color: '#94a3b8' }}>Loading AP Metrics & Analytics...</div>
      </div>
    );
  }

  const { summary, invoice_aging, vendor_analytics, recent_audits } = stats;

  const agingData = [
    { label: '0-30 Days', key: '0_30', color: '#10b981', count: invoice_aging?.['0_30'] || 0, amount: invoice_aging?.amounts?.['0_30'] || 0 },
    { label: '31-60 Days', key: '31_60', color: '#3b82f6', count: invoice_aging?.['31_60'] || 0, amount: invoice_aging?.amounts?.['31_60'] || 0 },
    { label: '61-90 Days', key: '61_90', color: '#f59e0b', count: invoice_aging?.['61_90'] || 0, amount: invoice_aging?.amounts?.['61_90'] || 0 },
    { label: '90+ Days (Overdue)', key: '90_plus', color: '#ef4444', count: invoice_aging?.['90_plus'] || 0, amount: invoice_aging?.amounts?.['90_plus'] || 0 },
  ];

  const totalAgingAmount = agingData.reduce((acc, curr) => acc + curr.amount, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner / Welcome */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', marginBottom: '0.25rem' }}>Accounts Payable Executive Cockpit</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Real-time OCR extraction monitoring, 3-way matching status, approval SLAs, and banking disbursements.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            id="btn-dash-capture"
            className="btn btn-primary"
            onClick={() => onNavigate('capture')}
          >
            <span>+ Ingest Invoices</span>
          </button>
          <button 
            id="btn-dash-approvals"
            className="btn btn-secondary"
            onClick={() => onNavigate('approvals')}
          >
            <span>Pending Approvals ({summary.pending_approvals})</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Total Invoices */}
        <div className="glass-panel stat-card" id="kpi-total-invoices">
          <div className="stat-header">
            <span>TOTAL PROCESSED</span>
            <FileText size={18} style={{ color: '#818cf8' }} />
          </div>
          <div className="stat-value">{summary.total_invoices}</div>
          <div className="stat-footer">
            <span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
              <TrendingUp size={12} style={{ marginRight: 2 }} /> Multi-Channel
            </span>
            <span>PDF, Images & Emails</span>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="glass-panel stat-card" id="kpi-pending-approvals" style={{ cursor: 'pointer' }} onClick={() => onNavigate('approvals')}>
          <div className="stat-header">
            <span>PENDING APPROVAL</span>
            <Clock size={18} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-value" style={{ color: summary.pending_approvals > 0 ? '#fbbf24' : '#f8fafc' }}>
            {summary.pending_approvals}
          </div>
          <div className="stat-footer">
            <span style={{ color: summary.escalated_invoices > 0 ? '#ef4444' : '#94a3b8', fontWeight: 600 }}>
              {summary.escalated_invoices} Escalated Tier 3
            </span>
            <span>High priority</span>
          </div>
        </div>

        {/* Turnaround Time (TAT) */}
        <div className="glass-panel stat-card" id="kpi-tat">
          <div className="stat-header">
            <span>AVG TURNAROUND TIME</span>
            <Clock size={18} style={{ color: '#06b6d4' }} />
          </div>
          <div className="stat-value">
            {summary.average_tat_hours || '1.8'}<span style={{ fontSize: '1rem', fontWeight: 500, color: '#94a3b8' }}> hrs</span>
          </div>
          <div className="stat-footer">
            <span style={{ color: '#10b981' }}>-72% vs manual</span>
            <span>SLA Target: 24h</span>
          </div>
        </div>

        {/* OCR Accuracy */}
        <div className="glass-panel stat-card" id="kpi-ocr-accuracy">
          <div className="stat-header">
            <span>OCR ACCURACY SCORE</span>
            <Scan size={18} style={{ color: '#a855f7' }} />
          </div>
          <div className="stat-value" style={{ color: '#c084fc' }}>
            {summary.ocr_accuracy_percentage}%
          </div>
          <div className="stat-footer">
            <span style={{ color: '#10b981' }}>High Confidence</span>
            <span>Line Items + Headers</span>
          </div>
        </div>

        {/* Settled Payments */}
        <div className="glass-panel stat-card" id="kpi-settled">
          <div className="stat-header">
            <span>DISBURSED SETTLEMENTS</span>
            <DollarSign size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-value" style={{ color: '#34d399', fontSize: '1.65rem' }}>
            ₹{(summary.total_settled_amount || 0).toLocaleString('en-IN')}
          </div>
          <div className="stat-footer">
            <span style={{ color: '#60a5fa' }}>NEFT/RTGS Batch</span>
            <span>Bank Settled</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Aging Analysis + Vendor Spend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        {/* Invoice Aging Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem' }}>Invoice Aging Analysis</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Outstanding liability by aging buckets</p>
            </div>
            <span className="badge badge-info">Due Date SLA</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {agingData.map((bucket) => {
              const pct = Math.round((bucket.amount / totalAgingAmount) * 100);
              return (
                <div key={bucket.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: bucket.color }} />
                      <span style={{ fontWeight: 600 }}>{bucket.label}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>({bucket.count} invoices)</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      ₹{bucket.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.07)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${Math.max(pct, bucket.count > 0 ? 5 : 0)}%`, 
                        background: bucket.color,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out'
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Total Unpaid AP Pipeline:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', fontFamily: 'var(--font-mono)' }}>
              ₹{(summary.pending_payment_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Vendor-wise Spend Analytics */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.1rem' }}>Top Vendor Spend Analytics</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.78rem' }}>Procurement volume by vendor partner</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('vendors')}>
              View All Vendors
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {vendor_analytics && vendor_analytics.length > 0 ? (
              vendor_analytics.map((v, idx) => (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      background: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#818cf8',
                      fontWeight: 700,
                      fontSize: '0.85rem'
                    }}>
                      {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.vendor_name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        {v.vendor_code} • {v.category}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem' }}>
                      ₹{v.total_spend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{v.invoices_count} invoices</div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No vendor records found</div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Audit Events & Discrepancy Warnings */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
        {/* Exception & Discrepancy Alert Box */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} style={{ color: '#ef4444' }} />
              <h2 style={{ fontSize: '1.1rem' }}>AP Exception Watchdog</h2>
            </div>
            <span className="badge badge-danger">
              {summary.discrepancies + summary.validation_failures} Exceptions Flagged
            </span>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
            Automated rules continuously scan invoices for duplicate numbers, tax calculation deviations, and PO price/qty variances.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, color: '#f87171', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                3-Way PO Variance Detected
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Apex Logistics (INV-APX-7719): Billed freight surcharge exceeds procurement rate card by 12%. Placed on hold.
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontWeight: 600, color: '#fbbf24', fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                Tier 3 SLA Escalation Triggered
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Tata Consultancy (INV-TCS-2026-990): High-value ₹4,13,000 invoice awaiting Finance Director approval.
              </div>
            </div>
          </div>

          <button 
            className="btn btn-secondary btn-sm" 
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => onNavigate('matching')}
          >
            Open 3-Way Reconciliation Module
          </button>
        </div>

        {/* Real-time Audit Trail Feed */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>Real-time Audit Log Feed</h2>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('reports')}>
              Full Logs
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '250px', overflowY: 'auto' }}>
            {recent_audits && recent_audits.length > 0 ? (
              recent_audits.map((log) => (
                <div 
                  key={log.id} 
                  style={{ 
                    padding: '0.55rem 0.75rem', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '3px solid #6366f1',
                    fontSize: '0.78rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.7rem' }}>
                    <span style={{ fontWeight: 600, color: '#cbd5e1' }}>{log.actor_name} ({log.action_type})</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ color: '#e2e8f0', marginTop: '2px' }}>{log.description}</div>
                </div>
              ))
            ) : (
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No recent audit events</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
