# 🦞 ClawChat

A browser-based, Discord-style multi-agent chat interface for [OpenClaw](https://github.com/openclaw/openclaw).

![Dark theme](https://img.shields.io/badge/theme-dark-1a1a2e) ![React 19](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)

## Features

- **Three-panel layout** — Agent Selector (left), Chat (centre), Control & Config (right)
- **Real-time streaming** — Agent responses stream in via WebSocket with throttled rendering
- **Multi-agent support** — Switch between agents instantly, each with their own session
- **Identity file editor** — Edit SOUL.md, IDENTITY.md, MEMORY.md etc. with conflict detection
- **Tool call cards** — Collapsible inline cards showing tool execution details
- **Error recovery** — Post-save monitoring, Gateway log viewer, agent restart
- **Dark theme** — Deep navy palette with lobster red accents

## Architecture

```
Browser (SPA) ──WS──▶ ClawChat Proxy (port 3100) ──WS──▶ OpenClaw Gateway (port 18789)
                       │
                       ├─ Static SPA serving
                       ├─ REST API for files, agents, config
                       └─ Dual-token auth (UI token + Gateway token)
```

## Quick Start

### 1. Configure

```bash
cd proxy
cp .env.example .env
# Edit .env with your tokens:
#   OPENCLAW_GATEWAY_TOKEN — from openclaw.json gateway.auth.token
#   CLAWCHAT_UI_TOKEN — generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Install & Build

```bash
npm install          # installs both proxy and ui workspaces
cd ui && npm run build
cp -r dist/* ../proxy/public/
```

### 3. Run

```bash
cd proxy
npx tsx src/server.ts
# → http://localhost:3100
```

### Development

```bash
# Terminal 1: Proxy
cd proxy && npm run dev

# Terminal 2: UI (Vite dev server with HMR)
cd ui && npm run dev
# → http://localhost:5173 (proxies API/WS to :3100)
```

## Access via Tailscale

The proxy binds to `0.0.0.0:3100` by default, making it accessible from any device on your tailnet:

```
http://<mac-studio-tailscale-ip>:3100
```

The `CLAWCHAT_UI_TOKEN` is always required, even on a trusted network.

## Tech Stack

| Layer | Technology |
|-------|------------|
| SPA | React 19 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS 4 |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| Proxy | Fastify + ws |
| Build | Vite |

## License

MIT
