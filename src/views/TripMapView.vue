<template>
  <div class="trip-map" id="tm-root" :class="[{ placing: !!placing }, 'tab-' + mobileTab]">
    <!-- MOBILE TABS (hidden on desktop, where both panes show at once) -->
    <nav class="tm-tabs">
      <button :class="{ on: mobileTab === 'plan' }" @click="goPlan">
        <LayoutList :size="14" :stroke-width="1.8" /> Plan
        <span v-if="pending" class="tm-tab-badge">{{ pending }}</span>
      </button>
      <button :class="{ on: mobileTab === 'map' }" @click="goMap">
        <MapIcon :size="14" :stroke-width="1.8" /> Map
      </button>
    </nav>

    <!-- SIDEBAR -->
    <aside class="tm-side">
      <div class="tm-side-head">
        <div>
          <router-link to="/trip-map" class="tm-back">← Trips</router-link>
          <h1>{{ trip ? trip.name : 'Trip Map' }}</h1>
          <p class="tm-sub">
            <template v-if="trip">{{ fmtRange(trip.date_start, trip.date_end) || 'no dates' }} · </template>
            <span :class="['tm-save', saveState]">{{ saveLabel }}</span>
            <span v-if="drivingBusy" class="tm-save saving"> · routing…</span>
          </p>
        </div>
        <router-link v-if="trip" :to="`/trip-map/${trip.id}/setup`" class="tm-cog" title="Trip setup">
          <Settings :size="15" :stroke-width="1.6" />
        </router-link>
      </div>

      <div v-if="loadErr" class="tm-warn">{{ loadErr }}</div>
      <div v-else-if="trip && !legs.length" class="tm-warn">
        This trip has no cities yet.
        <router-link :to="`/trip-map/${trip.id}/setup`">Configure it</router-link> to see suppliers on the map.
      </div>

      <div class="tm-controls">
        <input v-model="search" type="search" placeholder="Search supplier…" class="tm-search" />
        <div class="tm-chips">
          <button v-for="c in CAT_KEYS" :key="c"
                  :class="['tm-chip', { on: cats.includes(c) }]"
                  @click="toggleCat(c)">{{ CATS[c] }}</button>
          <button :class="['tm-chip', { on: showSourcing }]" @click="showSourcing = !showSourcing">Material</button>
          <button :class="['tm-chip', { on: byCountry }]" @click="byCountry = !byCountry; renderMarkers()"
                  :title="'Include all of ' + tripCountryList">Whole country</button>
        </div>
        <button class="tm-add" @click="startAddPlace('venue')">
          <MapPin :size="14" :stroke-width="2" /> Add a place we will be at
        </button>
      </div>

      <div class="tm-scroll">
        <!-- LEGS: the spine — every city, how long, and its meetings underneath -->
        <section class="tm-block">
          <div class="tm-block-h static">
            Trip legs <span class="tm-count">{{ legs.length }} cities</span>
          </div>
          <div class="tm-block-body">
            <div v-for="(leg, i) in orderedLegs" :key="leg.id" class="tm-leg" :class="{ open: openLeg === leg.id, dim: leg.off }">
              <button class="tm-leg-h" @click="focusLeg(leg.id)">
                <span class="tm-leg-n">{{ i + 1 }}</span>
                <span class="tm-leg-main">
                  <span class="tm-leg-l1">
                    <span class="tm-leg-nm">{{ leg.city }}</span>
                    <span class="tm-leg-dt">{{ leg.dt }}</span>
                  </span>
                  <span class="tm-leg-l2">
                    <span class="tm-leg-span">{{ leg.span }}</span>
                    <span class="tm-leg-days" :class="{ none: leg.off }">{{ leg.dayLabel }}</span>
                    <span v-if="legStats(leg.id).total" class="tm-leg-ap" :class="{ allok: !legStats(leg.id).pending }">
                      <CalendarDays :size="10" /> {{ legStats(leg.id).confirmed }}/{{ legStats(leg.id).total }}
                    </span>
                  </span>
                </span>
                <ChevronDown :size="14" class="tm-leg-cx" :class="{ rot: openLeg !== leg.id }" />
              </button>

              <!-- meetings hang off the city and stay visible without expanding -->
              <div class="tm-leg-meets">
                <div v-for="d in legAgenda(leg.id)" :key="d.date" class="tm-mday">
                  <div class="tm-mday-h">{{ fmtWeekday(d.date) }} {{ fmtDay(d.date) }}</div>
                  <div v-for="a in d.items" :key="a.id" class="tm-appt" :class="{ ok: a.confirmed }">
                    <button class="tm-appt-chk" @click="toggleConfirmed(a)" :title="a.confirmed ? 'Confirmed — tap to set back to pending' : 'Pending — tap to confirm'">
                      <Check v-if="a.confirmed" :size="11" :stroke-width="3.5" />
                    </button>
                    <span class="tm-appt-t">{{ a.time || '—' }}</span>
                    <span class="tm-appt-nm" @click="selectByKey(a.key)">{{ labelOfKey(a.key) }}</span>
                    <span class="tm-appt-st">{{ a.confirmed ? 'confirmed' : 'pending' }}</span>
                    <a class="tm-appt-ic" :href="gcalOf(a)" target="_blank" rel="noopener" title="Add this meeting to Google Calendar"><CalendarCheck :size="11" /></a><button class="tm-appt-ic" @click="editAppt(a)" title="Edit"><Pencil :size="11" /></button>
                  </div>
                </div>
                <button class="tm-madd" @click="newAppt(null, leg.id)">
                  <CalendarPlus :size="12" /> Add meeting in {{ leg.city }}
                </button>
              </div>

              <div v-if="openLeg === leg.id" class="tm-leg-body">
                <div class="tm-leg-meet">{{ leg.meet }}</div>
                <template v-if="!leg.off">
                  <div class="tm-base-row">
                    <span class="tm-k">Where you are staying</span>
                    <template v-if="stayOf(config.places, leg.id)">
                      <span class="tm-base-lbl">
                        <Hotel :size="11" /> {{ stayOf(config.places, leg.id).label }}
                      </span>
                      <button class="tm-base-btn" @click="editPlace(stayOf(config.places, leg.id))">edit</button>
                      <button class="tm-base-btn" @click="startPlaceMove(stayOf(config.places, leg.id))">move</button>
                    </template>
                    <template v-else>
                      <button class="tm-base-btn arm" @click="startAddPlace('stay', leg.id)">set on map</button>
                      <span class="tm-base-hint">using the centre of {{ leg.city }} for now</span>
                    </template>
                  </div>
                  <div class="tm-leg-sum" :class="{ over: metricsOf(leg.id).over }">
                    <template v-if="metricsOf(leg.id).n">
                      <b>{{ metricsOf(leg.id).n }}</b> stops ·
                      <b>{{ Math.round(metricsOf(leg.id).km) }}</b> km ·
                      <b>{{ fmtMin(metricsOf(leg.id).driveMin) }}</b> driving
                      <span class="tm-est">{{ metricsOf(leg.id).est ? '(estimated)' : '(real roads)' }}</span>
                      <br>≈ <b>{{ fmtH(metricsOf(leg.id).h) }}</b> with visits
                      <template v-if="leg.days"> · {{ metricsOf(leg.id).over ? 'over' : 'fits in' }} {{ leg.days }} {{ leg.days === 1 ? 'day' : 'days' }}</template>
                      <template v-else> · no meeting window</template>
                    </template>
                    <template v-else>No route yet. Tick suppliers below.</template>
                  </div>
                  <div class="tm-leg-acts">
                    <button @click="optimizeLeg(leg.id)" :disabled="optimizing === leg.id">
                      <Navigation :size="12" /> {{ optimizing === leg.id ? 'calculating…' : 'Optimize' }}
                    </button>
                    <button v-if="hasTimes(leg.id)" @click="sortByAppt(leg.id)" title="Follow the booked times instead of the shortest drive">
                      <Clock :size="12" /> By clock
                    </button>
                    <button @click="addNearby(leg.id)">Add nearby</button>
                    <button v-if="routeOf(leg.id).length" @click="clearRoute(leg.id)">Clear</button>
                  </div>
                  <ol v-if="routeOf(leg.id).length" class="tm-rlist">
                    <li v-for="(k, idx) in routeOf(leg.id)" :key="k">
                      <span class="tm-ix">{{ idx + 1 }}</span>
                      <span class="tm-rn" @click="selectByKey(k)">{{ labelOfKey(k) }}</span>
                      <span v-if="nextApptOf(k)" class="tm-rap" :class="{ ok: nextApptOf(k).confirmed }">
                        {{ fmtDay(nextApptOf(k).date) }}<template v-if="nextApptOf(k).time"> {{ nextApptOf(k).time }}</template>
                      </span>
                      <button @click="moveRoute(leg.id, idx, -1)" title="Move up">▲</button>
                      <button @click="moveRoute(leg.id, idx, 1)" title="Move down">▼</button>
                      <button @click="toggleRoute(leg.id, k, false)" title="Remove">✕</button>
                    </li>
                  </ol>
                  <div v-if="poolOf(leg.id).length" class="tm-pick">
                    <label v-for="s in poolOf(leg.id)" :key="s.key">
                      <input type="checkbox" @change="toggleRoute(leg.id, s.key, true)" />
                      {{ s.name }}
                      <span class="tm-pt">{{ Math.round(dist(baseOf(leg.id), s)) }}km</span>
                    </label>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </section>

        <!-- PLACES -->
        <section v-if="trip" class="tm-block">
          <button class="tm-block-h" @click="openPlaces = !openPlaces">
            <ChevronDown :size="14" :class="{ rot: !openPlaces }" />
            Where we will be
            <span class="tm-count">{{ config.places.length }}</span>
          </button>
          <div v-show="openPlaces" class="tm-block-body">
            <p v-if="!config.places.length" class="tm-unloc-tip">
              Hotels, fairs, offices — anywhere you will physically be. The one marked
              <b>Staying here</b> becomes the start of that city's driving route.
            </p>
            <div v-for="p in sortedPlaces" :key="p.id" class="tm-place" :class="'k-' + p.kind">
              <div class="tm-place-top">
                <span class="tm-place-ic">
                  <Hotel v-if="p.kind === 'stay'" :size="12" /><MapPin v-else :size="12" />
                </span>
                <span class="tm-place-nm" @click="selectByKey('c:' + p.id)">{{ p.label || 'Untitled place' }}</span>
                <span class="tm-place-k">{{ PLACE_KINDS[p.kind] }}</span>
              </div>
              <div v-if="p.address" class="tm-place-addr">{{ p.address }}</div>
              <div class="tm-place-bot">
                <span class="tm-place-leg">{{ (legById(p.legId) || {}).city || 'no city' }}</span>
                <span v-if="p.from || p.to" class="tm-place-dt">{{ fmtRange(p.from, p.to) }}</span>
                <span v-if="p.lat == null" class="tm-place-nc">no pin</span>
                <button class="tm-place-btn" @click="editPlace(p)">edit</button>
                <button class="tm-place-btn" @click="startPlaceMove(p)">move pin</button>
              </div>
            </div>
            <button class="tm-more" @click="openPlaceModal({ kind: 'stay', legId: openLeg || (legs[0] || {}).id || '' })">
              + Add a place by address
            </button>
            <button class="tm-more" @click="startAddPlace('stay')">+ Add one by clicking the map</button>
          </div>
        </section>

        <!-- AGENDA -->
        <section v-if="trip" class="tm-block">
          <button class="tm-block-h" @click="openAgenda = !openAgenda">
            <ChevronDown :size="14" :class="{ rot: !openAgenda }" />
            Agenda
            <span class="tm-count">
              <template v-if="stats.total">{{ stats.confirmed }}/{{ stats.total }} confirmed</template>
              <template v-else>empty</template>
            </span>
          </button>
          <div v-show="openAgenda" class="tm-block-body">
            <p v-if="!agenda.length" class="tm-unloc-tip">
              No meetings booked yet. Pick a supplier on the map (or “Book meeting”) to schedule one.
            </p>
            <div v-for="d in agenda" :key="d.date" class="tm-day">
              <div class="tm-day-h">
                <b>{{ fmtWeekday(d.date) }} {{ fmtDay(d.date) }}</b>
                <span class="tm-day-city">{{ cityForDate(d.date) }}</span>
                <span class="tm-day-n">{{ d.items.length }}</span>
              </div>
              <div v-for="a in d.items" :key="a.id" class="tm-appt" :class="{ ok: a.confirmed }">
                <button class="tm-appt-chk" @click="toggleConfirmed(a)"
                        :title="a.confirmed ? 'Confirmed — tap to set back to pending' : 'Pending — tap to confirm'">
                  <Check v-if="a.confirmed" :size="11" :stroke-width="3.5" />
                </button>
                <span class="tm-appt-t">{{ a.time || '—' }}</span>
                <span class="tm-appt-nm" @click="selectByKey(a.key)">{{ labelOfKey(a.key) }}</span>
                <span class="tm-appt-st">{{ a.confirmed ? 'confirmed' : 'pending' }}</span>
                <a class="tm-appt-ic" :href="gcalOf(a)" target="_blank" rel="noopener" title="Add this meeting to Google Calendar"><CalendarCheck :size="11" /></a><button class="tm-appt-ic" @click="editAppt(a)" title="Edit"><Pencil :size="11" /></button>
              </div>
            </div>
            <button v-if="agenda.length" class="tm-more" @click="downloadICS">
              <CalendarDays :size="12" /> Send the agenda to Google Calendar
            </button>
          </div>
        </section>

        <!-- UNLOCATED -->
        <section v-if="unlocatedShown.length" class="tm-block">
          <button class="tm-block-h" @click="openUnloc = !openUnloc">
            <ChevronDown :size="14" :class="{ rot: !openUnloc }" />
            Unlocated <span class="tm-count">{{ unlocatedShown.length }}</span>
          </button>
          <div v-show="openUnloc" class="tm-block-body">
            <p class="tm-unloc-tip">Drop them on the map with “Locate”, or “Auto” to geocode from the address. Use the search above to filter.</p>
            <div v-for="r in unlocatedShown.slice(0, unlocShown)" :key="r.key" class="tm-unloc">
              <div class="tm-unloc-nm">{{ r.name }}<span v-if="r.city" class="tm-unloc-city"> · {{ r.city }}</span></div>
              <div class="tm-unloc-acts">
                <button @click="startPlace(r)" :class="{ arming: placing && placing.key === r.key }">
                  <Crosshair :size="12" /> Locate
                </button>
                <button v-if="r.city || r.address" @click="autoLocate(r)" :disabled="geo === r.key">
                  {{ geo === r.key ? '…' : 'Auto' }}
                </button>
              </div>
            </div>
            <button v-if="unlocatedShown.length > unlocShown" class="tm-more" @click="unlocShown += 30">
              Show {{ Math.min(30, unlocatedShown.length - unlocShown) }} more
            </button>
          </div>
        </section>

        <div class="tm-legend">
          <span><i style="background:var(--critical)"></i>NDA + MMA signed</span>
          <span><i style="background:var(--positive)"></i>Trip folder</span>
          <span><i style="background:var(--info)"></i>Manufacturer</span>
          <span><i style="background:var(--caution)"></i>Material / sourcing</span>
          <span><i style="background:var(--text-subtle);opacity:.4"></i>Not interested</span>
          <span><i style="background:#7c5cbf"></i>Place we will be at</span>
          <span><i style="background:var(--primary)"></i>Where you are staying</span>
          <span><i style="background:var(--ink)"></i>Trip city</span>
          <span><i class="ring"></i>Has a confirmed meeting</span>
        </div>
      </div>
    </aside>

    <!-- MAP -->
    <div class="tm-map-wrap">
      <div ref="mapEl" class="tm-map"></div>
      <div v-if="placing" class="tm-place-hint">
        <span>{{ placeHint }}</span>
        <button @click="cancelPlace">cancel</button>
      </div>

      <!-- DETAIL -->
      <div v-if="selected" class="tm-detail">
        <button class="tm-x" @click="selected = null"><X :size="16" /></button>
        <h2>{{ selected.name }}</h2>
        <div class="tm-d-town">{{ selected.city || selected.town || '' }}<template v-if="selected.country"> · {{ selected.country }}</template></div>
        <div class="tm-d-badges">
          <span class="tm-b" :class="selected.tone">{{ selected.toneLabel }}</span>
          <span v-for="c in selected.catNames" :key="c" class="tm-b">{{ c }}</span>
        </div>
        <div v-if="selected.phone" class="tm-d-row"><span class="tm-k">Tel</span><a :href="'tel:' + selected.phone.replace(/\s/g,'')">{{ selected.phone }}</a></div>
        <div v-if="selected.email" class="tm-d-row"><span class="tm-k">Email</span><a :href="'mailto:' + selected.email">{{ selected.email }}</a></div>
        <div v-if="selected.website" class="tm-d-row"><span class="tm-k">Web</span><a :href="normUrl(selected.website)" target="_blank" rel="noopener">{{ selected.website }}</a></div>
        <div v-if="selected.address" class="tm-d-row"><span class="tm-k">Address</span><a :href="'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(selected.address)" target="_blank" rel="noopener" :title="selected.address">{{ selected.address }}</a></div>
        <div v-if="selected.place && (selected.from || selected.to)" class="tm-d-row">
          <span class="tm-k">There between</span>{{ fmtRange(selected.from, selected.to) }}
        </div>
        <div v-if="selDriving" class="tm-d-drive">
          <span class="tm-k">From {{ selDriving.isBase ? 'where you are staying' : 'the centre' }} in {{ (legById(selDriving.legId) || {}).city }}</span>
          <b>{{ Math.round(selDriving.km) }} km</b> · <b>{{ fmtMin(selDriving.min) }}</b> driving
          <span class="tm-est">{{ selDriving.est ? '(estimated)' : '' }}</span>
        </div>

        <!-- MEETINGS -->
        <div class="tm-appts">
          <span class="tm-k">Meetings</span>
          <div v-for="a in apptsOf(selected.key)" :key="a.id" class="tm-appt" :class="{ ok: a.confirmed }">
            <button class="tm-appt-chk" @click="toggleConfirmed(a)"
                    :title="a.confirmed ? 'Confirmed — tap to set back to pending' : 'Pending — tap to confirm'">
              <Check v-if="a.confirmed" :size="11" :stroke-width="3.5" />
            </button>
            <span class="tm-appt-t">{{ fmtDay(a.date) }}<template v-if="a.time"> {{ a.time }}</template></span>
            <span class="tm-appt-st">{{ a.confirmed ? 'confirmed' : 'pending' }}</span>
            <a class="tm-appt-ic" :href="gcalOf(a)" target="_blank" rel="noopener" title="Add this meeting to Google Calendar"><CalendarCheck :size="11" /></a><button class="tm-appt-ic" @click="editAppt(a)" title="Edit"><Pencil :size="11" /></button>
            <button class="tm-appt-ic" @click="deleteAppt(a.id)" title="Delete"><X :size="11" /></button>
          </div>
          <button class="tm-appt-add" :disabled="!legs.length" @click="newAppt(selected)">
            <CalendarPlus :size="12" /> Schedule a meeting
          </button>
        </div>

        <div v-if="selected.note" class="tm-d-note">{{ selected.note }}</div>
        <div class="tm-d-acts">
          <button v-if="focusLegId && legById(focusLegId)" class="primary"
                  @click="toggleRoute(focusLegId, selected.key, !inRoute(focusLegId, selected.key))">
            {{ inRoute(focusLegId, selected.key) ? 'Remove from ' + legById(focusLegId).city + ' route' : 'Add to ' + legById(focusLegId).city + ' route' }}
          </button>
          <button @click="startPlace(selected, 'move')"><Crosshair :size="12" /> Move pin</button>
          <a v-if="selected.kind === 'm'" :href="'/manufacturers#manu-' + selected.id" class="tm-link-btn">Open record</a>
          <template v-if="selected.place">
            <button @click="editPlace(placeById(selected.id))"><Pencil :size="12" /> Edit place</button>
            <button class="danger" @click="deletePlace(selected.id)"><Trash2 :size="12" /> Delete place</button>
          </template>
        </div>
      </div>
    </div>

    <!-- PLACE MODAL -->
    <div v-if="placeModal" class="tm-modal-back" @click.self="closePlaceModal">
      <div class="tm-modal">
        <h3>{{ placeModal._new ? 'New place' : 'Edit place' }}</h3>
        <label>Name</label>
        <input v-model="placeModal.label" placeholder="Hotel NH Porto, Milano Unica, a contact's office…" />

        <label>Address</label>
        <div class="tm-find">
          <input v-model="placeModal.address" placeholder="Calle de la Cabeza, 11, Madrid"
                 @keyup.enter.prevent="findAddress" />
          <button type="button" @click="findAddress" :disabled="finding || !String(placeModal.address || '').trim()">
            {{ finding ? '…' : 'Find on map' }}
          </button>
        </div>
        <p v-if="findMsg" class="tm-mnote">{{ findMsg }}</p>
        <div v-if="findHits.length" class="tm-hits">
          <button v-for="(h, i) in findHits" :key="i" type="button" class="tm-hit" @click="useHit(h)">
            {{ h.label }}
          </button>
        </div>

        <div class="tm-mrow">
          <div><label>What is it</label>
            <select v-model="placeModal.kind">
              <option v-for="(lbl, k) in PLACE_KINDS" :key="k" :value="k">{{ lbl }}</option>
            </select>
          </div>
          <div><label>City / leg</label>
            <select v-model="placeModal.legId">
              <option value="">— none —</option>
              <option v-for="l in legs" :key="l.id" :value="l.id">{{ l.city }} · {{ l.dt }}</option>
            </select>
          </div>
        </div>
        <div class="tm-mrow">
          <div><label>There from</label><input type="date" v-model="placeModal.from" /></div>
          <div><label>Until</label><input type="date" v-model="placeModal.to" /></div>
        </div>
        <div class="tm-mrow">
          <div><label>Lat</label><input v-model="placeModal.lat" inputmode="decimal" /></div>
          <div><label>Lon</label><input v-model="placeModal.lon" inputmode="decimal" /></div>
        </div>
        <p v-if="placeModal.kind === 'stay' && placeModal.legId" class="tm-mnote">
          Every driving distance for {{ (legById(placeModal.legId) || {}).city }} gets measured from here.
        </p>
        <label>Note</label>
        <textarea v-model="placeModal.note" rows="2" placeholder="Booking ref, hall number, who to ask for…"></textarea>
        <div class="tm-macts">
          <button @click="closePlaceModal">Cancel</button>
          <button class="primary" :disabled="!placeValid" @click="savePlace">Save</button>
        </div>
      </div>
    </div>

    <!-- APPOINTMENT MODAL -->
    <div v-if="apptModal" class="tm-modal-back" @click.self="apptModal = null">
      <div class="tm-modal">
        <h3>
          {{ apptModal._new ? 'Book a meeting' : 'Edit meeting' }}<template v-if="apptLeg"> in {{ apptLeg.city }}</template>
        </h3>

        <label>With</label>
        <select v-if="apptModal._new" v-model="apptModal.key">
          <option value="">— pick who you are meeting —</option>
          <optgroup v-for="g in apptTargets" :key="g.label" :label="g.label">
            <option v-for="r in g.items" :key="r.key" :value="r.key">{{ r.name }}</option>
          </optgroup>
        </select>
        <div v-else class="tm-mstatic">{{ labelOfKey(apptModal.key) }}</div>

        <div class="tm-mrow">
          <div><label>Day</label><input type="date" v-model="apptModal.date" :min="apptMin" :max="apptMax" /></div>
          <div><label>Time</label><input type="time" v-model="apptModal.time" /></div>
        </div>
        <p v-if="apptWarn" class="tm-mwarn">⚠ {{ apptWarn }}</p>
        <p v-else class="tm-mnote">{{ fmtWeekday(apptModal.date) }} in {{ cityForDate(apptModal.date) }} — a real meeting day.</p>

        <label class="tm-mchk">
          <input type="checkbox" v-model="apptModal.confirmed" />
          <span>They confirmed this meeting</span>
        </label>

        <label class="tm-mchk">
          <input type="checkbox" v-model="apptModal.filming" />
          <span>They approve filming on site</span>
        </label>

        <label>Note</label>
        <textarea v-model="apptModal.note" rows="2" placeholder="Who we are seeing, what we are showing, a different address…"></textarea>

        <div class="tm-macts">
          <button v-if="!apptModal._new" class="danger" @click="deleteAppt(apptModal.id); apptModal = null">Delete</button>
          <button @click="apptModal = null">Cancel</button>
          <button class="primary" :disabled="!apptValid" @click="saveAppt">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Crosshair, X, Navigation, Trash2, ChevronDown, Settings,
  Check, CalendarPlus, CalendarDays, CalendarCheck, Clock, Hotel, MapPin, Map as MapIcon, Pencil, LayoutList,
} from 'lucide-vue-next'
import {
  Trips, legFreeDays, fmtRange, fmtDay, fmtDayList, fmtWeekday, inTripRegion, tripCountries,
  PLACE_KINDS, blankPlace, blankAppt, stayOf, apptStats, agendaDays, legForDate, apptDateWarning,
  apptLegFor, normalizeData, tripICS, gcalLink, geocode,
} from '../lib/trips'

