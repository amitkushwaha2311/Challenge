# 🛡️ Threat Model & Security Architecture Document

**System**: Secure Personal Gemini Journal  
**Framework**: STRIDE Threat Analysis & OWASP Top 10 for Large Language Model Applications (2025)  
**Security Level**: Enterprise / Zero-Trust Architecture

---

## 1. System Architecture & Boundaries

```
[User Browser] (React UI)
  │
  ├── 1. Client-side Auth ─────────► [Firebase Authentication] (JWT Issuance)
  │
  ├── 2. E2EE Web Crypto ──────────► [Browser Secure Context] (AES-GCM-256)
  │
  ├── 3. Scoped DB Requests ───────► [Cloud Firestore] (Enforced by firestore.rules: request.auth.uid == userId)
  │
  └── 4. Authenticated API Calls ──► [Node.js / Express Security Proxy]
                                      │
                                      ├── 5. Token Verification (Firebase Admin SDK)
                                      ├── 6. Secret Fetching (@google-cloud/secret-manager)
                                      ├── 7. Prompt Sanitization & Rate Limiting
                                      └── 8. Gemini API Calls (Gemini 2.5 Flash)
```

---

## 2. STRIDE Threat Analysis & Countermeasures

### 1. Spoofing (Identity Deception)
- **Threat**: Attacker creates crafted requests with fake user identifiers to read or overwrite another user's personal journal entries.
- **Countermeasures**:
  - All client requests to the backend proxy require an `Authorization: Bearer <FIREBASE_ID_TOKEN>` header.
  - Server verifies token cryptographically using `firebase-admin.auth().verifyIdToken()`.
  - Firestore database rules restrict reads and writes exclusively to paths matching `/users/{userId}/...` where `request.auth.uid == userId`.

### 2. Tampering (Data Manipulation)
- **Threat**: Malicious actor alters journal summaries, AI mood insights, or injects cross-site scripting (XSS) in AI responses.
- **Countermeasures**:
  - Firestore documents are protected against unauthorized modifications by path-level security rules.
  - All AI outputs and user markdown are sanitized prior to DOM insertion using strict HTML sanitization.
  - Prompt payloads sent to Gemini are delimited using structured `<user_journal_content>` XML boundaries to prevent prompt tampering.

### 3. Repudiation (Denial of Action)
- **Threat**: User claims they did not perform an action or an unauthorized party accessed logs.
- **Countermeasures**:
  - Cryptographic timestamps and user UID hashes are logged on all AI transactions.
  - Immutable journal revision metadata stored in Firestore.

### 4. Information Disclosure (Data Leakage)
- **Threat**: Exposure of Gemini API Key in browser network tabs or accidental leakage of private journal logs across multi-tenant Firestore instances.
- **Countermeasures**:
  - **Zero Client Secrets**: Gemini API keys are NEVER sent to the client browser or bundled in Vite/React builds.
  - **Google Cloud Secret Manager**: Key is securely fetched in the backend proxy using `@google-cloud/secret-manager`.
  - **Zero-Knowledge Client-Side E2EE Vault**: Optional client-side encryption using AES-GCM-256 with PBKDF2 key derivation (100,000 iterations). Raw plaintext is encrypted in the user's browser before transmission; only ciphertext is stored in Firestore.

### 5. Denial of Service (Resource Exhaustion)
- **Threat**: An attacker spamming the Gemini endpoint to exhaust API quotas and cause financial/operational denial of service.
- **Countermeasures**:
  - Express backend implements `express-rate-limit` (sliding window limit of 30 requests per minute per IP/UID).
  - Maximum context token length limits (truncated to prevent oversized token payload attacks).
  - Request timeouts (30 seconds) on all LLM generation requests.

### 6. Elevation of Privilege (Unauthorized Escalation)
- **Threat**: Jailbreaking Gemini via Prompt Injection to reveal system instructions, API configurations, or execute unauthorized operations.
- **Countermeasures**:
  - System prompt hardening (Phase 1 Constitution).
  - Structured output schemas (`responseMimeType: application/json` or strict markdown parsing).
  - Strict role segregation: Model operates purely in conversational/summarization scope with zero system-level execution tools.

---

## 3. OWASP Top 10 for LLMs (2025) Compliance Matrix

| OWASP LLM Vulnerability | Status | Mitigation Strategy |
| :--- | :--- | :--- |
| **LLM01: Prompt Injection** | **PROTECTED** | Enclosed within structured XML tags, isolated from system persona directives. |
| **LLM02: Sensitive Data Disclosure** | **PROTECTED** | Server-side secret manager + Client E2EE encryption + PII sanitization filters. |
| **LLM03: Supply Chain Vulnerabilities** | **PROTECTED** | Official `@google/genai` and `@google-cloud/secret-manager` packages with pinned versions. |
| **LLM04: Data & Model Denial of Service** | **PROTECTED** | Strict rate-limiting, token budgets, payload size limits, and concurrency throttling. |
| **LLM05: Improper Output Handling** | **PROTECTED** | Markdown sanitizer, typed schema response validation, no raw `eval` or unsanitized `innerHTML`. |
| **LLM06: Excessive Agency** | **PROTECTED** | The Gemini model has no access to delete databases or trigger external webhooks. |
| **LLM07: System Prompt Leakage** | **PROTECTED** | System prompt instructions explicitly forbid disclosing internal prompts or guardrails. |
| **LLM08: Vector and Embedding Weaknesses**| **PROTECTED** | All user embeddings/journal entries are isolated strictly under user UID namespaces. |
| **LLM09: Misinformation & Hallucination** | **PROTECTED** | Socratic & Mindful personas tuned with balanced temperature (0.7) and grounded in journal context. |
| **LLM10: Unbounded Consumption** | **PROTECTED** | Enforced token quotas and output caps (maxOutputTokens: 2048). |
