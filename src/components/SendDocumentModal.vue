<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal">
      <div class="modal-header">
        <h2>Send {{ documentType.toUpperCase() }}</h2>
        <button @click="close" class="modal-close">✕</button>
      </div>

      <div class="modal-body">
        <p class="modal-hint">
          A secure signing link will be sent to <strong>{{ manufacturer.email }}</strong>
        </p>

        <div class="manufacturer-info">
          <div class="info-row">
            <span class="label">Company:</span>
            <span class="value">{{ manufacturer.company_name }}</span>
          </div>
          <div class="info-row">
            <span class="label">Email:</span>
            <span class="value">{{ manufacturer.email }}</span>
          </div>
          <div class="info-row">
            <span class="label">Document:</span>
            <span class="value">{{ documentType.toUpperCase() }}</span>
          </div>
          <div class="info-row">
            <span class="label">Link expires:</span>
            <span class="value">30 days</span>
          </div>
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
      </div>

      <div class="modal-actions">
        <button @click="close" class="btn-secondary">Cancel</button>
        <button @click="sendDocument" :disabled="sending" class="btn-primary">
          {{ sending ? 'Sending...' : 'Send Link' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { generateDocumentToken } from '../lib/documentSigning'

const props = defineProps({
  show: Boolean,
  manufacturer: Object,
  documentType: String, // 'nda' or 'mma'
})

const emit = defineEmits(['close', 'success'])

const sending = ref(false)
const error = ref(null)

watch(() => props.show, (newVal) => {
  if (newVal) {
    error.value = null
  }
})

function close() {
  emit('close')
}

async function sendDocument() {
  if (!props.manufacturer || !props.documentType) return

  sending.value = true
  error.value = null

  try {
    // Genera el token
    const { token, token_expires_at } = await generateDocumentToken(
      props.manufacturer.id,
      props.documentType
    )

    // Construye la URL del portal
    const portalUrl = `${window.location.origin}/portal/sign?token=${token}`

    // Envía el email
    const emailRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signing-link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manufacturer_email: props.manufacturer.email,
        manufacturer_name: props.manufacturer.company_name,
        document_type: props.documentType,
        portal_url: portalUrl,
        expires_at: token_expires_at,
        manufacturer_id: props.manufacturer.id,
      }),
    })

    if (!emailRes.ok) {
      throw new Error('Failed to send email')
    }

    emit('success')
    setTimeout(() => close(), 1500)
  } catch (err) {
    console.error('Error sending document:', err)
    error.value = err.message || 'Failed to send document. Please try again.'
  } finally {
    sending.value = false
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
  padding: 1.5rem 2rem;
  flex: 1;
}

.modal-hint {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin: 0 0 1.5rem;
}

.manufacturer-info {
  background: var(--bg-app);
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid var(--border-light);
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 0.5rem;
  padding-bottom: 0.75rem;
}

.label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.value {
  color: var(--text-main);
  font-weight: 500;
}

.error-message {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #991b1b;
  font-size: 0.9rem;
  margin-bottom: 1rem;
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

.btn-primary,
.btn-secondary {
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  border: none;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--border-light);
  color: var(--text-main);
}
</style>
