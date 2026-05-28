<template>
  <div class="container">
    <div class="header">
      <h1>Manufacturers</h1>
      <div class="header-actions">
        <button @click="openFolderForm" class="btn-secondary">
          <Folder :size="13" :stroke-width="1.5" /> {{ showFolderForm ? 'Cancel Folder' : '+ New Folder' }}
        </button>
        <button @click="openAddForm" class="btn-primary">
          {{ showForm ? 'Cancel' : '+ Add Manufacturer' }}
        </button>
      </div>
    </div>

    <div v-if="showFolderForm" class="modal-overlay" @keydown.escape="resetFolderForm" tabindex="0">
      <div class="modal">
        <div class="modal-header">
          <h2>Create New Folder</h2>
          <button @click="resetFolderForm" class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="input-group">
              <input v-model="folderForm.name" placeholder="Folder Name *" />
            </div>
          </div>
        </div>
        <div class="modal-actions mt-4">
          <button @click="saveFolder" class="btn-primary">
            CREATE FOLDER
          </button>
          <button @click="resetFolderForm" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="modal-overlay" @keydown.escape="resetForm" tabindex="0">
      <div class="modal modal-large">
        <div class="modal-header">
          <h2>{{ editing ? 'Edit Manufacturer' : 'New Manufacturer' }}</h2>
          <button @click="resetForm" class="modal-close">✕</button>
        </div>
        <div class="modal-body modal-body-scroll">
          <div class="form-grid">
            <div class="input-group"><input v-model="form.company_name" placeholder="Company Name *" /></div>
            <div class="input-group">
              <select v-model="form.folder_id">
                <option :value="null">No Folder</option>
                <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
              </select>
            </div>
            <div class="input-group"><input v-model="form.country" placeholder="Country" /></div>
            <div class="input-group"><input v-model="form.contact_name" placeholder="Contact Name" /></div>
            <div class="input-group"><input v-model="form.phone" placeholder="Phone" /></div>
            <div class="input-group"><input v-model="form.email" placeholder="Email" /></div>
            <div class="input-group"><input v-model="form.website" placeholder="Website" /></div>
            <div class="input-group"><input v-model="form.catalog_url" placeholder="Catalog Link (Google Drive)" /></div>
          </div>

          <div class="categories-section mt-4">
            <label class="section-label">Legal Status</label>
            <div class="legal-grid">
              <label class="legal-checkbox-item">
                <input type="checkbox" v-model="form.nda_signed" />
                <span>NDA Signed</span>
              </label>
              <label class="legal-checkbox-item">
                <input type="checkbox" v-model="form.mma_signed" />
                <span>MMA Signed</span>
              </label>
            </div>
          </div>

          <div class="categories-section mt-4">
            <label class="section-label">Product Categories</label>
            <div class="categories-grid">
              <label v-for="cat in categoryOptions" :key="cat" class="category-checkbox">
                <input type="checkbox" :value="cat" v-model="selectedCategories" />
                <span>{{ cat }}</span>
              </label>
            </div>
          </div>

          <div class="categories-section mt-4">
            <label class="section-label">Certifications</label>
            <select v-model="selectedCertifications" multiple class="multi-select-custom">
              <option v-for="cert in certOptions" :key="cert" :value="cert">{{ cert }}</option>
            </select>
            <p class="text-xs text-gray-400 mt-1">Hold Ctrl (or Cmd on Mac) to select multiple.</p>
          </div>

          <textarea v-model="form.notes" placeholder="Notes (Optional)" rows="3" class="mt-4"></textarea>
        </div>

        <div class="modal-actions mt-4">
          <button @click="saveManufacturer" class="btn-primary">
            {{ editing ? 'UPDATE MANUFACTURER' : 'SAVE MANUFACTURER' }}
          </button>
          <button @click="resetForm" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>

    <div class="filters">
      <input v-model="search" placeholder="Search..." class="search-input" />
      <select v-model="filterFolder" class="filter-select">
        <option value="">All Folders</option>
        <option v-for="f in folders" :key="f.id" :value="f.id">{{ f.name }}</option>
      </select>
      <select v-model="filterCountry" class="filter-select">
        <option value="">All Countries</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="filterCategory" class="filter-select">
        <option value="">All Categories</option>
        <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
      </select>
      <button v-if="search || filterFolder || filterCountry || filterCategory" @click="clearFilters" class="btn-clear">
        ✕ CLEAR
      </button>
      <span class="results-count">{{ filteredManufacturers.length }} result{{ filteredManufacturers.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="loading" class="loading">Loading...</div>
    <div v-else-if="filteredFolders.length === 0 && filteredManufacturers.length === 0" class="empty">No manufacturers or folders found.</div>
    
    <div v-else class="list-container">
      <div v-for="folder in filteredFolders" :key="folder.id" class="folder-section">
        
        <div class="folder-header" @click="toggleFolder(folder.id)">
          <div class="folder-info-wrapper">
            <span class="expand-icon">{{ isExpanded(folder.id) ? '▼' : '▶' }}</span>
            <h2 class="folder-title"><Folder :size="15" :stroke-width="1.5" /> {{ folder.name }}
              <span v-if="folder.manufacturers.length === 0" class="empty-badge">(Empty)</span>
              <span v-else class="empty-badge">({{ folder.manufacturers.length }})</span>
            </h2>
          </div>
          <div class="folder-actions" @click.stop>
            <button @click="editFolder(folder)" class="btn-action-icon btn-edit" title="Edit Folder"><Pencil :size="13" :stroke-width="1.5" /></button>
            <button @click="deleteFolder(folder.id)" class="btn-action-icon btn-delete" title="Delete Folder"><Trash2 :size="13" :stroke-width="1.5" /></button>
          </div>
        </div>
        
        <transition name="slide-fade">
          <div v-show="isExpanded(folder.id)" class="folder-content">
            <div class="folder-manufacturers" v-if="folder.manufacturers.length > 0">
              <div v-for="m in folder.manufacturers" :key="m.id" class="horizontal-card">
                
                <div class="card-identity">
                  <div class="card-avatar">{{ m.company_name?.charAt(0) }}</div>
                  <div class="card-title-block">
                    <h3>{{ m.company_name }}</h3>
                    <div class="badges-row">
                      <span class="country-badge"><Globe :size="11" :stroke-width="1.5" /> {{ m.country || 'Unknown' }}</span>
                      <span v-if="m.nda_signed" class="legal-badge nda" style="cursor:pointer;" @click.stop="openDocumentStatusModal(m, 'nda')">NDA ✓ ↓</span>
                      <span v-if="m.mma_signed" class="legal-badge mma" style="cursor:pointer;" @click.stop="openDocumentStatusModal(m, 'mma')">MMA ✓ ↓</span>
                    </div>
                  </div>
                </div>
                  
                <div class="card-info-block">
                  <div class="contact-info">
                    <div class="info-row" v-if="m.contact_name">
                      <span class="info-icon"><User :size="12" :stroke-width="1.5" /></span><strong>{{ m.contact_name }}</strong>
                    </div>
                    <div class="info-row" v-if="m.phone">
                      <span class="info-icon"><Phone :size="12" :stroke-width="1.5" /></span><a :href="'tel:'+m.phone">{{ m.phone }}</a>
                    </div>
                    <div class="info-row" v-if="m.email">
                      <span class="info-icon"><Mail :size="12" :stroke-width="1.5" /></span><a :href="'mailto:'+m.email">{{ m.email }}</a>
                    </div>
                    <div class="info-row" v-if="m.website">
                      <span class="info-icon"><Globe :size="12" :stroke-width="1.5" /></span><a :href="m.website" target="_blank">Website</a>
                    </div>
                  </div>

                  <div class="tags-section">
                    <div class="info-row align-start" v-if="m.product_categories">
                      <span class="info-icon mt-1"><Tag :size="12" :stroke-width="1.5" /></span>
                      <div class="tags-container">
                        <span v-for="tag in m.product_categories.split(',').map(t => t.trim())" :key="tag" class="category-tag">
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="card-details-block">
                  <div class="info-row" v-if="m.certifications">
                    <span class="info-icon"><FileText :size="12" :stroke-width="1.5" /></span>
                    <button @click="showCertsPopup(m)" class="btn-view-certs">
                      View {{ m.certifications.split(',').length }} Certs
                    </button>
                  </div>
                  
                  <div class="info-row notes-row" v-if="m.notes" @click="showNotesPopup(m.notes)" style="cursor: pointer;">
                    <span class="info-icon"><Edit :size="12" :stroke-width="1.5" /></span>
                    <span class="truncate-text" :title="m.notes">{{ m.notes }}</span>
                  </div>
                    
                  <div v-if="m.followup_due_at && !m.followup_sent_at && !m.followup_manually_completed_at" class="followup-status-row mt-2">
                    <span class="info-icon"><CalendarClock :size="12" :stroke-width="1.5" /></span>
                    <span :class="['followup-chip', followupChipClass(m)]">{{ followupChipLabel(m) }}</span>
                    <button @click.stop="openFollowupModal(m)" class="btn-edit-followup" title="Edit date"><Pencil :size="11" :stroke-width="1.5" /></button>
                  </div>

                  <div v-if="m.manufacturer_email_logs && m.manufacturer_email_logs.length > 0" class="email-history-preview mt-2">
                    <div class="reach-date" :class="{ 'overdue': isOverdue(m.manufacturer_email_logs[0].sent_at) }">
                      <span class="log-icon"><Clock :size="11" :stroke-width="1.5" /></span> {{ m.manufacturer_email_logs[0].template_name }}: {{ new Date(m.manufacturer_email_logs[0].sent_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short' }) }}
                      
                      <span v-if="isSigned(m.manufacturer_email_logs[0])" class="status-badge is-signed">Signed</span>
                      <span v-else-if="m.manufacturer_email_logs[0].read_at" class="status-badge is-read" :title="'Read at: ' + new Date(m.manufacturer_email_logs[0].read_at).toLocaleString()">Read</span>
                      <span v-else class="status-badge is-sent" title="Sent (not read yet)">Sent</span>
                      
                      <span v-if="isOverdue(m.manufacturer_email_logs[0].sent_at) && !m.manufacturer_email_logs[0].read_at" class="warning-icon" title="No response in more than 7 days"><AlertTriangle :size="11" :stroke-width="1.5" /></span>
                    </div>

                    <button v-if="m.manufacturer_email_logs.length > 1" @click="showEmailHistoryPopup(m)" class="btn-view-more mt-1">
                      View All {{ m.manufacturer_email_logs.length }} Logs
                    </button>
                  </div>
                </div>

                <div class="card-actions-vertical">
                  <div class="action-top-row">
                    <button @click="editManufacturer(m)" class="btn-action-icon btn-edit" title="Edit"><Pencil :size="13" :stroke-width="1.5" /></button>
                    <button @click="openLogContactModal(m)" class="btn-action-icon btn-log" title="Log Contact"><ClipboardList :size="13" :stroke-width="1.5" /></button>
                    <button @click="openFollowupModal(m)" class="btn-action-icon btn-followup" title="Schedule Follow-up"><CalendarClock :size="13" :stroke-width="1.5" /></button>
                    <button @click="deleteManufacturer(m.id)" class="btn-action-icon btn-delete" title="Delete"><Trash2 :size="13" :stroke-width="1.5" /></button>
                  </div>
                  <button v-if="m.email && !m.initial_reach_sent" @click="openInitialReachModal(m)" class="btn-action-full btn-initial-reach"><Send :size="12" :stroke-width="2" /> REACH</button>
                  <button v-if="m.initial_reach_sent && !m.initial_reach_responded_at" @click="markResponded(m)" class="btn-action-full btn-responded"><CheckCircle :size="12" :stroke-width="2" /> RESPONDED</button>
                  <button v-if="m.email" @click="openEmailModal(m)" class="btn-action-full btn-email"><Mail :size="12" :stroke-width="2" /> EMAIL</button>
                  <a v-if="m.catalog_url" :href="m.catalog_url" target="_blank" rel="noopener noreferrer" class="btn-action-full btn-catalog"><ExternalLink :size="12" :stroke-width="2" /> CATALOG</a>
                  <button v-if="m.email" @click="openSendDocumentsModal(m)" class="btn-action-full btn-documents"><FileCheck :size="12" :stroke-width="2" /> DOCUMENTS</button>
                </div>

              </div>
            </div>
            <div v-else class="empty-folder-message">
              No manufacturers in this folder yet.
            </div>
          </div>
        </transition>

      </div>
    </div>

    <div v-if="certPopup.show" class="modal-overlay" @click.self="certPopup.show = false">
      <div class="modal max-w-400">
        <div class="modal-header">
          <h2>Verified Certifications</h2>
          <button @click="certPopup.show = false" class="modal-close">✕</button>
        </div>
        <div class="cert-list-popup">
          <div v-for="c in certPopup.list" :key="c" class="cert-item">
            <span class="check-icon-green">✅</span> {{ c.trim() }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="notesPopup.show" class="modal-overlay" @click.self="notesPopup.show = false">
      <div class="modal max-w-500">
        <div class="modal-header">
          <h2 class="title">Notes</h2>
          <button @click="notesPopup.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body" style="padding: 20px; max-height: 400px; overflow-y: auto;">
          <p style="white-space: pre-wrap; line-height: 1.6; color: var(--text-main);">{{ notesPopup.text }}</p>
        </div>
      </div>
    </div>

    <div v-if="emailHistoryPopup.show" class="modal-overlay" @click.self="emailHistoryPopup.show = false">
      <div class="modal max-w-500">
        <div class="modal-header">
          <h2 class="title">Contact History</h2>
          <button @click="emailHistoryPopup.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-body" style="padding: 10px 20px 20px; max-height: 400px; overflow-y: auto;">
          <p class="text-sm text-gray-400 mb-3">All records for <strong>{{ emailHistoryPopup.companyName }}</strong>:</p>
          <div v-for="log in emailHistoryPopup.list" :key="log.id || log.sent_at" class="reach-date full-width mb-2" :class="{ 'overdue': isOverdue(log.sent_at) }">
            <span class="log-icon"><Clock :size="11" :stroke-width="1.5" /></span> {{ log.template_name }}: {{ new Date(log.sent_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) }}

            <span v-if="isSigned(log)" class="status-badge is-signed">Signed</span>
            <span v-else-if="log.read_at" class="status-badge is-read" :title="'Read at: ' + new Date(log.read_at).toLocaleString()">Read</span>
            <span v-else class="status-badge is-sent" title="Sent (not read yet)">Sent</span>

            <span v-if="isOverdue(log.sent_at) && !log.read_at" class="warning-icon" title="No response in more than 7 days"><AlertTriangle :size="11" :stroke-width="1.5" /></span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="logContactModal.show" class="modal-overlay" @click.self="logContactModal.show = false">
      <div class="modal">
        <div class="modal-header">
          <h2 class="title">Log Contact: {{ logContactModal.companyName }}</h2>
          <button @click="logContactModal.show = false" class="modal-close">✕</button>
        </div>
        
        <div class="modal-field mt-3">
          <label>Date of Contact</label>
          <input type="date" v-model="logContactModal.date" />
        </div>
        
        <div class="modal-field mt-3">
          <label>Contact Note / Action</label>
          <input v-model="logContactModal.note" placeholder="E.g., Called to discuss MOQ, Sent tech pack..." />
        </div>
        
        <div class="modal-actions mt-4">
          <button @click="logContactModal.show = false" class="btn-secondary">CANCEL</button>
          <button @click="saveLogContact" class="btn-primary" :disabled="!logContactModal.note.trim() || !logContactModal.date">
            SAVE LOG
          </button>
        </div>
      </div>
    </div>

    <div v-if="emailModal.show" class="modal-overlay" @click.self="emailModal.show = false">
      <div class="modal">
        <div class="modal-header">
          <h2 class="title">{{ emailModal.isInitialReach ? 'Edit & Send Initial Reach' : 'Send Custom Email' }} to {{ emailModal.companyName }}</h2>
          <button @click="emailModal.show = false" class="modal-close">✕</button>
        </div>
        <div class="modal-field">
          <label>To</label>
          <input v-model="emailModal.to" />
        </div>
        
        <div class="modal-field" v-if="!emailModal.isInitialReach">
          <label>Select Template</label>
          <select v-model="emailModal.selectedTemplate" @change="applyTemplate">
            <option value="">-- Choose a template --</option>
            <option v-for="t in templatesList" :key="t.id" :value="t">{{ t.name }}</option>
          </select>
        </div>

        <div class="modal-field">
          <label>Subject</label>
          <input v-model="emailModal.subject" />
        </div>
        
        <div class="modal-field">
          <label>Message</label>
          <textarea v-model="emailModal.body" rows="12"></textarea>
          <div class="signature-notice mt-2">
            ✨ Your SIINGE STUDIO signature will be automatically attached at the bottom.
          </div>
        </div>
        
        <div class="modal-actions mt-4">
          <button @click="emailModal.show = false" class="btn-secondary">CANCEL</button>
          <button @click="sendEmail" class="btn-primary" :disabled="emailModal.sending || (!emailModal.subject || !emailModal.body)">
            {{ emailModal.sending ? 'SENDING...' : 'SEND EMAIL' }}
          </button>
        </div>
      </div>
    </div>

  </div>

  <!-- FOLLOW-UP DATE MODAL -->
  <div v-if="followupModal.show" class="modal-overlay" @click.self="followupModal.show = false">
    <div class="modal max-w-400">
      <div class="modal-header">
        <h2 class="title">Schedule Follow-up</h2>
        <button @click="followupModal.show = false" class="modal-close">✕</button>
      </div>
      <div class="modal-body-pad">
        <p class="followup-modal-hint">
          Set a reminder date for <strong>{{ followupModal.manu?.company_name }}</strong>.
          Aparecerá en la vista de Follow-ups cuando llegue esa fecha.
        </p>
        <div class="modal-field">
          <label>Date</label>
          <input type="date" v-model="followupModal.date" class="modal-input" :min="todayDate" />
        </div>
        <div class="modal-field">
          <label>Notes (optional)</label>
          <input v-model="followupModal.notes" class="modal-input" placeholder="Contexto del follow-up..." />
        </div>
      </div>
      <div class="modal-actions-row">
        <button v-if="followupModal.manu?.followup_due_at" @click="clearFollowup" class="btn-secondary btn-sm-danger">
          <Trash2 :size="13" :stroke-width="1.5" /> Clear
        </button>
        <div style="flex:1"></div>
        <button @click="followupModal.show = false" class="btn-secondary">Cancel</button>
        <button @click="saveFollowup" :disabled="!followupModal.date" class="btn-primary">Save</button>
      </div>
    </div>
  </div>

  <!-- SEND DOCUMENTS MODAL -->
  <div v-if="sendDocumentsModal.show && sendDocumentsModal.manufacturer" class="modal-overlay" @click.self="closeSendDocumentsModal">
    <div class="modal modal-large">
      <div class="modal-header">
        <h2>Send Documents — {{ sendDocumentsModal.manufacturer.company_name }}</h2>
        <button @click="closeSendDocumentsModal" class="modal-close">✕</button>
      </div>
      <div class="modal-body">
        <p style="color: var(--text-muted); font-size: 0.85rem; margin: 0 0 1rem;">
          Sending to: <strong>{{ sendDocumentsModal.manufacturer.email }}</strong>
        </p>

        <!-- DOCUMENT SELECTION -->
        <div class="sdm-section">
          <label class="section-label">Documents to Send</label>
          <div style="display: flex; flex-direction: column; gap: 0.6rem;">
            <label class="sdm-option">
              <input type="checkbox" v-model="sdmSelectedDocs" value="nda" />
              <span>NDA — Non-Disclosure Agreement</span>
            </label>
            <label class="sdm-option">
              <input type="checkbox" v-model="sdmSelectedDocs" value="mma" />
              <span>MMA — Manufacturing Master Agreement</span>
            </label>
          </div>
        </div>

        <!-- LANGUAGE -->
        <div class="sdm-section">
          <label class="section-label">Portal Language</label>
          <div style="display: flex; gap: 1.5rem;">
            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.85rem;">
              <input type="radio" v-model="sdmLanguage" value="en" /> English
            </label>
            <label style="display:flex; align-items:center; gap:0.4rem; cursor:pointer; font-size:0.85rem;">
              <input type="radio" v-model="sdmLanguage" value="es" /> Español
            </label>
          </div>
        </div>

        <!-- EMAIL TEMPLATE -->
        <div class="sdm-section">
          <label class="section-label">Email Message</label>
          <select v-model="sdmTemplate" style="width:100%; padding: 0.6rem 0.9rem; font-size: 0.85rem; border: 1px solid var(--border-main); border-radius: 6px; background: var(--bg-app); color: var(--text-main);">
            <option :value="null">Default message</option>
            <option v-for="t in templatesList" :key="t.id" :value="t">{{ t.name }}</option>
          </select>

          <div v-if="sdmTemplate" style="margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); display:block; margin-bottom:0.25rem;">Subject</label>
              <input
                v-model="sdmEditableSubject"
                type="text"
                style="width:100%; padding: 0.5rem 0.75rem; font-size: 0.85rem; border: 1px solid var(--border-main); border-radius: 6px; background: var(--bg-app); color: var(--text-main); box-sizing: border-box;"
              />
            </div>
            <div>
              <label style="font-size: 0.75rem; color: var(--text-muted); display:block; margin-bottom:0.25rem;">Body</label>
              <textarea
                v-model="sdmEditableBody"
                rows="8"
                style="width:100%; padding: 0.5rem 0.75rem; font-size: 0.85rem; border: 1px solid var(--border-main); border-radius: 6px; background: var(--bg-app); color: var(--text-main); resize: vertical; font-family: inherit; box-sizing: border-box;"
              />
            </div>
            <p style="font-size: 0.72rem; color: var(--text-muted); margin: 0;">
              The signing link button is added automatically at the end.
            </p>
          </div>

          <p v-else style="font-size: 0.73rem; color: var(--text-muted); margin: 0.4rem 0 0;">
            The signing link is added automatically at the end of the message.
          </p>
        </div>

        <div v-if="sdmError" style="background: #fee2e2; border: 1px solid #fca5a5; border-radius: 6px; padding: 0.6rem 0.9rem; color: #991b1b; font-size: 0.8rem;">
          {{ sdmError }}
        </div>
      </div>
      <div class="modal-actions">
        <button @click="closeSendDocumentsModal" class="btn-secondary">Cancel</button>
        <button @click="sendDocuments" :disabled="sdmSelectedDocs.length === 0 || sdmSending" class="btn-primary">
          {{ sdmSending ? 'Sending...' : `Send ${sdmSelectedDocs.length || ''} Document${sdmSelectedDocs.length !== 1 ? 's' : ''}` }}
        </button>
      </div>
    </div>
  </div>

  <!-- DOCUMENT STATUS MODAL -->
  <DocumentStatusModal
    :show="docStatusModal.show"
    :document="docStatusModal.document"
    :document-type="docStatusModal.documentType"
    @close="closeDocumentStatusModal"
  />

</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { Folder, Globe, User, Phone, Mail, Tag, FileText, Edit, Pencil, Trash2, CalendarClock, Clock, AlertTriangle, Send, CheckCircle, ClipboardList, ExternalLink, FileCheck } from 'lucide-vue-next'
import DocumentStatusModal from '../components/DocumentStatusModal.vue'
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY


const manufacturers = ref([])
const folders = ref([])
const templatesList = ref([])
const loading = ref(true)
const showForm = ref(false)
const showFolderForm = ref(false)
const editing = ref(false)
const editingFolder = ref(false)
const editId = ref(null)
const editFolderId = ref(null)
const search = ref('')
const filterFolder = ref('')
const filterCountry = ref('')
const filterCategory = ref('')

const expandedFolders = ref(new Set(['no-folder']))


const categoryOptions = [
  'Activewear', "Children's Wear", 'Swimwear', 'Evening Wear',
  'Streetwear', 'Loungewear', 'Intimate Apparel', 'Leather Goods', 'Accessories',
  "Women's Wear", 'Workwear', 'Shapewear', 'Denim', 'Knit/Crochet'
]
const certOptions = [
  'OEKO-TEX STANDARD 100', 'ISO 45001', 'OCS100', 'UN Global Compact', 
  'GRS', 'ISO9001', 'amfori BSCI', 'SMETA', 'WRAP', 'SA8000', 'ISO 14001', 
  'OEKO-TEX STeP', 'bluesign®', 'GOTS'
]

const selectedCategories = ref([])
const selectedCertifications = ref([])
const certPopup = ref({ show: false, list: [] })
const notesPopup = ref({ show: false, text: '' })
const followupModal = ref({ show: false, manu: null, date: '', notes: '' })
const sendDocumentsModal = ref({ show: false, manufacturer: null })
const docStatusModal = ref({ show: false, document: null, documentType: null })
const sdmSelectedDocs = ref([])
const sdmLanguage = ref('en')
const sdmTemplate = ref(null)
const sdmSending = ref(false)
const sdmError = ref(null)
const sdmEditableSubject = ref('')
const sdmEditableBody = ref('')

watch(sdmTemplate, (tpl) => {
  const company = sendDocumentsModal.value.manufacturer?.company_name ?? ''
  if (tpl) {
    sdmEditableSubject.value = (tpl.subject || '').replace(/\{\{company_name\}\}/g, company)
    sdmEditableBody.value = (tpl.body || '').replace(/\{\{company_name\}\}/g, company)
  } else {
    sdmEditableSubject.value = ''
    sdmEditableBody.value = ''
  }
})

const PLACEHOLDER = '{{company_name}}'
const sdmPreviewSubject = computed(() => {
  if (!sdmTemplate.value || !sendDocumentsModal.value.manufacturer) return ''
  return (sdmTemplate.value.subject || '').split(PLACEHOLDER).join(sendDocumentsModal.value.manufacturer.company_name)
})
const sdmPreviewBody = computed(() => {
  if (!sdmTemplate.value || !sendDocumentsModal.value.manufacturer) return ''
  return (sdmTemplate.value.body || '').split(PLACEHOLDER).join(sendDocumentsModal.value.manufacturer.company_name)
})

const todayDate = new Date().toISOString().split('T')[0]

function followupChipClass(m) {
  const now = new Date()
  const due = new Date(m.followup_due_at)
  const diff = Math.floor((now - due) / 86400000)
  if (diff < 0) return 'chip-upcoming'
  if (diff === 0) return 'chip-today'
  return 'chip-overdue'
}

function followupChipLabel(m) {
  const now = new Date()
  now.setHours(0,0,0,0)
  const due = new Date(m.followup_due_at)
  due.setHours(0,0,0,0)
  const diff = Math.floor((now - due) / 86400000)
  if (diff < 0) return `Follow-up in ${Math.abs(diff)}d`
  if (diff === 0) return 'Follow-up today'
  return `Follow-up ${diff}d overdue`
}

function openFollowupModal(m) {
  followupModal.value = {
    show: true,
    manu: m,
    date: m.followup_due_at ? m.followup_due_at.split('T')[0] : '',
    notes: m.followup_notes || '',
  }
}

async function saveFollowup() {
  if (!followupModal.value.date) return
  const isoDate = new Date(followupModal.value.date + 'T13:00:00Z').toISOString()
  await supabase.from('manufacturers').update({
    followup_due_at: isoDate,
    followup_notes: followupModal.value.notes || null,
    followup_sent_at: null,
    followup_manually_completed_at: null,
  }).eq('id', followupModal.value.manu.id)
  followupModal.value.show = false
  fetchManufacturers()
}

async function clearFollowup() {
  await supabase.from('manufacturers').update({
    followup_due_at: null,
    followup_notes: null,
    followup_sent_at: null,
    followup_manually_completed_at: null,
  }).eq('id', followupModal.value.manu.id)
  followupModal.value.show = false
  fetchManufacturers()
}

async function markResponded(m) {
  await supabase.from('manufacturers').update({
    initial_reach_responded_at: new Date().toISOString(),
    followup_due_at: new Date().toISOString(),
    followup_type: 'call',
    followup_notes: 'Schedule intro call — they responded to initial reach',
    followup_sent_at: null,
    followup_manually_completed_at: null,
  }).eq('id', m.id)
  fetchManufacturers()
}

const emailHistoryPopup = ref({ show: false, list: [], companyName: '' })

const logContactModal = ref({
  show: false,
  manufacturerId: null,
  companyName: '',
  note: '',
  date: new Date().toISOString().split('T')[0]
})

const form = ref({ 
  company_name: '', country: '', contact_name: '', phone: '', 
  email: '', website: '', product_categories: '', certifications: '', notes: '',
  nda_signed: false, mma_signed: false, folder_id: null
})

const folderForm = ref({ name: '' })

const emailModal = ref({ 
  show: false, to: '', subject: '', body: '', sending: false, success: false, 
  error: '', manufacturerId: null, companyName: '', selectedTemplate: '', isInitialReach: false  
})

function toggleFolder(id) {
  if (expandedFolders.value.has(id)) {
    expandedFolders.value.delete(id)
  } else {
    expandedFolders.value.add(id)
  }
}

function isExpanded(id) {
  return expandedFolders.value.has(id)
}

const countries = computed(() => {
  return [...new Set(manufacturers.value.map(m => m.country).filter(Boolean))].sort()
})

const categories = computed(() => {
  const all = manufacturers.value.flatMap(m => m.product_categories ? m.product_categories.split(',').map(c => c.trim()) : [])
  return [...new Set(all)].filter(Boolean).sort()
})

const filteredFolders = computed(() => {
  const folderMap = {}

  folders.value.forEach(f => {
    folderMap[f.id] = { id: f.id, name: f.name, manufacturers: [] }
  })

  folderMap['no-folder'] = { id: 'no-folder', name: 'No Folder', manufacturers: [] }

  filteredManufacturers.value.forEach(m => {
    const folderId = m.folder_id || 'no-folder'
    if (folderMap[folderId]) {
      folderMap[folderId].manufacturers.push(m)
    } else {
      folderMap['no-folder'].manufacturers.push(m)
    }
  })

  return Object.values(folderMap)
    .filter(f => f.manufacturers.length > 0 || (!search.value && !filterCountry.value && !filterCategory.value))
    .sort((a, b) => {
      if (a.id === 'no-folder') return 1
      if (b.id === 'no-folder') return -1
      return a.name.localeCompare(b.name)
    })
})

const filteredManufacturers = computed(() => {
  return manufacturers.value.filter(m => {
    const s = search.value.toLowerCase()
    const matchSearch = !s || 
      m.company_name?.toLowerCase().includes(s) || 
      m.country?.toLowerCase().includes(s) || 
      m.product_categories?.toLowerCase().includes(s)
    const matchCountry = !filterCountry.value || m.country === filterCountry.value
    const matchCategory = !filterCategory.value || m.product_categories?.toLowerCase().includes(filterCategory.value.toLowerCase())
    const matchFolder = !filterFolder.value || m.folder_id === filterFolder.value
    return matchSearch && matchCountry && matchCategory && matchFolder
  })
})

function showCertsPopup(m) { 
  certPopup.value.list = m.certifications.split(',')
  certPopup.value.show = true 
}

function showNotesPopup(notes) {
  notesPopup.value.text = notes
  notesPopup.value.show = true
}

async function showEmailHistoryPopup(m) {
  emailHistoryPopup.value.companyName = m.company_name
  emailHistoryPopup.value.show = true
  const { data } = await supabase
    .from('manufacturer_email_logs')
    .select('id, template_name, sent_at, read_at')
    .eq('manufacturer_id', m.id)
    .order('sent_at', { ascending: false })
  emailHistoryPopup.value.list = data ?? m.manufacturer_email_logs
}

async function saveManufacturer() {
  if (!form.value.company_name) return alert('Name required')
  
  // CREAMOS UN PAYLOAD COMPLETAMENTE LIMPIO CON SOLO LAS COLUMNAS EXISTENTES
  const cleanPayload = {
    company_name: form.value.company_name,
    // Forzamos que si es un string vacío, mande un null real a PostgreSQL
    folder_id: form.value.folder_id === '' ? null : form.value.folder_id, 
    country: form.value.country,
    contact_name: form.value.contact_name,
    phone: form.value.phone,
    email: form.value.email,
    website: form.value.website,
    catalog_url: form.value.catalog_url,
    product_categories: selectedCategories.value.join(','),
    certifications: selectedCertifications.value.join(','),
    notes: form.value.notes,
    nda_signed: form.value.nda_signed,
    mma_signed: form.value.mma_signed
  }

  let err = null
  if (editing.value) {
    const { error } = await supabase.from('manufacturers').update(cleanPayload).eq('id', editId.value)
    err = error
  } else {
    const { error } = await supabase.from('manufacturers').insert([cleanPayload])
    err = error
  }

  if (err) {
    console.error("Error de Supabase:", err)
    return alert('Error guardando en la base de datos: ' + err.message)
  }

  resetForm()
  fetchManufacturers()
}

async function saveFolder() {
  if (!folderForm.value.name.trim()) return alert('Folder name required')
  
  let err = null
  if (editingFolder.value) {
    const { error } = await supabase.from('folders').update({ name: folderForm.value.name }).eq('id', editFolderId.value)
    err = error
  } else {
    const { error } = await supabase.from('folders').insert([{ name: folderForm.value.name }])
    err = error
  }

  if (err) {
    console.error("Error de Supabase al crear carpeta:", err)
    return alert('Error creando la carpeta en la base de datos: ' + err.message)
  }

  resetFolderForm()
  fetchFolders()
}

function editFolder(f) {
  folderForm.value.name = f.name
  editFolderId.value = f.id
  editingFolder.value = true
  showFolderForm.value = true
}

async function deleteFolder(folderId) {
  if (!confirm('Are you sure? This will not delete manufacturers, but they will be moved to "No Folder".')) return
  
  await supabase.from('manufacturers').update({ folder_id: null }).eq('folder_id', folderId)
  await supabase.from('folders').delete().eq('id', folderId)
  
  fetchFolders()
  fetchManufacturers()
}

function resetFolderForm() {
  folderForm.value = { name: '' }
  editingFolder.value = false
  editFolderId.value = null
  showFolderForm.value = false
}

function openFolderForm() {
  if (showFolderForm.value) {
    resetFolderForm()
    return
  }
  resetFolderForm()
  showFolderForm.value = true
}

function editManufacturer(m) {
  form.value = { ...m }
  selectedCategories.value = m.product_categories ? m.product_categories.split(',').map(s => s.trim()) : []
  selectedCertifications.value = m.certifications ? m.certifications.split(',').map(s => s.trim()) : []
  editId.value = m.id
  editing.value = true
  showForm.value = true
}

function resetForm() {
  form.value = {
    company_name: '', country: '', contact_name: '', phone: '',
    email: '', website: '', catalog_url: '', product_categories: '', certifications: '',
    notes: 'MOQ: \nSLT: \nBulk: \n\n1. Certifications: \n2. Can provide traceability: \n3. QC: \n4. Allow Visits: ',
    nda_signed: false, mma_signed: false, folder_id: null
  }
  selectedCategories.value = []
  selectedCertifications.value = []
  editing.value = false
  editId.value = null
  showForm.value = false
}

async function fetchManufacturers() {
  loading.value = true
  const { data } = await supabase
    .from('manufacturers')
    .select('*, manufacturer_email_logs(id, template_name, sent_at, read_at)')
    .order('company_name')
    .order('sent_at', { foreignTable: 'manufacturer_email_logs', ascending: false })
    
  manufacturers.value = data || []
  loading.value = false
}

async function fetchFolders() {
  const { data } = await supabase.from('folders').select('*').order('name')
  folders.value = data || []
}

async function fetchTemplates() {
  const { data } = await supabase.from('templates').select('*').order('name')
  templatesList.value = data || []
}

function openAddForm() {
  if (showForm.value) {
    resetForm()
    return
  }
  resetForm()
  showForm.value = true
}

function clearFilters() { 
  search.value = ''
  filterFolder.value = ''
  filterCountry.value = ''
  filterCategory.value = '' 
}

function openEmailModal(m) { 
  emailModal.value = { 
    show: true, to: m.email, subject: '', body: '', sending: false, 
    success: false, error: '', manufacturerId: m.id, companyName: m.company_name, 
    selectedTemplate: '', isInitialReach: false 
  } 
}

function openInitialReachModal(m) {
  const categoryText = m.product_categories ? m.product_categories : 'various apparel categories'
  const subject = 'Manufacturing Partnership Inquiry | SIINGE STUDIO'
  
  const body = `Hi ${m.company_name},

My name is Luis and I manage Product Operations at SIINGE STUDIO, a US-based apparel development and production partner supporting brands across ${categoryText}.

We currently oversee multiple development programs simultaneously and are selectively expanding our manufacturing network to support upcoming production cycles. Your facility came to our attention as a potential long-term partner.

Before moving into deeper alignment, could you share a brief overview of:

• Primary product categories and technical strengths
• Typical program size or MOQ range
• Whether you support material sourcing or operate CMT
• Approximate sample lead times

At SIINGE, we operate within a structured partnership framework designed to maintain clarity across development timelines, communication workflows, and ethical manufacturing standards, with an emphasis on responsible sourcing and sustainable design methods where applicable. 

Once alignment is confirmed, our onboarding process includes a mutual NDA and Manufacturing Master Agreement to standardize expectations across projects.

If there appears to be mutual fit, we would be glad to continue over email or schedule a short introductory call to learn more about your current capabilities and production focus.`

  emailModal.value = { 
    show: true, 
    to: m.email, 
    subject: subject, 
    body: body, 
    sending: false, 
    success: false, 
    error: '', 
    manufacturerId: m.id, 
    companyName: m.company_name, 
    selectedTemplate: '',
    isInitialReach: true 
  }
}

function applyTemplate() {
  const t = emailModal.value.selectedTemplate
  if (!t) return
  emailModal.value.subject = t.subject.replace(/{{company_name}}/g, emailModal.value.companyName)
  emailModal.value.body = t.body.replace(/{{company_name}}/g, emailModal.value.companyName)
}

function openLogContactModal(m) {
  logContactModal.value = {
    show: true,
    manufacturerId: m.id,
    companyName: m.company_name,
    note: '',
    date: new Date().toISOString().split('T')[0]
  }
}

async function saveLogContact() {
  if (!logContactModal.value.note.trim()) return
  const dateObj = new Date(logContactModal.value.date + 'T12:00:00') 
  const sentAt = dateObj.toISOString()
  await supabase.from('manufacturer_email_logs').insert([{
    manufacturer_id: logContactModal.value.manufacturerId,
    template_name: logContactModal.value.note.trim(),
    sent_at: sentAt
  }])
  logContactModal.value.show = false
  fetchManufacturers()
}

async function sendEmail() {
  emailModal.value.sending = true
  try {
    const templateName = emailModal.value.isInitialReach
      ? 'Initial Reach'
      : (emailModal.value.selectedTemplate?.name || 'Custom Email')

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-manu-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manufacturer_id:  emailModal.value.manufacturerId,
        subject:          emailModal.value.subject,
        body:             emailModal.value.body,
        template_name:    templateName,
        is_initial_reach: emailModal.value.isInitialReach,
      }),
    })

    const result = await res.json()
    if (!res.ok) throw new Error(result.error || 'Failed to send email')

    fetchManufacturers()
    emailModal.value.show = false
  } catch (err) {
    alert('Error sending email: ' + err.message)
    console.error(err)
  } finally {
    emailModal.value.sending = false
  }
}

async function deleteManufacturer(id) {
  if (confirm('Are you sure you want to delete this manufacturer?')) {
    await supabase.from('manufacturers').delete().eq('id', id)
    fetchManufacturers()
  }
}

function openSendDocumentsModal(manufacturer) {
  sdmSelectedDocs.value = []
  sdmLanguage.value = 'en'
  sdmTemplate.value = null
  sdmError.value = null
  sdmEditableSubject.value = ''
  sdmEditableBody.value = ''
  sendDocumentsModal.value.manufacturer = manufacturer
  sendDocumentsModal.value.show = true
}

function closeSendDocumentsModal() {
  sendDocumentsModal.value.show = false
  sendDocumentsModal.value.manufacturer = null
}

async function sendDocuments() {
  if (sdmSelectedDocs.value.length === 0) {
    sdmError.value = 'Please select at least one document'
    return
  }
  sdmSending.value = true
  sdmError.value = null
  try {
    const { generateDocumentToken } = await import('../lib/documentSigning.js')
    const company = sendDocumentsModal.value.manufacturer.company_name
    const tpl = sdmTemplate.value

    // Generate tokens for all documents
    const documentLinks = []
    for (const docType of sdmSelectedDocs.value) {
      const { token, token_expires_at } = await generateDocumentToken(
        sendDocumentsModal.value.manufacturer.id,
        docType
      )
      const portalUrl = `${window.location.origin}/portal/sign?token=${token}&lang=${sdmLanguage.value}`
      documentLinks.push({
        type: docType.toUpperCase(),
        url: portalUrl,
        expires: token_expires_at
      })
    }

    // Build links HTML with correct language
    const btnLabel = (type) => sdmLanguage.value === 'es'
      ? `Revisar y Firmar ${type}`
      : `Review & Sign ${type}`

    const linksHtml = documentLinks.map(doc =>
      `<div style="margin: 1rem 0;"><a href="${doc.url}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">${btnLabel(doc.type)}</a></div>`
    ).join('')

    const expiresDate = new Date(documentLinks[0].expires).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Build custom body with all links
    let emailBody = null
    if (tpl) {
      emailBody = sdmEditableBody.value + `\n\n${linksHtml}`
    } else {
      emailBody = `
        <p>Hi ${company},</p>
        <p>We would like you to review and sign the following documents:</p>
        <p style="font-weight: 600; margin: 1rem 0;">${documentLinks.map(d => d.type).join(' & ')}</p>
        <p>Please click the button(s) below to access the secure signing portal:</p>
        ${linksHtml}
        <p style="color: #666; font-size: 14px;"><strong>Links expire:</strong> ${expiresDate}</p>
        <p>If you have any questions, please reach out to us.</p>
        <p>Best regards,<br><strong>SIINGE STUDIO</strong><br><a href="https://www.siinge.studio" style="color: #6366f1;">www.siinge.studio</a></p>
      `
    }

    const customSubject = tpl
      ? (sdmEditableSubject.value || `${documentLinks.map(d => d.type).join(' & ')} Signing Request — SIINGE STUDIO`)
      : `${documentLinks.map(d => d.type).join(' & ')} Signing Request — SIINGE STUDIO`

    // Send single email with all documents
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-signing-link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manufacturer_email: sendDocumentsModal.value.manufacturer.email,
        manufacturer_name: company,
        document_type: sdmSelectedDocs.value.join('/'),
        portal_url: documentLinks[0].url,
        expires_at: documentLinks[0].expires,
        custom_subject: customSubject,
        custom_body: emailBody,
        manufacturer_id: sendDocumentsModal.value.manufacturer.id,
      }),
    })
    if (!res.ok) throw new Error('Failed to send documents')

    // Log each sent document
    const sentAt = new Date().toISOString()
    for (const docType of sdmSelectedDocs.value) {
      await supabase.from('manufacturer_email_logs').insert([{
        manufacturer_id: sendDocumentsModal.value.manufacturer.id,
        template_name: `${docType.toUpperCase()} sent for signature`,
        sent_at: sentAt,
      }])
    }

    alert(`${sdmSelectedDocs.value.map(d => d.toUpperCase()).join(' & ')} sent successfully!`)
    fetchManufacturers()
    closeSendDocumentsModal()
  } catch (err) {
    sdmError.value = err.message || 'Failed to send documents'
  } finally {
    sdmSending.value = false
  }
}

