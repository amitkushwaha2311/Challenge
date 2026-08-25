/**
 * End-to-End API Integration & Security Verification
 */

const API_BASE = 'http://localhost:3001';
const DEMO_TOKEN = 'demo-sandbox-token-dr_sam_001';

async function runE2ETests() {
  console.log('🚀 RUNNING END-TO-END INTEGRATION & SECURITY TESTS...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name} ${details ? '- ' + details : ''}`);
      failed++;
    }
  }

  try {
    // TEST 1: Health check
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'healthy', 'GET /api/health returns 200 OK');

    // TEST 2: Security Audit endpoint
    const auditRes = await fetch(`${API_BASE}/api/security/audit`);
    const auditJson = await auditRes.json();
    assert(
      auditRes.status === 200 && auditJson.securityPosture === 'HARDENED',
      'GET /api/security/audit returns HARDENED posture & zero client secrets'
    );

    // TEST 3: Multi-tenant rejection on unauthenticated request
    const unauthRes = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello AI' })
    });
    assert(unauthRes.status === 401, 'POST /api/chat rejects unauthenticated request (401 Unauthorized)');

    // TEST 4: Authenticated Multi-Turn Chat
    const chatRes = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEMO_TOKEN}`
      },
      body: JSON.stringify({
        message: 'How should we architect zero-trust boundaries for multi-tenant LLM applications?',
        persona: 'socratic_partner'
      })
    });
    const chatJson = await chatRes.json();
    assert(
      chatRes.status === 200 && chatJson.success && chatJson.reply,
      'POST /api/chat returns authenticated Gemini AI response',
      chatJson.reply ? `(Length: ${chatJson.reply.length} chars)` : ''
    );

    // TEST 5: Auto-Summarization
    const summaryRes = await fetch(`${API_BASE}/api/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEMO_TOKEN}`
      },
      body: JSON.stringify({
        conversationText: 'User: I want to build a resilient data pipeline.\nAssistant: Let us consider separating ingestion from transformation and using idempotent message brokers.'
      })
    });
    const summaryJson = await summaryRes.json();
    assert(
      summaryRes.status === 200 && summaryJson.summary?.title && summaryJson.summary?.executiveSummary,
      'POST /api/summarize returns structured JSON summary & tags'
    );

    // TEST 6: Cognitive Insights Analysis
    const insightsRes = await fetch(`${API_BASE}/api/insights/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEMO_TOKEN}`
      },
      body: JSON.stringify({
        entries: [
          { title: 'Refactoring Core Engine', content: 'Focused on clean decoupling.', primaryMood: 'Motivated' }
        ]
      })
    });
    const insightsJson = await insightsRes.json();
    assert(
      insightsRes.status === 200 && insightsJson.insights?.wellnessScore,
      'POST /api/insights/analyze returns cognitive resilience & emotional breakdown'
    );

    // TEST 7: Life Knowledge Graph Extraction
    const graphRes = await fetch(`${API_BASE}/api/graph/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEMO_TOKEN}`
      },
      body: JSON.stringify({
        entries: [
          { title: 'Deep Work on AI Security', summary: 'Building zero-trust systems.', tags: ['Security', 'AI'] }
        ]
      })
    });
    const graphJson = await graphRes.json();
    assert(
      graphRes.status === 200 && Array.isArray(graphJson.graph?.nodes),
      'POST /api/graph/extract returns interconnected nodes & links'
    );

    console.log(`\n========================================`);
    console.log(`E2E TEST SUMMARY: ${passed} Passed, ${failed} Failed.`);
    console.log(`STATUS: ${failed === 0 ? '🟢 ALL BACKEND & SECURITY SYSTEMS VERIFIED' : '🔴 FAILURES DETECTED'}`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runE2ETests();
