import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileCheck, 
  Mail, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Image as ImageIcon,
  ArrowRight,
  Layers
} from 'lucide-react';
import { uploadInvoiceFile, bulkUploadInvoiceFiles, simulateEmailIngestion } from '../api';

export default function InvoiceCaptureView({ onUploadComplete, onSelectInvoice }) {
  const [activeMode, setActiveMode] = useState('dragdrop'); // dragdrop, bulk, email
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [resultMessage, setResultMessage] = useState(null);

  // Email Ingestion form state
  const [emailForm, setEmailForm] = useState({
    from: 'accounts@wipro-systems.com',
    vendor_name: 'Wipro Enterprise Systems',
    subject: 'Tax Invoice INV-WIP-2026-904 for IT Infrastructure Support',
    body: 'Dear Accounts Payable Team, Please find attached tax invoice INV-WIP-2026-904 for quarterly hardware maintenance and cloud support. Total Amount: INR 82,600.00 inclusive of 18% GST.',
    amount: '82600.00'
  });

  const fileInputRef = useRef(null);
  const bulkInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      if (files.length === 1) {
        await processSingleFile(files[0], 'DRAG_DROP');
      } else {
        await processBulkFiles(files);
      }
    }
  };

  const handleFileInputChange = async (e) => {
    const files = e.target.files;
    if (files.length === 1) {
      await processSingleFile(files[0], 'MANUAL_UPLOAD');
    } else if (files.length > 1) {
      await processBulkFiles(files);
    }
  };

  const processSingleFile = async (file, source = 'MANUAL_UPLOAD') => {
    setIsProcessing(true);
    setResultMessage(null);
    setUploadProgress(`Extracting OCR data from ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('source', source);
      formData.append('uploaded_by', 'AP Executive Officer');

      const invoice = await uploadInvoiceFile(formData);
      setIsProcessing(false);
      setUploadProgress(null);
      setResultMessage({
        type: 'success',
        text: `Invoice #${invoice.invoice_number || invoice.id} successfully captured! OCR confidence: ${invoice.ocr_confidence_score}%. Validation Status: ${invoice.validation_status}.`,
        invoice
      });
      onUploadComplete && onUploadComplete();
    } catch (err) {
      setIsProcessing(false);
      setUploadProgress(null);
      setResultMessage({
        type: 'error',
        text: `Error processing file: ${err.message}`
      });
    }
  };

  const processBulkFiles = async (files) => {
    setIsProcessing(true);
    setResultMessage(null);
    setUploadProgress(`Processing batch of ${files.length} invoice files with parallel OCR...`);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }

      const res = await bulkUploadInvoiceFiles(formData);
      setIsProcessing(false);
      setUploadProgress(null);
      setResultMessage({
        type: 'success',
        text: `Batch complete! Successfully ingested and validated ${res.count} invoices.`,
        bulkInvoices: res.invoices
      });
      onUploadComplete && onUploadComplete();
    } catch (err) {
      setIsProcessing(false);
      setUploadProgress(null);
      setResultMessage({
        type: 'error',
        text: `Error during bulk upload: ${err.message}`
      });
    }
  };

  const handleEmailIngestSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setResultMessage(null);
    setUploadProgress('Connecting to vendor mail gateway and extracting invoice attachment...');

    try {
      const invoice = await simulateEmailIngestion(emailForm);
      setIsProcessing(false);
      setUploadProgress(null);
      setResultMessage({
        type: 'success',
        text: `Simulated Email Ingestion succeeded! Created Invoice #${invoice.invoice_number} from ${emailForm.from}.`,
        invoice
      });
      onUploadComplete && onUploadComplete();
    } catch (err) {
      setIsProcessing(false);
      setUploadProgress(null);
      setResultMessage({
        type: 'error',
        text: `Email ingestion failed: ${err.message}`
      });
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.45rem', marginBottom: '0.25rem' }}>Invoice Capture & Multi-Channel Ingestion</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
          Capture invoices across PDF, high-resolution scans, images, and automated email inbox monitoring.
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(17, 26, 46, 0.8)', padding: '0.35rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <button
          id="tab-mode-dragdrop"
          className={`btn ${activeMode === 'dragdrop' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveMode('dragdrop')}
        >
          <UploadCloud size={16} />
          <span>Single File Upload</span>
        </button>

        <button
          id="tab-mode-bulk"
          className={`btn ${activeMode === 'bulk' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveMode('bulk')}
        >
          <Layers size={16} />
          <span>Bulk Upload Queue</span>
        </button>

        <button
          id="tab-mode-email"
          className={`btn ${activeMode === 'email' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1 }}
          onClick={() => setActiveMode('email')}
        >
          <Mail size={16} />
          <span>Email Ingestion Simulator</span>
        </button>
      </div>

      {/* Format Support Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: '#94a3b8' }}>
        <span>Supported Formats:</span>
        <span className="badge badge-purple">PDF</span>
        <span className="badge badge-info">JPG / JPEG</span>
        <span className="badge badge-info">PNG</span>
        <span className="badge badge-warning">TIFF / TIF</span>
      </div>

      {/* Feedback Alert */}
      {resultMessage && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '1rem 1.25rem', 
            borderLeft: `4px solid ${resultMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {resultMessage.type === 'success' ? (
              <CheckCircle2 size={20} style={{ color: '#10b981' }} />
            ) : (
              <AlertCircle size={20} style={{ color: '#ef4444' }} />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {resultMessage.type === 'success' ? 'Ingestion Completed' : 'Ingestion Alert'}
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.8rem' }}>{resultMessage.text}</div>
            </div>
          </div>
          {resultMessage.invoice && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => onSelectInvoice(resultMessage.invoice)}
            >
              <span>Inspect Extraction</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Upload Progress Loader */}
      {isProcessing && (
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>{uploadProgress}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '0.25rem' }}>Running OCR parser and mathematical validation engine...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Mode 1 & 2: Single & Bulk Drag and Drop */}
      {(activeMode === 'dragdrop' || activeMode === 'bulk') && !isProcessing && (
        <div
          id="dropzone-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => activeMode === 'dragdrop' ? fileInputRef.current.click() : bulkInputRef.current.click()}
          style={{
            border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'}`,
            borderRadius: 'var(--radius-xl)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            background: isDragging ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.5)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={bulkInputRef}
            onChange={handleFileInputChange}
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
            style={{ display: 'none' }}
          />

          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(99, 102, 241, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#818cf8'
          }}>
            <UploadCloud size={32} />
          </div>

          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            {activeMode === 'dragdrop' 
              ? 'Drop your invoice file here, or browse' 
              : 'Drop multiple invoices here for batch processing'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '460px', margin: '0 auto 1.25rem' }}>
            Drag and drop standard corporate invoices in PDF, PNG, JPG, or TIFF. The AI engine will instantly extract line items, taxes, amounts, and dates.
          </p>

          <button className="btn btn-primary" type="button">
            <UploadCloud size={16} />
            <span>{activeMode === 'dragdrop' ? 'Select Invoice File' : 'Select Multiple Files'}</span>
          </button>
        </div>
      )}

      {/* Mode 3: Email Ingestion Simulation */}
      {activeMode === 'email' && !isProcessing && (
        <form onSubmit={handleEmailIngestSubmit} className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Mail size={20} style={{ color: '#06b6d4' }} />
            <h2 style={{ fontSize: '1.15rem' }}>Vendor Email Ingestion Gateway Simulator</h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Templegate AP listens to inbound emails sent to <code style={{ color: '#818cf8', fontFamily: 'var(--font-mono)' }}>invoices@templegate.com</code>. Fill this form to simulate an email trigger.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Sender Email (From:)</label>
              <input
                id="email-input-from"
                type="email"
                className="form-input"
                required
                value={emailForm.from}
                onChange={(e) => setEmailForm({ ...emailForm, from: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Vendor Company Name</label>
              <input
                id="email-input-vendor"
                type="text"
                className="form-input"
                required
                value={emailForm.vendor_name}
                onChange={(e) => setEmailForm({ ...emailForm, vendor_name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Subject Line (Includes Invoice #)</label>
            <input
              id="email-input-subject"
              type="text"
              className="form-input"
              required
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Total Amount (INR)</label>
            <input
              id="email-input-amount"
              type="number"
              step="0.01"
              className="form-input"
              required
              value={emailForm.amount}
              onChange={(e) => setEmailForm({ ...emailForm, amount: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Body & Attachment Summary</label>
            <textarea
              id="email-input-body"
              rows={3}
              className="form-textarea"
              value={emailForm.body}
              onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              id="btn-simulate-email-submit"
              type="submit"
              className="btn btn-primary"
            >
              <Mail size={16} />
              <span>Simulate Inbound Ingestion</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