async function openDocumentStatusModal(manufacturer, documentType) {
  try {
    const { data } = await supabase
      .from('manufacturer_documents')
      .select('*')
      .eq('manufacturer_id', manufacturer.id)
      .eq('document_type', documentType)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    docStatusModal.value.document = data
    docStatusModal.value.documentType = documentType
    docStatusModal.value.show = true
  } catch (err) {
    console.error('Error fetching document status:', err)
    // If no document found, still show modal with "not signed" state
    docStatusModal.value.document = null
    docStatusModal.value.documentType = documentType
    docStatusModal.value.show = true
  }
}

function closeDocumentStatusModal() {
  docStatusModal.value.show = false
  docStatusModal.value.document = null
  docStatusModal.value.documentType = null
}

function isOverdue(dateString) {
  if (!dateString) return false
  return Math.floor((new Date() - new Date(dateString)) / (1000 * 60 * 60 * 24)) >= 7
}

function isSigned(log) {
  return log.template_name?.toLowerCase().includes('signed by')
}

onMounted(() => {
  fetchManufacturers()
  fetchFolders()
  fetchTemplates()
})
</script>

<style scoped>
/* GENERAL LAYOUT */
.container { 
  max-width: 1400px; 
  margin: 0 auto; 
  padding: 2rem 1.5rem; 
  font-family: 'Inter', sans-serif; 
  color: var(--text-body); 
}
.header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 2rem; 
}
h1 { 
  font-size: 2rem; 
  font-weight: 800; 
  color: var(--text-main); 
}

