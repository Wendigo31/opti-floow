# OptiFlow - Line Optimizer

Application professionnelle de pilotage de rentabilité pour les entreprises de transport routier.

## 🚀 Build de l'application Tauri

### Prérequis

1. **Rust** - Installez Rust via [rustup](https://rustup.rs/)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js** - Version 18+ recommandée

3. **Dépendances système** (Linux uniquement) :
   ```bash
   sudo apt-get update
   sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev
   ```

### Installation

```bash
# Installer les dépendances
npm install

# Installer le CLI Tauri
npm install -g @tauri-apps/cli
```

### Développement

```bash
# Lancer l'application en mode développement
npm run tauri dev
```

### Build de production

```bash
# Construire l'exécutable portable
npm run tauri build
```

L'exécutable sera généré dans `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` (installateur) et `.exe` (portable)
- **macOS**: `.dmg` et `.app`
- **Linux**: `.deb`, `.rpm`, et `.AppImage`

### Configuration des icônes

Pour générer les icônes dans les bonnes tailles, utilisez l'outil officiel Tauri :
```bash
npx @tauri-apps/cli icon src/assets/optiflow-icon.png
```

Cela générera automatiquement toutes les icônes nécessaires dans `src-tauri/icons/`.

## 📦 Structure du projet

```
├── src/                    # Code source React/TypeScript
├── src-tauri/             # Configuration Tauri
│   ├── Cargo.toml         # Dépendances Rust
│   ├── tauri.conf.json    # Configuration Tauri
│   ├── src/               # Code Rust
│   └── icons/             # Icônes de l'application
├── public/                # Assets statiques
└── index.html             # Point d'entrée
```

## 🔧 Scripts disponibles

- `npm run dev` - Serveur de développement web
- `npm run build` - Build de production web
- `npm run tauri dev` - Application desktop en développement
- `npm run tauri build` - Build de production desktop

## 📄 Licence

© 2024 OptiFlow - Tous droits réservés
