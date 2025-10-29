# acin-incubator-teams

An Electron application with React and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### Automatic updates

- Electron auto-updates are handled via `electron-updater` and the `electron-builder` `publish` configuration (currently pointing to `https://example.com/auto-updates`). Replace this URL with the endpoint hosting your `.yml` feed and release artefacts.
- During development you can place a `dev-app-update.yml` file at the project root to test updates against a local server.
- At runtime the main process checks for updates on launch, downloads them automatically, and installs them right after the download finishes. The Control Panel shows the current update status and download progress.