/* NUEVOS ESTILOS PARA CARPETAS INTERACTIVAS */
.folder-section { 
  margin-bottom: 1.5rem; 
  border-radius: 16px; 
  overflow: hidden; 
  background: var(--bg-card); 
  border: 1px solid var(--border-main); 
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}
.folder-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 1.2rem 1.5rem; 
  background: var(--bg-app); 
  cursor: pointer; 
  transition: background 0.2s; 
  user-select: none;
}
.folder-header:hover { 
  background: var(--border-light); 
}
.folder-info-wrapper { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
}
.expand-icon { 
  font-size: 0.8rem; 
  color: var(--text-muted); 
  width: 20px; 
  text-align: center;
  transition: transform 0.3s;
}
.folder-title { 
  font-size: 1.1rem; 
  font-weight: 700; 
  margin: 0; 
  color: var(--text-main);
  display: flex;
  align-items: center;
}

/* Transición para el colapso suave */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
.folder-content {
  padding: 1.5rem;
  border-top: 1px solid var(--border-main);
  background: var(--bg-card);
}

/* FORM & INPUTS */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}
input, textarea, select { 
  width: 100%; 
  padding: 0.7rem 1rem; 
  border: 1px solid var(--border-main); 
  border-radius: 10px; 
  font-size: 0.95rem; 
  background: var(--bg-app); 
  color: var(--text-main);
  transition: all 0.2s; 
  box-sizing: border-box; 
}
input:focus, textarea:focus, select:focus { 
  border-color: var(--primary); 
  outline: none; 
}