const route = useRoute()
const trip = ref(null)
const loadErr = ref('')
const byCountry = ref(false)

/* legs come from the trip record; meeting windows are derived from its dates + blackouts */
const legs = computed(() => {
  if (!trip.value) return []
  const bl = trip.value.blackouts || []
  return (trip.value.legs || []).map(l => {
    const f = legFreeDays(l, bl)
    const nights = Math.max(0, f.all.length - 1)
    return {
      ...l,
      dt: fmtRange(l.from, l.to) || 'no dates',
      span: f.all.length
        ? f.all.length + (f.all.length === 1 ? ' day' : ' days') +
          (nights ? ' \u00b7 ' + nights + (nights === 1 ? ' night' : ' nights') : '')
        : 'no dates',
      days: f.count,
      dayLabel: f.count ? f.count + (f.count === 1 ? ' meeting day' : ' meeting days') : 'no meeting days',
      off: f.count === 0,
      meet: f.count ? 'Meetings: ' + fmtDayList(f.free) : 'No meeting window',
    }
  })
})
const orderedLegs = computed(() => legs.value)
function legById(id) { return legs.value.find(l => l.id === id) }
const tripCountryList = computed(() => trip.value ? tripCountries(trip.value).join(', ') || '—' : '—')
function cityForDate(d) { const l = trip.value && legForDate(trip.value, d); return l ? l.city : '—' }

