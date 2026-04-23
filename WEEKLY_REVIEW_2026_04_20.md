# Weekly Project Review — April 20, 2026

## Executive Summary

**Progress since April 13**: Solid incremental improvements on both projects, but neither has reached launch-ready status. **truefit-meds** has completed deployment infrastructure prep with `.env.example` and confirmed all backend endpoints are wired. **syllabusync** shows architectural elegance in data ownership fix (self-healing) but still suffers from data integrity bugs and missing automation in the onboarding flow that could strand new users.

Both projects would benefit from **focused execution week** (one major feature per project) followed by user validation rather than continued architectural tweaks.

---

## truefit-meds (Advocate)

### Status Summary

Deployment-ready infrastructure. All backend routers are properly included and CORS is configured. `.env.example` has been added with documentation. Core architecture is sound, but zero monetization model exists—the product remains completely free with no premium tier, which is a business liability rather than an asset.

### 🔥 Top Priorities

1. **Choose a monetization path and implement tier gating** — The app has no revenue model. Options: (a) **Freemium** (basic tracking free, premium = PDF export + physician sharing), (b) **B2B2C** (sell to hospital/clinic partners, revenue share on usage), (c) **Physician subscription tier** (charge doctors directly for patient management access). Without this, you have a feature, not a business. Pick one and gate the `/summary/pdf` endpoint behind it by end of week.

2. **Verify end-to-end backend integration** — All routers exist, but spot-check that data actually persists: (a) Create a test user via `/auth/register` → verify user row in DB, (b) POST to `/patients/` with a diagnosis → verify patient and condition configuration are created, (c) POST to `/logs/` → verify log data is queryable via `/logs/patient/{patient_id}`. Expected timeline: 1 hour.

3. **Fix tab-aware authentication** — AuthProvider stores token in localStorage only. If user logs out in one tab, they remain logged in another. Implement a **storage event listener** to broadcast logout across tabs: `window.addEventListener('storage', (e) => { if (e.key === 'token' && !e.newValue) logout() })`. This is a 15-minute fix that prevents user confusion.

### 💡 Opportunities

- **Physician onboarding channel** — Backend already generates clinical summaries. Partner with 2-3 primary care clinics (through your network) to use Advocate for 30-day pilot. Position as "caregiver communication tool + clinical handoff." This is your B2B2C beachhead.
- **Medication interaction + side effect warnings** — Backend tracks medications. Integrate a free drug interaction API (e.g., OpenFDA, RxNav) to show real-time warnings when caregivers log medications. This is a high-trust differentiator from Notion/spreadsheets.
- **Mobile app via Capacitor** — You have Capacitor already wired (see `package.json` + iOS folder). A simple iOS app (display-only dashboard + daily log entry) would capture caregivers on-the-go. 1-2 month lift if you start from the existing web build.
- **Caregiver community** — None of your competitors have caregiver-to-caregiver support. A simple forum or Slack-like channel (even if manual moderation initially) would create lock-in.

### ⚠️ Technical Concerns

- **Token refresh logic missing** — AccessToken is set to expire in 10,080 minutes (7 days), but there's no refresh endpoint. If a user returns after 7 days, they'll be logged out. Implement JWT refresh token pattern (store `refresh_token` in localStorage/httpOnly cookie, auto-refresh on 401).
- **Error handling is silent** — API calls likely fail without user feedback. Add toast notifications via `react-hot-toast` (already in package.json) for 4xx/5xx responses.
- **Logs endpoint has no pagination** — `GET /logs/patient/{patient_id}` likely returns all logs. Add `?limit=30&offset=0` query params to prevent slow load times as data grows.
- **Summary generation untested at scale** — `/summary/{patient_id}/generate` calls OpenAI, but no rate limiting or cost tracking. Add `user_id` and `rate_limit_key` to track costs per user (prepare for monetization).

---

## syllabusync (ClassMate)

### Status Summary

Feature-rich, but execution maturity is uneven. Strengths: Data ownership bug now has a self-healing mechanism (`_resolve_profile` auto-corrects stale `user_id` on first access). Chat feature roadmap (plan.md) is detailed and implementable. Weaknesses: new user onboarding still unclear (onboarding page removed but flow uncertain), data integrity bugs linger (orphaned records, duplicate courses), debug logging in production.

### 🔥 Top Priorities

1. **Verify new user flow doesn't strand profiles** — CRITICAL: After signup/email-confirm flow, does a user have a `user_profiles` row? The flow is: (a) Supabase email confirm → (b) `/auth/callback` → (c) POST `/me/complete-onboarding` → (d) redirect to `/home`. But I don't see a POST to `/me/profile` that would create the profile row. Either: (i) confirm `_resolve_profile` auto-creates on first `/me` call (needs verification), or (ii) add POST `/me/profile` call in auth callback. Estimated: 1 hour to trace + 30 min to fix if needed.