/* LEGAL STATUS BADGES */
.legal-grid { 
  display: flex; 
  gap: 1.5rem; 
  margin-top: 0.5rem; 
}
.legal-checkbox-item { 
  display: flex; 
  align-items: center; 
  gap: 0.5rem; 
  font-weight: 600; 
  font-size: 0.85rem; 
  cursor: pointer; 
  color: var(--text-body); 
}
.badges-row { 
  display: flex; 
  gap: 0.4rem; 
  align-items: center; 
  margin-top: 0.4rem; 
  flex-wrap: wrap;
}
.legal-badge { 
  font-size: 0.65rem; 
  padding: 0.15rem 0.4rem; 
  border-radius: 4px; 
  font-weight: 800; 
  color: white; 
  letter-spacing: 0.05em; 
}
.legal-badge.nda { background: #8b5cf6; }
.legal-badge.mma { background: #ec4899; }

/* SECTIONS */
.mt-4 { margin-top: 1.5rem; }
.mt-3 { margin-top: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-1 { margin-top: 0.25rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 1rem; }
.text-sm { font-size: 0.85rem; }

.section-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  letter-spacing: 0.05em;
}
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 0.5rem;
}
.category-checkbox {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.4rem;
  background: var(--bg-app);
  padding: 0.4rem 0.5rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.7rem;
  border: 1px solid var(--border-main);
  user-select: none;
  transition: all 0.2s;
  color: var(--text-body);
}
.category-checkbox:hover { background: var(--border-light); }
.category-checkbox:has(input:checked) { 
  background: rgba(99, 102, 241, 0.1); 
  border-color: var(--primary); 
  color: var(--primary); 
  font-weight: 600; 
}
.multi-select-custom { 
  height: 140px; 
  padding: 0.5rem; 
}

/* FILTERS */
.filters {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  background: transparent;
  padding: 0;
  border-radius: 0;
  border: none;
}
.search-input, .filter-select {
  background: var(--bg-card);
  color: var(--text-main);
  border-color: var(--border-main);
  padding: 0.55rem 0.85rem;
  font-size: 0.9rem;
  flex: 1;
  min-width: 140px;
}
.search-input { min-width: 200px; flex: 2; }
.filter-select { min-width: 130px; }
.results-count { font-size: 0.8rem; color: var(--text-muted); margin-left: auto; white-space: nowrap; }
.btn-clear { padding: 0.55rem 0.85rem; font-size: 0.85rem; }

/* LISTA */
.list-container { 
  display: flex; 
  flex-direction: column; 
  gap: 1.2rem; 
}

.empty-folder-message {
  padding: 1rem 1.5rem;
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.85rem;
  background: rgba(0,0,0,0.05);
  border-radius: 12px;
}
.empty-badge {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: normal;
  margin-left: 0.5rem;
}

.horizontal-card { 
  background: var(--bg-card); 
  border-radius: 16px; 
  border: 1px solid var(--border-main); 
  display: flex; 
  align-items: stretch; 
  transition: transform 0.2s, box-shadow 0.2s; 
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  overflow: hidden; 
  margin-bottom: 1rem;
}

.horizontal-card:hover { 
  transform: translateX(4px); 
  border-color: var(--primary); 
  box-shadow: 0 8px 15px rgba(0,0,0,0.15);
}

/* Bloques */
.card-identity { 
  display: flex; 
  align-items: flex-start; 
  gap: 1rem; 
  min-width: 260px;
  max-width: 300px;
  padding: 1.5rem;
  border-right: 1px solid var(--border-light);
  background: rgba(255,255,255,0.01);
}
.card-avatar { 
  width: 48px; height: 48px; 
  background: linear-gradient(135deg, var(--primary), #8b5cf6); 
  color: white; border-radius: 12px; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 1.3rem; font-weight: 800; 
  flex-shrink: 0;
}
.card-title-block h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-main); line-height: 1.2;}
.country-badge { background: var(--bg-app); color: var(--text-muted); padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; border: 1px solid var(--border-main);}

