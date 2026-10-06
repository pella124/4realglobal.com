# Firebase setup for 4REAL GLOBAL IT SOLUTION

This project now includes a registration page, Firestore database integration and a Cloud Function for confirmation emails.

## 1. Create Firebase project
Open https://console.firebase.google.com/ and create a project. Add a Web App and copy its configuration into `firebase-config.js`.

## 2. Enable Firestore
Firebase Console -> Build -> Firestore Database -> Create database. Deploy the included rules.

## 3. Install and deploy
Install Node.js 20+ and Firebase CLI, then from this project folder:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
cd functions
npm install
cd ..
firebase deploy --only firestore:rules,functions
```

## 4. Email notification
The browser never receives the SMTP password. The Cloud Function sends an email whenever a new registration is created.

Set secrets:

```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set MAIL_FROM
firebase deploy --only functions
```

For Gmail, use an App Password rather than your normal Gmail password.

## 5. Local website
Because the registration page uses ES modules and `fetch`, run it through a local server. In VS Code use Live Server, or:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500/register.html`.

## 6. Firestore collection
Registrations are stored in:

`registrations/{documentId}`

Fields: firstName, surname, email, phone, institutionType, institution, department, program, previousStack, reason, registrationNumber, status, createdAt.

## 7. WhatsApp
The registration page uses this group:
https://chat.whatsapp.com/D77oIhaLk0EKWH7ESaAJaw

## Institution data
`institutions.json` contains a substantial starter list. Nigeria's approved institution lists change, so refresh this dataset before production launch using the current NUC and NBTE directories.
