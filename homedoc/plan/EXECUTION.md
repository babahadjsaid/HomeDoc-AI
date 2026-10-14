# Implementation plan and execution log

Date: 2026-10-14

| Phase | Goal | Result now | Acceptance gate |
|---|---|---|---|
| 0 — Audit | Understand scanner code, OCR shape, and build dependencies | **Done** via upstream code/docs review | Confirm integration paths in main and repo build instructions |
| 1 — Design | Architecture, privacy boundaries, screen flows | **Done** (`design/*.md`) | Every proposed reminder needs explicit confirmation |
| 2 — Offline data | Date/amount/category extraction with guardrails | **Done**, 11 automated tests | No invented or ambiguous dates |
| 3 — Native MVP | HomeDoc hub reachable from scanner list | **Code written; NOT iOS-built** (`native/app`, patch installer) | Compile on Mac; scan → OCR → review → save |
| 4 — Cloud AI | Structured optional AI extraction | **Code written; provider integration mocked in tests** | Consent, credentials server-side, valid field evidence |
| 5 — UI preview | Interactive responsive prototype | **Done** (`preview/index.html`) | Manual browser checks incl. iPhone Safari |
| 6 — Packaging | Guides, test runner, source overlay | **Done** | Can apply overlay twice without duplicate buttons |
| 7 — Native integration QA | iOS simulator and physical iPhone validation | **Blocked here: no Mac/Xcode and no complete upstream checkout** | Successful `ns run ios` and run-device test |
| 8 — Production readiness | OS notifications, encrypted storage, upgrades, branding | **Not done** | Privacy/security audit, migration tests, app-store distribution |

## User stories (MVP)
- Given an existing scanned PDF/image with OCR data, I can open HomeDoc and see it in my scan list.
- When I tap a document, local extraction suggests category, amount, and labeled date only.
- If the date is ambiguous, HomeDoc leaves the field empty and explains why.
- I can correct and save reviewed metadata and find it in my due list after reopening the page.
- I can delete the review without deleting the underlying scan.
- Optionally, I can authorize sending OCR text to my own backend for AI suggestions; failure leaves offline review available.

## First physical test checklist (before declaring MVP complete)
1. Build upstream unmodified scanner on Mac/iPhone first; settle custom fork/native dependencies.
2. Apply overlay; check new FAB and HomeDoc page load.
3. Import a synthetic test bill, run OCR in original scanner, open HomeDoc.
4. Verify extraction and source OCR accuracy; edit all fields and save.
5. Kill/relaunch app; verify records persisted.
6. Test ambiguous dates, empty OCR, missing document, scan deletion, search, and many documents.
7. Test back navigation, landscape, large Dynamic Type, VoiceOver, iOS 13+ according to upstream compatibility.
8. Test optional AI endpoint only with non-sensitive synthetic documents. Verify failure is safe.
9. Profile first launch, memory, storage/DB migration and background behavior.

## Next engineering tickets (in priority order)
1. Complete a reproducible iOS toolchain lockfile / upstream SHA pin on the development Mac.
2. Secure local storage & record migration (replace ApplicationSettings) and document deletion reconciliation.
3. Implement scheduled on-device notifications (opt-in); badges and due/overdue UI; test timezone/DST.
4. Native polished dashboard & review original scanned image next to extracted evidence.
5. OpenAI endpoint authentication, HTTPS, quota and operational security; opt-in/privacy policy.
6. OCR languages (Arabic, French, Italian, English) with reliable metrics and human-language UX.
7. Subscription billing only after measuring task completion and actual willingness to pay.

## Definition of done for beta
Built and signed IPA, successful simulator/device tests, crash-free critical flows, no unconsented data transmission, encrypted private metadata, usable accessibility and deletion controls, privacy policy, tested notifications, dependency/license audit, and working TestFlight distribution.