const CATS = { lin: 'Lingerie', eve: 'Evening', lou: 'Lounge', ath: 'Athletic', swm: 'Swim' }
const CAT_KEYS = Object.keys(CATS)
const CAT_MATCH = [
  ['lin', /intimate|linger|corset|shapewear|hosiery/i],
  ['eve', /evening|bridal|cerimon|gala/i],
  ['lou', /loungewear|lounge|sleep|homewear|pajama|pyjama/i],
  ['ath', /activ|sport|athlet|fitness|performance|technical/i],
  ['swm', /swim|beachwear|bikini/i],
]
function catsFromText(txt) {
  if (!txt) return []
  return CAT_MATCH.filter(([, re]) => re.test(txt)).map(([k]) => k)
}

/* ---------------- state ---------------- */
const mapEl = ref(null)
const manufacturers = ref([])
const sourcing = ref([])
const folders = ref([])
const config = ref({ routes: {}, places: [], appointments: [] })

const search = ref('')
const cats = ref([])
const showSourcing = ref(true)
const openUnloc = ref(false)
const openPlaces = ref(false)
const openAgenda = ref(false)
const unlocShown = ref(30)
const openLeg = ref(null)
const focusLegId = ref(null)
const selected = ref(null)
const placing = ref(null)
const geo = ref(null)
const placeModal = ref(null)
const apptModal = ref(null)
const saveState = ref('idle')
const mobileTab = ref('plan')

let map = null
let markerLayer = null
let routeLayer = null
let channel = null
let saveTimer = null
let pendingFit = null

const saveLabel = computed(() => ({
  idle: 'saved',
  saving: 'saving…',
  error: 'save failed',
}[saveState.value]))

/* ---------------- data ---------------- */
async function load() {
  const [{ data: mf }, { data: sr }, { data: fl }] = await Promise.all([
    supabase.from('manufacturers').select('*'),
    supabase.from('sourcing').select('*'),
    supabase.from('folders').select('id,name'),
  ])
  manufacturers.value = mf || []
  sourcing.value = sr || []
  folders.value = fl || []

  try {
    const t = await Trips.get(route.params.id)
    if (!t) { loadErr.value = 'Trip not found.'; return }
    t.legs = t.legs || []
    t.blackouts = t.blackouts || []
    trip.value = t
    config.value = normalizeData(t.data, t.legs)
  } catch (e) {
    loadErr.value = 'Could not load the trip: ' + (e.message || e)
  }
}

const folderName = computed(() => Object.fromEntries(folders.value.map(f => [f.id, f.name || ''])))
const europeFolderId = computed(() => (folders.value.find(f => /europe trip/i.test(f.name)) || {}).id)

/* normalised stop records — suppliers, materials and our own places in one shape */
const records = computed(() => {
  const out = []
  for (const m of manufacturers.value) {
    const fn = folderName.value[m.folder_id] || ''
    const tone =
      /not interested|no interesa|descartad/i.test(fn) || m.declined_reason ? 'out' :
      m.nda_signed && m.mma_signed ? 'star' :
      m.folder_id && m.folder_id === europeFolderId.value ? 'new' : 'hub'
    out.push({
      key: 'm:' + m.id, kind: 'm', id: m.id,
      name: m.company_name, city: m.city, country: m.country,
      lat: m.lat, lon: m.lon,
      cats: catsFromText(m.product_categories),
      catNames: (m.product_categories || '').split(',').map(s => s.trim()).filter(Boolean),
      phone: m.phone, email: m.email, website: m.website, address: m.address || '',
      note: m.notes || m.declined_reason || '', declined: !!m.declined_reason,
      tone,
      toneLabel: tone === 'star' ? 'NDA + MMA signed' : tone === 'new' ? 'Trip folder' : tone === 'out' ? 'Not interested' : 'Manufacturer',
    })
  }
  for (const s of sourcing.value) {
    let types = []
    try { types = Array.isArray(s.types) ? s.types : JSON.parse(s.types || '[]') } catch (e) { types = [] }
    out.push({
      key: 's:' + s.id, kind: 's', id: s.id,
      name: s.provider, city: s.city, country: s.country,
      lat: s.lat, lon: s.lon,
      cats: catsFromText([types.join(' '), s.notes].filter(Boolean).join(' ')),
      catNames: types,
      phone: s.phone, email: s.email, website: s.website, address: s.address || '',
      note: s.notes || '',
      tone: 'material', toneLabel: 'Material / sourcing',
    })
  }
  for (const p of config.value.places || []) {
    out.push({
      key: 'c:' + p.id, kind: 'c', id: p.id, name: p.label || 'Untitled place',
      city: '', country: '', town: (legById(p.legId) || {}).city || '',
      lat: p.lat, lon: p.lon, cats: [], catNames: [],
      phone: '', email: '', website: '', address: '', note: p.note || '',
      place: true, placeKind: p.kind, legId: p.legId, from: p.from, to: p.to,
      tone: p.kind === 'stay' ? 'stay' : 'custom',
      toneLabel: PLACE_KINDS[p.kind] || 'Place',
    })
  }
  return out
})
const recByKey = computed(() => Object.fromEntries(records.value.map(r => [r.key, r])))
function placeById(id) { return config.value.places.find(p => p.id === id) }
const sortedPlaces = computed(() => {
  const order = Object.fromEntries(legs.value.map((l, i) => [l.id, i]))
  return [...config.value.places].sort((a, b) =>
    (order[a.legId] ?? 99) - (order[b.legId] ?? 99) || (a.from || '').localeCompare(b.from || ''))
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return records.value.filter(r => {
    if (r.kind === 's' && !showSourcing.value) return false
    if (cats.value.length && !r.cats.some(c => cats.value.includes(c))) return false
    if (q) return (r.name || '').toLowerCase().includes(q) || (r.city || '').toLowerCase().includes(q)
    // no search: only what belongs to this trip's region
    if (r.kind === 'c') return true
    return !trip.value || inTripRegion(r, trip.value, byCountry.value)
  })
})
const located = computed(() => filtered.value.filter(r => r.lat != null && r.lon != null))
const locatedAll = computed(() => records.value.filter(r => r.lat != null && r.lon != null))
const unlocated = computed(() => records.value.filter(r => (r.lat == null || r.lon == null) && r.kind !== 'c'))
const unlocatedShown = computed(() => {
  const q = search.value.trim().toLowerCase()
  const base = unlocated.value.filter(r => r.kind !== 's' || showSourcing.value)
  if (q) return base.filter(r => (r.name || '').toLowerCase().includes(q) || (r.city || '').toLowerCase().includes(q))
  // no search: only the countries this trip visits
  const cs = trip.value ? tripCountries(trip.value).map(c => c.toLowerCase()) : []
  if (!cs.length) return base
  return base.filter(r => cs.includes((r.country || '').trim().toLowerCase()))
})