.card-info-block { 
  flex: 2; 
  padding: 1.5rem;
  display: flex; 
  flex-direction: column; 
  gap: 1rem; 
}
.contact-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
}
.info-row { 
  display: flex; 
  align-items: center; 
  gap: 0.6rem; 
  font-size: 0.9rem; 
  color: var(--text-body); 
}
.info-row a { color: var(--primary); text-decoration: none; font-weight: 500; }

.tags-section { 
  background: rgba(0,0,0,0.1); 
  padding: 0.6rem 0.8rem; 
  border-radius: 10px; 
  border: 1px dashed var(--border-main); 
}
.tags-container { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 0.4rem; 
  flex: 1; 
}
.category-tag {
  background: var(--primary);
  color: white;
  padding: 0.35rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  display: inline-block;
}

.card-details-block {
  flex: 1.5;
  padding: 1.5rem;
  border-left: 1px dashed var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  min-width: 250px;
}
.btn-view-certs { 
  background: var(--bg-app); 
  color: #0ea5e9; 
  border: 1px solid rgba(14, 165, 233, 0.3); 
  padding: 0.3rem 0.8rem; 
  border-radius: 6px; 
  font-size: 0.8rem; 
  cursor: pointer; 
}
.notes-row { 
  background: rgba(0,0,0,0.15); 
  padding: 0.6rem; 
  border-radius: 8px; 
  border-left: 3px solid var(--border-main); 
  color: var(--text-muted); 
  font-style: italic; 
  align-items: flex-start;
}
.truncate-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.8rem;
}

