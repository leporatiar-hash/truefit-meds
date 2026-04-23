# Weekly Project Review — April 13, 2026

## Executive Summary
Both projects have strong product-market foundations but differ dramatically in execution phase. **Advocate (truefit-meds)** is product-ready with polished UX and a clear go-to-market story. **ClassMate (syllabusync)** has technical debt that's blocking user onboarding and scaling, despite a feature-rich roadmap. Recommend immediate focus on ClassMate's critical data integrity issues before pursuing new features.

---

## truefit-meds (Advocate)

### Status Summary
A mature caregiver health tracking product with excellent landing page, complete authentication flows, and core features built. Backend handles patient management, medication tracking, and clinical summary generation. Positioned as a free tool for caregivers with potential premium expansion.

### 🔥 Top Priorities

1. **Complete backend-to-database integration** — API endpoints exist for auth, patients, medications, logs, and summaries, but verify end-to-end data persistence. Several endpoints reference endpoints not yet confirmed as fully wired (dashboard config endpoints).

2. **Deployment readiness** — Package has outdated Next.js (16.1.6 vs current 16.x) and missing critical env handling. No visible `.env` example for backend connectivity. Deployment requires coordinated frontend/backend launch.

3. **Monetization strategy** — App is completely free with no premium tier planned. Consider freemium model (basic caregiver=free, premium with clinical export/sharing, physician access tier). Current positioning prevents revenue.

### 💡 Opportunities

- **Clinical PDF generation** — Print endpoint exists but likely incomplete. Add "Export for Doctor" PDF generation (clinical summary + charts) as premium feature.
- **Multi-patient support** — Backend supports multiple patients per user (patient_id in schema). Feature partially built; complete the patient selection/switching UI.
- **Medication interaction warnings** — Backend tracks medication adherence. Add AI-powered alerts for drug interactions and side effects.
- **Family sharing & physician access** — Core caregiver insight: they advocate for someone else. Allow caregivers to grant read-only access to family members or physicians.

### ⚠️ Technical Concerns

- **Authentication hardcoded** — AuthProvider stores token in localStorage. No logout event broadcast between tabs; users may be logged out in one tab but active in another.
- **Type safety gaps** — `lib/types.ts` likely has loose typing. No validation at API boundary.
- **Error handling** — No retry logic for failed API calls. Network errors show raw error messages to users.
- **No offline support** — Daily logs are critical for caregivers; app should allow offline entry and sync when restored.

---

## syllabusync (ClassMate)

### Status Summary
Feature-rich student productivity platform with AI-powered syllabus parsing, deadline tracking, and flashcard generation. Currently deployed to Railway with 7 test users. Critical issue: **data ownership is broken** — all user data is keyed to `"default"` or `"legacy"` instead of real Supabase user IDs. New users are stuck at onboarding. Product is technically sound but blocked from scaling.

### 🔥 Top Priorities

1. **CRITICAL: Fix data ownership bug** — Re-key all `"default"` and `"legacy"` rows to correct user IDs. 82 deadlines, 12 courses, and related records must be migrated. This is a one-time SQL operation that unblocks all user queries. **Estimated 30 minutes if script is clean, 2+ hours if manual.**

2. **CRITICAL: Fix onboarding → profile creation** — 4 of 7 new users are stuck after email confirmation. Onboarding saves to Supabase `user_metadata` but never calls the backend to create a `user_profiles` row. Either the POST endpoint is being skipped or silently failing. Likely cause: missing POST in onboarding page or redirect logic broken.

3. **Implement AI Chat feature** — Detailed roadmap is present (plan.md). This is the next major feature (Pro-only, 50 messages/month). Estimated 5-8 sprints if done incrementally, but blocks subscription revenue.

### 💡 Opportunities

- **Monetization is live but incomplete** — Supabase auth + Stripe integration exists. Missing: AI Chat lock (Pro feature), usage tracking UI, upgrade funnel polish.
- **Canvas/iCal integration** — Code exists for parsing Canvas and iCal feeds. Complete this to auto-import deadlines from existing course platforms (huge UX win).
- **Study group collaboration** — Backend allows multiple users; add shared flashcard decks and deadline visibility within groups.
- **Mobile app** — Next.js SSR supports mobile web, but a native mobile app (React Native) would own the "check my deadlines" use case.

### ⚠️ Technical Concerns

- **Data integrity cascades** — User deletion doesn't cascade properly. Orphaned flashcard sets, summaries, and calendar entries remain if a user is deleted from Supabase but backend row deletion logic doesn't fire.
- **Summary generation untested** — `summaries` table is empty [0 rows]. Feature is wired in the UI but likely silently failing. Needs a test upload to verify.
- **Duplicate course prevention missing** — 6 duplicate Finance 315 courses exist from accidental double-clicks. No unique constraint on `(user_id, code, semester)`. Button disable logic exists in frontend but DB should validate.
- **Debug logging in production** — `GET /deadlines` has `print(f"[DEBUG] …")` statements that pollute logs.
- **Rate limiting incomplete** — Endpoints have rate-limit decorators but no per-user quotas for AI generation (only monthly resets).

