# Templegate Accounts Payable (AP) Automation Software with OCR

> **Enterprise AP Automation & Workflow System** developed for **Templegate Technologies & Services Pvt. Ltd.** recruitment evaluation.

---

## 1. Mandatory Technology Stack Compliance

| Layer | Mandated Technology | Implementation Details |
|---|---|---|
| **Frontend** | **ReactJS** | Modern React 19 SPA built with Vite, Vanilla CSS Design System, Lucide Enterprise Icons |
| **Backend** | **Django** | Django 6.1 + Django REST Framework with modular microservice-style architecture |
| **Database** | **PostgreSQL** | Configured with `psycopg2-binary`, `.env.example`, `docker-compose.yml`, and dynamic dev fallback |

---

## 2. Implemented Modules Overview

### 1. Invoice Capture Module
- **Multi-channel ingestion**:
  - Direct file upload (PDF, JPG, JPEG, PNG, TIFF).
  - Drag-and-drop intuitive dropzone.
  - **Bulk Upload Support**: Process batches of invoices simultaneously.
  - **Email Ingestion Simulation**: Dedicated simulator testing inbound automated vendor emails to `invoices@templegate.com`.

### 2. OCR & AI Extraction Module
- Automated extraction of:
  - Header data: Vendor name, Invoice #, Invoice date, Due date, Payment terms.
  - Tax compliance identifiers: GSTIN / PAN.
  - Financial amounts: Subtotal, CGST, SGST, IGST, and Grand Total.
  - Detailed Line Items: Materials & services description, HSN/SAC codes, quantities, unit prices, and line totals.
- **OCR Accuracy Percentage**: Real-time confidence scoring per field and overall invoice confidence (avg ~97.1%).

### 3. Invoice Validation Engine
- Automated verification pipeline executing:
  - **Mandatory Field Validation**: Missing invoice numbers, dates, or non-positive amounts.
  - **Duplicate Invoice Detection**: Flags duplicate invoice numbers from the same vendor.
  - **GST / Statutory Tax Validation**: Validates 15-character Indian GSTIN format and ensures 18%/12%/5% tax rate mathematical accuracy.
  - **Mathematical Consistency**: Cross-checks sum of line items against taxable subtotal and grand total.
  - **Vendor Master Validation**: Checks active registration status and verified banking credentials.

### 4. Purchase Order (PO) Matching Module
- **2-Way Match**: PO vs Invoiced line items and amounts within a configurable 2% price tolerance.
- **3-Way Match**: PO vs Goods Receipt Note (GRN) vs Invoice:
  - Verifies ordered quantity vs warehouse received/accepted quantity vs billed quantity.
  - Real-time line-by-line discrepancy visualizer highlighting price variances and quantity overbilling.

### 5. Workflow & Approval Engine
- **Configurable Approval Matrix**:
  - **Tier 1 (< ₹50,000)**: AP Clerk approval authority (SLA: 24h).
  - **Tier 2 (₹50,000 - ₹2,00,000)**: AP Manager approval authority (SLA: 48h).
  - **Tier 3 (> ₹2,00,000)**: Finance Director / CFO sign-off (SLA: 72h).
- **Role-Based Approvals**: Interactive role switcher (AP Clerk, AP Manager, Finance Director, Admin).
- **Escalation Watchdog**: Flags overdue or high-risk invoices for senior managerial intervention.
- **Workflow Actions**: One-click Approve, Reject, Escalate, and Request Clarification with audit comments.

### 6. Vendor Management Module
- Vendor Master creation (Legal name, Trade name, Category, GSTIN, PAN, Address).
- **Bank Detail Management**: Bank name, Account number, IFSC code, and Account type.
- **1-Click Verifications**: Automated GSTIN format validator and Bank account verification.
- **Onboarding Workflow**: Status lifecycle management (`Draft` → `Pending Review` → `Approved` → `Active`).

### 7. Payment Processing Module
- **Payment Batch Generation**: Disburse single or multiple approved invoices in one corporate run.
- **Bank System Integration**: Exports standard RBI/NPCI NEFT-RTGS bulk payout CSV files ready for upload to corporate banking portals.
- **Official Payment Advice Generation**: Printable, formal Remittance Advice Voucher with UTR tracking, bank remittance details, and invoice breakdowns.

### 8. Executive Dashboard & KPIs
- Visual **Invoice Aging Analysis** (0-30, 31-60, 61-90, 90+ days).
- Real-time **Pending Approvals Counter** with SLA breakdown.
- **Average Turnaround Time (TAT)** metrics.
- **OCR Accuracy Percentage** gauge.
- **Top Vendor Spend Analytics** (spend by vendor & invoice volume).
- **Cash Outflow Pipeline** (Settled vs Pending liability).

### 9. Statutory & Audit Reports
- **AP Aging Report**: Detailed vendor-by-vendor open liability breakdown.
- **Invoice Status Report**: End-to-end lifecycle ledger with CSV export.
- **Exception & Discrepancy Report**: Flagged duplicates, tax anomalies, and matching variances.
- **Immutable Audit Trail**: Chronological event logs capturing actors, roles, timestamps, IP addresses, and deltas.
- **GST Tax & ITC Report (GSTR-2B)**: Input Tax Credit eligibility, CGST/SGST/IGST breakdown.

---

## 3. How to Run Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL (or use Docker / dev mode)

### Backend Setup (Django)
```powershell
# 1. Activate virtual environment
.\venv\Scripts\Activate.ps1

# 2. Navigate to backend
cd backend

# 3. Apply database migrations
python manage.py migrate

# 4. Seed demo data (Pre-populates sample vendors, POs, GRNs, invoices)
python -c "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); django.setup(); from core.views import seed_demo_data; from rest_framework.test import APIRequestFactory; factory = APIRequestFactory(); seed_demo_data(factory.post('/api/seed-demo-data/'))"

# 5. Start Django development server
python manage.py runserver 127.0.0.1:8000
```

### Frontend Setup (ReactJS)
```powershell
# 1. In a new terminal, navigate to frontend
cd frontend

# 2. Install dependencies (if not already installed)
npm install

# 3. Start React application
npm run dev
```
Open your browser at: **`http://127.0.0.1:5173/`**

### Running with PostgreSQL Database
To connect directly to a PostgreSQL instance:
1. Start PostgreSQL (e.g. `docker compose up -d`).
2. Set `USE_POSTGRES=True` and configure credentials in `.env` or system environment:
   ```env
   USE_POSTGRES=True
   DB_NAME=templegate_ap
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_HOST=localhost
   DB_PORT=5432
   ```
3. Run `python manage.py migrate`.
