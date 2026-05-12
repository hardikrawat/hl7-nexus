# Helix UI Redesign Plan

## 1. Current UI Notes

The current interface has a clear mission-control identity: dense panels, terminal-style typography, red/black accents, live processor states, and a persistent event log. That identity is useful for an HL7 orchestration tool, but the current execution feels more like a diagnostic console than a modern workspace.

Observed issues from the running UI:

- The layout is rigid: fixed left and right columns plus a center workbench leave little room for smaller screens.
- The current viewport shows horizontal overflow and repeated UI content off to the side, which suggests width constraints need tightening.
- Nearly all labels use tiny monospace uppercase text, which makes scanning hard during real workflows.
- The footer event controls compete with the right event log, duplicating operational attention.
- The active workflow tabs are functional, but compressed and hard to distinguish quickly.
- Disabled AI-only features use strikethrough styling, which reads as broken rather than unavailable.
- Input and output panes are useful but visually heavy because every pane uses thick borders and terminal headers.
- The event log animation is good in spirit, but should be calmer and more controllable for long sessions.
- Current state visibility is strong for engines and processors, but weak for task progress, validation summaries, and next actions.

What should be preserved:

- Three major zones: pipeline status, central workbench, processing/event context.
- Engine modes: Algorithm, Cloud AI, Local AI.
- Current feature tabs: Build Message, Parse and Validate, Compare Messages, Batch Processing, Clinical NLP.
- Real-time processor/agent status updates.
- Event bus and export controls.
- Existing backend API calls and WebSocket behavior.
- Strong HL7/FHIR technical tone.

## 2. Current Frontend Architecture

### App Shell

`frontend/src/App.jsx` owns the main shell:

- `GlobalHeader`
- `LeftPanel`
- `CenterPanel`
- `RightPanel`
- `GlobalFooter`
- `ConfigModal`

It already supports three layout modes through `systemConfig.layoutMode`:

- `classic`: fixed 3-column dense layout.
- `ide`: collapsible sidebars.
- `unified`: merged left/right dashboard column plus main workbench.

This is a good place to introduce a fourth layout mode, `modern`, without disrupting existing layouts.

### State Model

`frontend/src/store/nexusStore.js` uses Zustand for shared UI state:

- Core mode: `engineMode`
- UI routing: `activeTab`, `activeSubTab`
- Config: `systemConfig`
- Event log: `eventBus`, `isLogPaused`
- Message state: `currentMessage`, `parsedMessage`, `validationResult`
- Runtime status: `processors`, `agents`

The redesign should keep this store intact and add only small UI-state fields if needed, such as panel collapse, density, or event drawer state.

### Workflow Components

The center workbench is feature-driven:

- `GenerateTab.jsx`: JSON patient data to HL7 message.
- `ParseTab.jsx`: HL7 input to AST, validation, and FHIR bundle.
- `DiffTab.jsx`: segment-aware comparison.
- `BatchTab.jsx`: bulk validation stream and CSV export.
- `NlInputTab.jsx`: clinical text to HL7 for AI modes.

These components already contain the important behavior. The prototype should wrap and restyle them through shared primitives before rewriting logic.

### Side Context

`LeftPanel.jsx` chooses between:

- `AlgoProcessors.jsx`
- `AiAgents.jsx`

`RightPanel.jsx` shows:

- engine/provider parameters
- event stream

`GlobalFooter.jsx` provides:

- pause/resume/clear/export event controls
- session metrics

The modern design should merge footer controls into a drawer or compact event toolbar, so users are not forced to monitor two log surfaces at once.

## 3. Redesign Direction

Working name: **Nexus Console 2.0**

Design goals:

- Keep the enterprise HL7 command-center feel, but make it calmer, cleaner, and easier to scan.
- Preserve all existing workflows and API integrations.
- Make the first screen usable as a real tool, not a landing page.
- Improve responsive behavior with collapsible panels and scroll-safe work areas.
- Use modern spacing, typography, status chips, and code panes instead of heavy terminal boxes everywhere.
- Add subtle animations only where they clarify state changes.

Visual system:

- Background: neutral app canvas, not a saturated blue page.
- Surfaces: white and near-white panels with soft borders and restrained shadows.
- Accent: Helix red for primary actions and important output, with teal/green for healthy status, amber for warnings, and blue for informational states.
- Corners: 6-8px radius for cards, inputs, toolbars, and modals.
- Typography: Inter/system font for UI, monospace only for HL7 payloads, logs, and IDs.
- Density: compact by default, but with clearer grouping and stronger alignment.

## 4. Prototype Layout

### Top Command Bar

Purpose: global orientation and system actions.

Contents:

