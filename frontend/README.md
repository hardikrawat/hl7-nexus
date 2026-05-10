# Helix System — Frontend

> React 19 + Vite + TailwindCSS 4 + Zustand

This is the frontend UI for the **Helix System** HL7 orchestration platform.

## Quick Start

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Environment Variables

Create a `.env` file to override API defaults:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## Build for Production

```bash
npm run build
```

Output is generated in `dist/`. Serve with any static file server.

## Key Directories

| Path | Description |
|------|-------------|
| `src/config/api.js` | Centralized API URL configuration |
| `src/store/nexusStore.js` | Zustand global state (engine mode, processors, agents, events) |
| `src/hooks/useWebSocket.js` | WebSocket with exponential backoff reconnection |
| `src/components/center/` | Main feature tabs (Parse, Generate, Diff, Batch, NLP) |
| `src/components/agents/` | Pipeline visualization (AlgoProcessors, AiAgents) |
| `src/components/layout/` | Shell layout (Header, Footer, Left/Center/Right panels) |
| `src/components/shared/` | Shared components (ConfigModal, ErrorBoundary) |

## Engine Mode Awareness

All center panel tabs are engine-mode-aware:
- **Algorithm mode** → Updates `processors` state (left panel shows AlgoProcessors)
- **AI mode** → Updates `agents` state (left panel shows AiAgents)
- Components use `updateProcessorStatus()` or `updateAgentStatus()` based on `engineMode`
