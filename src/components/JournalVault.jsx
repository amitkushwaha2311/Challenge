import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Lock,
  Unlock,
  Trash2,
  Calendar,
  Tag,
  Sparkles,
  Smile,
  ShieldCheck,
  CheckCircle,
  PlusCircle,
  X,
  FileText
} from 'lucide-react';
import { loadUserEntries, deleteJournalEntry, saveJournalEntry } from '../services/storage.js';
import { decryptTextE2EE } from '../services/crypto.js';

export default function JournalVault({ user, onOpenAuth }) {
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState('ALL');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [passphrase, setPassphrase] = useState('');
  const [decryptedContent, setDecryptedContent] = useState('');
  const [decryptError, setDecryptError] = useState('');
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  // Manual entry form state
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualMood, setManualMood] = useState('Reflective');
  const [manualTags, setManualTags] = useState('Engineering, Focus');

  const fetchEntries = async () => {
    if (!user) return;
    const data = await loadUserEntries(user.uid);
    setEntries(data);
    if (data.length > 0 && !selectedEntry) {
      setSelectedEntry(data[0]);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [user]);

  useEffect(() => {
    setDecryptedContent('');
    setPassphrase('');
    setDecryptError('');
  }, [selectedEntry]);

  const handleDelete = async (entryId) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    await deleteJournalEntry(user.uid, entryId);
    const updated = entries.filter(e => e.id !== entryId);
    setEntries(updated);
    if (selectedEntry?.id === entryId) {
      setSelectedEntry(updated[0] || null);
    }
  };

  const handleDecrypt = async () => {
    if (!passphrase) {
      setDecryptError('Please enter passphrase.');
      return;
    }
    setDecryptError('');
    try {
      const plaintext = await decryptTextE2EE(
        selectedEntry.content,
        selectedEntry.iv,
        selectedEntry.salt,
        passphrase
      );
      setDecryptedContent(plaintext);
    } catch (err) {
      setDecryptError('Decryption failed: Incorrect passphrase or corrupted ciphertext.');
    }
  };

  const handleCreateManualEntry = async (e) => {
    e.preventDefault();
    if (!manualTitle || !manualContent) return;

    const tagsArray = manualTags.split(',').map(t => t.trim()).filter(Boolean);
    const newEntry = {
      title: manualTitle,
      summary: manualContent.slice(0, 160) + (manualContent.length > 160 ? '...' : ''),
      content: manualContent,
      primaryMood: manualMood,
      sentimentScore: 0.8,
      tags: tagsArray,
      keyHighlights: ['Direct reflection recorded in Vault'],
      actionItems: [],
      isEncrypted: false,
      createdAt: new Date().toISOString()
    };

    await saveJournalEntry(user.uid, newEntry);
    setIsManualModalOpen(false);
    setManualTitle('');
    setManualContent('');
    fetchEntries();
  };

  const filteredEntries = entries.filter(e => {
    const matchesSearch =
      (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.summary || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesMood = selectedMood === 'ALL' || e.primaryMood === selectedMood;
    return matchesSearch && matchesMood;
  });

  const moodsList = ['ALL', 'Joyful', 'Calm', 'Reflective', 'Motivated', 'Grateful', 'Anxious'];

  if (!user) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <BookOpen size={48} color="var(--accent-cyan)" style={{ margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Sign In to Access Your Isolated Vault</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px' }}>
          Your reflections are stored under strict tenant isolation. Only your authenticated credentials can read these logs.
        </p>
        <button className="btn btn-primary" onClick={onOpenAuth}>
          <ShieldCheck size={18} /> Authenticate Now
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Left Column: Entry List & Filters */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search & Actions Bar */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--accent-cyan)" /> Vault Entries ({entries.length})
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setIsManualModalOpen(true)}
              title="Add manual reflection"
              id="btn-add-manual-entry"
            >
              <PlusCircle size={15} /> New
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search reflections, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="input-vault-search"
              style={{ fontSize: '0.85rem', paddingLeft: '32px' }}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '11px', color: 'var(--text-muted)' }} />
          </div>

          {/* Mood Filter Chips */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
            {moodsList.map(m => (
              <button
                key={m}
                onClick={() => setSelectedMood(m)}
                className={`btn btn-sm ${selectedMood === m ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.72rem', padding: '3px 8px' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredEntries.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 10px', fontSize: '0.88rem' }}>
              No entries found. Start a conversation in the AI Studio or click 'New'.
            </div>
          ) : (
            filteredEntries.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedEntry(item)}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: selectedEntry?.id === item.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${selectedEntry?.id === item.id ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h4>
                  {item.isEncrypted ? (
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      <Lock size={10} /> E2EE
                    </span>
                  ) : (
                    <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                      {item.primaryMood || 'Reflective'}
                    </span>
                  )}
                </div>

                <p style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  marginBottom: '8px',
                  lineHeight: 1.4
                }}>
                  {item.summary || (item.isEncrypted ? '🔐 Encrypted AES-GCM Ciphertext' : item.content)}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(item.tags || []).slice(0, 2).map((t, idx) => (
                      <span key={idx} style={{ color: 'var(--accent-violet)' }}>#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Detailed Entry Viewer */}
      <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        {selectedEntry ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h2 style={{ fontSize: '1.5rem' }}>{selectedEntry.title}</h2>
                  {selectedEntry.isEncrypted && (
                    <span className="badge badge-emerald">
                      <Lock size={12} /> E2EE Encrypted
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Recorded: {new Date(selectedEntry.createdAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>Mood: <strong style={{ color: 'var(--accent-cyan)' }}>{selectedEntry.primaryMood || 'Reflective'}</strong></span>
                </div>
              </div>

              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(selectedEntry.id)}
                title="Delete this entry"
                id="btn-delete-entry"
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>

            {/* Executive Summary Card */}
            {selectedEntry.summary && (
              <div style={{
                padding: '16px',
                background: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.2)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                  <Sparkles size={14} /> AI EXECUTIVE SUMMARY
                </div>
                <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
                  {selectedEntry.summary}
                </p>
              </div>
            )}

            {/* Key Highlights & Action Items Grid */}
            <div className="grid-2">
              {selectedEntry.keyHighlights?.length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-cyan)', marginBottom: '8px' }}>KEY HIGHLIGHTS</h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedEntry.keyHighlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedEntry.actionItems?.length > 0 && (
                <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', marginBottom: '8px' }}>ACTION ITEMS</h4>
                  <ul style={{ paddingLeft: '18px', fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedEntry.actionItems.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Main Content / E2EE Decryption Box */}
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', color: 'var(--text-secondary)' }}>
                FULL CONVERSATION / REFLECTION TEXT
              </h4>

              {selectedEntry.isEncrypted ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px dashed rgba(16, 185, 129, 0.4)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  {decryptedContent ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '12px' }}>
                        <Unlock size={16} /> DECRYPTED SECURE REFLECTION:
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6 }}>
                        {decryptedContent}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Lock size={20} color="var(--accent-emerald)" />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Zero-Knowledge AES-GCM-256 Encrypted</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Enter your master passphrase to decrypt client-side</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <input
                          type="password"
                          className="input-field"
                          placeholder="Enter your master decryption passphrase..."
                          value={passphrase}
                          onChange={(e) => setPassphrase(e.target.value)}
                          id="input-vault-decrypt-passphrase"
                          style={{ maxWidth: '360px' }}
                        />
                        <button
                          className="btn btn-emerald"
                          onClick={handleDecrypt}
                          id="btn-vault-decrypt"
                        >
                          <Unlock size={16} /> Unlock
                        </button>
                      </div>

                      {decryptError && (
                        <div style={{ color: 'var(--accent-rose)', fontSize: '0.82rem', marginTop: '8px' }}>
                          {decryptError}
                        </div>
                      )}

                      <div style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Ciphertext: {selectedEntry.content.slice(0, 60)}...
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '18px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.92rem',
                  lineHeight: 1.6
                }}>
                  {selectedEntry.content}
                </div>
              )}
            </div>

            {/* Mindful Takeaway Footer */}
            {selectedEntry.mindfulTakeaway && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(139, 92, 246, 0.08)',
                borderLeft: '3px solid var(--accent-violet)',
                borderRadius: '0 var(--radius-md) var(--radius-md) 0',
                fontSize: '0.85rem',
                fontStyle: 'italic',
                color: 'var(--text-primary)'
              }}>
                "{selectedEntry.mindfulTakeaway}"
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
            Select an entry from the list to read.
          </div>
        )}
      </div>

      {/* Manual Reflection Creation Modal */}
      {isManualModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 15, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel-glow" style={{ width: '100%', maxWidth: '520px', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} color="var(--accent-cyan)" /> Record Direct Reflection
              </h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsManualModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateManualEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Breakthrough on Distributed Systems"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Primary Mood</label>
                <select
                  className="input-field"
                  value={manualMood}
                  onChange={(e) => setManualMood(e.target.value)}
                >
                  {moodsList.filter(m => m !== 'ALL').map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Tags (comma separated)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Architecture, Leadership, Focus"
                  value={manualTags}
                  onChange={(e) => setManualTags(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Reflection Content</label>
                <textarea
                  className="input-field textarea-field"
                  placeholder="Write your private thoughts and reflections here..."
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  required
                  style={{ minHeight: '120px' }}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                Save to Isolated Vault
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
