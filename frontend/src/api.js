const API_BASE_URL = 'http://127.0.0.1:8000/api';

export async function fetchDashboardStats() {
  const res = await fetch(`${API_BASE_URL}/dashboard/stats/`);
  return res.json();
}

export async function fetchInvoices(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE_URL}/invoices/?${query}`);
  const data = await res.json();
  return data.results || data;
}

export async function fetchInvoiceById(id) {
  const res = await fetch(`${API_BASE_URL}/invoices/${id}/`);
  return res.json();
}

export async function uploadInvoiceFile(formData) {
  const res = await fetch(`${API_BASE_URL}/invoices/upload/`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function bulkUploadInvoiceFiles(formData) {
  const res = await fetch(`${API_BASE_URL}/invoices/bulk-upload/`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

export async function simulateEmailIngestion(payload) {
  const res = await fetch(`${API_BASE_URL}/invoices/email-ingest/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function triggerInvoiceValidation(invoiceId) {
  const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/validate/`, {
    method: 'POST',
  });
  return res.json();
}

export async function triggerPOMatching(invoiceId, matchingType = 'THREE_WAY') {
  const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/match/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matching_type: matchingType }),
  });
  return res.json();
}

export async function submitApprovalAction(invoiceId, actionData) {
  const res = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/approve-action/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(actionData),
  });
  return res.json();
}

export async function fetchVendors() {
  const res = await fetch(`${API_BASE_URL}/vendors/`);
  const data = await res.json();
  return data.results || data;
}

export async function createVendor(vendorData) {
  const res = await fetch(`${API_BASE_URL}/vendors/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorData),
  });
  return res.json();
}

export async function verifyVendorGstin(vendorId) {
  const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}/verify-gst/`, {
    method: 'POST',
  });
  return res.json();
}

export async function verifyVendorBank(vendorId) {
  const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}/verify-bank/`, {
    method: 'POST',
  });
  return res.json();
}

export async function updateVendorStatus(vendorId, status) {
  const res = await fetch(`${API_BASE_URL}/vendors/${vendorId}/update-status/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function fetchPurchaseOrders() {
  const res = await fetch(`${API_BASE_URL}/purchase-orders/`);
  const data = await res.json();
  return data.results || data;
}

export async function fetchGrns() {
  const res = await fetch(`${API_BASE_URL}/grns/`);
  const data = await res.json();
  return data.results || data;
}

export async function fetchPayments() {
  const res = await fetch(`${API_BASE_URL}/payments/`);
  const data = await res.json();
  return data.results || data;
}

export async function createPaymentBatch(invoiceIds, paymentMethod = 'NEFT', actorName = 'Finance Controller') {
  const res = await fetch(`${API_BASE_URL}/payments/create-batch/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      invoice_ids: invoiceIds,
      payment_method: paymentMethod,
      actor_name: actorName,
    }),
  });
  return res.json();
}

export async function fetchPaymentAdvice(paymentId) {
  const res = await fetch(`${API_BASE_URL}/payments/${paymentId}/payment-advice/`);
  return res.json();
}

export async function fetchReport(reportType) {
  const res = await fetch(`${API_BASE_URL}/reports/?type=${reportType}`);
  return res.json();
}

export async function seedDemoData() {
  const res = await fetch(`${API_BASE_URL}/seed-demo-data/`, {
    method: 'POST',
  });
  return res.json();
}
