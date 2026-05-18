import axios, { isAxiosError, isCancel } from 'axios';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import './App.css';

export interface Student {
  id: number;
  name: string;
  email: string;
  course: string;
  age: number;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 12_000,
});

const emptyForm = {
  name: '',
  email: '',
  course: '',
  age: '',
};

function normalizeQuery(q: string) {
  return q.trim().toLowerCase();
}

function App() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null);

  const loadStudents = useCallback(async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
    const silent = opts?.silent === true;
    const signal = opts?.signal;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Student[]>('/api/students', { signal });
      setStudents(data);
    } catch (err: unknown) {
      if (isCancel(err)) return;
      setError(
        'Unable to load students. Check that the API is running (port 4000) and PostgreSQL is reachable.'
      );
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadStudents({ signal: ac.signal });
    return () => ac.abort();
  }, [loadStudents]);

  useEffect(() => {
    if (!pendingDelete) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPendingDelete(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingDelete]);

  const q = normalizeQuery(search);
  const filtered = useMemo(() => {
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q) ||
        String(s.id).includes(q)
    );
  }, [students, q]);

  const metrics = useMemo(() => {
    const n = students.length;
    const courses = new Set(students.map((s) => s.course.trim().toLowerCase())).size;
    const avgAge =
      n === 0
        ? null
        : Math.round(
            students.reduce((acc, s) => acc + s.age, 0) / n
          );
    return { n, courses, avgAge };
  }, [students]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const onChange =
    (field: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
    };

  const submitStudent = async () => {
    setError(null);
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      course: form.course.trim(),
      age: Number(form.age),
    };

    try {
      if (editingId !== null) {
        const { data } = await api.put<Student>(`/api/students/${editingId}`, payload);
        setStudents((list) => list.map((s) => (s.id === editingId ? data : s)));
        showNotice('Record updated successfully.');
      } else {
        const { data } = await api.post<Student>('/api/students', payload);
        setStudents((list) => [...list, data]);
        showNotice('New student record created.');
      }
      resetForm();
    } catch (err) {
      if (isAxiosError(err)) {
        const body = err.response?.data as { error?: string } | undefined;
        const msg =
          body?.error ||
          (typeof err.response?.data === 'string' ? err.response.data : null) ||
          (err.response
            ? `Request failed (${err.response.status})`
            : err.message || 'Network error — is the API running?');
        setError(msg);
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitStudent();
  };

  const onEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      email: s.email,
      course: s.course,
      age: String(s.age),
    });
    setError(null);
  };

  const requestDelete = (s: Student) => {
    setPendingDelete(s);
    setError(null);
  };

  const cancelDelete = () => setPendingDelete(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setPendingDelete(null);
    try {
      await api.delete(`/api/students/${id}`);
      setStudents((list) => list.filter((s) => s.id !== id));
      if (editingId === id) resetForm();
      showNotice('Record removed from the registry.');
    } catch (err) {
      if (isAxiosError(err)) {
        const msg =
          (err.response?.data as { error?: string })?.error || err.message;
        setError(msg);
      } else {
        setError('Removal could not be completed.');
      }
    }
  };

  const deleteTargetName = pendingDelete?.name ?? '';

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="shell-header">
        <div className="shell-header-inner">
          <div className="shell-brand">
            <span className="shell-mark" aria-hidden="true" />
            <span className="shell-title">Students</span>
          </div>
          <div className="shell-header-right">
            <span className="pill-quiet" title="Records are stored in PostgreSQL">
              PostgreSQL
            </span>
          </div>
        </div>
      </header>

      <main id="main-content" className="shell-main">
        <div className="shell-main-inner">
          <div className="page-heading">
            <p className="page-kicker">Directory</p>
            <div className="page-heading-row">
              <div>
                <h1 className="page-title">Students</h1>
                <p className="page-desc">
                  Search, add, and edit students. Records are saved in your PostgreSQL database.
                </p>
              </div>
              <div className="hero-stats" aria-label="Summary">
                <div className="stat-chip">
                  <span className="stat-chip-label">Total</span>
                  <span className="stat-chip-value">{loading ? '—' : metrics.n}</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-label">Programs</span>
                  <span className="stat-chip-value">{loading ? '—' : metrics.courses}</span>
                </div>
                <div className="stat-chip">
                  <span className="stat-chip-label">Avg age</span>
                  <span className="stat-chip-value">
                    {loading ? '—' : metrics.avgAge === null ? '—' : metrics.avgAge}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {notice && (
            <div className="banner banner-success" role="status">
              <span className="banner-icon" aria-hidden="true">
                ✓
              </span>
              <span>{notice}</span>
            </div>
          )}
          {error && (
            <div className="banner banner-error" role="alert">
              <span className="banner-icon" aria-hidden="true">
                !
              </span>
              <span>{error}</span>
            </div>
          )}

          <div className="layout">
            <section className="panel panel-primary table-section" aria-labelledby="registry-heading">
              <div className="panel-head">
                <div>
                  <h2 id="registry-heading" className="panel-title">
                    All students
                  </h2>
                  <p className="panel-sub">
                    {loading
                      ? 'Loading…'
                      : `${filtered.length} of ${students.length} shown`}
                  </p>
                </div>
                <div className="toolbar">
                  <label className="search-wrap">
                    <span className="sr-only">Search students</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="M21 21l-4.3-4.3" />
                    </svg>
                    <input
                      className="search-input"
                      type="search"
                      placeholder="Search…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </label>
                  <button
                    type="button"
                    className={`btn-toolbar${refreshing ? ' is-busy' : ''}`}
                    onClick={() => void loadStudents({ silent: true })}
                    disabled={loading || refreshing}
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="skeleton-block" aria-busy="true" aria-label="Loading">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="skeleton-row">
                      <span className="skeleton w-sm" />
                      <span className="skeleton w-lg" />
                      <span className="skeleton w-md" />
                      <span className="skeleton w-xs" />
                    </div>
                  ))}
                </div>
              ) : students.length === 0 ? (
                <div className="empty-state">
                  <svg
                    className="empty-illus"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <p className="empty-title">No students yet</p>
                  <p className="empty-text">
                    Add someone with the form on the right (or below on your phone).
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="empty-state empty-state-muted">
                  <p className="empty-title">No matching records</p>
                  <p className="empty-text">Adjust your search terms or clear the filter.</p>
                  <button type="button" className="btn-link" onClick={() => setSearch('')}>
                    Clear search
                  </button>
                </div>
              ) : (
                <>
                  <div className="table-wrap directory-table">
                    <table>
                      <thead>
                        <tr>
                          <th className="col-id">ID</th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Course</th>
                          <th className="col-narrow">Age</th>
                          <th className="col-actions" aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((s) => (
                          <tr key={s.id}>
                            <td className="cell-id">{s.id}</td>
                            <td className="cell-strong">{s.name}</td>
                            <td className="cell-email">{s.email}</td>
                            <td>
                              <span className="badge">{s.course}</span>
                            </td>
                            <td>{s.age}</td>
                            <td>
                              <div className="cell-actions">
                                <button
                                  type="button"
                                  className="btn-sm btn-outline"
                                  onClick={() => onEdit(s)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn-sm btn-outline-danger"
                                  onClick={() => requestDelete(s)}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <ul className="student-cards" aria-label="Students">
                    {filtered.map((s) => (
                      <li key={s.id} className="student-card">
                        <div className="student-card-top">
                          <span className="student-card-id">ID {s.id}</span>
                        </div>
                        <div className="student-card-body">
                          <p className="student-card-name">{s.name}</p>
                          <p className="student-card-email">{s.email}</p>
                          <div className="student-card-row">
                            <span className="badge">{s.course}</span>
                            <span className="student-card-age">Age {s.age}</span>
                          </div>
                        </div>
                        <div className="student-card-actions">
                          <button
                            type="button"
                            className="btn-sm btn-outline"
                            onClick={() => onEdit(s)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-sm btn-outline-danger"
                            onClick={() => requestDelete(s)}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <aside className="panel form-section" aria-labelledby="form-heading">
              <div className="panel-head panel-head-stack">
                <h2 id="form-heading" className="panel-title">
                  {editingId !== null ? 'Edit student' : 'Add student'}
                </h2>
                <p className="panel-sub">
                  {editingId !== null
                    ? 'Update the fields and save.'
                    : 'Fields marked with * are required.'}
                </p>
              </div>
              <form className="form-grid" onSubmit={handleFormSubmit}>
                <label>
                  Name <span className="req">*</span>
                  <input
                    className="form-input"
                    required
                    value={form.name}
                    onChange={onChange('name')}
                    autoComplete="name"
                    placeholder="Jordan Lee"
                  />
                </label>
                <label>
                  Email <span className="req">*</span>
                  <input
                    className="form-input"
                    required
                    type="email"
                    value={form.email}
                    onChange={onChange('email')}
                    autoComplete="email"
                    placeholder="jordan@school.edu"
                  />
                </label>
                <label>
                  Course <span className="req">*</span>
                  <input
                    className="form-input"
                    required
                    value={form.course}
                    onChange={onChange('course')}
                    placeholder="Computer Science"
                  />
                </label>
                <label>
                  Age <span className="req">*</span>
                  <input
                    className="form-input"
                    required
                    type="number"
                    min={1}
                    max={120}
                    value={form.age}
                    onChange={onChange('age')}
                    placeholder="18"
                  />
                </label>
                <div className="form-actions">
                  <button type="submit" className="btn-primary btn-wide">
                    {editingId !== null ? 'Save changes' : 'Add student'}
                  </button>
                  {editingId !== null && (
                    <button type="button" className="btn-ghost btn-wide" onClick={resetForm}>
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </aside>
          </div>
        </div>
      </main>

      {pendingDelete && (
        <div className="modal-backdrop" role="presentation" onClick={cancelDelete}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="del-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="del-title" className="modal-title">
              Delete student?
            </h3>
            <p className="modal-body">
              <strong>{deleteTargetName}</strong> will be removed. You can&apos;t undo this for
              the current session.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={cancelDelete}>
                Cancel
              </button>
              <button type="button" className="btn-danger-solid" onClick={() => void confirmDelete()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
