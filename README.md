# CarManagement

Προσωπική web εφαρμογή για ολοκληρωμένη διαχείριση οχήματος, με καταγραφή χιλιομέτρων, καυσίμων, service, εξόδων, υπενθυμίσεων, εγγράφων, maintenance intervals, analytics και συνολικής κατάστασης οχήματος.

Η εφαρμογή έχει υλοποιηθεί με **React + TypeScript + Vite** και χρησιμοποιεί **Supabase** για Authentication, PostgreSQL database και Storage.

---

## Project Information

- **Project name:** CarManagement
- **Frontend:** React
- **Language:** TypeScript
- **Build tool:** Vite
- **Backend / Database:** Supabase
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Database:** PostgreSQL
- **Icons:** lucide-react

---


## Main Vehicle

Η εφαρμογή είναι αυτή τη στιγμή διαμορφωμένη με κύριο όχημα:

- **Name:** FORD FIESTA 2002
- **Make:** FORD
- **Model:** FIESTA
- **Year:** 2002
- **License plate:** ZMM4136
- **Vehicle ID:** `ae0e7cc5-8028-4480-ac81-99871a670c92`

---

## Main Features

Η εφαρμογή περιλαμβάνει τις παρακάτω βασικές λειτουργίες.

### Dashboard

Κεντρική εικόνα του οχήματος με:

- τρέχον οδόμετρο
- συνολικό κόστος έτους
- Vehicle Health
- υπενθυμίσεις
- πρόσφατη δραστηριότητα
- σύνοψη καυσίμων
- προειδοποιήσεις / alerts

### Quick Add

Γρήγορη καταχώρηση για:

- Fuel
- Service / Repair
- Expense
- Reminder
- Odometer

### History

Ενοποιημένο ιστορικό συμβάντων του οχήματος με Timeline και Table view.

### Fuel

Καταγραφή ανεφοδιασμών με ημερομηνία, οδόμετρο, τύπο καυσίμου, ποσό, τιμή ανά λίτρο, λίτρα, full tank και σημειώσεις.

### Service

Καταγραφή service και επισκευών με service records, service items, labor cost, parts cost, other cost, maintenance events και σύνδεση με οδόμετρο.

### Vehicle Health

Παρακολούθηση προγραμματισμένης συντήρησης με maintenance items, intervals σε km/μήνες, warning thresholds και καταστάσεις όπως OK, Approaching, Soon, Overdue και Unknown.

### Expenses

Καταγραφή γενικών εξόδων του οχήματος με κατηγορία, ημερομηνία, ποσό, περιγραφή και σημειώσεις.

### Reminders

Υποστήριξη υπενθυμίσεων βάσει ημερομηνίας ή χιλιομέτρων, με priority, status, recurrence και snooze.

### Notifications

Notification center στο top bar για ενεργές υπενθυμίσεις, προθεσμίες και ληγμένα/επικείμενα έγγραφα.

### Analytics

Σελίδα στατιστικών και συγκεντρωτικών δεδομένων του οχήματος.

### Documents

Διαχείριση εγγράφων οχήματος με upload, open, archive, ημερομηνία εγγράφου, ημερομηνία λήξης, κατηγορία και σημειώσεις.

Private Supabase Storage bucket:

`vehicle-documents`

### Vehicle

Σελίδα με τα βασικά στοιχεία του οχήματος.

### Settings

Υποστηρίζονται:

- Language: EL / EN
- Theme: System / Light / Dark
- Currency
- Distance unit: km / mi
- Fuel consumption unit
- Pressure unit
- Default history view
- Dashboard preferences
- Notification preferences
- Data quality preferences

---

## Database

Η εφαρμογή χρησιμοποιεί Supabase PostgreSQL.

Βασικοί πίνακες:

- `user_settings`
- `vehicles`
- `odometer_entries`
- `fuel_stations`
- `fuel_entries`
- `workshops`
- `service_records`
- `service_items`
- `expense_categories`
- `expenses`
- `maintenance_items`
- `maintenance_events`
- `vehicle_issues`
- `reminders`
- `documents`
- `document_links`
- `import_batches`
- `import_rows`

### Database Views

