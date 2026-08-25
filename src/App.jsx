import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import JournalStudio from './components/JournalStudio.jsx';
import JournalVault from './components/JournalVault.jsx';
import InsightsDashboard from './components/InsightsDashboard.jsx';
import LifeKnowledgeGraph from './components/LifeKnowledgeGraph.jsx';
import SecurityAuditView from './components/SecurityAuditView.jsx';
import AuthModal from './components/AuthModal.jsx';
import { getCurrentStoredUser, logoutUser, isLiveFirebaseConfigured } from './services/firebase.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('studio');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Check if user session exists in local storage
    const stored = getCurrentStoredUser();
    if (stored) {
      setUser(stored);
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleEntrySaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('vault');
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main App Content Viewport */}
      <main className="main-content">
        {activeTab === 'studio' && (
          <JournalStudio
            user={user}
            onEntrySaved={handleEntrySaved}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'vault' && (
          <JournalVault
            key={refreshTrigger}
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsDashboard
            key={refreshTrigger}
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'graph' && (
          <LifeKnowledgeGraph
            key={refreshTrigger}
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
        )}

        {activeTab === 'security' && (
          <SecurityAuditView user={user} />
        )}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