/* ---------------- appointments ---------------- */
const appts = computed(() => config.value.appointments || [])
const stats = computed(() => apptStats(appts.value))
const pending = computed(() => stats.value.pending)
const agenda = computed(() => agendaDays(appts.value))
function apptsOf(key) { return appts.value.filter(a => a.key === key) }
function legStats(legId) { return apptStats(appts.value.filter(a => a.legId === legId)) }
function legAgenda(legId) { return agendaDays(appts.value.filter(a => a.legId === legId)) }
function hasTimes(legId) { return appts.value.some(a => a.legId === legId && a.time) }
/** Soonest booking on a stop — what the route list and the map tooltip show. */
function nextApptOf(key) {
  return apptsOf(key).slice().sort((a, b) =>
    ((a.date || '9999') + (a.time || '')).localeCompare((b.date || '9999') + (b.time || '')))[0] || null
}

const apptWarn = computed(() => (apptModal.value && trip.value) ? apptDateWarning(trip.value, apptModal.value.date) : '')
const apptLeg = computed(() => apptModal.value ? legById(apptModal.value.legId) : null)
const apptMin = computed(() => (apptLeg.value && apptLeg.value.from) || (trip.value && trip.value.date_start) || null)
const apptMax = computed(() => (apptLeg.value && apptLeg.value.to) || (trip.value && trip.value.date_end) || null)
const apptValid = computed(() => !!(apptModal.value && apptModal.value.key && apptModal.value.date))
/** Who you can book, grouped the same way the map colours them. */
const apptTargets = computed(() => {
  const all = [...located.value, ...unlocatedShown.value]
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '')
  const lid = apptModal.value && apptModal.value.legId
  const near = lid ? new Set(nearbyOf(lid).map(r => r.key)) : new Set()
  const groups = []
  if (near.size) groups.push({ label: 'Near ' + (legById(lid) || {}).city, items: all.filter(r => near.has(r.key)).sort(byName) })
  const rest = all.filter(r => !near.has(r.key))
  const pick = t => rest.filter(r => r.tone === t).sort(byName)
  groups.push(
    { label: 'NDA + MMA signed', items: pick('star') },
    { label: 'Trip folder', items: pick('new') },
    { label: 'Manufacturers', items: pick('hub') },
    { label: 'Material / sourcing', items: pick('material') },
    { label: 'Places we will be at', items: pick('custom') },
  )
  return groups.filter(g => g.items.length)
})

function newAppt(rec, legId) {
  const lid = legId || (rec && rec.legId) || focusLegId.value || (legs.value.find(l => !l.off) || {}).id || ''
  const leg = legById(lid)
  const free = leg ? legFreeDays(leg, trip.value.blackouts || []).free : []
  apptModal.value = blankAppt({
    _new: true,
    key: rec ? rec.key : '',
    legId: lid,
    // a leg with no usable day still gets its first date, and the form warns about it
    date: free[0] || (leg ? leg.from : '') || '',
  })
}
function editAppt(a) { apptModal.value = { ...a, _new: false } }
function saveAppt() {
  const m = apptModal.value
  if (!apptValid.value) return
  const rec = blankAppt({ ...m, legId: apptLegFor(trip.value, m.date, m.legId) })
  delete rec._new
  const arr = config.value.appointments
  const i = arr.findIndex(x => x.id === rec.id)
  if (i >= 0) arr[i] = rec; else arr.push(rec)
  apptModal.value = null
  // a booked visit belongs on that city's driving route
  if (rec.legId && !inRoute(rec.legId, rec.key)) toggleRoute(rec.legId, rec.key, true)
  else { renderMarkers(); drawRoutes(); saveConfig() }
}
/** Google Calendar (and Apple, and Outlook) import .ics: Settings > Import & export > Import. */
function downloadICS() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([tripICS(trip.value, config.value.appointments, labelOfKey)], { type: 'text/calendar' }))
  a.download = (trip.value.name || 'trip').replace(/[^A-Za-z0-9]+/g, '-').toLowerCase() + '-agenda.ics'
  a.click()
}
/** One meeting into Google Calendar prefilled. The address comes from the supplier record
    when we have one, so Google can map it instead of just naming the city. */
function gcalOf(a) {
  const r = recByKey.value[a.key] || {}
  return gcalLink(trip.value, a, labelOfKey(a.key), r.address || '')
}
function toggleConfirmed(a) {
  const t = config.value.appointments.find(x => x.id === a.id)
  if (!t) return
  t.confirmed = !t.confirmed
  renderMarkers(); drawRoutes(); saveConfig()
}
function deleteAppt(id) {
  config.value.appointments = config.value.appointments.filter(x => x.id !== id)
  renderMarkers(); drawRoutes(); saveConfig()
}
/** A booked day already has an order — follow the clock instead of the shortest drive. */
function sortByAppt(legId) {
  const when = {}
  for (const a of appts.value) if (a.legId === legId) when[a.key] = (a.date || '9999') + ' ' + (a.time || '99:99')
  const r = config.value.routes[legId]
  if (!r) return
  r.sort((x, y) => (when[x] || 'zzz').localeCompare(when[y] || 'zzz'))
  afterRouteChange(legId)
}

/* ---------------- geo helpers ---------------- */
function hav(a, b) {
  const R = 6371, dLa = (b.lat - a.lat) * Math.PI / 180, dLo = (b.lon - a.lon) * Math.PI / 180
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)))
}
const dist = (a, b) => hav(a, b)

/* ---------------- driving (OSRM public server) ----------------
   ponytail: OSRM demo server — no key, meant for light use. Every result is cached by the
   exact ordered path; on any failure it falls back to straight-line × 1.35 @ 70 km/h. */
const OSRM = 'https://router.project-osrm.org'
const routeCache = new Map()          // pathKey -> { km, min, coords, est }
const drivingByLeg = ref({})          // legId -> { km, min, h, over, est }
const drivingBusy = ref(0)
// serialize OSRM calls ≥ 320ms apart — the public demo server is not for bursty traffic
let osrmGate = Promise.resolve()
function osrmFetch(url) {
  const run = osrmGate.then(() => fetch(url))
  osrmGate = run.then(() => new Promise(r => setTimeout(r, 320)), () => new Promise(r => setTimeout(r, 320)))
  return run
}
function pathKey(pts) { return pts.map(p => p[0].toFixed(4) + ',' + p[1].toFixed(4)).join(';') }
function estRoute(pts) {
  let km = 0
  for (let i = 1; i < pts.length; i++) km += hav({ lat: pts[i - 1][0], lon: pts[i - 1][1] }, { lat: pts[i][0], lon: pts[i][1] })
  km *= 1.35
  return { km, min: km / 70 * 60, coords: pts, est: true }
}
async function drivingRoute(pts) {
  const key = pathKey(pts)
  if (routeCache.has(key)) return routeCache.get(key)
  const coordStr = pts.map(p => p[1] + ',' + p[0]).join(';')
  drivingBusy.value++
  try {
    const r = await osrmFetch(`${OSRM}/route/v1/driving/${coordStr}?overview=full&geometries=geojson`)
    const j = await r.json()
    if (j.code === 'Ok' && j.routes && j.routes[0]) {
      const rt = j.routes[0]
      const out = { km: rt.distance / 1000, min: rt.duration / 60, coords: rt.geometry.coordinates.map(c => [c[1], c[0]]), est: false }
      routeCache.set(key, out); return out
    }
  } catch (e) { /* fall through to estimate */ }
  finally { drivingBusy.value-- }
  const est = estRoute(pts); routeCache.set(key, est); return est
}
async function drivingMatrix(pts) {
  const coordStr = pts.map(p => p[1] + ',' + p[0]).join(';')
  drivingBusy.value++
  try {
    const r = await osrmFetch(`${OSRM}/table/v1/driving/${coordStr}?annotations=duration,distance`)
    const j = await r.json()
    if (j.code === 'Ok' && j.durations) return { dur: j.durations }
  } catch (e) { /* */ }
  finally { drivingBusy.value-- }
  const n = pts.length, dur = []
  for (let i = 0; i < n; i++) { dur[i] = []
    for (let k = 0; k < n; k++) dur[i][k] = hav({ lat: pts[i][0], lon: pts[i][1] }, { lat: pts[k][0], lon: pts[k][1] }) * 1.35 / 70 * 3600
  }
  return { dur }
}
// open-path nearest-neighbour + 2-opt over a duration matrix (index 0 = base). Returns 0-based stop order.
function solveOpen(m) {
  const n = m.length - 1
  if (n < 2) return [...Array(n).keys()]
  const unv = [...Array(n).keys()].map(i => i + 1)
  const path = [0]
  while (unv.length) {
    const cur = path[path.length - 1]
    let bi = 0, bd = Infinity
    unv.forEach((v, idx) => { if (m[cur][v] < bd) { bd = m[cur][v]; bi = idx } })
    path.push(unv[bi]); unv.splice(bi, 1)
  }
  let improved = true, g = 0
  while (improved && g++ < 200) {
    improved = false
    for (let i = 1; i < path.length - 1; i++) for (let k = i + 1; k < path.length; k++) {
      const a = path[i - 1], b = path[i], c = path[k], d = path[k + 1]
      const before = m[a][b] + (d !== undefined ? m[c][d] : 0)
      const after = m[a][c] + (d !== undefined ? m[b][d] : 0)
      if (after + 1e-6 < before) { path.splice(i, k - i + 1, ...path.slice(i, k + 1).reverse()); improved = true }
    }
  }
  return path.slice(1).map(i => i - 1)
}

/* where the traveller sleeps on a leg — or the city centre while no stay is pinned */
function baseOf(legId) {
  const s = stayOf(config.value.places, legId)
  if (s) return { lat: s.lat, lon: s.lon, label: s.label || 'Stay', isBase: true }
  const leg = legById(legId)
  if (!leg) return { lat: null, lon: null, label: '—', isBase: false }
  return { lat: leg.lat, lon: leg.lon, label: leg.city, isBase: false }
}
const drRefreshTimers = {}
function refreshDrivingSoon(legId) {
  clearTimeout(drRefreshTimers[legId])
  drRefreshTimers[legId] = setTimeout(() => refreshDriving(legId), 400)
}
async function refreshDriving(legId) {
  const rs = routeStops(legId)
  if (!rs.length) { const c = { ...drivingByLeg.value }; delete c[legId]; drivingByLeg.value = c; return }
  const base = baseOf(legId)
  const leg = legById(legId)
  if (!leg || base.lat == null) return
  const rt = await drivingRoute([[base.lat, base.lon], ...rs.map(s => [s.lat, s.lon])])
  const h = rt.min / 60 + rs.length * 0.6
  drivingByLeg.value = { ...drivingByLeg.value, [legId]: { km: rt.km, min: rt.min, h, est: rt.est, over: leg.days === 0 || h > leg.days * 7 } }
  drawRoutes()
}