/* HISTORIAL DE CORREOS Y BADGES */
.reach-date { 
  font-size: 0.8rem; 
  color: var(--text-muted); 
  background: rgba(255,255,255,0.02); 
  padding: 0.4rem 0.6rem; 
  border-radius: 8px; 
  display: flex; 
  align-items: center; 
  gap: 0.4rem; 
  border: 1px solid rgba(255,255,255,0.05);
}
.full-width { width: 100%; justify-content: flex-start; }

.status-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: help;
}
.is-sent   { background: rgba(0,0,0,0.1); color: var(--text-muted); border: 1px solid var(--border-main); }
.is-read   { background: rgba(59, 130, 246, 0.15); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); }
.is-signed { background: rgba(34, 197, 94, 0.15); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.3); }
.overdue { background-color: var(--danger-bg); color: var(--danger-text); border: 1px solid rgba(251, 113, 133, 0.3);}
.check-icon-green { font-size: 0.8rem; margin-right: 0.4rem;}

/* Botón de ver más logs */
.btn-view-more {
  background: transparent;
  border: none;
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-decoration-style: dashed;
  text-underline-offset: 3px;
  transition: color 0.2s;
}
.btn-view-more:hover { color: #818cf8; }


/* Bloque 4: Acciones */
.card-actions-vertical { 
  background: rgba(0,0,0,0.15); 
  border-left: 1px solid var(--border-main); 
  padding: 1.5rem 1rem; 
  display: flex; 
  flex-direction: column; 
  gap: 0.6rem; 
  min-width: 140px;
  justify-content: center;
}
.action-top-row { display: flex; justify-content: space-between; gap: 0.3rem;}
.btn-action-icon { background: var(--bg-app); border: 1px solid var(--border-main); border-radius: 6px; padding: 0.4rem; cursor: pointer; flex: 1; display: flex; justify-content: center; align-items: center; transition: 0.2s; }
.btn-action-full { width: 100%; padding: 0.6rem; border-radius: 8px; font-size: 0.75rem; font-weight: 800; border: none; cursor: pointer; text-transform: uppercase; transition: filter 0.2s; }
.btn-initial-reach { background: var(--primary); color: white; }
.btn-email { background: var(--success-bg); color: var(--success-text); }
.btn-responded { background: #d1fae5; color: #065f46; }
.btn-followup:hover { border-color: #f59e0b; background: #fef3c7; }
.btn-catalog { display: flex; align-items: center; justify-content: center; gap: 0.3rem; background: #eff6ff; color: #1d4ed8; text-decoration: none; }
.btn-documents { background: #fef3c7; color: #92400e; }

/* SEND DOCUMENTS MODAL */
.sdm-section { margin-bottom: 0.8rem; }
.sdm-option { display: flex; align-items: center; gap: 0.6rem; cursor: pointer; padding: 0.4rem 0; border: none; background: none; }
.sdm-option:hover { opacity: 0.8; }
.sdm-option input[type="checkbox"] { cursor: pointer; width: 18px; height: 18px; }
.sdm-option span { color: var(--text-main); font-weight: 500; font-size: 0.85rem; }
.sdm-preview { margin-top: 0.5rem; padding: 0.7rem; background: var(--bg-app); border: 1px solid var(--border-light); border-radius: 6px; max-height: 150px; overflow-y: auto; }
.sdm-preview-subject { font-size: 0.8rem; color: var(--text-main); margin-bottom: 0.4rem; font-weight: 600; }
.sdm-preview-body { font-size: 0.75rem; color: var(--text-muted); white-space: pre-wrap; line-height: 1.4; }

/* FOLLOW-UP CHIP */
.followup-status-row { display: flex; align-items: center; gap: 0.4rem; }
.followup-chip { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
.chip-upcoming { background: #ede9fe; color: #7c3aed; }
.chip-today    { background: #fef3c7; color: #d97706; }
.chip-overdue  { background: #fee2e2; color: #dc2626; }
.btn-edit-followup { background: none; border: none; cursor: pointer; font-size: 0.7rem; opacity: 0.5; padding: 0; line-height: 1; }
.btn-edit-followup:hover { opacity: 1; }

/* FOLLOW-UP MODAL */
.followup-modal-hint { font-size: 0.85rem; color: var(--text-body); margin: 0 0 1rem; line-height: 1.5; }
.modal-body-pad { padding: 1.2rem 1.5rem; }
.modal-actions-row { display: flex; align-items: center; gap: 0.6rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-light); }
.btn-sm-danger { color: #dc2626; border-color: #fca5a5; }
.btn-sm-danger:hover { background: #fee2e2; }

/* MODALES */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal { background: var(--bg-card); border-radius: 20px; width: 90%; max-width: 600px; border: 1px solid var(--border-main); display: flex; flex-direction: column; max-height: 90vh; }
.modal-large { max-width: 520px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-light); padding: 1.2rem 1.5rem 0.7rem; flex-shrink: 0; }
.modal-header h2 { margin: 0; font-size: 1.1rem; color: var(--text-main); }
.modal-close { background: var(--bg-app); border: 1px solid var(--border-main); color: var(--text-muted); width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; justify-content: center; align-items: center; font-weight: bold;}
.modal-body { flex: 1; padding: 1rem 1.5rem; overflow-y: auto; }
.modal-body-scroll { max-height: calc(90vh - 200px); }
.modal-actions { display: flex; gap: 0.8rem; justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid var(--border-light); flex-shrink: 0; background: var(--bg-app); border-radius: 0 0 20px 20px; }
.signature-notice { background: rgba(234, 179, 8, 0.1); color: var(--warning-text); padding: 0.5rem 0.8rem; border-radius: 8px; font-size: 0.85rem; border: 1px dashed var(--warning-text); }
.cert-item { background: var(--bg-app); padding: 0.8rem 1rem; border-radius: 8px; margin-bottom: 0.5rem; color: var(--text-main); display: flex; gap: 0.6rem; }
.modal-field { margin-bottom: 1.2rem; }
.modal-field label { display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.05em;}

/* GLOBAL BUTTONS */
.btn-primary { background: var(--primary); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.9rem; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background: var(--border-light); color: var(--text-main); border: none; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
.btn-clear { background: var(--border-light); color: var(--text-muted); border: none; padding: 0.7rem 1rem; border-radius: 8px; cursor: pointer; }
.loading, .empty { text-align: center; padding: 3rem; color: var(--text-muted); }

/* RESPONSIVE */
@media (max-width: 1000px) {
  .horizontal-card { flex-direction: column; align-items: stretch; }
  .card-identity { border-right: none; border-bottom: 1px solid var(--border-light); padding-bottom: 1rem;}
  .card-details-block { border-left: none; border-top: 1px dashed var(--border-light); padding-top: 1rem;}
  .card-actions-vertical { border-left: none; border-top: 1px solid var(--border-main); flex-direction: row; flex-wrap: wrap; }
  .card-actions-vertical > * { flex: 1; min-width: 100px;}
}
</style>