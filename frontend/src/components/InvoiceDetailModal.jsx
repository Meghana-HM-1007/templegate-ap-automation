import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  FileText, 
  Scan, 
  ShieldCheck, 
  GitMerge, 
  Send, 
  UserCheck, 
  History,
  DollarSign
} from 'lucide-react';
import { 
  triggerInvoiceValidation, 
  triggerPOMatching, 
  submitApprovalAction 
} from '../api';

export default function InvoiceDetailModal({ 
  invoice, 
  userRole, 
  onClose, 
  onUpdate 
}) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, line_items, validation, matching, history
  const [actionComments, setActionComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  if (!invoice) return null;

  const handleAction = async (actionType) => {
    setIsSubmitting(true);
    setActionMessage(null);
    try {
      const updated = await submitApprovalAction(invoice.id, {
        action: actionType,
        user_name: `${userRole.replace('_', ' ')} Officer`,
        user_role: userRole,
        comments: actionComments || `Marked as ${actionType} by ${userRole}.`
      });
      setIsSubmitting(false);
      setActionMessage(`Invoice successfully updated to ${actionType}.`);
      setActionComments('');
      onUpdate && onUpdate(updated);
    } catch (err) {
      setIsSubmitting(false);
      setActionMessage(`Error: ${err.message}`);
    }
  };

  const handleReValidate = async () => {
    setIsSubmitting(true);
    try {
      await triggerInvoiceValidation(invoice.id);
      setIsSubmitting(false);
      onUpdate && onUpdate();
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const handleReMatch = async (matchType) => {
    setIsSubmitting(true);
    try {
      await triggerPOMatching(invoice.id, matchType);
      setIsSubmitting(false);
      onUpdate && onUpdate();
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const getValidationBadge = (status) => {
    if (status === 'PASSED') return <span className="badge badge-success">Passed</span>;
    if (status === 'WARNING') return <span className="badge badge-warning">Warning</span>;
    if (status === 'FAILED') return <span className="badge badge-danger">Failed</span>;
    return <span className="badge badge-info">{status}</span>;
  };

  const getMatchingBadge = (status) => {
    if (status === 'MATCHED') return <span className="badge badge-success">Matched</span>;
    if (status === 'DISCREPANCY') return <span className="badge badge-danger">Discrepancy</span>;
    return <span className="badge badge-info">{status}</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '960px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>
                Invoice {invoice.invoice_number || `Draft #${invoice.id}`}
              </h2>
              {getValidationBadge(invoice.validation_status)}
              {getMatchingBadge(invoice.matching_status)}
              <span className="badge badge-purple">{invoice.approval_tier}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Vendor: <strong style={{ color: '#cbd5e1' }}>{invoice.vendor?.name || invoice.vendor_name_raw}</strong> • Invoiced Date: {invoice.invoice_date || 'N/A'} • Due: {invoice.due_date || 'N/A'}
            </div>
          </div>
          <button 
            id="btn-close-modal"
            className="btn btn-secondary btn-sm" 
            onClick={onClose} 
            style={{ borderRadius: '50%', padding: '0.4rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Subtabs */}
        <div style={{ display: 'flex', background: 'rgba(17, 26, 46, 0.9)', padding: '0.35rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', gap: '0.5rem' }}>
          <button 
            className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('overview')}
          >
            <FileText size={14} />
            <span>Overview & OCR</span>
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'line_items' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('line_items')}
          >
            <span>Line Items ({invoice.line_items?.length || 0})</span>
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'validation' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('validation')}
          >
            <ShieldCheck size={14} />
            <span>Validation Checks</span>
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'matching' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('matching')}
          >
            <GitMerge size={14} />
            <span>PO & GRN Matching</span>
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} />
            <span>Approval History</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {actionMessage && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.82rem' }}>
              {actionMessage}
            </div>
          )}

          {/* TAB 1: OVERVIEW & OCR */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Financial Summary Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>TAXABLE SUBTOTAL</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    ₹{Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>GST / TAX AMOUNT</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    ₹{Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>GRAND TOTAL</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
                    ₹{Number(invoice.grand_total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>OCR CONFIDENCE</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#c084fc' }}>
                    {invoice.ocr_confidence_score}%
                  </div>
                </div>
              </div>

              {/* Vendor & Metadata Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#818cf8' }}>Vendor Master Data</h4>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div><strong>Legal Name:</strong> {invoice.vendor?.name || invoice.vendor_name_raw}</div>
                    <div><strong>Vendor Code:</strong> {invoice.vendor?.vendor_code || 'Unlinked'}</div>
                    <div><strong>GSTIN:</strong> {invoice.vendor?.gstin || 'Missing in Master'}</div>
                    <div><strong>Bank Account:</strong> {invoice.vendor?.account_number ? `****${invoice.vendor.account_number.slice(-4)} (${invoice.vendor.bank_name})` : 'Not verified'}</div>
                    <div><strong>Status:</strong> {invoice.vendor?.status || 'Unknown'}</div>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#818cf8' }}>Capture & Workflow Info</h4>
                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div><strong>Ingestion Source:</strong> {invoice.source}</div>
                    <div><strong>File Name:</strong> {invoice.file_name || 'Direct Input'}</div>
                    <div><strong>Approval Matrix:</strong> {invoice.approval_tier} ({invoice.current_approver_role})</div>
                    <div><strong>Payment Status:</strong> {invoice.payment_status}</div>
                    {invoice.is_escalated && (
                      <div style={{ color: '#ef4444' }}><strong>Escalation Reason:</strong> {invoice.escalation_reason}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Extracted Raw OCR Preview */}
              <div>
                <h4 style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '0.35rem' }}>Raw OCR Text Extracted</h4>
                <pre style={{ 
                  background: 'rgba(0, 0, 0, 0.4)', 
                  padding: '0.85rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: '0.75rem', 
                  maxHeight: '130px', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-subtle)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {invoice.ocr_raw_text || '[No raw text captured]'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: LINE ITEMS TABLE */}
          {activeTab === 'line_items' && (
            <div>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Material / Description</th>
                    <th>HSN/SAC</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Tax Rate</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items?.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td>{item.line_number}</td>
                      <td>
                        <strong>{item.item_description}</strong>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{item.hsn_sac || '-'}</td>
                      <td>{item.quantity} {item.unit_of_measure}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(item.unit_price).toLocaleString('en-IN')}</td>
                      <td>{item.tax_rate}%</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        ₹{Number(item.total_amount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: VALIDATION ENGINE RESULTS */}
          {activeTab === 'validation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '0.95rem' }}>Automated Verification Checklist</h3>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={handleReValidate}
                  disabled={isSubmitting}
                >
                  <span>Re-Run Validation Rules</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {/* 1. Mandatory Fields */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                    <span style={{ fontSize: '0.82rem' }}>Mandatory Fields (Invoice #, Date, Amounts)</span>
                  </div>
                  <span className="badge badge-success">Passed</span>
                </div>

                {/* 2. Duplicate Invoice Check */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {!invoice.is_duplicate ? (
                      <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <AlertOctagon size={16} style={{ color: '#ef4444' }} />
                    )}
                    <span style={{ fontSize: '0.82rem' }}>Duplicate Invoice Validation</span>
                  </div>
                  {!invoice.is_duplicate ? (
                    <span className="badge badge-success">Unique</span>
                  ) : (
                    <span className="badge badge-danger">Duplicate Alert</span>
                  )}
                </div>

                {/* 3. GST / Tax Validation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {invoice.gst_validated ? (
                      <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                    )}
                    <span style={{ fontSize: '0.82rem' }}>GSTIN Statutory Check & Tax Rate Math (18%/12%)</span>
                  </div>
                  {invoice.gst_validated ? (
                    <span className="badge badge-success">Compliant</span>
                  ) : (
                    <span className="badge badge-warning">Review Needed</span>
                  )}
                </div>

                {/* 4. Amount Math Consistency */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {invoice.amount_validated ? (
                      <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <AlertOctagon size={16} style={{ color: '#ef4444' }} />
                    )}
                    <span style={{ fontSize: '0.82rem' }}>Mathematical Consistency (Sum of Items == Total)</span>
                  </div>
                  {invoice.amount_validated ? (
                    <span className="badge badge-success">Exact Match</span>
                  ) : (
                    <span className="badge badge-danger">Math Variance</span>
                  )}
                </div>

                {/* 5. Vendor Master Validation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {invoice.vendor_validated ? (
                      <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                    ) : (
                      <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                    )}
                    <span style={{ fontSize: '0.82rem' }}>Vendor Master Status & Active Banking Records</span>
                  </div>
                  {invoice.vendor_validated ? (
                    <span className="badge badge-success">Verified</span>
                  ) : (
                    <span className="badge badge-warning">Action Required</span>
                  )}
                </div>
              </div>

              {invoice.validation_errors?.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: '0.35rem' }}>Detailed Validation Notices:</h4>
                  {invoice.validation_errors.map((err, i) => (
                    <div key={i} style={{ fontSize: '0.78rem', color: '#fca5a5', padding: '0.35rem 0' }}>
                      • {err.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PO & GRN MATCHING */}
          {activeTab === 'matching' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '0.95rem' }}>PO vs GRN vs Invoice Reconciliation</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Current Mode: {invoice.matching_type}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleReMatch('TWO_WAY')}
                    disabled={isSubmitting}
                  >
                    Run 2-Way Match
                  </button>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => handleReMatch('THREE_WAY')}
                    disabled={isSubmitting}
                  >
                    Run 3-Way Match
                  </button>
                </div>
              </div>

              {invoice.po ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#818cf8', fontWeight: 600 }}>PURCHASE ORDER</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{invoice.po.po_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      PO Total: ₹{Number(invoice.po.total_amount).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#06b6d4', fontWeight: 600 }}>GOODS RECEIPT (GRN)</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      {invoice.grn?.grn_number || 'Auto-Verified with PO'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Status: {invoice.grn?.status || 'Accepted in Warehouse'}
                    </div>
                  </div>

                  <div style={{ padding: '0.85rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 600 }}>INVOICE CLAIM</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{invoice.invoice_number}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Claim: ₹{Number(invoice.grand_total).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No Purchase Order linked to this invoice.</div>
                </div>
              )}

              {/* Matching Status Details */}
              {invoice.matching_discrepancy_details && (
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.35rem' }}>
                    Reconciliation Status: {invoice.matching_status}
                  </div>
                  {invoice.matching_discrepancy_details.message && (
                    <div style={{ fontSize: '0.75rem', color: '#fca5a5' }}>
                      {invoice.matching_discrepancy_details.message}
                    </div>
                  )}
                  {invoice.matching_discrepancy_details.variance_percent !== undefined && (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Variance: ₹{invoice.matching_discrepancy_details.variance_amount} ({invoice.matching_discrepancy_details.variance_percent}%)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: APPROVAL HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {invoice.approval_history?.length > 0 ? (
                invoice.approval_history.map((step, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '0.75rem 1rem', 
                      background: 'rgba(255, 255, 255, 0.02)', 
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid #6366f1'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                      <div>
                        <strong>{step.approver_name}</strong> ({step.approver_role})
                      </div>
                      <span className="badge badge-info">{step.action}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>{step.comments || 'No comments'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.3rem' }}>
                      {new Date(step.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>
                  No previous approval history entries recorded yet.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer / Approval Action Center */}
        <div className="modal-footer" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
            <input
              id="input-action-comments"
              type="text"
              className="form-input"
              placeholder="Add optional reviewer comment / audit justification..."
              value={actionComments}
              onChange={(e) => setActionComments(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Action Authority: <strong style={{ color: '#818cf8' }}>{userRole}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                id="btn-action-escalate"
                className="btn btn-warning btn-sm"
                onClick={() => handleAction('ESCALATED')}
                disabled={isSubmitting}
              >
                <span>Escalate</span>
              </button>

              <button
                id="btn-action-reject"
                className="btn btn-danger btn-sm"
                onClick={() => handleAction('REJECTED')}
                disabled={isSubmitting}
              >
                <span>Reject</span>
              </button>

              <button
                id="btn-action-approve"
                className="btn btn-success btn-sm"
                onClick={() => handleAction('APPROVED')}
                disabled={isSubmitting}
              >
                <CheckCircle2 size={14} />
                <span>Approve Invoice</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