2. **Remove debug logging from production** — `GET /deadlines` has `print(f"[DEBUG]...")` statements polluting logs. Search Backend/main.py for all `print()` and `logging.debug()` calls; move to `logger.debug()` with env gate. Estimated: 30 min.

3. **Implement Phase 1 of AI Chat (models + DB)** — The plan.md is solid. Start with Phase 1 (SQLAlchemy models + migrations): `ChatConversation`, `ChatMessage`, update `UserProfile` with `chat_messages_used` + `chat_messages_reset_at` (already partially done—just needs migration). Estimated: 2-3 hours, unblocks Phases 2-7.

### 💡 Opportunities

- **Stripe integration is already live** — You have Supabase auth + Stripe. Build the upgrade funnel: (a) add "Upgrade" CTA to /home for Free users, (b) create `/upgrade` page showing feature comparison (AI Chat = Pro only), (c) gate chat feature behind `tier == "pro"`. Estimated: 4-6 hours, immediate monetization.
- **Canvas/iCal auto-import** — Code exists for parsing. Complete the LMSConnection flow: (a) user connects Canvas PAT → (b) hourly sync job fetches new deadlines → (c) auto-create Deadline rows. This is a "set it and forget it" UX win vs. manual syllabus upload. Estimated: 3-5 hours.
- **Study group collaboration** — Backend already stores `user_id` per flashcard/deadline. Build: (a) "Share group code" → (b) friends enter code → (c) see shared deadlines + collaborative flashcard edits. Estimated: 2 sprints, huge engagement boost.
- **Enterprise pilot with university registrar** — Position as "deadline sync for all students" (auto-import from institutional calendar). Reach out to one registrar with 5K+ students; offer free pilot in exchange for data on usage patterns. This is a $50K-500K TAM if you can land 1-2 universities.

### ⚠️ Technical Concerns

- **Data integrity cascades broken** — User deletion doesn't cascade. If a user is deleted from Supabase, their flashcards/summaries/quizzes remain orphaned. Add `ON DELETE CASCADE` to `Flashcard.user_id`, `Summary.user_id`, `Quiz.user_id`, etc. Estimated: 1 hour.
- **Duplicate course prevention missing** — You noted 6 duplicate "Finance 315" courses from accidental double-clicks. Add a unique constraint: `UNIQUE(user_id, course_code, semester)` on the `courses` table. Also add `disabled: true` to the "Add Course" button after click, with 2-second re-enable. Estimated: 30 min.
- **Summary generation untested** — The `summaries` table is empty (0 rows). Either the feature is disabled, or it silently fails. Test: (a) upload a PDF to a course, (b) request a summary, (c) check if row is inserted. Fix any silent errors. Estimated: 30 min trace + 1-2 hours fix.
- **Rate limiting incomplete** — Decorators exist but no per-user quotas for API calls. Users could DOS `/chat/send` with repeated calls. Add `user_id` + `datetime.utcnow()` logic to track calls per minute. Estimated: 1 hour.
- **Missing indexes on high-query tables** — `GET /deadlines` queries the deadlines table without indexes on `(user_id, completed)`. Add index: `CREATE INDEX idx_deadlines_user_completed ON deadlines(user_id, completed)`. Estimated: 15 min.

---

## 📊 Cross-Project Analysis

### Technical Trajectory

| Dimension | Advocate | ClassMate |
|-----------|---------|-----------|
| **Deployment readiness** | ⭐⭐⭐⭐ (all infra in place) | ⭐⭐⭐ (good, but flow unclear) |
| **Code organization** | ⭐⭐⭐⭐ Clean, minimal deps | ⭐⭐⭐⭐ Well-structured, good patterns |
| **Data integrity** | ⭐⭐⭐⭐ (simple schema, no cascades) | ⭐⭐⭐ (bugs exist, fixable) |
| **Monetization** | 🔴 Not started | ✅ Stripe live, just needs gating |
| **Feature completeness** | 70% (core works, premium gaps) | 80% (advanced features, unfinished AI) |
| **User feedback loop** | 🔴 0 users (private beta pending) | 🟡 7 users, some stuck at onboarding |

### Market & Go-to-Market

**Advocate** has a clear, defensible TAM (65M+ US caregivers), but zero go-to-market strategy. Your competitive advantage is clinical summary quality + caregiver UX. Bottleneck: **trust with healthcare providers**. Recommend: pilot with 2-3 primary care clinics (you likely know some through your network) to gather quotes + testimonials.

**ClassMate** has a crowded TAM (Notion, Todoist, Canvas itself are competitors) but unique angle (AI chat + deadline sync). Your advantage is **institutional integration** (Canvas/iCal) + workflow automation. Bottleneck: **campus adoption & network effects**. Recommend: partner with 1-2 universities to auto-import deadlines for all students (100% adoption day 1), then grow within campus.

