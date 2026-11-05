import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Bell, 
  Sparkles, 
  FileText, 
  UploadCloud, 
  GitMerge, 
  CheckCircle2, 
  Users, 
  CreditCard, 
  BarChart3,
  RefreshCw
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  userRole, 
  setUserRole, 
  onResetSeed, 
  pendingCount = 0 
}) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'capture', label: 'Invoice Capture', icon: UploadCloud },
    { id: 'invoices', label: 'Invoices Hub', icon: FileText },
    { id: 'matching', label: 'PO Matching', icon: GitMerge },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2, badge: pendingCount },
    { id: 'vendors', label: 'Vendors', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'reports', label: 'Reports', icon: ShieldCheck },
  ];

  return (
    <header className="app-header">
      <div className="brand-badge" onClick={() => setActiveTab('dashboard')} id="brand-logo-btn">
        <div className="brand-logo-icon">
          <Building2 size={24} />
        </div>
        <div>
          <div className="brand-title">Templegate AP</div>
          <div className="brand-subtitle">Automated Accounts Payable</div>
        </div>
      </div>

      <nav className="nav-tab-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              className={`nav-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span style={{
                  background: isActive ? '#ffffff' : '#ef4444',
                  color: isActive ? '#4f46e5' : '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          id="btn-seed-data"
          className="btn btn-secondary btn-sm"
          onClick={onResetSeed}
          title="Reload fresh sample invoices and demo records"
        >
          <Sparkles size={14} style={{ color: '#a855f7' }} />
          <span>Demo Data</span>
        </button>

        <div className="role-badge-box">
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Role:</span>
          <select
            id="role-switcher-select"
            className="role-select"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
          >
            <option value="AP_CLERK">AP Clerk</option>
            <option value="AP_MANAGER">AP Manager</option>
            <option value="FINANCE_DIRECTOR">Finance Director</option>
            <option value="ADMIN">System Admin</option>
          </select>
        </div>

        <div style={{ position: 'relative' }}>
          <button 
            id="btn-notifications"
            className="btn btn-secondary btn-sm" 
            style={{ padding: '0.45rem', borderRadius: '50%' }}
            onClick={() => setActiveTab('approvals')}
            title="Pending Escalations & Reminders"
          >
            <Bell size={16} />
            {pendingCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#ef4444',
                border: '2px solid #0f172a'
              }} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
