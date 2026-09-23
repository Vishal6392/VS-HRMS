# VS HRMS - Modern Attendance & Shift Management Web Application

Production-ready, responsive web application for internal employee attendance, break tracking, shift management, location verification, and live camera photo audit.

---

## 🌟 Key Features

1. **Role-Based Access**:
   - **Employee**: Mobile-first dashboard, today's shift card, one-touch punch, live duration counters, break management, personal attendance history, break logs, profile & password management.
   - **HR / SuperAdmin**: Desktop-optimized SaaS dashboard, top 7 KPI metrics, live attendance explorer, employee master CRUD, shift master CRUD, attendance audit with Google Maps link & photo verification, reports with export (Excel, CSV, Print), and administrative audit logs.

2. **Shift Engine Architecture**:
   - **General Shift**: Standard daytime schedule with grace period, late detection, and overtime calculation.
   - **Night Shift**: Crosses midnight (e.g. 10:00 PM – 06:00 AM next day). Morning punches correctly associate with shift start date without false absence.
   - **Split Shift**: Two duty segments in one day (e.g. 06:00 AM – 10:00 AM & 06:00 PM – 10:00 PM). Working hours sum both segments; off-duty gap is NOT counted as break.

3. **Multi-Step Punch Verification**:
   - **Step 1**: Automatic HTML5 browser Geolocation capture (`latitude`, `longitude`, `accuracy`).
   - **Step 2**: Device live camera capture using `navigator.mediaDevices.getUserMedia()` (no gallery photo uploads allowed).
   - **Step 3**: Pre-punch confirmation displaying detected time, coordinates, accuracy rating, and selfie preview.
   - **Sequence Guard**: `CHECK_IN` ➔ `BREAK_START` ➔ `BREAK_END` ➔ `CHECK_OUT` strictly enforced.

4. **Audit & Reporting**:
   - Daily Attendance, Monthly Summary, Late Coming, Break Details, Overtime, and Missing Punch reports.
   - One-click export to Excel (`.xlsx`), CSV, and browser print layout.
   - Administrative audit log with before/after payload inspection.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- MongoDB (Optional locally: if `MONGODB_URI` is blank, embedded in-memory MongoDB starts automatically!)

### Installation & Run

1. Clone or open the repository:
   ```bash
   cd "VS HRMS"
   ```

2. Run development servers (concurrently starts backend on port 5000 and Vite frontend on port 5173):
   ```bash
   npm run dev
   ```
   Or separately:
   ```bash
   # Terminal 1: Backend
   npm run dev:server

   # Terminal 2: Frontend
   npm run dev:client
   ```

3. Open your browser:
   ```
   http://localhost:5173
   ```

---

## 🔑 Default Credentials

The system automatically seeds initial admin and test employees on first startup. You can also use the one-click demo login buttons on the login screen:

| Role / Profile | Email | Password | Assigned Shift |
|---|---|---|---|
| **SuperAdmin (HR Lead)** | `admin@hrms.local` | `Admin@123` | General Day Shift |
| **John Doe** | `john@hrms.local` | `Emp@123` | General Day Shift (09:30 - 18:30) |
| **Priya Sharma** | `priya@hrms.local` | `Emp@123` | Night Shift (22:00 - 06:00) |
| **Rahul Verma** | `rahul@hrms.local` | `Emp@123` | Split Shift (06-10 & 18-22) |
| **Anita Desai** | `anita@hrms.local` | `Emp@123` | General Day Shift |

---

## ☁️ Deployment on Render

This repository is pre-configured with `render.yaml` for zero-friction deployment to Render:

1. Push your repository to GitHub / GitLab.
2. In Render Dashboard, click **New +** ➔ **Blueprint** and select your repository.
3. Configure the `MONGODB_URI` environment variable with your MongoDB Atlas connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/vs-hrms?retryWrites=true&w=majority
   ```
4. Render will automatically build the React Vite client into `client/dist` and launch Express to serve both the API and the single-page application.
