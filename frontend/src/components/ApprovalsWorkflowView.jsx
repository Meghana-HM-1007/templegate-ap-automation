import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  UserCheck, 
  ArrowUpRight, 
  Send,
  SlidersHorizontal,
  ChevronRight,
  Filter
} from 'lucide-react';
import { submitApprovalAction } from '../api';

export default function ApprovalsWorkflowView({ 
  invoices = [], 
  userRole, 
  onSelectInvoice, 
  onRefresh 
}) {
  const [tierFilter, setTierFilter] = useState('ALL'); // ALL, TIER_1, TIER_2, TIER_3, ESCALATED
  const [selectedInvoiceForAction, setSelectedInvoiceForAction] = useState(null);
  const [actionComments, setActionComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);

  const pendingInvoices = invoices.filter(inv => inv.approval_status === 'PENDING_APPROVAL' || inv.is_escalated);

  const filtered = pendingInvoices.filter(inv => {
    if (tierFilter === 'ALL') return true;
    if (tierFilter === 'ESCALATED') return inv.is_escalated;
    return inv.approval_tier === tierFilter;
  });

  const handleQuickAction = async (invoice, actionType) => {
    setIsSubmitting(true);
    setActionSuccess(null);
    try {
      await submitApprovalAction(invoice.id, {
        action: actionType,
        user_name: `${userRole.replace('_', ' ')} Officer`,
        user_role: userRole,
        comments: actionComments || `One-click ${actionType} by ${userRole}.`
      });
      setIsSubmitting(false);
      setActionSuccess(`Invoice #${invoice.invoice_number} successfully marked as ${actionType}!`);
      setActionComments('');
      setSelectedInvoiceForAction(null);
      onRefresh && onRefresh();
    } catch (err) {
      setIsSubmitting(false);
      setActionSuccess(`Failed: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>Workflow & Approval Engine Queue</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Multi-tier corporate authorization matrix based on invoice amounts and SLA timers.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Your Role:</span>
          <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>{userRole}</span>
        </div>
      </div>

      {/* Approval Matrix Configuration Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#818cf8' }}>
          <SlidersHorizontal size={16} />
          <span>Active Configurable Corporate Approval Matrix</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.82rem', color: '#34d399' }}>Tier 1: Minor Spend</strong>
              <span className="badge badge-success">AP Clerk</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>&lt; ₹50,000.00 (SLA: 24h)</div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.82rem', color: '#60a5fa' }}>Tier 2: Mid-Level Spend</strong>
              <span className="badge badge-info">AP Manager</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>₹50,000 - ₹2,00,000 (SLA: 48h)</div>
          </div>

          <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '0.82rem', color: '#f87171' }}>Tier 3: Executive Spend</strong>
              <span className="badge badge-danger">Finance Director / CFO</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>&gt; ₹2,00,000 (SLA: 72h / Auto-Escalate)</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(17, 26, 46, 0.8)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
        {[
          { id: 'ALL', label: `All Pending (${pendingInvoices.length})` },
          { id: 'TIER_1', label: 'Tier 1 (< ₹50k)' },
          { id: 'TIER_2', label: 'Tier 2 (₹50k-₹200k)' },
          { id: 'TIER_3', label: 'Tier 3 (> ₹200k)' },
          { id: 'ESCALATED', label: `Overdue / Escalated (${invoices.filter(i => i.is_escalated).length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn btn-sm ${tierFilter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem' }}
            onClick={() => setTierFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionSuccess && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)', color: '#34d399', fontSize: '0.85rem' }}>
          {actionSuccess}
        </div>
      )}

      {/* Pending Approval Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {filtered.length > 0 ? (
          filtered.map((inv) => (
            <div 
              key={inv.id} 
              className="glass-panel" 
              style={{ 
                padding: '1.25rem', 
                borderLeft: `4px solid ${inv.is_escalated ? '#ef4444' : (inv.approval_tier === 'TIER_3' ? '#f59e0b' : '#6366f1')}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>
                    {inv.invoice_number || `Draft #${inv.id}`}
                  </span>
                  <span className="badge badge-purple">{inv.approval_tier}</span>
                  {inv.is_escalated && (
                    <span className="badge badge-danger">
                      <ShieldAlert size={12} /> ESCALATED TO DIRECTOR
                    </span>
                  )}
                  {inv.matching_status === 'DISCREPANCY' && (
                    <span className="badge badge-warning">Variance Flag</span>
                  )}
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.15rem', color: '#34d399' }}>
                  ₹{Number(inv.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                <div>Vendor: <strong style={{ color: '#cbd5e1' }}>{inv.vendor?.name || inv.vendor_name_raw}</strong></div>
                <div>PO Reference: <strong style={{ color: '#cbd5e1' }}>{inv.po?.po_number || 'Direct Non-PO'}</strong></div>
                <div>Invoice Date: <strong style={{ color: '#cbd5e1' }}>{inv.invoice_date}</strong></div>
                <div>Due Date: <strong style={{ color: '#cbd5e1' }}>{inv.due_date}</strong></div>
              </div>

              {inv.is_escalated && inv.escalation_reason && (
                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239, 68, 68, 0.25)', fontSize: '0.75rem', color: '#f87171' }}>
                  <strong>Escalation Cause:</strong> {inv.escalation_reason}
                </div>
              )}

              {/* Action Buttons row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onSelectInvoice(inv)}
                >
                  <span>Inspect Full Breakdown</span>
                  <ChevronRight size={14} />
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={() => handleQuickAction(inv, 'ESCALATED')}
                    disabled={isSubmitting}
                  >
                    <span>Escalate</span>
                  </button>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleQuickAction(inv, 'REJECTED')}
                    disabled={isSubmitting}
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>

                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleQuickAction(inv, 'APPROVED')}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem', color: '#94a3b8' }}>
            <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 0.75rem' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>All Caught Up!</div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>No pending invoices awaiting approval for this tier.</div>
          </div>
        )}
      </div>
    </div>
  );
}