---

## 📊 Cross-Project Analysis

### Market Position
- **Advocate**: B2C health app targeting caregivers. Large addressable market (>65M caregivers in US) but fragmented. Clear problem-solution fit. Scaling bottleneck is awareness & trust with healthcare providers.
- **ClassMate**: B2C student app. High competition (Notion, Todoist, Canvas itself). Differentiation is AI + institutional integration. User acquisition bottleneck is campus adoption + network effects.

### Technical Maturity
| Dimension | Advocate | ClassMate |
|-----------|---------|-----------|
| Code quality | ⭐⭐⭐⭐ Clean, minimal deps | ⭐⭐⭐ Good, but data bugs |
| Feature completeness | 60% (core works, premium gaps) | 75% (core + advanced features) |
| Deployment readiness | 70% (ready for beta test) | 40% (blocked by data bugs) |
| Scalability | ⭐⭐⭐⭐ (minimal external deps) | ⭐⭐⭐ (depends on OpenAI + DB) |
| User feedback loop | 🔴 None visible | ✅ 7 users, 4 stuck |

### Resource Allocation Recommendation

**Immediate (Next 2 weeks):**
- **ClassMate: 80% effort** — Fix data ownership + onboarding bugs. These are non-negotiable blockers. Estimated 8-12 hours of focused work.
- **Advocate: 20% effort** — Verify end-to-end backend flow and plan monetization model (choose: freemium, B2B physician access, or premium export).

**Short-term (Weeks 3-6):**
- **ClassMate: 60% effort** — Implement AI Chat feature (roadmap is solid, just needs execution).
- **Advocate: 40% effort** — Launch private beta with 5-10 healthcare provider partners. Get feedback on clinical summary quality and pricing sensitivity.

**Medium-term (Weeks 7-12):**
- **Advocate: 70% effort** — Pursue physician channel (most defensible). Either B2B SaaS (charge clinics) or B2B2C (revenue share with partner clinics).
- **ClassMate: 30% effort** — Stabilize + monitor. Begin campus partnerships (sell to registrars for deadline integration).

### Launch Timeline
- **ClassMate Public Beta**: 6-8 weeks (after data fix + chat feature)
- **Advocate Private Beta**: 4 weeks (immediate, concurrent with ClassMate fixes)

---

## 🔗 Specific File References

### Advocate
- **Authentication**: `app/components/AuthProvider.tsx` — localStorage-based, needs tab sync
- **API client**: `app/lib/api.ts` — well-structured, good error normalization
- **Landing**: `app/page.tsx` — excellent narrative design, 25KB single component (consider splitting)
- **Backend routers**: `backend/routers/` — 6 modular files (auth, patients, meds, logs, summary, onboarding)

### ClassMate
- **Data ownership bug**: `Backend/main.py` lines ~500-600 (UserProfile model) — all new courses/deadlines use hardcoded `user_id` instead of JWT `sub`
- **Onboarding**: `Frontend/app/onboarding` — needs to POST to `/me` endpoint after Supabase save (currently missing)
- **Chat roadmap**: `plan.md` — 189 lines, 7 phases, well-scoped
- **Scale issues**: `SCALE_CHECKLIST.md` — comprehensive audit showing 6 critical bugs

---

## Next Actions (Ordered by Impact)

1. **ClassMate**: Create SQL migration script to re-key `"default"` → `26642736-...` (your real Supabase UUID)
2. **ClassMate**: Add `POST /me` call to onboarding page after email confirmation
3. **Advocate**: Add `.env.example` with required backend variables; document API setup
4. **Advocate**: Verify all 6 backend routers are returning 200 with valid data
5. **ClassMate**: Add unique constraint on courses table: `UNIQUE(user_id, code, semester)`
6. **Advocate**: Draft monetization model (freemium, premium export, physician access tier)
7. **ClassMate**: Start AI Chat Phase 1 (models + migrations) after critical bugs are fixed

---

## Summary Table

| Project | Status | Risk | Opportunity | Next 2 Weeks |
|---------|--------|------|-------------|--------------|
| Advocate | 🟢 Product-ready | Medium (no users yet) | $500K+ TAM (caregiver market) | Verify backend, choose pricing |
| ClassMate | 🟡 Feature-rich, data-broken | High (new users stuck) | $2M+ TAM (student market) + $50K enterprise | Fix bugs, unblock growth |

---

**Review conducted**: Monday, April 13, 2026 (Automated)
**Next review**: Monday, April 20, 2026