/* ---------------- routes ---------------- */
function routeOf(legId) { return config.value.routes[legId] || [] }
/** Routed stops that can actually be drawn/measured — a booking may precede an address. */
function routeStops(legId) {
  return routeOf(legId).map(k => recByKey.value[k]).filter(r => r && r.lat != null && r.lon != null)
}
function inRoute(legId, key) { return routeOf(legId).includes(key) }
function labelOfKey(k) { const r = recByKey.value[k]; return r ? r.name : '(deleted)' }
function nearbyOf(legId) {
  const leg = legById(legId)
  if (!leg || leg.lat == null) return []
  return locatedAll.value
    // a stay is where the route starts, not a visit on it
    .filter(r => r.tone !== 'stay')
    .filter(r => (r.tone !== 'out' && hav(leg, r) <= (leg.radiusKm || 150)) || inRoute(legId, r.key))
    .sort((a, b) => hav(leg, a) - hav(leg, b))
}
function poolOf(legId) {
  const r = routeOf(legId)
  return nearbyOf(legId).filter(s => !r.includes(s.key))
}
function metricsOf(legId) {
  const leg = legById(legId)
  const rs = routeStops(legId)
  if (!rs.length) return { n: 0, km: 0, h: 0, over: false, est: true }
  const d = drivingByLeg.value[legId]
  if (d) return { n: rs.length, km: d.km, driveMin: d.min, h: d.h, over: d.over, est: d.est }
  // synchronous straight-line fallback until OSRM answers
  const base = baseOf(legId)
  let km = 0, prev = base
  for (const s of rs) { km += hav(prev, s); prev = s }
  km *= 1.35
  const driveMin = km / 70 * 60
  const h = driveMin / 60 + rs.length * 0.6
  return { n: rs.length, km, driveMin, h, over: leg.days === 0 || h > leg.days * 7, est: true }
}
function fmtH(h) { const m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + (m % 60) + 'm' }
function fmtMin(min) { const m = Math.round(min || 0); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + ' min' }

function toggleRoute(legId, key, on) {
  const r = config.value.routes[legId] || (config.value.routes[legId] = [])
  const i = r.indexOf(key)
  if (on === false || (on === undefined && i >= 0)) { if (i >= 0) r.splice(i, 1) }
  else if (i < 0) r.push(key)
  if (!r.length) delete config.value.routes[legId]
  afterRouteChange(legId)
}
const optimizing = ref(null)
async function optimizeLeg(legId) {
  let cur = routeStops(legId)
  if (!cur.length) cur = nearbyOf(legId).filter(s => s.tone !== 'material' && s.tone !== 'out')
  if (cur.length < 2) { config.value.routes[legId] = cur.map(s => s.key); afterRouteChange(legId); return }
  const base = baseOf(legId)
  if (base.lat == null) return
  optimizing.value = legId
  const { dur } = await drivingMatrix([[base.lat, base.lon], ...cur.map(s => [s.lat, s.lon])])
  optimizing.value = null
  config.value.routes[legId] = solveOpen(dur).map(i => cur[i].key)
  afterRouteChange(legId)
}
function addNearby(legId) {
  const r = config.value.routes[legId] || (config.value.routes[legId] = [])
  nearbyOf(legId).forEach(s => { if (s.tone !== 'material' && s.tone !== 'out' && !r.includes(s.key)) r.push(s.key) })
  if (!r.length) delete config.value.routes[legId]
  afterRouteChange(legId)
}
function clearRoute(legId) { delete config.value.routes[legId]; afterRouteChange(legId) }
function moveRoute(legId, i, dir) {
  const r = config.value.routes[legId]; if (!r) return
  const j = i + dir; if (j < 0 || j >= r.length) return
  ;[r[i], r[j]] = [r[j], r[i]]; afterRouteChange(legId)
}
function afterRouteChange(legId) { drawRoutes(); renderMarkers(); saveConfig(); if (legId) refreshDrivingSoon(legId) }

/* ---------------- map ---------------- */
// OSM's own tiles — keyless. Dark theme is a CSS filter on the tile pane (see styles).
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
function initMap() {
  map = L.map(mapEl.value, { zoomControl: true, worldCopyJump: true }).setView([41, 3], 5)
  L.tileLayer(OSM_TILES, { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map)
  markerLayer = L.layerGroup().addTo(map)
  routeLayer = L.layerGroup().addTo(map)
  map.on('click', onMapClick)
  renderMarkers(); drawRoutes()
}
/** fitBounds on a hidden (0×0) container misfires silently — hold it until the map is shown. */
function fit(pts, maxZoom, pad = 0.2) {
  if (!map || !pts.length) return
  const sz = map.getSize()
  if (!sz.x || !sz.y) { pendingFit = { pts, maxZoom, pad }; return }
  map.fitBounds(L.latLngBounds(pts).pad(pad), { maxZoom })
}
function pinIcon(cls, big) {
  const s = big ? 18 : 14
  return L.divIcon({ className: '', html: `<span class="tm-pin ${cls}"></span>`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] })
}
function toneClass(tone) {
  return {
    star: 'tone-star', new: 'tone-new', hub: 'tone-hub', material: 'tone-mat',
    custom: 'tone-cst', stay: 'tm-base', out: 'tone-out',
  }[tone] || 'tone-hub'
}
function renderMarkers() {
  if (!markerLayer) return
  markerLayer.clearLayers()
  // trip cities
  for (const leg of legs.value) {
    if (leg.lat == null) continue
    L.marker([leg.lat, leg.lon], { icon: pinIcon('tm-city', true), zIndexOffset: 500, keyboard: false })
      .bindTooltip(leg.city, { direction: 'top', offset: [0, -10] })
      .on('click', () => focusLeg(leg.id))
      .addTo(markerLayer)
  }
  // suppliers, materials and our own places all come from the same record list
  for (const r of located.value) {
    const inAny = Object.values(config.value.routes).some(a => a.includes(r.key))
    const ap = nextApptOf(r.key)
    const cls = [
      toneClass(r.tone),
      inAny ? 'in-route' : '',
      ap ? (ap.confirmed ? 'appt-ok' : 'appt') : '',
    ].filter(Boolean).join(' ')
    const tip = ap
      ? r.name + ' · ' + fmtDay(ap.date) + (ap.time ? ' ' + ap.time : '') + (ap.confirmed ? ' ✓' : ' (pending)')
      : r.name
    markerLayer.addLayer(
      L.marker([r.lat, r.lon], {
        icon: pinIcon(cls, r.tone === 'stay'),
        zIndexOffset: r.tone === 'stay' ? 450 : 0,
      })
        .bindTooltip(tip, { direction: 'top', offset: [0, -8] })
        .on('click', () => { selected.value = r })
    )
  }
}
function drawRoutes() {
  if (!routeLayer) return
  routeLayer.clearLayers()
  for (const legId of Object.keys(config.value.routes)) {
    const leg = legById(legId); if (!leg) continue
    const rs = routeStops(legId)
    if (!rs.length) continue
    const base = baseOf(legId)
    if (base.lat == null) continue
    const pathPts = [[base.lat, base.lon], ...rs.map(s => [s.lat, s.lon])]
    const cached = routeCache.get(pathKey(pathPts))
    const line = cached && !cached.est ? cached.coords : pathPts
    const dim = openLeg.value && openLeg.value !== legId
    L.polyline(line, { color: '#C2410C', weight: dim ? 2 : 4, opacity: dim ? 0.25 : 0.9 }).addTo(routeLayer)
    rs.forEach((s, i) => {
      const ap = nextApptOf(s.key)
      L.marker([s.lat, s.lon], {
        icon: L.divIcon({
          className: '',
          html: `<span class="tm-rnode${ap ? (ap.confirmed ? ' ok' : ' pend') : ''}">${i + 1}</span>`,
          iconSize: [18, 18], iconAnchor: [9, 9],
        }),
        zIndexOffset: 400,
      }).addTo(routeLayer)
    })
  }
}
function onMapClick(e) {
  if (!placing.value) return
  const p = placing.value
  const la = +e.latlng.lat.toFixed(5), lo = +e.latlng.lng.toFixed(5)
  placing.value = null
  if (p.kind === 'place') openPlaceModal({ lat: la, lon: lo, kind: p.placeKind, legId: p.legId })
  else setCoords(p, la, lo)
}

/* ---------------- locating ---------------- */
const placeHint = computed(() => {
  const p = placing.value
  if (!p) return ''
  if (p.kind === 'place') return p.placeKind === 'stay' ? 'Tap where you are staying' : 'Tap where this place is'
  if (p.kind === 'move') return 'Tap to move the pin'
  return 'Tap the map to locate ' + p.name
})
function startPlace(r, kind) {
  placing.value = { key: r.key, kind: kind || 'locate', name: r.name, rec: r }
  goMap()
}
function startAddPlace(kind, legId) {
  placing.value = {
    kind: 'place',
    placeKind: kind || 'stay',
    legId: legId || openLeg.value || (legs.value[0] || {}).id || '',
  }
  goMap()
}
function startPlaceMove(p) { startPlace({ key: 'c:' + p.id, name: p.label }, 'move') }
function cancelPlace() { placing.value = null }

async function setCoords(p, lat, lon) {
  const r = p.rec || recByKey.value[p.key]
  if (!r) return
  if (r.kind === 'c') {
    const c = placeById(r.id)
    if (!c) return
    c.lat = lat; c.lon = lon
    afterPlaceChange(c.legId)
  } else {
    const table = r.kind === 'm' ? 'manufacturers' : 'sourcing'
    const { error } = await supabase.from(table).update({ lat, lon }).eq('id', r.id)
    if (error) { flash('error'); return }
    const arr = r.kind === 'm' ? manufacturers.value : sourcing.value
    const row = arr.find(x => x.id === r.id)
    if (row) { row.lat = lat; row.lon = lon }
    renderMarkers(); drawRoutes()
  }
  if (selected.value && selected.value.key === p.key) selected.value = recByKey.value[p.key]
}

async function autoLocate(r) {
  geo.value = r.key
  try {
    const q = [r.address, r.city, r.country].filter(Boolean).join(', ')
    // ponytail: Nominatim free endpoint — 1 req/s, no bulk. One record per click; no batch button on purpose.
    const res = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(q), {
      headers: { 'Accept': 'application/json' },
    })
    const j = await res.json()
    if (j && j.length) {
      await setCoords({ key: r.key, rec: r }, +(+j[0].lat).toFixed(5), +(+j[0].lon).toFixed(5))
      goMap()
      if (map) map.setView([+j[0].lat, +j[0].lon], 11)
    } else {
      flash('error')
    }
  } catch (e) { flash('error') }
  geo.value = null
}

