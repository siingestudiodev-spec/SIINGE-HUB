<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h2>{{ documentType.toUpperCase() }} Status</h2>
        <button @click="close" class="modal-close">✕</button>
      </div>

      <div class="modal-body">
        <!-- NOT SIGNED -->
        <div v-if="!document || !document.is_used" class="status-section unsigned">
          <div class="status-icon">📋</div>
          <h3>Not Signed Yet</h3>
          <p>This {{ documentType.toUpperCase() }} has not been signed.</p>
          <div v-if="document && document.token_expires_at" class="expires-info">
            <p>Current link expires: <strong>{{ formatDate(document.token_expires_at) }}</strong></p>
          </div>
        </div>

        <!-- SIGNED -->
        <div v-else class="status-section signed">
          <div class="status-icon">✅</div>
          <h3>Signed</h3>

          <div class="details-grid">
            <div class="detail-item">
              <span class="label">Signed Date:</span>
              <span class="value">{{ formatDate(document.signed_date) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Signed By:</span>
              <span class="value">{{ document.signed_by_email }}</span>
            </div>
            <div v-if="document.signed_by_name" class="detail-item">
              <span class="label">Name:</span>
              <span class="value">{{ document.signed_by_name }}</span>
            </div>
          </div>

          <div class="success-message">
            <p>✓ This document has been successfully signed and stored.</p>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button
          v-if="document"
          @click="deleteRecord"
          :disabled="deleting"
          class="btn-delete"
        >
          {{ deleting ? 'Deleting...' : 'Delete record' }}
        </button>
        <button @click="close" class="btn-secondary">Close</button>
        <button
          v-if="document && document.is_used"
          @click="downloadPdf"
          :disabled="downloading"
          class="btn-download"
        >
          {{ downloading ? 'Generating...' : '↓ Download PDF' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  show: Boolean,
  document: Object,
  documentType: String, // 'nda' or 'mma'
})

const emit = defineEmits(['close', 'deleted'])
const downloading = ref(false)
const deleting = ref(false)

function close() {
  emit('close')
}

async function deleteRecord() {
  const doc = props.document
  const type = props.documentType.toUpperCase()
  if (!confirm(`Delete this ${type} record? The signature and its PDF are erased and the ${type} goes back to unsigned. This cannot be undone.`)) return

  deleting.value = true
  try {
    const companySlug = (doc.signer_company_name || '')
      .trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase() || 'unsigned'
    await supabase.storage.from('signed_documents').remove([
      `${doc.manufacturer_id}/${companySlug}_${props.documentType}_${doc.id}.pdf`,
      `${doc.manufacturer_id}/${props.documentType}_${doc.id}.pdf`, // legacy path
    ])

    const { data, error } = await supabase
      .from('manufacturer_documents')
      .delete()
      .eq('id', doc.id)
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error('Record was not deleted (check your permissions)')

    // ¿Queda alguna otra firma de este tipo? Si no, el fabricante vuelve a "sin firmar"
    const { count } = await supabase
      .from('manufacturer_documents')
      .select('id', { count: 'exact', head: true })
      .eq('manufacturer_id', doc.manufacturer_id)
      .eq('document_type', props.documentType)
      .eq('is_used', true)

    if (!count) {
      await supabase
        .from('manufacturers')
        .update({ [props.documentType === 'nda' ? 'nda_signed' : 'mma_signed']: false })
        .eq('id', doc.manufacturer_id)
    }

    emit('deleted')
  } catch (err) {
    alert('Error deleting record: ' + err.message)
  } finally {
    deleting.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function downloadPdf() {
  if (!props.document?.id || !props.document?.manufacturer_id) return
  downloading.value = true
  try {
    const companySlug = (props.document.signer_company_name || '')
      .trim().replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase() || 'unsigned'
    const fileName = `${companySlug}_${props.documentType}_signed.pdf`
    const newPath = `${props.document.manufacturer_id}/${companySlug}_${props.documentType}_${props.document.id}.pdf`
    const oldPath = `${props.document.manufacturer_id}/${props.documentType}_${props.document.id}.pdf`
    const dlOpts = { download: fileName }

    let { data, error } = await supabase.storage.from('signed_documents').createSignedUrl(newPath, 3600, dlOpts)

    if (error || !data?.signedUrl) {
      const legacy = await supabase.storage.from('signed_documents').createSignedUrl(oldPath, 3600, dlOpts)
      if (!legacy.error && legacy.data?.signedUrl) { data = legacy.data; error = null }
    }

    // Not in storage — regenerate from saved signature
    if (error || !data?.signedUrl) {
      if (!props.document.signature_base64) throw new Error('No signature data found to regenerate PDF')
      const { generateAndUploadSignedPDF } = await import('../lib/documentSigning')
      await generateAndUploadSignedPDF(
        props.document.id,
        props.documentType,
        props.document.manufacturer_id,
        props.document.signature_base64
      )
      const result = await supabase.storage.from('signed_documents').createSignedUrl(newPath, 3600, dlOpts)
      if (result.error || !result.data?.signedUrl) throw new Error('Could not generate download link')
      data = result.data
    }

    // Force download via blob (avoids blank tab on cross-origin URLs)
    const res = await fetch(data.signedUrl)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    alert('Error generating download link: ' + err.message)
  } finally {
    downloading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--bg-card);
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  border: 1px solid var(--border-main);
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-light);
  padding: 1.5rem 2rem;
  flex-shrink: 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-main);
}

.modal-close {
  background: var(--bg-app);
  border: 1px solid var(--border-main);
  color: var(--text-muted);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
}

.modal-body {
  padding: 2rem;
  flex: 1;
}

.status-section {
  text-align: center;
}

.status-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.status-section h3 {
  font-size: 1.3rem;
  color: var(--text-main);
  margin: 0 0 0.5rem;
}

.status-section p {
  color: var(--text-muted);
  margin: 0.5rem 0;
}

.unsigned {
  color: var(--text-muted);
}

.signed {
  color: #22c55e;
}

.expires-info {
  background: var(--bg-app);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 1rem;
  margin-top: 1.5rem;
  text-align: center;
}

.expires-info p {
  margin: 0;
  font-size: 0.9rem;
}

.details-grid {
  background: var(--bg-app);
  border-radius: 10px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  text-align: left;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-light);
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value {
  color: var(--text-main);
  font-weight: 500;
}

.success-message {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid #22c55e;
  border-radius: 10px;
  padding: 1rem;
  margin-top: 1.5rem;
}

.success-message p {
  margin: 0;
  color: #22c55e;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
  background: var(--bg-app);
  border-radius: 0 0 20px 20px;
}

.btn-secondary {
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  border: none;
  background: var(--border-light);
  color: var(--text-main);
}

.btn-download {
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  border: none;
  background: #22c55e;
  color: white;
}

.btn-delete {
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  border: 1px solid #ef4444;
  background: transparent;
  color: #ef4444;
  margin-right: auto;
}

.btn-delete:disabled,
.btn-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
