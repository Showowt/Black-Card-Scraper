# MachineMind Sales Platform - Deployment Guide

## 🚀 Quick Start for Replit

### Step 1: Upload Files
Upload these files to your Replit:
- `api.py` - Flask API server
- `database.py` - Database layer with all business logic
- `index.html` - Frontend application
- `app.js` - JavaScript application code
- `requirements.txt` - Python dependencies
- `.replit` - Replit configuration
- `replit.nix` - Nix environment

### Step 2: Run
Click the "Run" button. The server will:
1. Install dependencies automatically
2. Create the SQLite database
3. Initialize default users
4. Start on port 5000 (mapped to port 80)

### Step 3: Login
Open the web URL provided by Replit and login with:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@machinemind.co | admin123 |
| **Manager** | sergio@machinemind.co | sergio123 |
| **Rep** | rep@machinemind.co | rep123 |

---

## 🔐 SCAN PROTECTION CODE

**Default Code: `SCAN2024`**

The scan feature uses paid Google Places API. To prevent accidental charges:
- Only admins can run scans
- A confirmation code is required
- Change the code in Admin → Costs → Scan Confirmation Code

---

## ✅ Complete Feature Checklist

### USER MANAGEMENT
- [x] Multi-role system (Admin, Manager, Rep)
- [x] Secure login with session tokens
- [x] Role-based permissions
- [x] User creation/management (admin only)
- [x] Permission customization per user
- [x] Activity logging

### PROSPECT MANAGEMENT
- [x] Create/edit/delete prospects
- [x] Business info (name, phone, email, city, type)
- [x] Deal stage tracking (lead → won/lost)
- [x] Deal score (0-100)
- [x] Visibility rules (reps see own, admin sees all)
- [x] Search and filter
- [x] Follow-up date tracking

### GENOME PROTOCOL™ (Buyer Intelligence)
- [x] Buyer type capture (Analytical, Driver, Expressive, Amiable)
- [x] Urgency level (Bleeding, Urgent, Planning, Browsing)
- [x] Authority detection (Sole, Influencer, Gatekeeper)
- [x] Budget signals (Flexible, Price-first, Constrained)
- [x] Pain points capture
- [x] Objection tracking with resolution
- [x] Auto-calculated deal scores

### CALL COMPANION
- [x] WhatsApp integration (one-tap to call)
- [x] Direct phone call option
- [x] Call timer
- [x] One-tap signal capture during calls
- [x] Objection logging with categories
- [x] Call outcome tracking (Interested, Callback, Not Now, No Answer)
- [x] Notes and next steps
- [x] Follow-up date scheduling
- [x] AI closing strategy generator

### SCRIPTS MANAGEMENT
- [x] Pre-built sales scripts
- [x] Categories (WhatsApp, Cold Call, Objection, Closing)
- [x] Quick copy to clipboard
- [x] Admin script management

### ANALYTICS DASHBOARD
- [x] Total prospects count
- [x] Calls made today
- [x] Hot prospects (score 70+)
- [x] Pipeline by stage
- [x] Rep leaderboard
- [x] Follow-ups due today

### ADMIN PANEL
- [x] User management
- [x] Permission control
- [x] Settings configuration
- [x] Script management
- [x] Lead scanner (with code protection)
- [x] Cost controls and limits
- [x] System monitoring

### COST CONTROLS
- [x] Daily spending limits
- [x] Monthly spending limits
- [x] Scan confirmation code
- [x] Cost history tracking
- [x] Admin-only access to paid features

### SECURITY
- [x] JWT-style session tokens
- [x] Role-based access control
- [x] Admin-only operations enforced at multiple levels
- [x] Scan code protection
- [x] Request logging
- [x] Error tracking

### REAL-TIME FEATURES
- [x] Auto-sync every 30 seconds
- [x] Settings broadcast
- [x] Prospect updates sync

---

## 📱 Mobile Optimized

The Call tab is fully mobile-optimized:
- Large touch targets
- One-tap signal capture
- Swipe-friendly interface
- Works as a companion while on WhatsApp calls

---

## 🔧 Customization

### Change Scan Code
1. Login as Admin
2. Go to Admin → Costs
3. Enter new code in "Scan Confirmation Code"
4. Click "Update Code"

### Add New Users
1. Login as Admin
2. Go to Admin → Users
3. Fill in email, name, password
4. Select role
5. Click "Create User"

### Customize Permissions
1. Login as Admin
2. Go to Admin → Permissions
3. Select user
4. Toggle permissions on/off
5. Click "Save Permissions"

---

## 🗄️ Database

The platform uses SQLite with these tables:
- `users` - User accounts and permissions
- `sessions` - Active login sessions
- `prospects` - Business prospects
- `calls` - Call logs
- `scripts` - Sales scripts
- `settings` - System settings
- `activity_log` - User actions
- `daily_stats` - Daily metrics
- `api_logs` - API request logs
- `error_logs` - Error tracking
- `api_costs` - API cost tracking
- `scan_history` - Lead scan history
- `cost_limits` - Spending limits

---

## 🆘 Troubleshooting

### "Invalid confirmation code"
Enter the correct scan code (default: SCAN2024)

### Rep can't see prospects
Prospects are only visible to creator or assigned user. Admin can see all.

### Scan fails
- Verify you're logged in as Admin
- Check the confirmation code
- Ensure cost limits aren't exceeded

### Database reset
Delete `machinemind_sales.db` and restart. Default users will be recreated.

---

## 📞 Support

Platform built by MachineMind for Colombian hospitality sales teams.
