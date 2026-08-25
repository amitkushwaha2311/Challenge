import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Mic,
  MicOff,
  Bot,
  User,
  ShieldAlert,
  Lock,
  Save,
  Check,
  RefreshCw,
  Zap,
  Flame,
  Volume2,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { sendChatMessage, summarizeSession } from '../services/api.js';
import { saveJournalEntry } from '../services/storage.js';
import { encryptTextE2EE } from '../services/crypto.js';

const PERSONAS = [
  {
    id: 'mindful_mentor',
    name: 'Mindful Mentor',
    icon: '🧘',
    desc: 'Empathetic reflection & emotional clarity',
    color: '#38bdf8'
  },
  {
    id: 'socratic_partner',
    name: 'Socratic Partner',
    icon: '💡',
    desc: 'Intellectual inquiry & challenging assumptions',
    color: '#8b5cf6'
  },
  {
    id: 'strategic_executive',
    name: 'Strategic Coach',
    icon: '⚡',
    desc: 'Actionable prioritization & structured planning',
    color: '#10b981'
  },
  {
    id: 'creative_muse',
    name: 'Creative Muse',
    icon: '🎨',
    desc: 'Lateral thinking & metaphorical brainstorming',
    color: '#f59e0b'
  }
];

const PROMPT_STARTERS = [
  '⚡ Help me break down a complex architectural dilemma',
  '🧘 Unpack my thoughts on today\'s focus & mental energy',
  '💡 Socratic challenge: Question my assumptions on our tech stack',
  '🎯 Organize 3 high-impact priorities for tomorrow'
];