### Resource Allocation (Next 2 Weeks)

**Week 1 (April 21-27):**
- **truefit-meds: 40% effort** — Verify end-to-end backend flow (user → patient → log → summary). Choose monetization model (pick one). Implement tier gating for one premium endpoint (e.g., `/summary/pdf`). Fix tab-aware logout. Estimated 12-16 hours focused work.
- **syllabusync: 60% effort** — Verify new user onboarding doesn't strand profiles (critical bug to confirm). Implement AI Chat Phase 1 (models + migrations + `/me/subscription` update). Remove debug logging. Estimated 16-20 hours focused work.

**Week 2 (April 28-May 4):**
- **truefit-meds: 60% effort** — Launch private beta with 3 healthcare provider partners. Collect quotes, testimonials, feature requests. Implement feedback loop (post-session survey).
- **syllabusync: 40% effort** — Implement AI Chat Phases 2-3 (tier checks + endpoints). Get chat working with 7 existing users. Gather feedback on feature quality + tier value.

### Launch Timeline

- **truefit-meds**: Private beta (4 weeks) → seed feedback from healthcare providers → iterate on clinical accuracy + pricing model → public beta (target: May 20)
- **syllabusync**: Public beta Phase 1 (AI Chat + Stripe gating) by May 15 → pursue university partnership for Phase 2 (institutional integration + campus launch)

---

## 🔗 Key File Changes Since April 13

### truefit-meds
- ✅ `backend/.env.example` — Added with full documentation
- ✅ `backend/main.py` — CORS + exception handling finalized
- ✅ `backend/routers/*.py` — All 6 routers confirmed wired and present
- ⚠️ `app/components/AuthProvider.tsx` — Still uses localStorage only (no tab sync)
- ⚠️ `backend/routers/summary.py` — Summary endpoint exists but no rate limiting

### syllabusync
- ✅ `Backend/main.py` — `_resolve_profile()` now self-heals stale `user_id` (elegant fix to data ownership bug)
- ✅ `Backend/main.py` — UserProfile model updated with `chat_messages_used`, `chat_messages_reset_at` (Phase 1 partially done)
- ✅ `Frontend/app/auth/callback/page.tsx` — POST to `/me/complete-onboarding` wired
- ❓ `Frontend/app/onboarding/page.tsx` — Removed and redirects to `/home` (unclear if profile creation is automatic or missing)
- ⚠️ `Backend/main.py` — Debug logging still present in production endpoints

---

## Next Actions (Ordered by Impact)

### truefit-meds

1. **Trace end-to-end backend** (1 hour) — Create test user, verify each endpoint returns valid data, check DB rows are persisted
2. **Choose monetization model** (1 hour) — Pick freemium, B2B2C, or physician tier. Document in README.md
3. **Implement tier gating** (2 hours) — Gate `/summary/pdf` endpoint; add `user.tier` check
4. **Fix tab-aware logout** (30 min) — Storage event listener to sync logout across tabs
5. **Plan healthcare provider pilot** (2 hours) — Identify 3 clinics, draft outreach email, prepare one-page pitch

### syllabusync

1. **Confirm new user flow** (30 min) — Manually signup with new email, verify user_profiles row exists after onboarding. Trace the flow end-to-end.
2. **Remove debug logging** (30 min) — Grep for all `print()` calls, replace with `logger.debug()` with env gate
3. **Implement Chat Phase 1** (3 hours) — Add SQLAlchemy models, migration, endpoint updates
4. **Add unique constraint on courses** (15 min) — Prevent duplicates
5. **Add cascade delete** (30 min) — Prevent orphaned records
6. **Test summary generation** (30 min) — Manually trigger, verify row creation
7. **Reach out for university partnership** (1 hour) — Identify registrar contacts, draft intro email

---

## Summary Table

| Project | Status | Risk | Opportunity | Launch Target |
|---------|--------|------|-------------|---|
| **Advocate** | 🟢 Infrastructure ready | Medium (no users, no revenue model) | Healthcare provider partnerships, B2B2C channel | May 20 (private beta) |
| **ClassMate** | 🟡 Feature-rich, execution uneven | Medium (new users potentially stuck, data bugs) | AI Chat + campus partnerships, $50K+ TAM | May 15 (public beta Phase 1) |

---

**Review conducted**: Monday, April 20, 2026 (Automated)
**Next review**: Monday, April 27, 2026

**Key recommendation**: Both projects are **one execution week** away from user-facing milestones. Pick ONE focus per project for the next 7 days and ship it. Advocate needs monetization validation; ClassMate needs working AI chat + confirmed onboarding flow.