/* ---------------- places ---------------- */
const placeValid = computed(() => {
  const m = placeModal.value
  return !!(m && String(m.label || '').trim() && !isNaN(parseFloat(m.lat)) && !isNaN(parseFloat(m.lon)))
})
/* Type the address instead of hunting for the spot on the map: Nominatim turns it into a pin.
   ponytail: same free endpoint as the rest of the app, one lookup per click. */
const finding = ref(false)
const findMsg = ref('')
const findHits = ref([])
function clearFind() { finding.value = false; findMsg.value = ''; findHits.value = []; clearDraftPin() }
function closePlaceModal() { placeModal.value = null; clearFind() }

async function findAddress() {
  const q = String(placeModal.value.address || '').trim()
  if (!q) return
  finding.value = true
  findMsg.value = ''
  findHits.value = await geocode(q)
  finding.value = false
  if (!findHits.value.length) {
    findMsg.value = 'No match. Drop the venue name and leave street, number and city — "Calle de la Cabeza, 11, Madrid".'
  } else if (findHits.value.length === 1) {
    useHit(findHits.value[0])
  }
}
function useHit(h) {
  placeModal.value.lat = h.lat
  placeModal.value.lon = h.lon
  if (!String(placeModal.value.label || '').trim()) placeModal.value.label = h.city || h.label
  findHits.value = []
  findMsg.value = 'Pinned at ' + h.label
  showDraftPin(h.lat, h.lon)
}

/* The pin lands on the map the moment the address resolves, so Save only confirms what you
   already see. It is swapped for the real marker by renderMarkers() once the place is saved. */
let draftPin = null
function showDraftPin(lat, lon) {
  if (!map) return
  clearDraftPin()
  draftPin = L.marker([lat, lon], { icon: pinIcon('tm-draft', true), zIndexOffset: 900 })
    .bindTooltip('New place', { direction: 'top', offset: [0, -10], permanent: true })
    .addTo(map)
  map.setView([lat, lon], 15)
}
function clearDraftPin() {
  if (draftPin && map) map.removeLayer(draftPin)
  draftPin = null
}

function openPlaceModal(pre) {
  const leg = legById((pre && pre.legId) || '')
  clearFind()
  placeModal.value = blankPlace({
    _new: true,
    from: leg ? leg.from : '',
    to: leg ? leg.to : '',
    ...pre,
  })
}
function editPlace(p) { clearFind(); placeModal.value = { ...p, _new: false } }
function savePlace() {
  const m = placeModal.value
  if (!placeValid.value) return
  const rec = blankPlace({
    ...m,
    label: String(m.label).trim(),
    address: String(m.address || '').trim(),
    note: String(m.note || '').trim(),
    lat: parseFloat(m.lat),
    lon: parseFloat(m.lon),
  })
  delete rec._new
  const i = config.value.places.findIndex(x => x.id === rec.id)
  if (i >= 0) config.value.places[i] = rec; else config.value.places.push(rec)
  closePlaceModal()
  afterPlaceChange(rec.legId)
  if (selected.value && selected.value.key === 'c:' + rec.id) selected.value = recByKey.value['c:' + rec.id]
}
function deletePlace(id) {
  const p = placeById(id)
  const legId = p && p.legId
  config.value.places = config.value.places.filter(x => x.id !== id)
  for (const k of Object.keys(config.value.routes)) {
    config.value.routes[k] = config.value.routes[k].filter(x => x !== 'c:' + id)
    if (!config.value.routes[k].length) delete config.value.routes[k]
  }
  config.value.appointments = config.value.appointments.filter(a => a.key !== 'c:' + id)
  selected.value = null
  afterPlaceChange(legId)
}
/** A stay is the origin of its leg's route, so touching a place re-measures that leg. */
function afterPlaceChange(legId) {
  renderMarkers(); drawRoutes(); saveConfig()
  if (legId) refreshDriving(legId)
  refreshSelDriving()
}

/* ---------------- persistence ---------------- */
function saveConfig() {
  if (!trip.value) return
  saveState.value = 'saving'
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await Trips.save(trip.value.id, { data: JSON.parse(JSON.stringify(config.value)) })
      saveState.value = 'idle'
    } catch (e) { saveState.value = 'error' }
  }, 1200)
}
function flash(s) { saveState.value = s; setTimeout(() => { if (saveState.value === s) saveState.value = 'idle' }, 2500) }

/* ---------------- interactions ---------------- */
function goPlan() { mobileTab.value = 'plan' }
function goMap() {
  mobileTab.value = 'map'
  nextTick(() => {
    if (!map) return
    map.invalidateSize()
    if (pendingFit) { const f = pendingFit; pendingFit = null; fit(f.pts, f.maxZoom, f.pad) }
  })
}
function toggleCat(c) { const i = cats.value.indexOf(c); i >= 0 ? cats.value.splice(i, 1) : cats.value.push(c); renderMarkers() }
function focusLeg(id) {
  openLeg.value = openLeg.value === id ? null : id
  focusLegId.value = id
  const leg = legById(id)
  refreshSelDriving()
  if (!leg || leg.lat == null) { drawRoutes(); return }
  const base = baseOf(id)
  const rs = routeStops(id)
  const anchor = rs.length ? rs : nearbyOf(id).slice(0, 12)
  fit([[base.lat, base.lon], ...anchor.map(s => [s.lat, s.lon])], 13)
  drawRoutes()
  if (routeOf(id).length) refreshDriving(id)
}
function selectByKey(k) {
  const r = recByKey.value[k]
  if (!r) return
  selected.value = r
  if (r.lat == null) return
  goMap()
  if (map) map.setView([r.lat, r.lon], 12)
}
function normUrl(u) { return /^https?:\/\//.test(u) ? u : 'https://' + u }

/* driving distance/time from a leg's stay (or city centre) to the selected supplier */
const selDriving = ref(null)
async function refreshSelDriving() {
  selDriving.value = null
  const s = selected.value
  if (!s || s.lat == null || s.place) return
  let legId = focusLegId.value && legById(focusLegId.value) && !legById(focusLegId.value).off ? focusLegId.value : null
  if (!legId) {
    let bd = Infinity
    for (const l of legs.value) { if (l.lat == null) continue; const d = hav(l, s); if (d < bd) { bd = d; legId = l.id } }
  }
  if (!legId) return
  const base = baseOf(legId)
  if (base.lat == null) return
  const rt = await drivingRoute([[base.lat, base.lon], [s.lat, s.lon]])
  if (selected.value === s) selDriving.value = { ...rt, legId, isBase: base.isBase }
}
watch(selected, refreshSelDriving)

/* ---------------- lifecycle ---------------- */
watch([showSourcing, search], renderMarkers)

onMounted(async () => {
  await load()
  await nextTick()
  initMap()
  setTimeout(() => map && map.invalidateSize(), 200)
  for (const legId of Object.keys(config.value.routes)) refreshDrivingSoon(legId)
  // fit to the whole trip on open
  fit(legs.value.filter(l => l.lat != null).map(l => [l.lat, l.lon]), 8, 0.3)
  if (trip.value) {
    channel = supabase.channel('trip-map-' + trip.value.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: `id=eq.${trip.value.id}` }, payload => {
        if (!payload.new) return
        if (payload.new.legs) trip.value = { ...trip.value, ...payload.new }
        if (payload.new.data) {
          config.value = normalizeData(payload.new.data, trip.value.legs)
          drivingByLeg.value = {}
          renderMarkers(); drawRoutes()
          if (openLeg.value && routeOf(openLeg.value).length) refreshDriving(openLeg.value)
        }
      }).subscribe()
  }
})
onBeforeUnmount(() => {
  clearTimeout(saveTimer)
  if (channel) supabase.removeChannel(channel)
  if (map) { map.remove(); map = null }
})
</script>

<style scoped>
.trip-map {
  display: flex;
  height: calc(100vh - 64px);
  /* dvh keeps the panes correct while a phone browser shows/hides its address bar */
  height: calc(100dvh - 64px);
  overflow: hidden;
  background: var(--bg-app);
}
.trip-map.placing .tm-map { cursor: crosshair; }

/* mobile tab bar — desktop shows both panes at once, so it stays hidden there */
.tm-tabs { display: none; }
.tm-tabs button {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: var(--bg-card); border: none; border-bottom: 2px solid transparent;
  padding: 12px 8px; font: inherit; font-size: var(--fs-13); font-weight: 700;
  color: var(--text-muted); cursor: pointer; text-transform: uppercase; letter-spacing: var(--tr-allcaps);
}
.tm-tabs button.on { color: var(--primary); border-bottom-color: var(--primary); }
.tm-tab-badge {
  font-family: var(--font-mono); font-size: 0.62rem; background: var(--caution); color: var(--ink);
  border-radius: var(--r-pill); padding: 1px 6px; letter-spacing: 0;
}

