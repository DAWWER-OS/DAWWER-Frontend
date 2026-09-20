# Dawwer (دوّر) - Smart In-Store Retail & Inventory Management Platform

[![Platform](https://img.shields.io/badge/Platform-Dawwer%20OS-1c5335.svg)](https://dawwer.runasp.net)
[![Architecture](https://img.shields.io/badge/Architecture-Single%20Page%20Multi--View%20SPA-blue.svg)](#project-architecture)
[![UI Framework](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v3-38bdf8.svg)](https://tailwindcss.com)
[![Language](https://img.shields.io/badge/Language-Vanilla%20JavaScript%20(ES6+)-f7df1e.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Design](https://img.shields.io/badge/Direction-RTL%20Arabic%20First-d6a950.svg)](#key-features)
[![Backend API](https://img.shields.io/badge/Backend%20API-ASP.NET%20Core%208.0%20%2F%20PostgreSQL-512bd4.svg)](API_DOCUMENTATION.md)

**Dawwer (دوّر)** is an enterprise retail operations and in-store indoor navigation platform designed to bridge ِphysical retail stores with digital inventory discovery. It provides merchants with tools to digitize physical aisle and shelf layouts, streamline staff role-based access control, manage orders and product catalogs, and submit verified merchant applications—accompanied by a centralized administrative control center for platform governance, category taxonomy tree management, and security audit logging.

---

## 🛠️ Tech Stack Overview

| Layer | Technology | Purpose & Details |
|---|---|---|
| **Frontend Core** | **HTML5 & Vanilla JavaScript (ES6+)** | Lightweight, framework-free client architecture with modular object namespaces (`ApiClient`, `Auth`, `CONFIG`, `Layout`). |
| **Typography & RTL** | **Google Fonts (`Tajawal`) & Native RTL** | Arabic-first Right-to-Left design optimized for regional usability and clarity. |
| **Styling Engine** | **Tailwind CSS v3 (Standalone Engine)** | Dynamic utility classes with custom brand color extensions (`#1c5335` primary, `#143e27` dark, `#edf5f0` soft, `#d6a950` accent). |
| **Authentication** | **JWT Bearer + Token Rotation** | Dual token strategy (Access Token + Refresh Token) with automatic `401 Unauthorized` interception and silent renewal. |
| **Authorization** | **Fine-Grained RBAC & Store Contexts** | Multi-tenant store context switching (`/api/Auth/select-store`) and declarative UI trimming via `data-require-role` and `data-require-perm`. |
| **Backend API** | **ASP.NET Core Web API (RESTful)** | Production endpoint hosted at `https://dawwer.runasp.net/api` with standardized `ApiResponse<T>` envelopes. |
| **Database** | **PostgreSQL (Connected to Web API)** | Relational backend data store powering multi-tenant retail records and immutable security audit trails. |

---

## ✨ Key Features

### 1. In-Store Navigation & Shelf Mapping (`shelves.html`)
- **Aisle & Shelf Grid System**: Visual organization of in-store layout mapping (e.g., Aisle A1, A2, Shelves F1-F4).
- **Product Location Tracking**: Link products to exact aisle coordinates and physical shelf identifiers for rapid customer discovery and staff fulfillment.
- **Dynamic Filtering & Search**: Instant client-side search by aisle name, shelf code, or assigned category with live product counts.

### 2. Merchant Store Lifecycle & Verification (`merchant-application.html`)
- **Step-by-Step Onboarding**: Draft, update, and submit store registration profiles.
- **Document Verification Flow**: Multipart file upload (`multipart/form-data`) supporting Commercial Registers, Tax Cards, Store Licenses, and Identity Documents.
- **Verification Status Engine**: Real-time lifecycle tracking across `Draft`, `Submitted`, `UnderReview`, `NeedsInformation`, `Approved`, and `Rejected`.

### 3. Role-Based Access Control (RBAC) & Staff Hierarchy (`store-staff.html`)
- **Store-Scoped Staff Management**: Invite employees, assign operational roles, and enforce fine-grained permissions (`Products.Manage`, `Inventory.Manage`, `Orders.Manage`, `Staff.Manage`, etc.).
- **Custom Role Builder**: Create bespoke store roles tailored to dispatchers, stockers, or shift managers.
- **Client Route Guards & DOM Trimming**: Strict head-level script checks (`Auth.requireAuth()`) and dynamic component removal for unauthorized elements.

### 4. Product Catalog & Inventory (`products.html`, `add-product.html`)
- **Product Management**: Multi-attribute product creation including barcodes, SKU, pricing, stock levels, category relations, and physical shelf assignments.
- **Stock Status Badges**: Visual indicators for in-stock, low-stock, and out-of-stock inventory thresholds.

### 5. Order Management & Fulfillment (`orders.html`)
- **Live Orders Feed**: Filter customer orders across `Pending`, `Processing`, `Shipped`, `Delivered`, and `Cancelled`.
- **Fulfillment Operations**: Update order status, track order line-items, and handle dispatching workflows.

### 6. Central Platform Administration Console (`admin-dashboard.html`)
- **Store Application Moderation Queue**: Inspect submitted business documents, initiate reviews, approve applications, request supplementary information, or issue rejections.
- **User Governance & Suspension**: Global user directory with instant account suspension/reactivation capabilities and session termination.
- **Hierarchical Taxonomy Tree**: Manage multi-level category and subcategory trees with live reordering and slug generation.
- **Security Audit Logs**: Paginated, filterable event stream of all administrative modifications, user actions, and state changes.

### 7. Resilient Authentication Suite
- **Universal Auth Flows**: Registration, 6-digit OTP verification code confirmation (`verify-account.html`), login, password recovery (`forgot-password.html`), and password reset (`reset-password.html`).
- **Dedicated Admin Login**: Isolated operator entry point (`admin-login.html`) with direct role validation against `CONFIG.ROLES.ADMIN`.

---

## 📂 Project Architecture & Directory Structure

```text
dawwer/
├── assets/
│   ├── css/
│   │   └── tailwind.min.js       # Standalone Tailwind CSS v3 client runtime & configuration
│   ├── images/
│   │   └── FrameLogo.png         # Official Dawwer brand identity & logo asset
│   └── js/
│       ├── api.js                # Universal HTTP client (JWT injection, 401 refresh, multipart uploads)
│       ├── auth.js               # Auth session management, RBAC checks, route guards & store selector
│       ├── config.js             # Global environment config, API URLs, user roles & permission constants
│       └── layout.js             # Shared layout controller, mobile sidebar drawer & dynamic badge renderer
├── index.html                    # Merchant operations dashboard & store KPI overview
├── merchant-application.html     # Store onboarding wizard & legal document verification submission
├── store-staff.html              # Multi-user staff directory, permission matrix & custom role creator
├── products.html                 # Product inventory table with search, stock counts & shelf links
├── add-product.html              # Product creation form with category tree & physical shelf assignment
├── orders.html                   # Order fulfillment manager with lifecycle status tracking
├── shelves.html                  # Visual in-store aisle & shelf layout mapping interface
├── profile.html                  # User profile settings, contact info updates & password change
├── login.html                    # Universal authentication portal (Merchants, Staff, Customers)
├── register.html                 # New user registration portal
├── verify-account.html           # 6-digit OTP verification & account activation screen
├── forgot-password.html          # Password reset email request form
├── reset-password.html           # Password reset token confirmation & new password form
├── admin-login.html              # Isolated secure login gateway for Platform Administrators
├── admin-dashboard.html          # Central administration hub (Stores, Users, Categories, Audit Logs)
├── API_DOCUMENTATION.md          # Machine-readable REST API reference & payload contracts
└── README.md                     # Comprehensive project documentation
```

---

## ⚙️ Prerequisites & Environment Setup

Because Dawwer is built with vanilla modern web technologies, it requires **zero external build tools** (no Node.js compiler or Webpack bundle step is mandatory to run the frontend). However, to serve the HTML pages with proper browser security headers and enable clean CORS/fetch operations, a local HTTP server is recommended.

### Requirements:
- **Web Browser**: Any modern browser supporting ES6+ (Google Chrome 90+, Microsoft Edge 90+, Mozilla Firefox 88+, Safari 14+).
- **Local HTTP Server** *(pick any one)*:
  - Python 3.8+ (built-in `http.server`)
  - Node.js 18+ (`npx serve` or `npx http-server`)
  - VS Code Extension: *Live Server* (`ritwickdey.liveserver`)
  - Caddy / Nginx / Apache

### Environment Configuration (`assets/js/config.js`):
The application connects to the central REST API configured in `assets/js/config.js`:

```javascript
const CONFIG = {
  // Production / Staging API Base
  API_BASE_URL: "https://dawwer.runasp.net/api",

  // Local Backend Development Override (uncomment when running local API)
  // API_BASE_URL: "https://localhost:7212/api",

  TOKEN_KEY: "dawwer_access_token",
  REFRESH_TOKEN_KEY: "dawwer_refresh_token",
  USER_KEY: "dawwer_user_data",
  STORE_TOKEN_KEY: "dawwer_store_token",
  ACTIVE_STORE_KEY: "dawwer_active_store",
  // ...
};
```

---

## 🚀 Installation & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/DAWWER-OS/DAWWER-Frontend.git
cd dawwer
```

### 2. Start a Local Development Server

Choose your preferred environment:

#### Option A: Using Python (Zero Installation)
```bash
# Python 3
python -m http.server 3000

# or Python 2
python -m SimpleHTTPServer 3000
```

#### Option B: Using Node.js
```bash
# Run instantly with npx without global install
npx serve -l 3000 .
# or
npx http-server -p 3000 -c-1
```

#### Option C: Using VS Code Live Server
1. Open the repository root folder in **VS Code**.
2. Right-click on `index.html` or `login.html`.
3. Click **"Open with Live Server"**.

### 3. Open in Browser
Navigate to:
```text
http://localhost:3000/login.html
```
For Admin Operations:
```text
http://localhost:3000/admin-login.html
```

---

## 📋 Available Commands & Scripts

| Command | Environment | Description |
|---|---|---|
| `python -m http.server 3000` | Python | Starts a lightweight zero-dependency local web server on port 3000. |
| `npx serve . -l 3000` | Node.js | Launches static file server with single command. |
| `npx http-server -p 3000 -c-1` | Node.js | Launches server with browser caching disabled (`-c-1`) for instant live edits. |
| `npx prettier --write "**/*.{html,js,css,md}"` | Node.js | Formats all HTML, JS, and Markdown files across the codebase. |

---

## 🔌 API & Integration Architecture

The frontend communicates with the backend via the unified `ApiClient` located in `assets/js/api.js`.

### 1. Standard Response Handling (`ApiResponse<T>`)
Every request automatically validates the standard backend envelope:
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": { ... },
  "errors": null
}
```

### 2. Automatic JWT Injection & Store Context
When a merchant selects a store, `Auth.selectStore(storeId)` requests a store-scoped token and stores it in `localStorage`. `ApiClient` automatically injects this active token into the `Authorization` header:

```javascript
// Making an authenticated GET request
try {
  const response = await ApiClient.get("/merchant/stores");
  console.log("Merchant Stores:", response.data);
} catch (error) {
  console.error("Fetch failed:", error.message);
}
```

### 3. Automatic 401 Interception & Refresh Flow
If an access token expires mid-session, `ApiClient.request()` intercepts the `401 Unauthorized` status, calls `POST /api/Auth/refresh-token` with the refresh token, updates storage, and retries the original request seamlessly.

### 4. Uploading Store Legal Documents (Multipart Form-Data)
```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);
formData.append("documentType", CONFIG.DOCUMENT_TYPES.COMMERCIAL_REGISTER); // 1

const result = await ApiClient.upload(`/merchant/stores/${storeId}/documents`, formData);
console.log("Uploaded Document ID:", result.data.id);
```

For complete endpoint specifications, JSON request/response schemas, and role matrices, refer to [API_DOCUMENTATION.md](file:///c:/Users/admin/Desktop/dawwer/API_DOCUMENTATION.md).

---

## 🔒 Security & Role-Based Access Control (RBAC)

### User Roles (`CONFIG.ROLES`)
1. **Customer (`1`)**: Public catalog browsing, order placement, and profile management.
2. **Merchant (`2`)**: Store onboarding, document uploads, product creation, shelf mapping, and staff assignment.
3. **Staff (`3`)**: Store-assigned personnel operating under fine-grained permissions (`StorePermissions`).
4. **Admin (`4`)**: Global platform governance, store approval queue, category tree control, and audit logs.

### Route Guard Usage
Protect any page by specifying authorized roles at the top of the `<head>` section:
```html
<script src="assets/js/config.js"></script>
<script src="assets/js/api.js"></script>
<script src="assets/js/auth.js"></script>
<script>
  // Enforce Merchant & Admin access only
  Auth.requireAuth(["Merchant", 2, "Admin", 4]);
</script>
```

### Declarative UI Element Trimming
Hide elements automatically from unauthorized users using HTML attributes:
```html
<!-- Visible only to users with the Admin role -->
<button data-require-role="Admin">حذف المتجر</button>

<!-- Visible only to staff with the Products.Manage permission -->
<a href="add-product.html" data-require-perm="Products.Manage">+ إضافة منتج</a>
```

---

## 🤝 Contribution Guidelines

1. **Fork & Branch**: Create a descriptive feature branch (`git checkout -b feature/in-store-ar-navigation`).
2. **Coding Standards**:
   - Maintain pure vanilla JavaScript with clear separation of concerns.
   - Adhere to the established RTL and Arabic naming conventions for UI labels.
   - Use Tailwind utility classes matching the brand palette defined in `tailwind.config`.
3. **Test Local API Endpoints**: Ensure changes work against `https://dawwer.runasp.net/api` or a local ASP.NET Core backend instance.
4. **Submit Pull Request**: Open a PR with a clear summary of changes, linked issues, and screenshots of UI modifications.

---

## 📄 License & Attribution

This project is proprietary and confidential under the **Dawwer Platform Ecosystem**. All rights reserved.

&copy; 2026 **Dawwer Platform (منصة دوّر)**. Developed for modern retail excellence.
