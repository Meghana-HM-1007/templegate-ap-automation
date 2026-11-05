import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { 
  createVendor, 
  verifyVendorGstin, 
  verifyVendorBank, 
  updateVendorStatus 
} from '../api';

export default function VendorManagementView({ 
  vendors = [], 
  onRefresh, 
  isLoading 
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionNotice, setActionNotice] = useState(null);

  // New Vendor Form
  const [form, setForm] = useState({
    vendor_code: `VEN-IND-00${vendors.length + 1}`,
    name: '',
    trade_name: '',
    category: 'IT Hardware & Peripherals',
    contact_person: '',
    email: '',
    phone: '',
    address: 'Bangalore Tech Park',
    gstin: '29AABCT3421K1ZK',
    pan: 'AABCT3421K',
    bank_name: 'HDFC Bank',
    account_number: '5020008819234',
    ifsc_code: 'HDFC0001045',
    account_type: 'Current',
    status: 'PENDING_REVIEW'
  });

  const filtered = vendors.filter(v => 
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.vendor_code && v.vendor_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.gstin && v.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setActionNotice(null);
    try {
      await createVendor(form);
      setShowAddModal(false);
      setActionNotice({ type: 'success', text: `Vendor '${form.name}' added to Master Directory!` });
      onRefresh && onRefresh();
    } catch (err) {
      setActionNotice({ type: 'error', text: `Failed to create vendor: ${err.message}` });
    }
  };

  const handleVerifyGstin = async (vendorId) => {
    setActionNotice(null);
    try {
      const res = await verifyVendorGstin(vendorId);
      setActionNotice({ type: 'success', text: res.message });
      onRefresh && onRefresh();
    } catch (err) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  const handleVerifyBank = async (vendorId) => {
    setActionNotice(null);
    try {
      const res = await verifyVendorBank(vendorId);
      setActionNotice({ type: 'success', text: res.message });
      onRefresh && onRefresh();
    } catch (err) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  const handleStatusChange = async (vendorId, newStatus) => {
    setActionNotice(null);
    try {
      await updateVendorStatus(vendorId, newStatus);
      setActionNotice({ type: 'success', text: `Vendor status updated to ${newStatus}.` });
      onRefresh && onRefresh();
    } catch (err) {
      setActionNotice({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.2rem' }}>Vendor Master & Compliance Management</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
            Central repository of approved suppliers, GSTIN statutory validation, and verified banking remittance details.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            id="btn-add-vendor"
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} />
            <span>Onboard New Vendor</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div style={{ padding: '0.75rem 1rem', background: actionNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${actionNotice.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, borderRadius: 'var(--radius-md)', color: actionNotice.type === 'success' ? '#34d399' : '#f87171', fontSize: '0.85rem' }}>
          {actionNotice.text}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '380px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          id="search-vendors-input"
          type="text"
          className="form-input"
          style={{ paddingLeft: '2.4rem' }}
          placeholder="Search vendor by name, code, or GSTIN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Vendor Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Vendor Details</th>
              <th>Category</th>
              <th>Contact Person</th>
              <th>GSTIN / Tax ID</th>
              <th>Banking Details</th>
              <th>Onboarding Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((v) => (
                <tr key={v.id} id={`vendor-row-${v.id}`}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{v.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#818cf8', fontFamily: 'var(--font-mono)' }}>
                      {v.vendor_code} {v.trade_name ? `• ${v.trade_name}` : ''}
                    </div>
                  </td>

                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>{v.category}</span>
                  </td>

                  <td>
                    <div style={{ fontSize: '0.8rem' }}>{v.contact_person || 'N/A'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{v.email}</div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{v.gstin || 'None'}</span>
                      {v.gst_verified ? (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Verified</span>
                      ) : (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                          onClick={() => handleVerifyGstin(v.id)}
                          title="Verify GSTIN with Tax Engine"
                        >
                          Verify GST
                        </button>
                      )}
                    </div>
                  </td>

                  <td>
                    <div>
                      <div style={{ fontSize: '0.78rem' }}>
                        {v.bank_name || 'Bank'} • <span style={{ fontFamily: 'var(--font-mono)' }}>{v.account_number ? `****${v.account_number.slice(-4)}` : 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>IFSC: {v.ifsc_code}</span>
                        {v.bank_verified ? (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>A/C Active</span>
                        ) : (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                            onClick={() => handleVerifyBank(v.id)}
                            title="Verify Bank Account for Direct Remittance"
                          >
                            Verify Bank
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  <td>
                    <select
                      className="form-select"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      value={v.status}
                      onChange={(e) => handleStatusChange(v.id, e.target.value)}
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PENDING_REVIEW">Pending Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Spend: ₹{Number(v.total_spend || 0).toLocaleString('en-IN')}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  No vendors found in master directory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.15rem' }}>Onboard New Vendor Partner</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div className="form-group">
                  <label className="form-label">Vendor Code</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={form.vendor_code}
                    onChange={(e) => setForm({ ...form, vendor_code: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="IT Hardware & Peripherals">IT Hardware & Peripherals</option>
                    <option value="Cloud Infrastructure & Telecom">Cloud Infrastructure & Telecom</option>
                    <option value="Freight & Logistics">Freight & Logistics</option>
                    <option value="Consulting & Audit">Consulting & Audit</option>
                    <option value="Office Facilities">Office Facilities</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Legal Company Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    placeholder="e.g. Oracle India Private Limited"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.contact_person}
                    onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GSTIN (15 Alphanumeric)</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.pan}
                    onChange={(e) => setForm({ ...form, pan: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={form.bank_name}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={form.account_number}
                    onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={form.ifsc_code}
                    onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Onboarding Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="PENDING_REVIEW">Pending Review</option>
                    <option value="ACTIVE">Active & Approved</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Vendor Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