/* sidebar */
.tm-side {
  width: 350px;
  flex: none;
  border-right: 1px solid var(--border-main);
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.tm-side-head { padding: 12px 16px 10px; display: flex; align-items: flex-start; gap: 8px; }
.tm-side-head > div { min-width: 0; flex: 1; }
.tm-side-head h1 { margin: 0; font-size: var(--fs-16); font-weight: 700; overflow: hidden; text-overflow: ellipsis; }
.tm-back { font-size: 0.68rem; color: var(--text-subtle); text-decoration: none; display: block; }
.tm-back:hover { color: var(--primary); }
.tm-cog {
  flex: none; width: 34px; height: 34px; border: 1px solid var(--border-main); border-radius: var(--r-2);
  display: flex; align-items: center; justify-content: center; color: var(--text-muted);
}
.tm-cog:hover { border-color: var(--primary); color: var(--text-main); }
.tm-warn a { text-decoration: underline; }
.tm-sub { margin: 2px 0 0; font-size: var(--fs-12); color: var(--text-muted); font-family: var(--font-mono); }
.tm-save { color: var(--text-subtle); }
.tm-save.saving { color: var(--caution); }
.tm-save.error { color: var(--critical); }
.tm-save.idle { color: var(--positive); }

.tm-warn {
  margin: 0 12px 8px;
  padding: 8px 10px;
  border: 1px solid var(--caution);
  background: var(--caution-soft);
  color: var(--ember-deep);
  border-radius: var(--r-2);
  font-size: var(--fs-12);
}

.tm-controls { padding: 0 14px 10px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid var(--border-light); }
.tm-search {
  width: 100%; padding: 8px 10px; border: 1px solid var(--border-main);
  border-radius: var(--r-2); background: var(--bg-app); color: var(--text-main); font: inherit; font-size: var(--fs-13);
}
.tm-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.tm-chip {
  font-family: var(--font-mono); font-size: 0.68rem; padding: 4px 9px; border-radius: var(--r-pill);
  border: 1px solid var(--border-main); background: transparent; color: var(--text-muted); cursor: pointer;
}
.tm-chip.on { background: var(--primary); border-color: var(--primary); color: var(--bone); }
.tm-add {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: var(--primary); color: var(--bone); border: 1px solid var(--primary); border-radius: var(--r-2);
  padding: 9px 6px; font-weight: 600; font-size: var(--fs-12); cursor: pointer; min-height: 38px;
}
.tm-add:disabled { opacity: 0.45; cursor: default; }

.tm-scroll { flex: 1; overflow-y: auto; padding: 8px 10px 40px; min-height: 0; }
.tm-block { margin-bottom: 10px; }
.tm-block-h {
  width: 100%; display: flex; align-items: center; gap: 6px; background: none; border: none;
  font-size: var(--fs-12); font-weight: 700; text-transform: uppercase; letter-spacing: var(--tr-allcaps);
  color: var(--text-muted); padding: 8px 4px; cursor: pointer; text-align: left;
}
.tm-block-h.static { cursor: default; }
.tm-block-h .rot { transform: rotate(-90deg); }
.tm-count { margin-left: auto; font-family: var(--font-mono); color: var(--text-subtle); text-transform: none; letter-spacing: 0; }
.tm-block-body { padding: 2px 2px 0; }

/* agenda */
.tm-day { margin-bottom: 8px; }
.tm-day-h {
  display: flex; align-items: center; gap: 7px; padding: 5px; border-radius: var(--r-1);
  background: var(--bg-sunken); font-size: var(--fs-12);
}
.tm-day-h b { font-family: var(--font-mono); }
.tm-day-city { color: var(--text-muted); }
.tm-day-n { margin-left: auto; font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-subtle); }
.tm-appt {
  display: flex; align-items: center; gap: 6px; padding: 5px; font-size: var(--fs-12);
  border-bottom: 1px solid var(--border-light);
}
.tm-appt-chk {
  flex: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; padding: 0;
  border: 1.5px solid var(--caution); background: var(--caution-soft); color: var(--ink);
  display: flex; align-items: center; justify-content: center;
}
.tm-appt.ok .tm-appt-chk { border-color: var(--positive); background: var(--positive); color: #fff; }
.tm-appt-t { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-muted); flex: none; }
.tm-appt-nm { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.tm-appt-nm:hover { color: var(--primary); }
.tm-appt-st {
  font-family: var(--font-mono); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--caution); flex: none;
}
.tm-appt.ok .tm-appt-st { color: var(--positive); }
.tm-appt-ic {
  flex: none; background: none; border: none; color: var(--text-subtle); cursor: pointer;
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
}
.tm-appt-ic:hover { color: var(--text-main); }
a.tm-appt-ic { text-decoration: none; }
a.tm-appt-ic:hover { color: var(--primary); }
.tm-appt-add {
  display: flex; align-items: center; gap: 5px; margin-top: 6px; width: 100%; justify-content: center;
  font-size: var(--fs-12); padding: 9px; border: 1px dashed var(--border-main); border-radius: var(--r-2);
  background: transparent; color: var(--text-body); cursor: pointer;
}
.tm-appt-add:hover:not(:disabled) { border-color: var(--primary); color: var(--primary); }
.tm-appt-add:disabled { opacity: 0.45; cursor: default; }

/* places */
.tm-place { border: 1px solid var(--border-light); border-radius: var(--r-2); padding: 6px 8px; margin-bottom: 5px; }
.tm-place.k-stay { border-color: var(--primary); background: var(--primary-soft); }
.tm-place-top { display: flex; align-items: center; gap: 6px; }
.tm-place-ic { flex: none; color: var(--text-muted); display: flex; }
.tm-place.k-stay .tm-place-ic { color: var(--primary); }
.tm-place-nm { flex: 1; font-size: var(--fs-13); font-weight: 600; cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tm-place-nm:hover { color: var(--primary); }
.tm-place-k { font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-subtle); flex: none; }
.tm-place-addr { font-size: 0.7rem; color: var(--text-subtle); margin-top: 3px; line-height: 1.4; }
.tm-place-bot { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 5px; font-size: var(--fs-12); }
.tm-place-leg { color: var(--text-muted); }
.tm-place-dt { font-family: var(--font-mono); font-size: 0.66rem; color: var(--text-subtle); }
.tm-place-nc { font-family: var(--font-mono); font-size: 0.62rem; color: var(--critical); }
.tm-place-btn {
  font-size: 0.68rem; padding: 4px 9px; border: 1px solid var(--border-main); border-radius: var(--r-1);
  background: var(--bg-card); color: var(--text-body); cursor: pointer;
}
.tm-place-bot .tm-place-btn:nth-last-child(2) { margin-left: auto; }
.tm-place-btn:hover { border-color: var(--primary); }

.tm-unloc-tip { font-size: 0.72rem; color: var(--text-subtle); margin: 0 0 6px; line-height: 1.5; }
.tm-unloc { padding: 6px; border: 1px solid var(--border-light); border-radius: var(--r-2); margin-bottom: 4px; }
.tm-unloc-nm { font-size: var(--fs-13); font-weight: 600; }
.tm-unloc-city { color: var(--text-muted); font-weight: 400; }
.tm-unloc-acts { display: flex; gap: 4px; margin-top: 4px; }
.tm-unloc-acts button {
  font-size: 0.7rem; padding: 4px 8px; border: 1px solid var(--border-main); border-radius: var(--r-1);
  background: var(--bg-app); color: var(--text-body); cursor: pointer; display: flex; align-items: center; gap: 3px;
}
.tm-unloc-acts button.arming { background: var(--critical); color: var(--bone); border-color: var(--critical); }
.tm-more { font-size: var(--fs-12); color: var(--primary); background: none; border: none; cursor: pointer; padding: 8px 4px; }

