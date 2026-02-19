# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Initial setup (install deps, generate Prisma client, run migrations)
npm run setup

# Development server (uses Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/lib/__tests__/file-system.test.ts

# Reset the database
npm run db:reset

# After changing prisma/schema.prisma, run a migration
npx prisma migrate dev --name <migration-name>
```

The app runs at http://localhost:3000. It works without an `ANTHROPIC_API_KEY` — it falls back to a mock provider that returns static components.

## Architecture

UIGen is an AI-powered React component generator. Users describe components in a chat, and Claude generates files in a virtual (in-memory) file system. A live preview renders those files in an iframe.

### Request Flow

1. **User sends a message** → `ChatContext` (`src/lib/contexts/chat-context.tsx`) calls `/api/chat` with the current messages plus the serialized virtual file system (`fileSystem.serialize()`).

2. **API route** (`src/app/api/chat/route.ts`) reconstructs a `VirtualFileSystem` from the serialized data, then calls `streamText` with two AI tools:
   - `str_replace_editor` — create, view, and edit files (via `VirtualFileSystem` methods like `createFileWithParents`, `replaceInFile`, `insertInFile`)
   - `file_manager` — rename and delete files/directories

3. **Tool calls stream back** to the client. `ChatContext` passes each `onToolCall` event to `handleToolCall` in `FileSystemContext`, which applies the mutations to the in-memory `VirtualFileSystem`.

4. **`PreviewFrame`** (`src/components/preview/PreviewFrame.tsx`) watches `refreshTrigger` from `FileSystemContext`. On change it:
   - Calls `createImportMap()` which transforms every `.jsx/.tsx/.ts/.js` file using Babel standalone into a blob URL, then builds an ES module import map
   - Third-party packages are resolved through `https://esm.sh/`
   - Injects the import map + React into an `<iframe srcdoc>` as a complete HTML page

### Key Modules

- **`src/lib/file-system.ts`** — `VirtualFileSystem` class: the single source of truth for all generated files. Supports CRUD, rename, serialize/deserialize, and text-editor operations.
- **`src/lib/transform/jsx-transformer.ts`** — `transformJSX` (Babel transform), `createImportMap` (blob URL map), `createPreviewHTML` (full iframe HTML). This is where JSX/TSX is transpiled client-side.
- **`src/lib/contexts/file-system-context.tsx`** — React context wrapping `VirtualFileSystem`. Exposes `handleToolCall` which routes AI tool call results into the file system.
- **`src/lib/contexts/chat-context.tsx`** — Wraps Vercel AI SDK `useChat`. Serializes the virtual FS on every request body so the server always has the latest state.
- **`src/lib/provider.ts`** — Returns a real `anthropic("claude-haiku-4-5")` model when `ANTHROPIC_API_KEY` is set; otherwise returns `MockLanguageModel` which streams static components.
- **`src/lib/auth.ts`** — JWT-based session stored in an `httpOnly` cookie. Server-only.
- **`src/lib/prompts/generation.tsx`** — System prompt given to Claude for component generation.

### Data Persistence

Authenticated users' projects (messages + virtual FS snapshot) are stored in SQLite via Prisma. The schema has two models: `User` and `Project`. The `data` column holds `JSON.stringify(fileSystem.serialize())` and `messages` holds the full conversation.

Anonymous users can generate components but nothing is persisted to the DB; work is tracked client-side in `src/lib/anon-work-tracker.ts`.

### Authentication

JWT tokens are issued on sign-up/sign-in and stored in an `httpOnly` cookie named `auth-token`. `src/middleware.ts` handles route protection. Auth forms are in `src/components/auth/`.

### Testing

Tests use Vitest with jsdom and React Testing Library. Test files live adjacent to the code they test in `__tests__` subdirectories.
