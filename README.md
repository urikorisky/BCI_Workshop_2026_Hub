# BCI Workshop 2026 Hub

Cross-platform onboarding installer, hardware-free verifier, and daily classroom launchpad for the **Bar-Ilan University Introduction to Brain-Computer Interface (BCI) Workshop 2026**.

Built with **Tauri v2** (Rust backend + React/TypeScript/Tailwind CSS frontend) for **Windows (`x64`)** and **macOS Universal (`arm64` + `x64`)**, featuring **Hebrew (`RTL`)** by default with instant **English (`LTR`)** toggle.

---

## Repository Structure

```text
Workshop_Hub/
├── manifest.json                 # Dynamic remote config (packages, URLs, notices)
├── src/                          # React + TypeScript + Tailwind bilingual UI
│   ├── api/bridge.ts             # Tauri IPC bridge + Browser Preview fallback
│   ├── i18n/                     # Hebrew (RTL) & English (LTR) dictionaries
│   ├── components/               # Header, PreActionModal, FindArduinoModal, HelpReportModal
│   └── views/                    # SignIn, Onboarding, Diagnostics, Dashboard
├── src-tauri/                    # Rust backend (OAuth PKCE, scanner, installer, diagnostics)
└── .github/workflows/build.yml   # Automated Win + macOS Universal builds & Releases
```

---

## Local UI Preview (No Rust Required)

To preview and test the full bilingual UI (with simulated browser-preview mocks) locally:

```powershell
npm.cmd install
npm.cmd run dev
```

To verify TypeScript compilation and production bundling:

```powershell
npm.cmd run build
```

---

## Configuration Before Releasing

1. **Update `manifest.json`**:
   - Set `urls.gitbook` to your published GitBook space URL.
   - Set `urls.telemetry_endpoint` to your deployed Google Apps Script `/exec` URL.
   - Set `oauth_client_id` to your Google Cloud Desktop OAuth Client ID.
   - *(Optional)* Mirror `ch340_driver`, `ftdi_driver`, etc. into a GitHub Release on this repo and update their direct asset URLs + `sha256` hashes in `manifest.json`.

2. **Add GitHub Repository Secrets** (*Settings → Secrets and variables → Actions*):
   - `GOOGLE_CLIENT_ID` — Desktop OAuth Client ID (`...apps.googleusercontent.com`)
   - `GOOGLE_CLIENT_SECRET` — Desktop OAuth Client Secret
   - *(Optional future code-signing secrets)*: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`, `TAURI_SIGNING_PRIVATE_KEY`

3. **Build & Release via GitHub Actions**:
   - Push to `main` (or run *Actions → Build BCI Workshop Hub → Run workflow*) to generate Windows & macOS artifacts.
   - Tag a release (`git tag v0.1.0 && git push --tags`) to create a GitHub Release with downloadable `.exe`/`.msi` and `.dmg` installers.