.tm-leg { border: 1px solid var(--border-light); border-radius: var(--r-2); margin-bottom: 5px; overflow: hidden; }
.tm-leg.dim { opacity: 0.55; }
.tm-leg-h { width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 10px; background: none; border: none; cursor: pointer; text-align: left; }
.tm-leg-h:hover { background: var(--bg-sunken); }
.tm-leg-n {
  font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-subtle); flex: none;
  width: 18px; height: 18px; border-radius: 50%; background: var(--bg-sunken);
  display: flex; align-items: center; justify-content: center;
}
.tm-leg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tm-leg-l1 { display: flex; align-items: baseline; gap: 8px; }
.tm-leg-l2 { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.tm-leg-nm { font-weight: 700; font-size: var(--fs-14); color: var(--text-main); }
.tm-leg-span { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-subtle); }
.tm-leg-days { font-family: var(--font-mono); font-size: 0.65rem; color: var(--positive); }
.tm-leg-days.none { color: var(--text-subtle); }
.tm-leg-cx { flex: none; color: var(--text-subtle); transition: transform var(--dur-fast) var(--ease); }
.tm-leg-cx.rot { transform: rotate(-90deg); }
.tm-leg-ap {
  display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-mono); font-size: 0.65rem;
  padding: 1px 6px; border-radius: var(--r-pill); background: var(--caution-soft); color: var(--ember-deep);
}
.tm-leg-ap.allok { background: var(--positive-soft); color: var(--positive); }
.tm-leg-dt { margin-left: auto; font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-muted); flex: none; }
.tm-leg-meets { padding: 0 10px 8px 32px; }
.tm-mday { margin-bottom: 4px; }
.tm-mday-h {
  font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-subtle); padding: 3px 0 1px; border-bottom: 1px solid var(--border-light);
}
.tm-leg-meets .tm-appt { border-bottom: none; padding: 4px 0; }
.tm-madd {
  display: flex; align-items: center; gap: 5px; width: 100%; justify-content: center; margin-top: 2px;
  font-size: 0.72rem; padding: 7px; border: 1px dashed var(--border-main); border-radius: var(--r-2);
  background: transparent; color: var(--text-muted); cursor: pointer;
}
.tm-madd:hover { border-color: var(--primary); color: var(--primary); }
.tm-leg-body { padding: 0 10px 10px; border-top: 1px solid var(--border-light); margin-top: 2px; }
.tm-leg-body .tm-leg-meet { padding-top: 6px; }
.tm-leg-meet { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-muted); margin: 2px 0 6px; }
.tm-base-row {
  font-size: var(--fs-12); padding: 6px 8px; border-radius: var(--r-2); background: var(--primary-soft);
  margin-bottom: 6px; display: flex; flex-wrap: wrap; align-items: center; gap: 5px;
}
.tm-base-row .tm-k { flex-basis: 100%; }
.tm-base-lbl { font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
.tm-base-btn {
  font-size: 0.68rem; padding: 4px 9px; border: 1px solid var(--border-main); border-radius: var(--r-1);
  background: var(--bg-card); color: var(--text-body); cursor: pointer;
}
.tm-base-btn.arm { border-color: var(--primary); color: var(--primary); font-weight: 600; }
.tm-base-hint { font-size: 0.66rem; color: var(--text-subtle); }
.tm-leg-sum { font-size: var(--fs-12); padding: 6px 8px; border-radius: var(--r-2); background: var(--bg-sunken); margin-bottom: 6px; line-height: 1.6; }
.tm-leg-sum.over { background: var(--caution-soft); color: var(--ember-deep); }
.tm-est { color: var(--text-subtle); font-family: var(--font-mono); font-size: 0.66rem; }
.tm-leg-acts { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
.tm-leg-acts button {
  font-size: 0.72rem; padding: 5px 9px; border: 1px solid var(--border-main); border-radius: var(--r-1);
  background: var(--bg-card); color: var(--text-body); cursor: pointer; display: flex; align-items: center; gap: 3px;
}
.tm-rlist { list-style: none; margin: 0 0 6px; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.tm-rlist li { display: flex; align-items: center; gap: 5px; font-size: var(--fs-12); padding: 4px 5px; background: var(--bg-app); border-radius: var(--r-1); }
.tm-ix { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-subtle); width: 12px; flex: none; }
.tm-rn { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.tm-rn:hover { color: var(--primary); }
.tm-rap {
  flex: none; font-family: var(--font-mono); font-size: 0.6rem; padding: 1px 5px; border-radius: var(--r-pill);
  background: var(--caution-soft); color: var(--ember-deep);
}
.tm-rap.ok { background: var(--positive-soft); color: var(--positive); }
.tm-rlist li button { background: none; border: none; color: var(--text-subtle); cursor: pointer; font-size: 0.75rem; padding: 2px 4px; }
.tm-rlist li button:hover { color: var(--text-main); }
.tm-pick { border-top: 1px dashed var(--border-light); padding-top: 5px; }
.tm-pick label { display: flex; align-items: center; gap: 6px; font-size: var(--fs-12); padding: 4px 3px; cursor: pointer; }
.tm-pick label:hover { background: var(--bg-sunken); }
.tm-pt { margin-left: auto; font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-subtle); }

.tm-legend { margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-light); display: grid; gap: 5px; font-size: var(--fs-12); color: var(--text-muted); }
.tm-legend span { display: flex; align-items: center; gap: 7px; }
.tm-legend i { width: 10px; height: 10px; border-radius: 50%; flex: none; }
.tm-legend i.ring { background: transparent; box-shadow: 0 0 0 2px var(--positive); }

/* map */
.tm-map-wrap { flex: 1; position: relative; min-width: 0; }
.tm-map { position: absolute; inset: 0; }
.tm-place-hint {
  position: absolute; left: 50%; top: 14px; transform: translateX(-50%); z-index: 1200;
  background: var(--critical); color: var(--bone); padding: 8px 14px; border-radius: var(--r-pill);
  font-size: var(--fs-13); font-weight: 600; box-shadow: var(--shadow-2);
  display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap;
  max-width: calc(100% - 24px); text-align: center;
}
.tm-place-hint button {
  background: rgba(255,255,255,0.25); border: none; color: var(--bone); border-radius: var(--r-1);
  padding: 4px 10px; cursor: pointer; font-size: var(--fs-12);
}

.tm-detail {
  position: absolute; right: 0; top: 0; bottom: 0; width: 320px; max-width: 88vw; z-index: 1200;
  background: var(--bg-card); border-left: 1px solid var(--border-main); box-shadow: var(--shadow-3);
  padding: 16px; overflow-y: auto;
}
.tm-x {
  position: absolute; right: 8px; top: 8px; width: 32px; height: 32px; background: none; border: none;
  color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
}
.tm-detail h2 { margin: 0 34px 2px 0; font-size: var(--fs-18); font-weight: 700; }
.tm-d-town { font-family: var(--font-mono); font-size: var(--fs-12); color: var(--text-muted); margin-bottom: 10px; }
.tm-d-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
.tm-b { font-family: var(--font-mono); font-size: 0.65rem; padding: 2px 6px; border-radius: var(--r-1); background: var(--bg-sunken); color: var(--text-muted); }
.tm-b.star { background: var(--critical-soft); color: var(--critical); }
.tm-b.new { background: var(--positive-soft); color: var(--positive); }
.tm-b.stay { background: var(--primary-soft); color: var(--primary); }
.tm-b.out { background: var(--bg-sunken); color: var(--text-subtle); }
.tm-d-row { font-size: var(--fs-13); margin: 5px 0; word-break: break-word; }
.tm-d-drive { font-size: var(--fs-13); margin: 8px 0; padding: 7px 9px; border-radius: var(--r-2); background: var(--primary-soft); }
.tm-d-drive b { font-variant-numeric: tabular-nums; }
.tm-appts { margin: 12px 0; padding: 8px 9px; border-radius: var(--r-2); border: 1px solid var(--border-light); }
.tm-appts .tm-appt:last-of-type { border-bottom: none; }
.tm-k { display: block; font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-subtle); }
.tm-d-note { font-size: var(--fs-12); color: var(--text-muted); margin-top: 8px; white-space: pre-wrap; }
.tm-d-acts { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.tm-d-acts button, .tm-link-btn {
  padding: 10px; border-radius: var(--r-2); border: 1px solid var(--border-main); background: var(--bg-app);
  font-size: var(--fs-13); font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; color: var(--text-main);
  display: flex; align-items: center; justify-content: center; gap: 5px;
}
.tm-d-acts button.primary { background: var(--primary); color: var(--bone); border-color: var(--primary); }
.tm-d-acts button.danger { color: var(--critical); border-color: var(--critical); }

.tm-modal-back { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 3000; padding: 16px; }
.tm-modal {
  background: var(--bg-card); border-radius: var(--r-3); padding: 18px; width: 380px; max-width: 100%;
  max-height: 92vh; max-height: 92dvh; overflow-y: auto; box-shadow: var(--shadow-3);
}
.tm-modal h3 { margin: 0 0 12px; font-size: var(--fs-16); font-weight: 700; }
.tm-modal label { display: block; font-family: var(--font-mono); font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-subtle); margin: 8px 0 3px; }
.tm-modal input, .tm-modal select, .tm-modal textarea {
  width: 100%; padding: 8px 9px; border: 1px solid var(--border-main); border-radius: var(--r-2);
  background: var(--bg-app); color: var(--text-main); font: inherit; font-size: var(--fs-13);
}
.tm-mstatic { font-size: var(--fs-14); font-weight: 700; padding: 4px 0 2px; }
.tm-mrow { display: flex; gap: 8px; flex-wrap: wrap; }
.tm-mrow > * { flex: 1; min-width: 130px; }
.tm-find { display: flex; gap: 6px; align-items: center; }
.tm-find input { flex: 1; min-width: 0; }
.tm-find button {
  flex: none; padding: 0 0.7rem; align-self: stretch; font-size: 0.68rem; cursor: pointer;
  border: 1px solid var(--border-main); border-radius: var(--r-1); background: var(--bg-app); color: var(--text-main);
}
.tm-find button:hover:not(:disabled) { border-color: var(--primary); }
.tm-find button:disabled { opacity: 0.45; cursor: not-allowed; }
.tm-hits { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.tm-hit {
  text-align: left; font-size: 0.7rem; line-height: 1.4; padding: 5px 7px; cursor: pointer;
  border: 1px solid var(--border-light); border-radius: var(--r-1);
  background: var(--bg-app); color: var(--text-muted);
}
.tm-hit:hover { border-color: var(--primary); color: var(--text-main); }
.tm-mnote { font-size: 0.7rem; color: var(--text-subtle); margin: 6px 0 0; line-height: 1.5; }
.tm-mwarn {
  font-size: var(--fs-12); margin: 6px 0 0; padding: 6px 8px; border-radius: var(--r-2);
  background: var(--caution-soft); color: var(--ember-deep);
}
.tm-mchk {
  display: flex !important; align-items: center; gap: 9px; margin: 12px 0 0 !important; padding: 10px;
  border: 1px solid var(--border-main); border-radius: var(--r-2); cursor: pointer;
  font-family: var(--font-sans) !important; font-size: var(--fs-13) !important; text-transform: none !important;
  letter-spacing: 0 !important; color: var(--text-main) !important;
}
.tm-mchk input { width: 18px !important; height: 18px; flex: none; }
.tm-macts { display: flex; gap: 8px; margin-top: 14px; }
.tm-macts button { flex: 1; padding: 11px; border-radius: var(--r-2); border: 1px solid var(--border-main); background: var(--bg-app); font-weight: 600; font-size: var(--fs-13); cursor: pointer; }
.tm-macts .primary { background: var(--primary); color: var(--bone); border-color: var(--primary); }
.tm-macts .primary:disabled { opacity: 0.45; cursor: default; }
.tm-macts .danger { color: var(--critical); border-color: var(--critical); flex: 0 0 auto; padding: 11px 14px; }

@media (max-width: 860px) {
  .trip-map { flex-direction: column; }
  .tm-tabs { display: flex; border-bottom: 1px solid var(--border-main); flex: none; }
  .tm-side { width: 100%; flex: 1; min-height: 0; border-right: none; }
  .tm-map-wrap { flex: 1; }
  .trip-map.tab-map .tm-side { display: none; }
  .trip-map.tab-plan .tm-map-wrap { display: none; }

  /* iOS zooms the whole page on focus whenever an input sits under 16px */
  .tm-side input, .tm-side select, .tm-side textarea,
  .tm-modal input, .tm-modal select, .tm-modal textarea { font-size: 16px; }

  /* thumb-sized controls */
  .tm-chip { padding: 7px 12px; font-size: 0.72rem; }
  .tm-add { font-size: var(--fs-13); min-height: 42px; }
  .tm-block-h { padding: 12px 4px; }
  .tm-leg-h { padding: 13px 10px; }
  .tm-leg-nm { font-size: var(--fs-16); }
  .tm-leg-meets { padding: 0 10px 10px 30px; }
  .tm-madd { min-height: 38px; font-size: 0.8rem; }
  .tm-leg-acts button, .tm-unloc-acts button, .tm-place-btn, .tm-base-btn { min-height: 34px; padding: 7px 12px; font-size: 0.76rem; }
  .tm-rlist li { padding: 8px 5px; }
  .tm-rlist li button { min-width: 32px; min-height: 32px; font-size: 0.95rem; }
  .tm-appt { padding: 9px 4px; }
  .tm-appt-chk { width: 26px; height: 26px; }
  .tm-appt-ic { width: 32px; height: 32px; }
  .tm-pick label { padding: 9px 3px; }
  .tm-pick input[type="checkbox"] { width: 18px; height: 18px; flex: none; }
  .tm-place-bot .tm-place-btn:nth-last-child(2) { margin-left: 0; }

  /* the detail panel reads better as a bottom sheet on a phone */
  .tm-detail {
    inset: auto 0 0 0; width: 100%; max-width: 100%; max-height: 80%;
    border-left: none; border-top: 1px solid var(--border-main);
    border-radius: var(--r-3) var(--r-3) 0 0; padding: 14px 14px 20px;
  }
  .tm-place-hint { top: 10px; font-size: var(--fs-12); }
}
</style>

<style>
/* leaflet divIcon pins (injected outside scoped styles) */
#tm-root .tm-pin {
  display: block; width: 100%; height: 100%; border-radius: 50%;
  border: 1.5px solid var(--bg-card); box-shadow: 0 1px 3px rgba(0,0,0,0.35);
}
#tm-root .tm-pin.tm-city { border-radius: 50%; background: var(--ink); border-color: var(--bone); }
#tm-root .tm-pin.tone-star { background: var(--critical); }
#tm-root .tm-pin.tone-new { background: var(--positive); }
#tm-root .tm-pin.tone-hub { background: var(--info); }
#tm-root .tm-pin.tone-mat { background: var(--caution); border-radius: 2px; }
#tm-root .tm-pin.tone-out { background: var(--text-subtle); opacity: .4; }
#tm-root .tm-pin.tone-cst { background: #7c5cbf; }
#tm-root .tm-pin.tm-base { background: var(--primary); border: 2.5px solid var(--bg-card); box-shadow: 0 0 0 2px var(--primary); }
#tm-root .tm-pin.tm-draft { background: var(--primary); border: 2.5px solid var(--bg-card); box-shadow: 0 0 0 3px var(--primary); }
#tm-root .tm-pin.in-route { outline: 2px solid var(--primary); outline-offset: 1px; }
/* a booked meeting rings the pin: amber while pending, green once confirmed */
#tm-root .tm-pin.appt { box-shadow: 0 0 0 3px var(--caution); }
#tm-root .tm-pin.appt-ok { box-shadow: 0 0 0 3px var(--positive); }
#tm-root .tm-rnode {
  display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;
  background: #3b5a6b; color: #fff; border-radius: 50%; font: 600 10px/1 var(--font-mono, monospace);
  border: 1.5px solid var(--bg-card);
}
#tm-root .tm-rnode.ok { background: var(--positive); }
#tm-root .tm-rnode.pend { background: var(--caution); color: var(--ink); }
#tm-root .leaflet-container { background: var(--bg-sunken); font-family: var(--font-sans); }
#tm-root .leaflet-control-zoom a { width: 32px; height: 32px; line-height: 32px; }
[data-theme="dark"] #tm-root .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(.92) contrast(.9) saturate(.85); }
</style>
