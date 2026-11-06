# Alkansiya Tracker — Glass Edition

A responsive personal + family alkansiya tracker with a glassmorphism interface.

## Features
- Switch between Personal and Family wallets
- Record deposits and withdrawals
- Prevent withdrawals that exceed the current balance
- Create savings goals and track progress
- View transaction history and filter by type
- Dashboard totals and a 7-day deposit activity chart
- Saves data in the browser using `localStorage`
- Responsive layout for desktop and mobile

## Run in GitHub Codespaces
1. Create a GitHub repository named `alkansiya-tracker`.
2. Upload these project files to the repository.
3. Open the repository and choose **Code → Codespaces → Create codespace**.
4. In the Codespaces terminal, run:

   ```bash
   python3 -m http.server 5500
   ```

5. Open the **Ports** tab, find port `5500`, and click the forwarded address.

## Important data note
This starter version stores data in the browser on the device/browser where it is used. It does not yet have online accounts, a database, or automatic syncing between family members. For shared live access, the next upgrade should add authentication and a cloud database such as Supabase.

## Project files
- `index.html` — page structure and dialogs
- `style.css` — glassmorphism styling and responsive layout
- `app.js` — wallet logic, validation, dashboard rendering, and local storage
