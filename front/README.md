# Chain My Vote

## Overview

Chain My Vote is a Next.js + TypeScript frontend that provides a prompt/chat UI intended for generative AI interactions, and can be packaged as a lightweight native desktop application using Tauri. The repository contains the web UI in `src/` and the Tauri native wrapper in `src-tauri/`.

The primary objective of Chain My Vote is to act as an extensible "brain": an AI-driven system connected to a graph database that models knowledge, ingests new information, and can trigger automated workflows and actions. Think of it as a combination of a generative AI chat interface plus a graph-backed knowledge store and a workflow executor (similar in spirit to tools like n8n but driven by a graph-based AI "brain").

This README gives a concise description, developer quickstart, and a checklist for publishing the project publicly on GitHub.

## Key goals

- Provide a modern prompt/chat interface for interacting with generative AI services.
- Connect to a graph database (knowledge graph) to represent concepts, relationships and persistent state — enabling richer context and long-term memory for the AI.
- Allow the AI to ingest and append data to the graph, enabling the system to learn and grow its knowledge over time.
- Execute automated actions and workflows based on AI decisions (e.g., trigger tasks, call APIs, or run orchestrated flows), providing n8n-like automation augmented by the graph-backed AI "brain".
- Allow running as a web app (Next.js) and as a cross-platform desktop app (Tauri).
- Keep the code modular and ready for static export so Tauri can bundle the frontend.

## Screenshots

### Dashboard

![Dashboard screenshot](media/dashboard.png)

### Prompt / Chat UI

![Prompt screenshot](media/prompt.png)

## What the repo contains

- Frontend: `src/` (Next.js App Router, React + TypeScript components).
- Native wrapper: `src-tauri/` (Rust + Tauri; configuration at [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)).
- Project manifest: [package.json](package.json) and [src-tauri/Cargo.toml](src-tauri/Cargo.toml).

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind/PostCSS.
- Native: Tauri (Rust), Cargo.
-- Integrations & tooling: generative AI client libraries, graph-database references (SurrealDB appears in the codebase as a possible persistence option), and hooks for workflow/action execution.

## Developer Quickstart

Prerequisites

- Node.js 18+ and npm
- Rust toolchain (`rustup`, `cargo`) — install from <https://rustup.rs>
- On Windows: Visual Studio Build Tools (Desktop development with C++) for native builds

Install frontend dependencies

```bash
npm install
```

Run frontend in development

```bash
npm run dev
# open http://localhost:3000
```

Run Tauri in dev (in a second terminal after the frontend is up)

```bash
# If you have the Tauri Node CLI in node_modules/devDependencies
npx tauri dev

# Or use the Rust CLI from the src-tauri folder
cd src-tauri
cargo tauri dev
```

Production build & package (static export + Tauri)

```bash
# Build frontend
npm run build
npx next export    # produces the `out/` folder used by Tauri (see [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json))

# Build native app
cd src-tauri
cargo tauri build
```

If you prefer the Node CLI for Tauri (instead of `cargo tauri`) use `npx tauri build` from the repository root or from `src-tauri` as appropriate.

## Configuration notes

- Tauri expects the frontend static output in `out/` by default in this repo (see [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)).
- Environment variables: the code may read environment variables during build/runtime  ensure that API keys or secrets are not committed. `.gitignore` already includes `.env*` entries.

## Contributing

Contributions are welcome. Please open issues and pull requests with clear descriptions. Include environment/version information for reproducibility.
