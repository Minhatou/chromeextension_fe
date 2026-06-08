import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import './AdminDashboard.css';
import { getSession } from '../api/authClient';
import {
  TeamOutlined, HistoryOutlined, BookOutlined, DashboardOutlined,
  ThunderboltFilled, ReloadOutlined, UserOutlined, CrownOutlined,
  DeleteOutlined, PlusOutlined, EditOutlined, CloseOutlined,
  CheckCircleOutlined, CloseCircleOutlined, WarningOutlined,
  SunOutlined, MoonOutlined, LockOutlined, SafetyCertificateOutlined,
  CloudOutlined, RobotOutlined, SettingOutlined, CheckOutlined,
  StopOutlined, BulbOutlined, PoweroffOutlined, DownloadOutlined,
  DollarCircleOutlined, LineChartOutlined
} from '@ant-design/icons';

const API = 'https://hvmndoan-production.up.railway.app';

// ── Toast helper ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const show = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, show };
}

function apiPost(path, body) {
  return fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json());
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ uid, toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    apiPost('/api/admin/users', { uid })
      .then(d => { if (d.users) setUsers(d.users); })
      .catch(() => toast('Không thể tải danh sách người dùng', 'error'))
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleRole = async (targetUid, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    const action = newRole === 'admin' ? 'nâng lên Admin' : 'thu hồi quyền Admin';
    if (!window.confirm(`Bạn muốn ${action} cho tài khoản này?`)) return;
    setUpdating(targetUid);
    const res = await apiPost('/api/admin/users/role', { uid, target_uid: targetUid, role: newRole });
    setUpdating(null);
    if (res.success) {
      setUsers(prev => prev.map(u => u.uid === targetUid ? { ...u, role: newRole } : u));
      toast(`Đã ${action} thành công`);
    } else {
      toast(res.error || 'Thao tác thất bại', 'error');
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div>
      <div className="admin-section-title">Quản lý người dùng</div>
      <div className="admin-section-desc">Xem và phân quyền toàn bộ tài khoản trong hệ thống.</div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">
            Tất cả tài khoản
            <span className="badge-count">{users.length}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={fetchUsers} disabled={loading}>
            <ReloadOutlined spin={loading} /> Làm mới
          </button>
        </div>

        {loading ? (
          <div className="admin-empty"><span className="admin-spinner" /></div>
        ) : users.length === 0 ? (
          <div className="admin-empty">Không có tài khoản nào.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Vai trò</th>
                <th>UID</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid}>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <UserOutlined style={{ color: 'var(--text-secondary)', fontSize: 13 }} />
                      {u.email || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`role-badge ${u.role}`}>
                      {u.role === 'admin'
                        ? <><CrownOutlined /> Admin</>
                        : <><UserOutlined /> User</>}
                    </span>
                  </td>
                  <td>
                    <span className="truncate" style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                      {u.uid}
                    </span>
                  </td>
                  <td>
                    {u.uid === uid ? (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>(bạn)</span>
                    ) : (
                      <button
                        className={`btn btn-sm ${u.role === 'admin' ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={() => toggleRole(u.uid, u.role)}
                        disabled={updating === u.uid}
                      >
                        {updating === u.uid
                          ? <span className="admin-spinner" />
                          : u.role === 'admin'
                            ? <><StopOutlined /> Thu hồi quyền</>
                            : <><CrownOutlined /> Nâng lên Admin</>}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div className="admin-card" style={{ flex: 1, marginBottom: 0 }}>
          <div className="admin-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TeamOutlined /> Tổng tài khoản
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{users.length}</div>
        </div>
        <div className="admin-card" style={{ flex: 1, marginBottom: 0 }}>
          <div className="admin-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CrownOutlined /> Quản trị viên
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-primary)' }}>{adminCount}</div>
        </div>
        <div className="admin-card" style={{ flex: 1, marginBottom: 0 }}>
          <div className="admin-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserOutlined /> Người dùng thường
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{users.length - adminCount}</div>
        </div>
      </div>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ uid, toast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const exportJson = () => {
    const data = history.map(h => ({ ENG: h.source_text || '', VIE: h.translated_text || '' }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `history_contributions_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchHistory = useCallback(() => {
    setLoading(true);
    apiPost('/api/admin/history', { uid })
      .then(d => {
        console.log('[Admin/History] API response:', d);
        if (d.error) {
          console.error('[Admin/History] Backend error:', d.error);
          toast(d.error, 'error');
        } else if (d.history) {
          console.log('[Admin/History] Loaded', d.history.length, 'entries');
          setHistory(d.history);
        }
      })
      .catch(err => {
        console.error('[Admin/History] Fetch error:', err);
        toast('Không thể tải lịch sử', 'error');
      })
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const deleteEntry = async (docId) => {
    const res = await apiPost('/api/admin/history/delete', { uid, doc_id: docId });
    if (res.success) {
      setHistory(prev => prev.filter(h => h.id !== docId));
      toast('Đã xoá bản ghi');
    } else {
      toast(res.error || 'Xoá thất bại', 'error');
    }
  };

  const clearAll = async () => {
    setClearing(true);
    const res = await apiPost('/api/admin/history/clear', { uid });
    setClearing(false);
    setShowConfirm(false);
    if (res.success) {
      setHistory([]);
      toast(`Đã xoá ${res.deleted} bản ghi`);
    } else {
      toast(res.error || 'Xoá thất bại', 'error');
    }
  };

  return (
    <div>
      <div className="admin-section-title">Lịch sử dịch thuật người dùng đóng góp</div>
      <div className="admin-section-desc">Xem và xoá toàn bộ lịch sử dịch thuật người dùng đóng góp của hệ thống.</div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">
            Translation logs
            <span className="badge-count">{history.length}</span>
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchHistory} disabled={loading}>
              <ReloadOutlined spin={loading} /> Làm mới
            </button>
            <button className="btn btn-ghost btn-sm" onClick={exportJson} disabled={history.length === 0}>
              <DownloadOutlined /> Xuất JSON
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => setShowConfirm(true)}
              disabled={history.length === 0}
            >
              <DeleteOutlined /> Xoá tất cả
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty"><span className="admin-spinner" /></div>
        ) : history.length === 0 ? (
          <div className="admin-empty">Không có lịch sử nào.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Văn bản gốc</th>
                <th>Kết quả dịch</th>
                <th>Loại</th>
                <th>Thời gian</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {history.map(h => (
                <tr key={h.id}>
                  <td><span className="truncate" title={h.source_text}>{h.source_text}</span></td>
                  <td><span className="truncate" title={h.translated_text}>{h.translated_text}</span></td>
                  <td>
                    <span style={{ fontSize: 11, background: 'var(--item-bg)', border: '1px solid var(--card-border)', borderRadius: 6, padding: '2px 7px', color: 'var(--text-secondary)' }}>
                      {h.type || 'auto'}
                    </span>
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {h.timestamp ? new Date(h.timestamp).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteEntry(h.id)}>
                      <CloseOutlined />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showConfirm && (
        <div className="admin-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-title">Xoá toàn bộ lịch sử?</div>
            <div className="confirm-box">
              <p>Thao tác này sẽ xoá vĩnh viễn <strong>{history.length} bản ghi</strong> khỏi hệ thống và không thể hoàn tác.</p>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)}>Huỷ</button>
              <button className="btn btn-danger" onClick={clearAll} disabled={clearing}>
                {clearing ? <span className="admin-spinner" /> : <DeleteOutlined />} Xoá tất cả
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Glossary Tab ──────────────────────────────────────────────────────────────
function GlossaryTab({ uid, toast }) {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ term: '', meaning: '', context: '' });
  const [saving, setSaving] = useState(false);

  const fetchGlossary = useCallback(() => {
    setLoading(true);
    apiPost('/api/admin/glossary', { uid })
      .then(d => { if (d.glossary) setTerms(d.glossary); })
      .catch(() => toast('Không thể tải sổ tay thuật ngữ', 'error'))
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => { fetchGlossary(); }, [fetchGlossary]);

  const openEdit = (term) => {
    setEditTarget(term);
    setForm({ term: term.term, meaning: term.meaning, context: term.context || '' });
    setShowAdd(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ term: '', meaning: '', context: '' });
    setShowAdd(true);
  };

  const closeModal = () => { setEditTarget(null); setShowAdd(false); };

  const save = async () => {
    if (!form.term.trim() || !form.meaning.trim()) {
      toast('Thuật ngữ và nghĩa không được trống', 'error');
      return;
    }
    setSaving(true);
    if (editTarget) {
      const res = await apiPost('/api/admin/glossary/update', { uid, id: editTarget.id, ...form });
      setSaving(false);
      if (res.success) {
        setTerms(prev => prev.map(t => t.id === editTarget.id ? { ...t, ...form } : t));
        toast('Đã cập nhật thuật ngữ');
        closeModal();
      } else {
        toast(res.error || 'Cập nhật thất bại', 'error');
      }
    } else {
      const res = await apiPost('/api/admin/glossary/add', { uid, ...form });
      setSaving(false);
      if (res.success) {
        setTerms(prev => [...prev, { id: res.id, ...form }]);
        toast('Đã thêm thuật ngữ mới');
        closeModal();
      } else {
        toast(res.error || 'Thêm thất bại', 'error');
      }
    }
  };

  const deleteTerm = async (id) => {
    if (!window.confirm('Xoá thuật ngữ này?')) return;
    const res = await apiPost('/api/admin/glossary/delete', { uid, id });
    if (res.success) {
      setTerms(prev => prev.filter(t => t.id !== id));
      toast('Đã xoá thuật ngữ');
    } else {
      toast(res.error || 'Xoá thất bại', 'error');
    }
  };

  const isModalOpen = showAdd || editTarget !== null;

  return (
    <div>
      <div className="admin-section-title">Sổ tay thuật ngữ hệ thống</div>
      <div className="admin-section-desc">Quản lý từ điển thuật ngữ IT dùng chung cho toàn hệ thống.</div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">
            Thuật ngữ hệ thống
            <span className="badge-count">{terms.length}</span>
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchGlossary} disabled={loading}>
              <ReloadOutlined spin={loading} /> Làm mới
            </button>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <PlusOutlined /> Thêm thuật ngữ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty"><span className="admin-spinner" /></div>
        ) : terms.length === 0 ? (
          <div className="admin-empty">Chưa có thuật ngữ nào. Nhấn "Thêm thuật ngữ" để bắt đầu.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Thuật ngữ</th>
                <th>Nghĩa</th>
                <th>Ngữ cảnh</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {terms.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.term}</td>
                  <td>{t.meaning}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t.context || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>
                        <EditOutlined /> Sửa
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => deleteTerm(t.id)}>
                        <DeleteOutlined />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-title">
              {editTarget ? <><EditOutlined /> Chỉnh sửa thuật ngữ</> : <><PlusOutlined /> Thêm thuật ngữ mới</>}
            </div>
            <div className="admin-form">
              <div className="admin-form-group">
                <label>Thuật ngữ (EN)</label>
                <input
                  className="admin-input"
                  placeholder="vd: inference"
                  value={form.term}
                  onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Nghĩa (VI)</label>
                <input
                  className="admin-input"
                  placeholder="vd: suy luận"
                  value={form.meaning}
                  onChange={e => setForm(p => ({ ...p, meaning: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Ngữ cảnh</label>
                <input
                  className="admin-input"
                  placeholder="vd: Machine Learning, Networking…"
                  value={form.context}
                  onChange={e => setForm(p => ({ ...p, context: e.target.value }))}
                />
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={closeModal}>
                <CloseOutlined /> Huỷ
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <span className="admin-spinner" /> : <CheckOutlined />}
                {editTarget ? 'Lưu thay đổi' : 'Thêm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Models Tab ────────────────────────────────────────────────────────────────
function ModelsTab({ uid, toast }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ model_id: '', name: '', path: '', input_price_1m: 5000, output_price_1m: 15000 });
  const [saving, setSaving] = useState(false);

  const fetchModels = useCallback(() => {
    setLoading(true);
    apiPost('/api/admin/models', { uid })
      .then(d => { if (d.models) setModels(d.models); })
      .catch(() => toast('Không thể tải danh sách model', 'error'))
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => { fetchModels(); }, [fetchModels]);

  const openAdd = () => {
    setForm({ model_id: '', name: '', path: '', input_price_1m: 5000, output_price_1m: 15000 });
    setShowAdd(true);
  };

  const deleteModel = async (modelId) => {
    if (!window.confirm(`Xoá model ${modelId} này?`)) return;
    const res = await apiPost('/api/admin/models/delete', { uid, model_id: modelId });
    if (res.success) {
      setModels(prev => prev.filter(m => m.model_id !== modelId));
      toast('Đã xoá model thành công');
    } else {
      toast(res.error || 'Xoá thất bại', 'error');
    }
  };

  const save = async () => {
    if (!form.model_id.trim() || !form.name.trim() || !form.path.trim()) {
      toast('Các trường Model ID, Tên và Path không được trống', 'error');
      return;
    }
    setSaving(true);
    const res = await apiPost('/api/admin/models/add', { uid, ...form });
    setSaving(false);
    if (res.success) {
      fetchModels();
      toast('Đã lưu model thành công');
      setShowAdd(false);
    } else {
      toast(res.error || 'Lưu thất bại', 'error');
    }
  };

  return (
    <div>
      <div className="admin-section-title">Quản lý mô hình AI</div>
      <div className="admin-section-desc">Xem, cấu hình và thêm các mô hình ngôn ngữ lớn (LLM) trong hệ thống.</div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">
            Danh sách mô hình
            <span className="badge-count">{models.length}</span>
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchModels} disabled={loading}>
              <ReloadOutlined spin={loading} /> Làm mới
            </button>
            <button className="btn btn-primary btn-sm" onClick={openAdd}>
              <PlusOutlined /> Thêm mô hình
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty"><span className="admin-spinner" /></div>
        ) : models.length === 0 ? (
          <div className="admin-empty">Chưa có mô hình nào. Nhấn "Thêm mô hình" để bắt đầu.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Model ID</th>
                <th>Tên hiển thị</th>
                <th>Đường dẫn (Path)</th>
                <th>Giá Input (1M tokens)</th>
                <th>Giá Output (1M tokens)</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.model_id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{m.model_id}</td>
                  <td>{m.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'monospace' }}>{m.path}</td>
                  <td>{m.input_price_1m?.toLocaleString('vi-VN')} VNĐ</td>
                  <td>{m.output_price_1m?.toLocaleString('vi-VN')} VNĐ</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteModel(m.model_id)}>
                      <DeleteOutlined /> Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="admin-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-title">
              <PlusOutlined /> Thêm mô hình AI mới
            </div>
            <div className="admin-form">
              <div className="admin-form-group">
                <label>Model ID (vd: qwen2, llama3)</label>
                <input
                  className="admin-input"
                  placeholder="model_id"
                  value={form.model_id}
                  onChange={e => setForm(p => ({ ...p, model_id: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Tên hiển thị</label>
                <input
                  className="admin-input"
                  placeholder="Qwen2-1.5B Premium"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Đường dẫn (Local path hoặc HuggingFace repo)</label>
                <input
                  className="admin-input"
                  placeholder="C:\paths\to\model..."
                  value={form.path}
                  onChange={e => setForm(p => ({ ...p, path: e.target.value }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Giá Input (VNĐ cho 1 triệu tokens)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={form.input_price_1m}
                  onChange={e => setForm(p => ({ ...p, input_price_1m: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div className="admin-form-group">
                <label>Giá Output (VNĐ cho 1 triệu tokens)</label>
                <input
                  type="number"
                  className="admin-input"
                  value={form.output_price_1m}
                  onChange={e => setForm(p => ({ ...p, output_price_1m: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>
                <CloseOutlined /> Huỷ
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <span className="admin-spinner" /> : <CheckOutlined />} Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transactions Tab ─────────────────────────────────────────────────────────
function TransactionsTab({ uid, toast }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(() => {
    setLoading(true);
    apiPost('/api/admin/transactions', { uid })
      .then(d => { if (d.transactions) setTransactions(d.transactions); })
      .catch(() => toast('Không thể tải lịch sử giao dịch', 'error'))
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const totalRevenue = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  const exportXlsx = () => {
    const rows = transactions.map(t => ({
      'Mã giao dịch': t.id,
      'UID Người dùng': t.uid,
      'Gói dịch vụ': t.package_id === 'basic' ? 'Cơ bản' : t.package_id === 'standard' ? 'Tiêu chuẩn' : 'Cao cấp',
      'Số tiền (VNĐ)': t.amount || 0,
      'Hình thức': t.payment_method || 'QR',
      'Thời gian': t.timestamp ? new Date(t.timestamp).toLocaleString('vi-VN') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch');
    XLSX.writeFile(wb, `transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      <div className="admin-section-title">Quản lý giao dịch nạp tiền</div>
      <div className="admin-section-desc">Theo dõi các giao dịch nạp Credit mua của người dùng qua VietQR.</div>

      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">
            Lịch sử giao dịch
            <span className="badge-count">{transactions.length}</span>
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={fetchTransactions} disabled={loading}>
              <ReloadOutlined spin={loading} /> Làm mới
            </button>
            <button className="btn btn-ghost btn-sm" onClick={exportXlsx} disabled={transactions.length === 0}>
              <DownloadOutlined /> Xuất XLSX
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-empty"><span className="admin-spinner" /></div>
        ) : transactions.length === 0 ? (
          <div className="admin-empty">Không có giao dịch nào được ghi nhận.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã giao dịch (ID)</th>
                <th>UID Người dùng</th>
                <th>Gói dịch vụ</th>
                <th>Số tiền</th>
                <th>Hình thức</th>
                <th>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{t.id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{t.uid}</td>
                  <td>
                    <span style={{ fontSize: 12, background: 'var(--item-bg)', border: '1px solid var(--card-border)', borderRadius: '6px', padding: '2px 8px', fontWeight: 600 }}>
                      {t.package_id === 'basic' ? 'Cơ bản' : t.package_id === 'standard' ? 'Tiêu chuẩn' : 'Cao cấp'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--success)', fontWeight: 700 }}>+{t.amount?.toLocaleString('vi-VN')} VNĐ</td>
                  <td>
                    <span style={{ textTransform: 'uppercase', fontSize: 11, color: 'var(--text-secondary)' }}>{t.payment_method || 'QR'}</span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t.timestamp ? new Date(t.timestamp).toLocaleString('vi-VN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
        <div className="admin-card" style={{ flex: 1, marginBottom: 0 }}>
          <div className="admin-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarCircleOutlined style={{ color: 'var(--success)' }} /> Tổng doanh thu
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>
            {totalRevenue.toLocaleString('vi-VN')} VNĐ
          </div>
        </div>
        <div className="admin-card" style={{ flex: 1, marginBottom: 0 }}>
          <div className="admin-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <LineChartOutlined style={{ color: 'var(--accent-primary)' }} /> Số lượt giao dịch
          </div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>
            {transactions.length}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status Tab ────────────────────────────────────────────────────────────────
function StatusTab() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);

  const handleRestart = async () => {
    if (!window.confirm('Bạn có chắc muốn khởi động lại backend server?')) return;
    setRestarting(true);
    try {
      await fetch(`${API}/api/restart`, { method: 'POST' });
    } catch {
      // server may close connection before responding
    }
    setTimeout(() => {
      setRestarting(false);
      fetchStatus();
    }, 5000);
  };

  const fetchStatus = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/status`)
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => setStatus({ status: 'error', model_loaded: false, firebase_connected: false }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 15000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const StatusIcon = ({ ok, warn }) => {
    if (ok) return <CheckCircleOutlined style={{ color: 'var(--success)', fontSize: 16 }} />;
    if (warn) return <WarningOutlined style={{ color: 'var(--warning)', fontSize: 16 }} />;
    return <CloseCircleOutlined style={{ color: 'var(--danger)', fontSize: 16 }} />;
  };

  return (
    <div>
      <div className="admin-section-title">Trạng thái máy chủ</div>
      <div className="admin-section-desc">
        Kiểm tra trạng thái hoạt động của backend và mô hình ngôn ngữ. Tự động cập nhật mỗi 15 giây.
      </div>

      {loading && !status ? (
        <div className="admin-empty"><span className="admin-spinner" /></div>
      ) : (
        <>
          <div className="status-grid">
            <div className="status-card">
              <div className="status-card-label">
                <SafetyCertificateOutlined style={{ marginRight: 5 }} />
                Backend API
              </div>
              <div className={`status-card-value ${status?.status === 'running' ? 'green' : 'red'}`}>
                <span className={`status-dot ${status?.status === 'running' ? 'online' : 'offline'}`} />
                {status?.status === 'running' ? 'Online' : 'Offline'}
              </div>
              {/* <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{API}</div> */}
            </div>

            <div className="status-card">
              <div className="status-card-label">
                <RobotOutlined style={{ marginRight: 5 }} />
                Mô hình LLM
              </div>
              <div className={`status-card-value ${status?.model_loaded ? 'green' : 'yellow'}`}>
                <span className={`status-dot ${status?.model_loaded ? 'online' : 'loading'}`} />
                {status?.model_loaded ? 'Đã tải' : 'Chưa tải'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {status?.model_loaded ? 'Sẵn sàng dịch thuật' : 'Model chưa được load vào VRAM'}
              </div>
            </div>

            <div className="status-card">
              <div className="status-card-label">
                <CloudOutlined style={{ marginRight: 5 }} />
                Firebase / Firestore
              </div>
              <div className={`status-card-value ${status?.firebase_connected ? 'green' : 'red'}`}>
                <span className={`status-dot ${status?.firebase_connected ? 'online' : 'offline'}`} />
                {status?.firebase_connected ? 'Kết nối' : 'Mất kết nối'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {status?.firebase_connected ? 'Cloud Firestore sẵn sàng' : 'Kiểm tra serviceAccountKey.json'}
              </div>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <span className="admin-card-title">Tóm tắt trạng thái</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={fetchStatus} disabled={loading || restarting}>
                  <ReloadOutlined spin={loading} /> Làm mới
                </button>
                <button className="btn btn-danger btn-sm" onClick={handleRestart} disabled={restarting || loading}>
                  <PoweroffOutlined spin={restarting} /> {restarting ? 'Đang khởi động lại...' : 'Khởi động lại'}
                </button>
              </div>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thành phần</th>
                  <th>Trạng thái</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SafetyCertificateOutlined style={{ color: 'var(--text-secondary)' }} />
                    Flask Backend
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: status?.status === 'running' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      <StatusIcon ok={status?.status === 'running'} />
                      {status?.status === 'running' ? 'Running' : 'Down'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Port 5000</td>
                </tr>
                <tr>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RobotOutlined style={{ color: 'var(--text-secondary)' }} />
                    LLM (Qwen2 / LoRA)
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: status?.model_loaded ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                      <StatusIcon ok={status?.model_loaded} warn={!status?.model_loaded} />
                      {status?.model_loaded ? 'Loaded' : 'Not loaded'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                    {status?.model_loaded ? 'Inference sẵn sàng' : 'Gọi load_model() để nạp'}
                  </td>
                </tr>
                <tr>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CloudOutlined style={{ color: 'var(--text-secondary)' }} />
                    Cloud Firestore
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: status?.firebase_connected ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                      <StatusIcon ok={status?.firebase_connected} />
                      {status?.firebase_connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Firebase Admin SDK</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
const NAV = [
  { id: 'users', icon: <TeamOutlined />, label: 'Người dùng' },
  { id: 'history', icon: <HistoryOutlined />, label: 'Lịch sử dịch' },
  { id: 'glossary', icon: <BookOutlined />, label: 'Thuật ngữ hệ thống' },
  { id: 'models', icon: <RobotOutlined />, label: 'Quản lý Model' },
  { id: 'transactions', icon: <BulbOutlined />, label: 'Quản lý Giao dịch' },
  { id: 'status', icon: <DashboardOutlined />, label: 'Trạng thái máy chủ' },
];

export default function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('theme') || 'light'; } catch { return 'light'; }
  });
  const { toasts, show: toast } = useToast();

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch { }
  }, [theme]);

  useEffect(() => {
    const load = async () => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.get(['authSession'], (r) => {
            setSession(r.authSession || null);
            setLoading(false);
          });
        } else {
          const s = await getSession();
          setSession(s);
          setLoading(false);
        }
      } catch {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isAdmin = session?.role === 'admin';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="admin-spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-header-left">
          <div className="admin-logo">
            <ThunderboltFilled style={{ fontSize: 18 }} />
            <span>DevBridge</span>
            <span className="admin-logo-badge">
              <SettingOutlined style={{ marginRight: 4 }} />Admin
            </span>
          </div>
        </div>
        <div className="admin-header-right">
          {session && (
            <span className="admin-user-info">
              <UserOutlined style={{ marginRight: 5 }} />
              <strong>{session.email}</strong>
            </span>
          )}
          <button className="admin-theme-btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
          </button>
          <button className="admin-back-btn" onClick={() => window.close()}>
            <CloseOutlined /> Đóng
          </button>
        </div>
      </header>

      {!isAdmin ? (
        <div className="admin-access-denied">
          <LockOutlined style={{ fontSize: 52, color: 'var(--text-secondary)' }} />
          <h2>Truy cập bị từ chối</h2>
          <p>
            {session
              ? 'Tài khoản của bạn không có quyền quản trị.'
              : 'Bạn cần đăng nhập bằng tài khoản Admin để truy cập trang này.'}
          </p>
          <button className="btn btn-ghost" onClick={() => window.close()}>
            <CloseOutlined /> Quay lại
          </button>
        </div>
      ) : (
        <div className="admin-body">
          <nav className="admin-sidebar">
            {NAV.map(item => (
              <button
                key={item.id}
                className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <main className="admin-content">
            {activeTab === 'users' && <UsersTab uid={session.uid} toast={toast} />}
            {activeTab === 'history' && <HistoryTab uid={session.uid} toast={toast} />}
            {activeTab === 'glossary' && <GlossaryTab uid={session.uid} toast={toast} />}
            {activeTab === 'models' && <ModelsTab uid={session.uid} toast={toast} />}
            {activeTab === 'transactions' && <TransactionsTab uid={session.uid} toast={toast} />}
            {activeTab === 'status' && <StatusTab toast={toast} />}
          </main>
        </div>
      )}

      <div className="admin-toast">
        {toasts.map(t => (
          <div key={t.id} className={`admin-toast-item ${t.type}`}>
            {t.type === 'success'
              ? <CheckCircleOutlined style={{ marginRight: 6 }} />
              : <CloseCircleOutlined style={{ marginRight: 6 }} />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