export default function JournalStudio({ user, onEntrySaved, onOpenAuth }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Welcome to your Secure Gemini Journal. I'm your private AI reflection partner. Everything we discuss is authenticated, protected by Secret Manager proxying, and strictly isolated to your tenant. How can I help you reflect or brainstorm today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [persona, setPersona] = useState('mindful_mentor');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [useE2EE, setUseE2EE] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initialize Web Speech API for voice dictation
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || loading) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    const userMsg = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setErrorMsg('');

    try {
      // Format multi-turn conversation history
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: m.content
        }));

      const res = await sendChatMessage({
        history,
        message: userMsg.content,
        persona
      });

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to connect to Gemini API backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarizeAndSave = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setSummarizing(true);
    setSummaryModalOpen(true);
    setErrorMsg('');

    try {
      const fullText = messages
        .map(m => `${m.role.toUpperCase()}: ${m.content}`)
        .join('\n\n');

      const res = await summarizeSession({ conversationText: fullText });
      setSummaryData(res.summary);
    } catch (err) {
      console.error(err);
      setErrorMsg('Auto-summarization failed: ' + err.message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleFinalSaveEntry = async () => {
    if (!summaryData || !user) return;

    try {
      let contentToStore = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
      let isEncrypted = false;
      let cryptoMeta = {};

      if (useE2EE) {
        if (!passphrase || passphrase.length < 4) {
          alert('Please provide a secure master passphrase of at least 4 characters to encrypt.');
          return;
        }
        const encResult = await encryptTextE2EE(contentToStore, passphrase);
        contentToStore = encResult.ciphertext;
        isEncrypted = true;
        cryptoMeta = {
          iv: encResult.iv,
          salt: encResult.salt,
          algorithm: encResult.algorithm
        };
      }

      const newEntry = {
        title: summaryData.title,
        summary: summaryData.executiveSummary,
        content: contentToStore,
        primaryMood: summaryData.primaryMood,
        sentimentScore: summaryData.sentimentScore,
        tags: summaryData.tags || [],
        keyHighlights: summaryData.keyHighlights || [],
        actionItems: summaryData.actionItems || [],
        mindfulTakeaway: summaryData.mindfulTakeaway,
        isEncrypted,
        ...cryptoMeta,
        createdAt: new Date().toISOString()
      };

      await saveJournalEntry(user.uid, newEntry);

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setSummaryModalOpen(false);
        if (onEntrySaved) onEntrySaved();
      }, 1400);
    } catch (err) {
      console.error(err);
      alert('Save failed: ' + err.message);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear current brainstorming session?')) {
      setMessages([
        {
          role: 'assistant',
          content: "Fresh session started. What would you like to explore?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const activePersonaObj = PERSONAS.find(p => p.id === persona);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 120px)' }}>
      {/* Top Bar: Persona Picker & Action Controls */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            AI PERSONA:
          </span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PERSONAS.map(p => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                className={`btn btn-sm ${persona === p.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  borderColor: persona === p.id ? p.color : 'var(--border-subtle)',
                  boxShadow: persona === p.id ? `0 0 12px ${p.color}40` : 'none'
                }}
              >
                <span>{p.icon}</span> {p.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleClearChat}
            title="Reset conversation"
          >
            <Trash2 size={15} /> Reset
          </button>

          <button
            className="btn btn-emerald btn-sm"
            onClick={handleSummarizeAndSave}
            disabled={messages.length <= 1 || loading}
            id="btn-summarize-save"
          >
            <Sparkles size={16} /> ✨ Auto-Summarize & Save
          </button>
        </div>
      </div>

      {/* Main Conversational Workspace */}
      <div className="glass-panel" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Messages Stream */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '14px',
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%'
              }}
            >
              {m.role !== 'user' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: 'var(--gradient-gemini)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <Bot size={20} color="#fff" />
                </div>
              )}

              <div style={{
                padding: '14px 18px',
                borderRadius: '16px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                  : 'rgba(30, 41, 59, 0.7)',
                border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                color: '#ffffff',
                fontSize: '0.94rem',
                lineHeight: 1.6,
                wordBreak: 'break-word',
                boxShadow: m.role === 'user' ? '0 4px 14px rgba(99, 102, 241, 0.3)' : 'none'
              }}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                <div style={{
                  fontSize: '0.7rem',
                  color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                  marginTop: '6px',
                  textAlign: m.role === 'user' ? 'right' : 'left'
                }}>
                  {m.timestamp}
                </div>
              </div>

              {m.role === 'user' && (
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={18} color="#94a3b8" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '14px', alignSelf: 'flex-start' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: 'var(--gradient-gemini)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={20} color="#fff" />
              </div>
              <div style={{
                padding: '14px 18px',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--accent-cyan)'
              }}>
                <RefreshCw size={16} className="animate-spin" />
                <span style={{ fontSize: '0.9rem' }}>Gemini is reflecting...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Starters */}
        {messages.length <= 2 && (
          <div style={{
            padding: '8px 24px 14px',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {PROMPT_STARTERS.map((starter, i) => (
              <button
                key={i}
                className="btn btn-secondary btn-sm"
                onClick={() => handleSend(starter)}
                style={{ fontSize: '0.78rem' }}
              >
                {starter}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <div style={{
          padding: '16px 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Voice Input Button */}
          <button
            className={`btn btn-icon ${isListening ? 'btn-danger' : 'btn-secondary'}`}
            onClick={toggleVoiceInput}
            title={isListening ? 'Stop listening' : 'Voice dictation'}
            id="btn-voice-dictate"
            style={{ position: 'relative' }}
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            {isListening && (
              <span className="pulse-dot" style={{ position: 'absolute', top: 4, right: 4 }} />
            )}
          </button>

          <input
            type="text"
            className="input-field"
            placeholder={`Reflect with ${activePersonaObj.name}... (Press Enter to send)`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
            id="input-journal-chat"
            style={{ flex: 1 }}
          />

          <button
            className="btn btn-primary"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            id="btn-send-chat"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Auto-Summarization & Save Modal */}
      {summaryModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(5, 8, 15, 0.85)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-panel-glow" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={22} color="var(--accent-cyan)" />
                <h3 style={{ fontSize: '1.3rem' }}>AI Executive Summary & Save</h3>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSummaryModalOpen(false)}
              >
                Cancel
              </button>
            </div>

            {summarizing ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <RefreshCw size={32} className="animate-spin" color="var(--accent-cyan)" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Gemini is synthesizing key takeaways, action items, and emotional sentiment...</p>
              </div>
            ) : summaryData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Title & Mood */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{summaryData.title}</h4>
                  <span className="badge badge-cyan">{summaryData.primaryMood}</span>
                </div>

                {/* Executive Summary */}
                <div style={{
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.92rem',
                  lineHeight: 1.6
                }}>
                  {summaryData.executiveSummary}
                </div>

                {/* Key Highlights */}
                {summaryData.keyHighlights?.length > 0 && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>KEY HIGHLIGHTS</h5>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {summaryData.keyHighlights.map((h, idx) => (
                        <li key={idx}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items */}
                {summaryData.actionItems?.length > 0 && (
                  <div>
                    <h5 style={{ fontSize: '0.85rem', color: 'var(--accent-emerald)', marginBottom: '8px' }}>ACTIONABLE NEXT STEPS</h5>
                    <ul style={{ paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {summaryData.actionItems.map((a, idx) => (
                        <li key={idx}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tags */}
                {summaryData.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {summaryData.tags.map((t, idx) => (
                      <span key={idx} className="badge badge-violet">#{t}</span>
                    ))}
                  </div>
                )}

                {/* E2EE Toggle (Original Feature Enhancement) */}
                <div style={{
                  marginTop: '8px',
                  padding: '14px',
                  background: useE2EE ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${useE2EE ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Lock size={18} color={useE2EE ? 'var(--accent-emerald)' : 'var(--text-muted)'} />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Zero-Knowledge E2EE Encryption</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Encrypt in browser (AES-GCM-256) before saving to Cloud Firestore</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={useE2EE}
                      onChange={(e) => setUseE2EE(e.target.checked)}
                      id="toggle-e2ee"
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                    />
                  </div>

                  {useE2EE && (
                    <div style={{ marginTop: '12px' }}>
                      <input
                        type="password"
                        className="input-field"
                        placeholder="Enter master passphrase to encrypt reflection..."
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        id="input-e2ee-passphrase"
                      />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        ⚠️ You will need this passphrase to decrypt and view raw text in the Vault.
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Save Button */}
                <button
                  className="btn btn-emerald"
                  onClick={handleFinalSaveEntry}
                  disabled={saveSuccess}
                  id="btn-confirm-save-entry"
                  style={{ width: '100%', marginTop: '8px', padding: '12px' }}
                >
                  {saveSuccess ? (
                    <>
                      <Check size={18} /> Saved to Isolated Vault!
                    </>
                  ) : (
                    <>
                      <Save size={18} /> Confirm & Save to Firestore
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div style={{ color: 'var(--accent-rose)' }}>{errorMsg}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
