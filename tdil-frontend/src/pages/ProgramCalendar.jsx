import { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import API from '../services/api';
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Download, Upload, X, Calendar, List, ExternalLink } from 'lucide-react';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const CAT_COLORS = {
  'in-person': 'bg-green-100 text-green-800 border-green-200',
  'virtual':   'bg-blue-100 text-blue-800 border-blue-200',
  'hybrid':    'bg-purple-100 text-purple-800 border-purple-200',
  'workshop':  'bg-orange-100 text-orange-800 border-orange-200',
  'webinar':   'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const defaultForm = {
  title: '', description: '', date: '', time: '09:00',
  location: '', category: 'in-person', max_attendees: 50,
  points: 50, visibility: 'public', signup_url: ''
};

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  }).filter(r => r.title && r.date);
}

function parseICS(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT');
  for (const block of blocks.slice(1)) {
    const getVal = (key) => {
      const m = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return m ? m[1].trim() : '';
    };
    const dtstart = getVal('DTSTART');
    if (!dtstart) continue;
    // Parse date from YYYYMMDD or YYYYMMDDTHHMMSS
    const y = dtstart.slice(0,4), mo = dtstart.slice(4,6), d = dtstart.slice(6,8);
    const h = dtstart.length > 8 ? dtstart.slice(9,11) : '09';
    const mn = dtstart.length > 8 ? dtstart.slice(11,13) : '00';
    events.push({
      title: getVal('SUMMARY') || 'Imported Event',
      description: getVal('DESCRIPTION'),
      date: `${y}-${mo}-${d}`,
      time: `${h}:${mn}`,
      location: getVal('LOCATION'),
      signup_url: getVal('URL')
    });
  }
  return events.filter(e => e.title && e.date);
}

