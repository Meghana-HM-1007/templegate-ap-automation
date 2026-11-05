import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  FileText, 
  Clock, 
  AlertTriangle, 
  History, 
  Receipt,
  Printer,
  RefreshCw
} from 'lucide-react';
import { fetchReport } from '../api';

export default function ReportsView() {
  const [activeReport, setActiveReport] = useState('ap_aging'); // ap_aging, invoice_status, exceptions, audit_logs, gst_tax
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const reportTabs = [
    { id: 'ap_aging', label: 'AP Aging Report', icon: Clock },
    { id: 'invoice_status', label: 'Invoice Status Report', icon: FileText },
    { id: 'exceptions', label: 'Exceptions & Discrepancies', icon: AlertTriangle },
    { id: 'audit_logs', label: 'Immutable Audit Trail', icon: History },
    { id: 'gst_tax', label: 'GST Tax & ITC (GSTR-2B)', icon: Receipt },
  ];

  const loadReport = async (type) => {
    setIsLoading(true);
    try {
      const data = await fetchReport(type);
      setReportData(data);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setReportData({ error: err.message });
    }
  };

  useEffect(() => {
    loadReport(activeReport);
  }, [activeReport]);

  const handleExportCSV = () => {
    if (!reportData) return;
    let headers = [];
    let rows = [];

    if (activeReport === 'ap_aging' && reportData.data) {
      headers = ['Invoice Number', 'Vendor Name', 'Date', 'Due Date', 'Age (Days)', 'Bucket', 'Amount (INR)', 'Status'];
      rows = reportData.data.map(r => [
        r.invoice_number,
        `"${(r.vendor_name || '').replace(/"/g, '""')}"`,
        r.invoice_date,
        r.due_date,
        r.age_days,
        r.bucket,
        r.amount,
        r.approval_status
      ]);
    } else if (activeReport === 'invoice_status' && reportData.data) {
      headers = ['Invoice Number', 'Vendor', 'PO Number', 'Date', 'Total', 'OCR Score', 'Validation', 'Matching', 'Approval', 'Payment'];
      rows = reportData.data.map(r => [
        r.invoice_number,
        `"${(r.vendor || '').replace(/"/g, '""')}"`,
        r.po_number,
        r.invoice_date,
        r.grand_total,
        r.ocr_score,
        r.validation_status,
        r.matching_status,
        r.approval_status,
        r.payment_status
      ]);
    } else if (activeReport === 'exceptions' && reportData.data) {
      headers = ['Invoice Number', 'Vendor', 'Grand Total', 'Validation Status', 'Matching Status', 'Is Duplicate', 'Is Escalated', 'Reason'];
      rows = reportData.data.map(r => [
        r.invoice_number,
        `"${(r.vendor || '').replace(/"/g, '""')}"`,
        r.grand_total,
        r.validation_status,
        r.matching_status,
        r.is_duplicate,
        r.is_escalated,
        `"${(r.escalation_reason || '').replace(/"/g, '""')}"`
      ]);
    } else if (activeReport === 'audit_logs' && reportData.data) {
      headers = ['Timestamp', 'Action Type', 'Actor', 'Role', 'IP Address', 'Description'];
      rows = reportData.data.map(r => [
        r.timestamp,
        r.action_type,
        r.actor_name,
        r.actor_role,
        r.ip_address,
        `"${(r.description || '').replace(/"/g, '""')}"`
      ]);
    } else if (activeReport === 'gst_tax' && reportData.records) {
      headers = ['Invoice Number', 'Vendor Name', 'GSTIN', 'Date', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', 'ITC Eligibility'];
      rows = reportData.records.map(r => [
        r.invoice_number,
        `"${(r.vendor_name || '').replace(/"/g, '""')}"`,
        r.vendor_gstin,
        r.invoice_date,
        r.taxable_value,
        r.cgst,
        r.sgst,
        r.igst,
        r.total_tax,
        r.itc_eligibility
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `templegate_report_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>Corporate AP Reporting & Audit Intelligence</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Comprehensive statutory tax compliance, aging liability schedules, exception audits, and immutable event logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => loadReport(activeReport)}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Reload</span>
          </button>

          <button
            id="btn-export-report-csv"
            className="btn btn-primary btn-sm"
            onClick={handleExportCSV}
            disabled={isLoading || !reportData}
          >
            <Download size={14} />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(17, 26, 46, 0.8)', padding: '0.3rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
        {reportTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeReport === t.id;
          return (
            <button
              key={t.id}
              className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={() => setActiveReport(t.id)}
            >
              <Icon size={14} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Report Content Container */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            Generating report data...
          </div>
        ) : (
          <div>
            {/* 1. AP Aging Report */}
            {activeReport === 'ap_aging' && reportData?.data && (
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Accounts Payable Aging Schedule (Open Payables)</h2>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Vendor Name</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th>Age</th>
                      <th>Aging Bucket</th>
                      <th>Approval Status</th>
                      <th style={{ textAlign: 'right' }}>Liability (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.invoice_number}</td>
                        <td>{r.vendor_name}</td>
                        <td>{r.invoice_date}</td>
                        <td>{r.due_date}</td>
                        <td>{r.age_days} days</td>
                        <td>
                          <span className={`badge ${r.bucket === '0-30' ? 'badge-success' : (r.bucket === '31-60' ? 'badge-info' : (r.bucket === '61-90' ? 'badge-warning' : 'badge-danger'))}`}>
                            {r.bucket} Days
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-purple">{r.approval_status}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. Invoice Status Report */}
            {activeReport === 'invoice_status' && reportData?.data && (
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Comprehensive Lifecycle Status Report</h2>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Invoice Number</th>
                      <th>Vendor</th>
                      <th>PO Ref</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>OCR</th>
                      <th>Validation</th>
                      <th>Matching</th>
                      <th>Approval</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.invoice_number}</td>
                        <td>{r.vendor}</td>
                        <td>{r.po_number}</td>
                        <td>{r.invoice_date}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          ₹{r.grand_total.toLocaleString('en-IN')}
                        </td>
                        <td>{r.ocr_score}%</td>
                        <td>
                          <span className={`badge ${r.validation_status === 'PASSED' ? 'badge-success' : 'badge-danger'}`}>
                            {r.validation_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${r.matching_status === 'MATCHED' ? 'badge-success' : 'badge-warning'}`}>
                            {r.matching_status}
                          </span>
                        </td>
                        <td>{r.approval_status}</td>
                        <td>
                          <span className={`badge ${r.payment_status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                            {r.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Exceptions & Discrepancies Report */}
            {activeReport === 'exceptions' && reportData?.data && (
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#f87171' }}>Exception, Duplicate & Variance Report</h2>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Vendor</th>
                      <th>Amount</th>
                      <th>Validation Issues</th>
                      <th>Matching Variance</th>
                      <th>Duplicate?</th>
                      <th>Escalated?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.invoice_number}</td>
                        <td>{r.vendor}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{r.grand_total.toLocaleString('en-IN')}</td>
                        <td>
                          {r.validation_errors && r.validation_errors.length > 0 ? (
                            r.validation_errors.map((e, idx) => (
                              <div key={idx} style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
                                • {e.message}
                              </div>
                            ))
                          ) : (
                            <span style={{ color: '#10b981', fontSize: '0.75rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${r.matching_status === 'DISCREPANCY' ? 'badge-danger' : 'badge-success'}`}>
                            {r.matching_status}
                          </span>
                        </td>
                        <td>
                          {r.is_duplicate ? <span className="badge badge-danger">YES</span> : 'No'}
                        </td>
                        <td>
                          {r.is_escalated ? (
                            <span className="badge badge-warning" title={r.escalation_reason}>
                              ESCALATED
                            </span>
                          ) : 'No'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. Immutable Audit Logs */}
            {activeReport === 'audit_logs' && reportData?.data && (
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Immutable Forensic Audit Trail</h2>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event Type</th>
                      <th>Actor Name</th>
                      <th>Role</th>
                      <th>IP</th>
                      <th>Event Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(r.timestamp).toLocaleString()}
                        </td>
                        <td>
                          <span className="badge badge-info">{r.action_type}</span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{r.actor_name}</td>
                        <td style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{r.actor_role}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{r.ip_address}</td>
                        <td style={{ fontSize: '0.8rem' }}>{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 5. GST Tax & ITC (GSTR-2B) Report */}
            {activeReport === 'gst_tax' && reportData?.records && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.1rem' }}>GSTR-2B Input Tax Credit (ITC) Statutory Report</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Eligible inward supplies and tax credits for GST portal filing</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>TOTAL ELIGIBLE ITC</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                      ₹{reportData.summary?.total_input_tax_credit?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Summary Tax Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>TAXABLE SUPPLIES</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      ₹{reportData.summary?.total_taxable_value?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>CENTRAL TAX (CGST)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      ₹{reportData.summary?.total_cgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>STATE TAX (SGST)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      ₹{reportData.summary?.total_sgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>INTEGRATED TAX (IGST)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      ₹{reportData.summary?.total_igst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Supplier Name</th>
                      <th>Supplier GSTIN</th>
                      <th>Date</th>
                      <th>Taxable Value</th>
                      <th>CGST</th>
                      <th>SGST</th>
                      <th>Total GST</th>
                      <th>ITC Eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.records.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 700 }}>{r.invoice_number}</td>
                        <td>{r.vendor_name}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{r.vendor_gstin}</td>
                        <td>{r.invoice_date}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{r.taxable_value.toLocaleString('en-IN')}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{r.cgst.toLocaleString('en-IN')}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{r.sgst.toLocaleString('en-IN')}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{r.total_tax.toLocaleString('en-IN')}</td>
                        <td>
                          <span className={`badge ${r.itc_eligibility === 'Eligible' ? 'badge-success' : 'badge-warning'}`}>
                            {r.itc_eligibility}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
