# Alkansiya Tracker — Glass Edition with Login & Register

## What's included
- Glassmorphism responsive dashboard
- Register and log in using an email and password
- Passwords are hashed in the browser using PBKDF2 before storage
- Log out and restore the session on refresh
- Separate Personal and Family wallets for each browser account
- Deposits, withdrawals, balance validation, savings goals, history, and 7-day chart

## Run in GitHub Codespaces
1. Upload the project files to your GitHub repository.
2. Open **Code → Codespaces → Create codespace on main**.
3. In the terminal run:

   ```bash
   python3 -m http.server 5500
   ```

4. Open the **Ports** tab and open port `5500` in your browser.

## Important security and syncing limitation
This is a front-end starter login. Account records and wallet data are saved in that browser's `localStorage`; password hashes are stored instead of plain-text passwords, but this is **not production-grade authentication**. It does not provide server-side identity verification, password reset, secure cross-device sessions, cloud backup, or shared live family data. Anyone with access to the browser's local storage may be able to tamper with local data.

For a real public app, connect Supabase Authentication and a database with Row Level Security. Never use this local-only login as the security boundary for real financial or sensitive data.