- `current_vehicle_odometer`
- `vehicle_cost_entries`
- `vehicle_maintenance_status`
- `vehicle_health_summary`

Η βάση χρησιμοποιεί foreign keys, validation constraints, indexes, triggers και Row Level Security (RLS).

---

## Authentication

Το login γίνεται μέσω Supabase Auth και το session διαχειρίζεται από το Supabase SDK.

---

## Environment Variables

Δημιούργησε αρχείο `.env.local`:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Η εφαρμογή πρέπει να χρησιμοποιεί **Publishable / Anon key** στο frontend.

**Μην χρησιμοποιήσεις Supabase Secret Key ή Service Role Key μέσα στο frontend.**

---

## Local Development

### Requirements

- Node.js
- npm
- ενεργό Supabase project

### Installation

```bash
npm install
```

### Start Development Server

```bash
npm run dev
```

Η εφαρμογή τρέχει συνήθως στο:

```text
http://localhost:5173/
```

---

## Production Build

```bash
npm run build
```

Το production build δημιουργείται στον φάκελο:

```text
dist/
```

Το project έχει ήδη ελεγχθεί με επιτυχημένο TypeScript + Vite production build. Υπάρχει μόνο μη κρίσιμο Vite warning για JavaScript chunk μεγαλύτερο από 500 kB.

---

## Deployment Notes

Η εφαρμογή μπορεί να γίνει deploy ως static Vite SPA.

Στο deployment environment πρέπει να υπάρχουν:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Επειδή η εφαρμογή χρησιμοποιεί client-side routing, ο web server πρέπει να κάνει SPA fallback προς `/index.html`.

Μετά το deployment πρέπει επίσης να ελεγχθούν στο Supabase Auth:

- Site URL
- Redirect URLs

ώστε να περιλαμβάνουν το production domain.

---

## Storage

Bucket:

```text
vehicle-documents
```

Χρησιμοποιείται για private αποθήκευση εγγράφων οχημάτων και προστατεύεται μέσω Supabase policies / RLS.

---

## Data State

Μετά το development/testing έγινε καθαρισμός των test δεδομένων.

Παρέμεινε μόνο το πραγματικό όχημα:

`FORD FIESTA 2002`

Τα test δεδομένα από fuel, service, expenses, reminders, documents, maintenance και odometer διαγράφηκαν πριν την πραγματική χρήση.

---

## Project Structure

```text
src/
├── components/
│   ├── AppLayout.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   └── QuickAddModal.tsx
│
├── features/
│   ├── dashboard/
│   ├── expenses/
│   ├── fuel/
│   ├── maintenance/
│   ├── notifications/
│   ├── reminders/
│   ├── service/
│   ├── settings/
│   └── vehicles/
│
├── lib/
│   └── supabase.ts
│
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── HistoryPage.tsx
│   ├── FuelPage.tsx
│   ├── ServicePage.tsx
│   ├── VehicleHealthPage.tsx
│   ├── ExpensesPage.tsx
│   ├── RemindersPage.tsx
│   ├── AnalyticsPage.tsx
│   ├── DocumentsPage.tsx
│   ├── VehiclePage.tsx
│   └── SettingsPage.tsx
│
└── main.tsx
```

---

## Current Status

Η βασική εφαρμογή έχει ολοκληρωθεί λειτουργικά.

Έχουν ελεγχθεί:

- Login
- Dashboard
- Quick Add
- History
- Fuel
- Service
- Vehicle Health
- Expenses
- Reminders
- Analytics
- Documents
- Vehicle
- Settings
- Notifications
- Production build

Το επόμενο στάδιο είναι production deployment και εισαγωγή πραγματικών δεδομένων χρήσης.

---

## Important Security Notes

- Μην ανεβάζεις `.env.local` σε Git.
- Μην χρησιμοποιείς Supabase Secret / Service Role key στο frontend.
- Αν το repository γίνει public, αφαίρεσε άμεσα τα credentials από αυτό το README.
- Αν credentials έχουν ήδη ανέβει δημόσια σε Git history, θεωρούνται εκτεθειμένα και πρέπει να αλλαχθούν.
- Το database password και το default-user password πρέπει ιδανικά να αποθηκεύονται σε password manager και όχι σε public repository.

---

## License

Private personal project.
