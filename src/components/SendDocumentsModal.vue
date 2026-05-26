<template>
  <div v-if="show">
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 9999; display: flex; align-items: center; justify-content: center;">
      <div style="background: white; padding: 2rem; border-radius: 10px; max-width: 500px; z-index: 10000;">
        <h2>{{ manufacturer?.company_name }}</h2>
        <p>Email: {{ manufacturer?.email }}</p>

        <div style="margin: 1.5rem 0;">
          <h3>Documents:</h3>
          <label><input type="checkbox" @change="toggleDocument('nda')" /> NDA</label>
          <label><input type="checkbox" @change="toggleDocument('mma')" /> MMA</label>
        </div>

        <div style="margin: 1.5rem 0;">
          <h3>Language:</h3>
          <label><input type="radio" name="lang" @change="selectedLanguage = 'en'" checked /> English</label>
          <label><input type="radio" name="lang" @change="selectedLanguage = 'es'" /> Español</label>
        </div>

        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
          <button @click="close" style="padding: 0.5rem 1rem; background: #ccc; border: none; border-radius: 5px; cursor: pointer;">Close</button>
          <button @click="sendDocuments" style="padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Send {{ selectedDocuments.length }} Documents
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { generateDocumentToken } from '../lib/documentSigning'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  manufacturer: {
    type: Object,
    default: null
  },
  templatesList: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'success'])

onMounted(() => {})

const selectedDocuments = ref([])
const selectedLanguage = ref('en')
const sending = ref(false)

function toggleDocument(docType) {
  const idx = selectedDocuments.value.indexOf(docType)
  if (idx > -1) {
    selectedDocuments.value.splice(idx, 1)
  } else {
    selectedDocuments.value.push(docType)
  }
}

watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedDocuments.value = []
    selectedLanguage.value = 'en'
  }
})

function close() {
  console.log('Closing modal')
  emit('close')
}

async function sendDocuments() {
  if (selectedDocuments.value.length === 0) {
    alert('Please select at least one document')
    return
  }

  sending.value = true

  try {
    for (const docType of selectedDocuments.value) {
      const { token, token_expires_at } = await generateDocumentToken(
        props.manufacturer.id,
        docType
      )

      const portalUrl = `${window.location.origin}/portal/sign?token=${token}&lang=${selectedLanguage.value}`
      const emailRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-signing-link`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            manufacturer_email: props.manufacturer.email,
            manufacturer_name: props.manufacturer.company_name,
            document_type: docType,
            portal_url: portalUrl,
            expires_at: token_expires_at,
            language: selectedLanguage.value,
          }),
        }
      )

      if (!emailRes.ok) {
        throw new Error(`Failed to send ${docType}`)
      }
    }

    alert('Documents sent!')
    emit('success')
    close()
  } catch (err) {
    console.error('Error:', err)
    alert('Error: ' + err.message)
  } finally {
    sending.value = false
  }
}
</script>
