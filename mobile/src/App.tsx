import { useState, useRef, useEffect } from 'react';
import { parseTask, type ParsedTask } from './ai';
import { insertTask, getRecentTasks, type NewTask } from './db';

function generateId() {
  return crypto.randomUUID();
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function friendlyDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (dateStr === todayKey()) return 'Today';
  if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const P_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  p1: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  p2: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  p3: { bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0' },
};

const P_LABELS: Record<string, string> = { p1: 'P1 · Do today', p2: 'P2 · This week', p3: 'P3 · When ready' };

const S: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: '#f8fafc' },

  header: {
    background: '#1e293b',
    padding: '52px 20px 20px',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 700, letterSpacing: -0.3 },
  headerSub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },

  body: { flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 },

  card: {
    background: '#fff',
    borderRadius: 16,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    border: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', gap: 12,
  },

  textarea: {
    width: '100%', border: 'none', outline: 'none', resize: 'none',
    fontSize: 16, lineHeight: 1.5, color: '#1e293b',
    fontFamily: 'inherit', background: 'transparent',
    minHeight: 72,
  },

  aiBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '12px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 600, width: '100%',
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff',
    transition: 'opacity 0.15s',
  },

  fieldLabel: { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.8, textTransform: 'uppercase' },

  textInput: {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1.5px solid #e2e8f0', fontSize: 15, color: '#1e293b',
    fontFamily: 'inherit', outline: 'none', background: '#f8fafc',
  },

  pillRow: { display: 'flex', gap: 8 },

  addBtn: {
    padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
    fontSize: 16, fontWeight: 700, width: '100%',
    background: '#16a34a', color: '#fff',
    transition: 'opacity 0.15s',
  },

  successBanner: {
    background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 14,
    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
    color: '#15803d', fontSize: 15, fontWeight: 600,
  },

  recentHeader: { fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },

  recentItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 10, background: '#fff',
    border: '1px solid #e2e8f0', marginBottom: 6,
  },

  dot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
};

