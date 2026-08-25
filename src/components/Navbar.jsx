import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  BookOpen,
  Brain,
  Network,
  Lock,
  LogOut,
  UserCheck,
  Mic
} from 'lucide-react';

export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  onOpenAuth,
  onLogout,
  isE2EEActive
}) {
  return (
    <header style={{
      background: 'rgba(9, 13, 22, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--gradient-gemini)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                fontWeight: 800,
                letterSpacing: '-0.02em'
              }}>
                Gemini <span className="text-gradient-gemini">Journal</span>
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                <span className="pulse-dot" /> SECURE PROD
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Zero-Trust Multi-Tenant AI Reflection
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeTab === 'studio' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('studio')}
            id="tab-studio"
          >
            <Sparkles size={16} /> AI Studio
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'vault' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('vault')}
            id="tab-vault"
          >
            <BookOpen size={16} /> Journal Vault
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'insights' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('insights')}
            id="tab-insights"
          >
            <Brain size={16} /> AI Insights
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'graph' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('graph')}
            id="tab-graph"
          >
            <Network size={16} /> Life Graph
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'security' ? 'btn-emerald' : 'btn-secondary'}`}
            onClick={() => setActiveTab('security')}
            id="tab-security"
          >
            <ShieldCheck size={16} /> Security Audit
          </button>
        </nav>

        {/* User Profile & Auth Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-subtle)'
              }}>
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                  alt={user.displayName}
                  style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                />
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  {user.displayName || user.email?.split('@')[0]}
                </div>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                onClick={onLogout}
                title="Sign out"
                id="btn-logout"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenAuth}
              id="btn-login-modal"
            >
              <UserCheck size={16} /> Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
