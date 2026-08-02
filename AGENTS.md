# Repository Guidelines

NestJS 11 + TypeScript backend for the bookkeeping app (`server/`). Uses TypeORM with MySQL, JWT auth, MinIO file storage, and Socket.IO.

## Project Structure & Module Organization

- `src/main.ts` — bootstrap entry; `src/app.module.ts` — root module
- Feature modules: `auth/`, `user/`, `keeping/`, `category/`, `analysis/`, `chat/`, `file/`
- Cross-cutting code: `dto/`, `entity/`, `guard/`, `interceptor/`, `filters/`, `middleware/`, `decorator/`, `jwt/`, `minio/`, `types/`
- `test/` — e2e tests (`app.e2e-spec.ts`, `jest-e2e.json`)
- `docs/` — project documentation
- Environment files: `.env.example`, `.env.development`, `.env.production`

## Build, Test, and Development Commands

Uses npm (`package-lock.json` is authoritative).

- `npm run start:dev` — start in watch mode
- `npm run start:local` — start with the local environment
- `npm run build` — compile to `dist/` via `nest build`
- `npm run start:prod` — run the compiled build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`) with `--fix`
- `npm run format` — Prettier over `src/**/*.ts` and `test/**/*.ts`
- `npm test` — Jest unit tests (`*.spec.ts` under `src/`)
- `npm run test:e2e` — e2e tests with Supertest

## Coding Style & Naming Conventions

- Prettier (`.prettierrc`): single quotes, trailing commas, print width 120
- ESLint 9 flat config with `typescript-eslint` and `eslint-config-prettier`
- Follow NestJS conventions: one feature folder with controller/service/module; name files `*.module.ts`, `*.controller.ts`, `*.service.ts`
- Validate request payloads with `class-validator` DTOs; keep TypeScript strict settings

## Testing Guidelines

- Jest with `ts-jest`; unit tests are co-located `*.spec.ts` files under `src/`
- E2e tests live in `test/` and use Supertest
- Run `npm test` before pushing; run `npm run test:e2e` for integration changes

## Commit & Pull Request Guidelines

- History uses Conventional Commits-style prefixes, most often `feat:`, `add:`, and `fix:` (e.g. `feat: add jwt guard`, `add: minio oss storage`); descriptions may be in English or Chinese
- Keep commits scoped to one change; describe what and why, and link related issues
- Update `docs/` and `.env.example` when behavior or configuration changes