function Pill({
  label, active, color, onClick,
}: {
  label: string; active: boolean; color: { bg: string; text: string; border: string }; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 14px', borderRadius: 20, border: `1.5px solid ${active ? color.border : '#e2e8f0'}`,
        background: active ? color.bg : '#f8fafc', color: active ? color.text : '#94a3b8',
        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
}

function dotColor(priority: string) {
  if (priority === 'p1') return '#ef4444';
  if (priority === 'p2') return '#f59e0b';
  return '#cbd5e1';
}

export function App() {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<NewTask[]>([]);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Manual fields (also used as editable after AI parse)
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayKey());
  const [priority, setPriority] = useState<'p1' | 'p2' | 'p3'>('p2');
  const [category, setCategory] = useState<'work' | 'personal'>('work');

  useEffect(() => {
    getRecentTasks().then(setRecent).catch(() => {});
  }, [success]);

  async function handleParse() {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await parseTask(input.trim());
      setParsed(result);
      setTitle(result.title);
      setDate(result.date || todayKey());
      setPriority(result.priority);
      setCategory(result.category);
    } catch {
      setError('Could not parse — try manual mode');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    const taskTitle = (mode === 'ai' ? title : title).trim();
    if (!taskTitle) return;
    setSaving(true);
    setError('');
    try {
      await insertTask({ id: generateId(), title: taskTitle, date, priority, category });
      setSuccess(taskTitle);
      setInput('');
      setParsed(null);
      setTitle('');
      setDate(todayKey());
      setPriority('p2');
      setCategory('work');
      setMode('ai');
      setTimeout(() => setSuccess(''), 3000);
      textareaRef.current?.focus();
    } catch (e) {
      setError('Failed to save. Check connection.');
    } finally {
      setSaving(false);
    }
  }

  const showFields = parsed !== null || mode === 'manual';

  return (
    <div style={S.root}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.headerTitle}>⚽ The Ball</div>
          <div style={S.headerSub}>Quick add</div>
        </div>
      </div>

      <div style={S.body}>
        {/* Success */}
        {success && (
          <div style={S.successBanner}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div>
              <div>Task added</div>
              <div style={{ fontSize: 12, fontWeight: 400, color: '#16a34a', opacity: 0.8, marginTop: 2 }}>{success}</div>
            </div>
          </div>
        )}

        {/* Input card */}
        <div style={S.card}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setMode('ai'); setParsed(null); }}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: mode === 'ai' ? '#1e293b' : '#f1f5f9',
                color: mode === 'ai' ? '#fff' : '#64748b',
              }}
            >✨ AI</button>
            <button
              onClick={() => { setMode('manual'); setParsed(null); }}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600,
                background: mode === 'manual' ? '#1e293b' : '#f1f5f9',
                color: mode === 'manual' ? '#fff' : '#64748b',
              }}
            >Manual</button>
          </div>

          {mode === 'ai' && (
            <>
              <textarea
                ref={textareaRef}
                style={S.textarea}
                placeholder="Describe the task naturally…&#10;e.g. &quot;Call Roland about Q3 deck P1 Thursday&quot;"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) handleParse(); }}
                rows={3}
                autoFocus
              />
              <button
                style={{ ...S.aiBtn, opacity: loading || !input.trim() ? 0.5 : 1 }}
                onClick={handleParse}
                disabled={loading || !input.trim()}
              >
                {loading ? '⏳ Parsing…' : '✨ Parse with AI'}
              </button>
            </>
          )}

          {/* Fields — shown after AI parse or in manual mode */}
          {showFields && (
            <>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
                <div style={S.fieldLabel}>Title</div>
                <input
                  style={{ ...S.textInput, marginTop: 6 }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title"
                />
              </div>

              <div>
                <div style={S.fieldLabel}>Date</div>
                <input
                  type="date"
                  style={{ ...S.textInput, marginTop: 6 }}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div>
                <div style={S.fieldLabel}>Priority</div>
                <div style={{ ...S.pillRow, marginTop: 6, flexWrap: 'wrap' }}>
                  {(['p1', 'p2', 'p3'] as const).map((p) => (
                    <Pill
                      key={p}
                      label={P_LABELS[p]}
                      active={priority === p}
                      color={P_COLORS[p]}
                      onClick={() => setPriority(p)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div style={S.fieldLabel}>Category</div>
                <div style={{ ...S.pillRow, marginTop: 6 }}>
                  <Pill
                    label="Work"
                    active={category === 'work'}
                    color={{ bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }}
                    onClick={() => setCategory('work')}
                  />
                  <Pill
                    label="Personal"
                    active={category === 'personal'}
                    color={{ bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' }}
                    onClick={() => setCategory('personal')}
                  />
                </div>
              </div>
            </>
          )}

          {/* Manual mode — show title field directly */}
          {mode === 'manual' && !showFields && null}

          {error && (
            <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 500 }}>{error}</div>
          )}
        </div>

        {/* Add button */}
        {showFields && (
          <button
            style={{ ...S.addBtn, opacity: saving || !title.trim() ? 0.5 : 1 }}
            onClick={handleAdd}
            disabled={saving || !title.trim()}
          >
            {saving ? 'Adding…' : '+ Add Task'}
          </button>
        )}

        {mode === 'manual' && !parsed && (
          <div style={S.card}>
            <div>
              <div style={S.fieldLabel}>Title</div>
              <input
                style={{ ...S.textInput, marginTop: 6 }}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                autoFocus
              />
            </div>
            <div>
              <div style={S.fieldLabel}>Date</div>
              <input type="date" style={{ ...S.textInput, marginTop: 6 }} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <div style={S.fieldLabel}>Priority</div>
              <div style={{ ...S.pillRow, marginTop: 6, flexWrap: 'wrap' }}>
                {(['p1', 'p2', 'p3'] as const).map((p) => (
                  <Pill key={p} label={P_LABELS[p]} active={priority === p} color={P_COLORS[p]} onClick={() => setPriority(p)} />
                ))}
              </div>
            </div>
            <div>
              <div style={S.fieldLabel}>Category</div>
              <div style={{ ...S.pillRow, marginTop: 6 }}>
                <Pill label="Work" active={category === 'work'} color={{ bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }} onClick={() => setCategory('work')} />
                <Pill label="Personal" active={category === 'personal'} color={{ bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' }} onClick={() => setCategory('personal')} />
              </div>
            </div>
            <button
              style={{ ...S.addBtn, opacity: saving || !title.trim() ? 0.5 : 1 }}
              onClick={handleAdd}
              disabled={saving || !title.trim()}
            >
              {saving ? 'Adding…' : '+ Add Task'}
            </button>
          </div>
        )}

        {/* Recent tasks */}
        {recent.length > 0 && (
          <div>
            <div style={S.recentHeader}>Recently added</div>
            {recent.map((t) => (
              <div key={t.id} style={S.recentItem}>
                <div style={{ ...S.dot, background: dotColor(t.priority) }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{friendlyDate(t.date)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