export default function ProgramCalendar() {
  const { user } = useUser();
  const isAdmin = ['admin', 'founder'].includes(user?.userType);
  const fileRef = useRef(null);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView] = useState('calendar'); // 'calendar' | 'list'
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const r = await API.get('/events');
      setEvents(r.data || []);
    } catch (_) {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  // ── Calendar grid helpers ────────────────────────────────────────────────
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsForMonth = events.filter(e => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const eventsForDay = (day) => eventsForMonth.filter(e => {
    const d = new Date(e.date);
    return d.getDate() === day;
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // ── Form helpers ─────────────────────────────────────────────────────────
  const openCreate = (prefillDate = '') => {
    setEditingEvent(null);
    setForm({ ...defaultForm, date: prefillDate });
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    const d = ev.date ? ev.date.split('T')[0] : '';
    const t = ev.date?.includes('T') ? ev.date.split('T')[1]?.slice(0,5) : ev.time || '09:00';
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      date: d,
      time: t || '09:00',
      location: ev.location || '',
      category: ev.category || 'in-person',
      max_attendees: ev.maxAttendees || ev.max_attendees || 50,
      points: ev.points || 50,
      visibility: ev.visibility || 'public',
      signup_url: ev.signup_url || ''
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: form.time ? `${form.date}T${form.time}:00` : form.date,
        max_attendees: parseInt(form.max_attendees) || 50,
        points: parseInt(form.points) || 50
      };
      if (editingEvent) {
        await API.put(`/events/${editingEvent.id}`, payload);
        notify('Event updated ✅');
      } else {
        await API.post('/events', payload);
        notify('Event created ✅');
      }
      setShowForm(false);
      setEditingEvent(null);
      await fetchEvents();
    } catch (err) {
      notify(err.response?.data?.error || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await API.delete(`/events/${id}`);
      notify('Event deleted');
      await fetchEvents();
    } catch (_) { notify('Delete failed', 'error'); }
  };

  // ── Import ───────────────────────────────────────────────────────────────
  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const isICS = file.name.endsWith('.ics') || file.name.endsWith('.ical');
    const rows = isICS ? parseICS(text) : parseCSV(text);

    if (!rows.length) { notify('No valid events found in file', 'error'); return; }

    let created = 0;
    for (const row of rows) {
      try {
        await API.post('/events', {
          title: row.title,
          description: row.description || '',
          date: row.time ? `${row.date}T${row.time}:00` : row.date,
          location: row.location || '',
          category: row.category || 'in-person',
          max_attendees: parseInt(row.max_attendees) || 50,
          points: parseInt(row.points) || 50,
          visibility: row.visibility || 'public',
          signup_url: row.signup_url || row.url || ''
        });
        created++;
      } catch (_) {}
    }
    notify(`Imported ${created} of ${rows.length} events ✅`);
    await fetchEvents();
    e.target.value = '';
  };

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const cols = ['title', 'description', 'date', 'location', 'category', 'signup_url', 'visibility'];
    const header = cols.join(',');
    const rows = events.map(ev =>
      cols.map(c => `"${(ev[c] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tdil-events.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  const listEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <PageLayout
      userType={user?.userType}
      title="📅 Program Calendar"
      subtitle="Upcoming events, workshops, and programs"
      userPoints={user?.points || 0}
      headerActions={
        <div className="flex items-center gap-2">
          <button onClick={() => setView(v => v === 'calendar' ? 'list' : 'calendar')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            {view === 'calendar' ? <><List size={14} /> List</> : <><Calendar size={14} /> Month</>}
          </button>
          {isAdmin && (
            <>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download size={14} /> Export
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                <Upload size={14} /> Import
              </button>
              <input ref={fileRef} type="file" accept=".csv,.ics,.ical" className="hidden" onChange={handleImportFile} />
              <button onClick={() => openCreate()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Plus size={14} /> Add Event
              </button>
            </>
          )}
        </div>
      }
    >
      {/* Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium ${
          notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>{notification.msg}</div>
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editingEvent ? 'Edit Event' : 'New Event'}</h3>
              <button onClick={() => { setShowForm(false); setEditingEvent(null); }}><X size={18} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input required value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                placeholder="Event title *" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time</label>
                  <input type="time" value={form.time} onChange={e => setForm(f => ({...f, time: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <input value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))}
                placeholder="Location / Zoom link" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              <input value={form.signup_url} onChange={e => setForm(f => ({...f, signup_url: e.target.value}))}
                placeholder="Sign-up URL (Eventbrite, Calendly, Zoom, etc.)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="in-person">In-Person</option>
                    <option value="virtual">Virtual</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="workshop">Workshop</option>
                    <option value="webinar">Webinar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Visibility</label>
                  <select value={form.visibility} onChange={e => setForm(f => ({...f, visibility: e.target.value}))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="public">🌐 Public</option>
                    <option value="cohort">🎓 Cohort</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Points</label>
                  <input type="number" min="0" value={form.points} onChange={e => setForm(f => ({...f, points: e.target.value}))}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditingEvent(null); }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                  {saving ? 'Saving…' : editingEvent ? 'Save Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import hint */}
      {isAdmin && (
        <div className="mb-4 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2">
          📥 <strong>Import:</strong> CSV (columns: title, date, time, location, category, signup_url) or .ics/.ical calendar file
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"><ChevronLeft size={18} /></button>
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-900">{MONTH_NAMES[month]} {year}</h2>
              <button onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); }}
                className="text-xs text-blue-600 hover:underline">Today</button>
            </div>
            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"><ChevronRight size={18} /></button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {DAY_NAMES.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-[90px] border-r border-b bg-gray-50/50" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayKey = `${year}-${month}-${day}`;
              const isToday = dayKey === todayKey;
              const dayEvents = eventsForDay(day);
              return (
                <div key={day} className={`min-h-[90px] border-r border-b p-1.5 cursor-pointer hover:bg-blue-50/30 transition-colors ${isToday ? 'bg-blue-50' : ''}`}
                  onClick={() => { setSelectedDay(selectedDay === day ? null : day); }}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id}
                      onClick={e => { e.stopPropagation(); setSelectedDay(day); }}
                      className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate border cursor-pointer ${CAT_COLORS[ev.category] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-400">+{dayEvents.length - 3} more</div>
                  )}
                  {/* Admin: add button on hover */}
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); openCreate(`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`); }}
                      className="opacity-0 hover:opacity-100 mt-0.5 w-full text-center text-xs text-blue-500 hover:text-blue-700">
                      + add
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected day event detail */}
          {selectedDay && eventsForDay(selectedDay).length > 0 && (
            <div className="border-t p-4 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{MONTH_NAMES[month]} {selectedDay}</h3>
              <div className="space-y-2">
                {eventsForDay(selectedDay).map(ev => <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading events…</div>
          ) : listEvents.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="text-5xl mb-3">📅</div>
              <h3 className="font-semibold text-gray-900 mb-1">No events yet</h3>
              {isAdmin && <p className="text-gray-500 text-sm">Click "+ Add Event" to create the first one.</p>}
            </div>
          ) : (
            listEvents.map(ev => (
              <EventCard key={ev.id} ev={ev} isAdmin={isAdmin} onEdit={openEdit} onDelete={handleDelete} expanded />
            ))
          )}
        </div>
      )}
    </PageLayout>
  );
}

// ── Event Card Component ──────────────────────────────────────────────────────
function EventCard({ ev, isAdmin, onEdit, onDelete, expanded = false }) {
  const d = ev.date ? new Date(ev.date + (ev.date.endsWith('Z') ? '' : '')) : null;
  const dateStr = d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';
  const timeStr = d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${ev.signup_url ? 'border-l-4 border-l-blue-400' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-gray-900 text-sm">{ev.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${CAT_COLORS[ev.category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {ev.category || 'event'}
              </span>
              {ev.points > 0 && <span className="text-xs text-yellow-600 font-medium">⭐ +{ev.points} pts</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
              <span>📅 {dateStr}{timeStr && ` · ${timeStr}`}</span>
              {ev.location && <span>📍 {ev.location}</span>}
            </div>
            {expanded && ev.description && (
              <p className="text-sm text-gray-600 mb-2">{ev.description}</p>
            )}
            {ev.signup_url && (
              <a href={ev.signup_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors font-medium">
                <ExternalLink size={11} /> Sign Up / Register
              </a>
            )}
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onEdit(ev)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                <Edit2 size={13} />
              </button>
              <button onClick={() => onDelete(ev.id, ev.title)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