- Brand: Helix System
- Environment badge: HL7 v2.5.1 / FHIR R4
- Engine segmented control: Algorithm, Cloud AI, Local AI
- Connection status with pulse indicator
- Session timer
- Settings icon button

Behavior:

- Engine changes keep the current active tab when valid.
- Clinical NLP appears locked with a tooltip in Algorithm mode instead of strikethrough.
- Settings opens the existing config modal.

### Left Pipeline Rail

Purpose: live pipeline observability.

Desktop:

- 280px collapsible rail.
- Header: Active Engine
- Status cards for processors or agents.
- Each card shows name, role, status, and small metrics.

Mobile/tablet:

- Rail becomes a drawer.
- Workbench takes full width.

Animations:

- Status cards gently pulse only while processing.
- Completed states fade to green briefly, then settle.
- Panel collapse uses a short slide/fade.

### Center Workbench

Purpose: primary task execution.

Structure:

- Workflow tab bar with icons:
  - Build
  - Parse
  - Diff
  - Batch
  - NLP
- Context toolbar beneath tabs:
  - selected template or mode
  - primary action
  - validation/error state
- Main content grid with code-aware panes.

Workflow-specific prototype:

- Build Message:
  - left pane: template selector and patient JSON editor
  - right pane: generated HL7 output with copy button
  - compact validation notice for invalid JSON
- Parse and Validate:
  - top HL7 input pane
  - bottom result grid: AST tree, compliance summary, FHIR bundle
  - compliance summary should be a quick status card before details
- Compare Messages:
  - two input panes side by side on desktop, stacked on mobile
  - diff output uses added/removed/modified colors and a compact summary bar
- Batch Processing:
  - payload input
  - progress bar with count
  - results table with sticky header and export action
- Clinical NLP:
  - AI-only empty/locked state in Algorithm mode
  - clinical text input plus synthesized HL7 output in AI modes

### Right Inspector Panel

Purpose: parameters, run metadata, and live events.

Desktop:

- 320px inspector.
- Top card: engine details and provider/model/rules loaded.
- Middle: current workflow summary.
- Bottom: event stream.

Behavior:

- Event stream can be paused, cleared, and exported from its own header.
- Long logs virtualize later if needed.
- Footer can be removed or reduced to a tiny status strip.

### Bottom Event Drawer

Purpose: optional deep log view.

Instead of a permanent 32px footer full of controls, use:

- compact status strip with event count, buffer, memory, and engine
- expandable event drawer for full log operations

This keeps operational data available without stealing space from the workbench.

## 5. Implementation Plan

### Phase 1: Design Foundation

- Add a `modern` layout mode in `systemConfig.layoutMode`.
- Add shared UI primitives:
  - `ShellPanel`
  - `StatusChip`
  - `IconButton`
  - `SegmentedControl`
  - `CodePane`
  - `ActionToolbar`
  - `MetricCard`
- Replace global scanline overlay in modern mode only.
- Create design tokens in CSS:
  - app background
  - surface colors
  - border colors
  - semantic status colors
  - shadow levels
  - motion durations

### Phase 2: Modern Shell Prototype

- Build `ModernShell.jsx`.
- Keep `CenterPanel`, `LeftPanel`, and `RightPanel` mounted through the same store.
- Move footer controls into a modern event drawer.
- Add collapsible left rail and right inspector.
- Add responsive breakpoints for tablet and mobile.

### Phase 3: Workflow Restyle

- Restyle `CenterPanel` tabs into modern workflow navigation.
- Restyle `GenerateTab`, `ParseTab`, `DiffTab`, `BatchTab`, and `NlInputTab` using shared panes.
- Preserve all handlers, axios calls, downloads, copy actions, and state updates.
- Improve empty states and disabled states.

### Phase 4: Motion and Polish

- Use Framer Motion for:
  - panel enter/collapse
  - tab content transitions
  - event insertion
  - processing/completed status feedback
- Respect `prefers-reduced-motion`.
- Keep animations under 200ms for operational responsiveness.

### Phase 5: Verification

- Verify all workflow actions:
  - build message
  - parse and validate
  - diff
  - batch report export
  - AI-only NLP locked/unlocked states
  - config modal save
  - event pause/resume/clear/export
- Check desktop, tablet, and mobile screenshots.
- Confirm no horizontal overflow.
- Confirm backend URLs still use `frontend/src/config/api.js`.

## 6. First Prototype Milestone

The fastest useful prototype should be:

- Add `modern` layout mode.
- Make it the default only after review.
- Implement the modern shell, command bar, pipeline rail, workbench wrapper, inspector, and event drawer.
- Reuse existing workflow components initially.
- Then restyle workflow internals one by one.

This gives a visible modern UI quickly while keeping all existing functionality intact.

