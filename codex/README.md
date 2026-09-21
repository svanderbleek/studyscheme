# PlayProver

A Proof Blocks game with a public proof collection and a private admin studio. Players drag blocks into an argument and receive feedback based on logical prerequisites. Independent steps can appear in different orders; blocks within a case must stay together.

## Run locally

Requires Node.js 24 or newer.

```sh
npm install
cp .env.example .env
npm start
```

Open http://localhost:3000. The two supplied example proofs are available immediately, without an API key. Anonymous progress is saved in the browser.

To enable the studio, set `ADMIN_PASSWORD` in `.env` to a password of at least 12 characters and restart. Visit http://localhost:3000/admin directly; the public site does not link to it. Set `OPENAI_API_KEY` to enable AI draft generation. Keep `.env` private.

## Create and publish a proof

1. Sign in at `/admin` and enter a proof name and mathematical description, including assumptions and domains.
2. Generate a draft. Review its statement, blocks, and dependencies in the editor, making corrections as needed.
3. Save changes and select **Playtest saved proof**. Arrange the blocks and complete a successful check.
4. Confirm that you reviewed the mathematics, then select **Approve & publish**. The proof now appears in the public collection.

Drafts and rejected proofs are private. Editing a published proof returns it to draft and requires another successful playtest before publication. You can reject a draft or unpublish an approved proof from the editor.

The checker validates ordering against the authored dependency graph; it does not independently verify mathematical truth. Admin review is required for AI-generated mathematics. The current format supports required blocks and non-nested subproof groups, without distractors.

## Cost and storage

Playing and checking proofs make no AI requests. Generation makes one request per draft, caps output at 6,000 tokens, and does not automatically retry. There is no daily generation cap; the admin controls generation volume. `OPENAI_MODEL` selects the generation model.

Proofs, admin sessions, and generation counts persist in SQLite at `data/playprover.sqlite` by default. `DATABASE_PATH` overrides this location. Back up the database using a SQLite-aware backup or stop the app before copying it. Keep the data directory on persistent storage when hosting.

The app serves its JavaScript, styles, and math fonts locally. It uses Node's HTTP server and SQLite support, plus KaTeX for mathematical notation.

## Hosting configuration

Set `APP_ORIGIN` to the exact browser origin, including scheme and port when applicable. Its default example value assumes you open `http://localhost:3000`. Set `COOKIE_SECURE=true` when serving through HTTPS, and configure your reverse proxy accordingly. `HOST` defaults to `127.0.0.1`; use the appropriate bind address for your hosting environment. Run one app process per database so the in-process generation lock and sign-in limits apply consistently.

## Verification

```sh
npm test
npm run test:browser
```

Browser tests use installed Google Chrome by default. To use Playwright Chromium, install it with `npx playwright install chromium` and run `PLAYWRIGHT_CHANNEL=chromium npm run test:browser`. Tests start an isolated server with an in-memory database and simulated AI responses; they do not incur AI charges.
