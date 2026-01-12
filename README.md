# SafeGuard for Kids 🛡️

SafeGuard is a societal protection system designed to keep children safe online. It combines a **local web dashboard** with a **browser extension** to automatically detect and block inapropriate content in real-time.

## Features
- **3-Layer Detection**: Blacklist, Keyword Filter, Google Safe Browsing API.
- **Auto-Guard Extension**: Automatically checks every visited site.
- **Real-time Blocking**: Immediate redirection to a safe warning screen.

## Project Structure
- `/web-app`: Node.js Express server + Frontend Dashboard.
- `/extension`: Chrome/Edge extension (Manifest V3).

## Setup
### 1. Web App
```bash
cd web-app
npm install
npm start
```
Runs on `http://localhost:3000`.

### 2. Extension
1. Go to `chrome://extensions`
2. Enable Developer Mode.
3. "Load unpacked" -> Select `/extension` folder.
