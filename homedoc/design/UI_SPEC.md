# HomeDoc AI — UI/UX specification

## Visual direction
- **Mood:** calm, trustworthy, useful every day; professional household records instead of flashy AI chat.
- **Palette:** deep teal `#143C41`, action teal `#145E55`, mint `#C5EDC7`, paper background `#F5F7F6`, muted text `#708184`, warning `#FFF5DD`.
- **Typography:** platform system font, bold 28–42px product headings, 14–16px primary body, 12px secondary text.
- **Shape:** 14–22px soft cards; 44px+ touch targets; use visible focused/error states and explicit controls.
- **Voice:** short task-oriented labels, no unwarranted claims about accuracy.

## Screen 1: Overview (full design prototype)
```text
┌─────────────────────────────────┐
│ HOME / PRIVATE DOCUMENT SPACE   │
│ Everything important.           │
│ All in one place.               │
│ ┌─────────────────────────────┐ │
│ │ No more missed dates        │ │
│ │ [ + Add document ]          │ │
│ └─────────────────────────────┘ │
│ [12 scans] [4 dates] [2 review]│
│ Upcoming reminders              │
│ ┌─────────────────────────────┐ │
│ │ Electricity bill   Nov 25  │ │
│ └─────────────────────────────┘ │
│ Recently added                  │
│ Home   Docs    Add   Dates      │
└─────────────────────────────────┘
```
**Actions:** open pending review; scan/import via upstream; jump to confirmed deadline. Overview exists in the interactive browser prototype; native MVP currently uses the hub screen as its first page.

## Screen 2: Documents and OCR
```text
┌─────────────────────────────────┐
│ Documents       [+ Add]         │
│ [ Search documents........... ] │
│ ┌─────────────────────────────┐ │
│ │ ▤ Utility bill  OCR ready   │ │
│ ├─────────────────────────────┤ │
│ │ ▤ Warranty      No OCR      │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
In native MVP, original scanner remains the primary scan/import entry. New HomeDoc icon lives in the existing floating action row.

## Screen 3: Review (native + prototype)
```text
┌─────────────────────────────────┐
│ ← Review extracted fields       │
│ [⚠ Ambiguous: check manually]  │
│ Document title [____________]   │
│ Category       [Bill       ▾]  │
│ Due date       [2026-11-25  ]  │
│ Amount         [52.40       ]  │
│ Currency       [EUR         ]  │
│ Original OCR available to check │
│ [ Confirm and save ]            │
└─────────────────────────────────┘
```
Rules: title required; date ISO-8601 and optional; amount optional with up to two decimals. No automatic reminder, payment, or external message. Cloud AI button is opt-in and explicitly lists the privacy consequence.

## Screen 4: Deadlines (full design prototype; simplified in native hub)
Sorted by date, earliest first. Show documents without confirmed due date in library, not reminder list. Explain whether date is past/soon; provide `Export .ics` in web prototype. Native OS notifications are pending.

## Screen 5: Privacy controls (prototype)
Explain where data is stored, optional AI transmission, and one-step demo delete. Production mobile settings must add secure metadata deletion and AI revocation/logout.

## Accessibility and localization requirements
- Dynamic Type/large-text layout must be tested in iOS and Android.
- Do not encode state using color only; provide status text.
- VoiceOver/TalkBack controls should have labels and logical focus order.
- Honor reduced-motion settings for transitions.
- Translate date handling thoughtfully: `01/10/2026` is ambiguous, and the program refuses to decide without user review.
- Right-to-left Arabic support requires layout and OCR-language research; it has **not** been implemented yet.

## Interactive deliverable
`preview/index.html` is a working browser UI: dashboard, search, import OCR text, extraction, user review, local browser persistence, deadlines, calendar export, and clear-data control. It is a software prototype, not an iOS app binary.
