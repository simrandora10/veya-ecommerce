# 🌸 VEYA E-Commerce Website

A full-stack skincare and beauty e-commerce platform **VEYA**, built using **Django REST Framework** for the backend and **React.js** for the frontend.  
The project focuses on delivering a clean UI, smooth shopping experience, and secure backend APIs.

---

## ✨ Project Overview

This project is designed as a modern e-commerce application where users can browse beauty and skincare products, manage their cart, and place orders securely.  
It follows a clean separation between frontend and backend and uses industry-standard tools and practices.

---

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- React Router
- Context API (State Management)

### Backend
- Python
- Django REST Framework
- PostgreSQL

### Integrations
- Razorpay (Payment Gateway)
- Cloudinary (Image Uploads)

### Deployment
- Frontend: Vercel
- Backend: Render

---

## 🌿 Features

### 🛍️ E-Commerce Features
- Product catalog with categories:
  - Skin
  - Body
  - Hair
  - Fragrances
  - Gifting
- Product search and filtering
- Product detail pages
- Shopping cart functionality
- Secure checkout with Razorpay
- User authentication (Register / Login)
- Order management

### 👤 User Features
- User registration and login
- Email & mobile OTP verification
- View order history
- Manage cart items

---

## ⚙️ Setup Instructions

### 🔹 Backend Setup

1. Navigate to the backend directory:
```bash
cd backend



Create and activate a virtual environment:
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate


Install dependencies:
pip install -r requirements.txt


Create a .env file inside the backend directory:
SECRET_KEY=your-secret-key
DEBUG=True

DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
# VEYA — E-Commerce Web Application

This repository contains a full-stack e-commerce application built with a React frontend and a Django REST backend. The project demonstrates core e-commerce features (product catalog, cart, checkout, orders, user accounts) and includes scripts and configuration to run in local development.

This `README.md` provides a concise, step-by-step guide for setting up, running, testing, and deploying the project on your local machine (Windows) and in production.

---

## Project Summary
- Frontend: React + Tailwind CSS (Single-Page Application)
- Backend: Django + Django REST Framework
- Dev DB: SQLite (default) — Postgres recommended for production
- Optional services: Redis (cache), Celery (async tasks), Stripe/Razorpay (payments)

---

## Prerequisites (Windows)
- Python 3.10+ (install from python.org)
- Node.js 16+ and npm
- Git
- (Optional for production) PostgreSQL

---

## Setup — Backend (Windows)
Open PowerShell and run these commands from the repository root.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create a `.env` or set environment variables for sensitive values. Example `.env` values:

- `DJANGO_SECRET_KEY` (production only)
- `DJANGO_DEBUG=True` (set to `False` in production)
- `DATABASE_URL` (e.g., `postgres://user:pass@host:port/dbname`) — optional, SQLite used by default
- `STRIPE_SECRET_KEY` / `RAZORPAY_KEY_SECRET` (if integrating payments)

If using the default SQLite database, run:

```powershell
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The backend API will be available at `http://127.0.0.1:8000/`.

---

## Setup — Frontend (Windows)
Open a new terminal and run:

```powershell
cd frontend
npm install
npm start
```

The frontend dev server runs at `http://localhost:3000/` and should be configured to call the backend API.
Set the API base URL in a `.env` (or in code) as:

```
REACT_APP_API_URL=http://127.0.0.1:8000/api
```

---

## Running Tests

Backend (Django tests):

```powershell
cd backend
python manage.py test
```

Frontend (if tests present):

```bash
cd frontend
npm test
```

---

## API — Quick Reference
Example endpoints (prefix with `/api/`):

- `POST /api/auth/register/` — Register user
- `POST /api/auth/login/` — Login (returns token)
- `GET /api/products/` — List products
- `GET /api/products/{id}/` — Product detail
- `POST /api/orders/` — Create order (checkout)

Use token-based auth (JWT or token header) for protected endpoints. Protect secrets and tokens with environment variables.

---

## Postman & API Testing
If you use Postman or Newman to run API tests, set an environment variable `baseUrl` with the backend address (for example `http://127.0.0.1:8000`) and run the collection. If you need a collection file, create one from the endpoints above.

To run tests headlessly with Newman:

```bash
npm install -g newman
newman run <your-postman-collection.json> -e <env.json>
```

---

## Recommended Production Steps
- Use Postgres in production (set `DATABASE_URL`).
- Set `DEBUG=False` and configure `ALLOWED_HOSTS` in `ecommerce/settings.py` or via env vars.
- Configure static files: run `python manage.py collectstatic` and serve via CDN or static host.
- Use Gunicorn / Daphne with Nginx (or cloud managed services) instead of Django dev server.
- Set up HTTPS, monitoring (Sentry), and backups for the database.

---

## Project Structure (high level)

Root layout (important files and folders):

- `backend/` — Django project & API app, `manage.py`, `requirements.txt`
- `frontend/` — React app (`src/` contains `components/`, `pages/`, `context/`, `services/`)
- `diagrams/` — (optional) architecture and data model diagrams
- `scripts/` — helper scripts used during development

When referencing files, use the repository-relative paths above (for example, open `backend/manage.py`).

---

## Project Structure Diagram

Text tree (quick view):

```
ecommmer/
├── backend/
│   ├── api/
│   ├── ecommerce/
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── services/
│   └── public/
├── diagrams/
├── scripts/
└── README.md
```

Mermaid (visual):

```mermaid
flowchart TD
  Repo[ecommmer repo]
  Repo --> Backend[backend/ (Django)]
  Repo --> Frontend[frontend/ (React)]
  Repo --> Diagrams[diagrams/]
  Repo --> Scripts[scripts/]
  Backend --> API[api/]
  Backend --> Settings[ecommerce/ (settings)]
  Frontend --> Src[src/]
  Src --> Components[components/]
  Src --> Pages[pages/]
  Src --> Context[context/]
  Src --> Services[services/]
```

---

## Detailed Project File Structure
Below is a file-by-file listing of the most important parts of the project. This helps reviewers quickly find code for models, serializers, views, pages and configuration.

Backend (Django)
```
backend/
├── manage.py                      # Django CLI
├── requirements.txt               # Python dependencies
├── db.sqlite3                     # Dev database (if present)
├── ecommerce/
│   ├── __init__.py
│   ├── settings.py                # Main settings (DB, INSTALLED_APPS, CORS)
│   ├── urls.py                    # Project URL includes
│   ├── wsgi.py
│   └── asgi.py
└── api/
  ├── __init__.py
  ├── admin.py                   # Django admin registration
  ├── apps.py
  ├── models.py                  # Product, Order, OrderItem, Coupon models
  ├── serializers.py             # DRF serializers for API
  ├── views.py                   # API views / viewsets
  ├── urls.py                    # App-level API routes
  ├── migrations/                # Django migrations
  │   └── 0001_initial.py
  └── management/
    └── commands/
      ├── seed_data.py       # Seed script for demo data
      └── list_users.py
```

Frontend (React)
```
frontend/
├── package.json                   # npm scripts & deps
├── postcss.config.js
├── tailwind.config.js
├── public/
│   └── index.html
└── src/
  ├── index.js                   # App bootstrap
  ├── App.js                     # Top-level routes
  ├── index.css
  ├── assets/                    # Images & static assets
  ├── components/
  │   ├── Header.js
  │   ├── Footer.js
  │   ├── CartSidebar.js
  │   └── Notification.js
  ├── context/
  │   └── CartContext.js         # Cart state & persistence
  ├── pages/
  │   ├── Home.js
  │   ├── Products.js
  │   ├── ProductDetail.js
  │   ├── Cart.js
  │   ├── Checkout.js
  │   └── Profile.js
  └── services/
    └── api.js                 # Axios/fetch wrappers for API calls
```

Other
```
diagrams/                          # Optional mermaid diagrams (architecture, ER, sequences)
scripts/                           # Utility scripts (conversion, helpers)
SETUP.md                           # Extra setup notes
README.md                           # This file
```

Tip: use your editor's file tree or `git status` to view any untracked files. Reviewers can open `backend/api/models.py` and `frontend/src/pages/ProductDetail.js` to inspect core domain logic and UI flows.



## Troubleshooting
- If migrations fail, ensure the correct DB settings and run `python manage.py makemigrations` before `migrate`.
- If environment variables are not loaded, ensure you have created a `.env` or set them in your shell.
- If CORS blocks frontend requests, configure `CORS_ALLOWED_ORIGINS` or use `django-cors-headers`.

---

## Notes & Acknowledgements
This project was developed as an academic/portfolio e-commerce platform. If you need a formatted synopsis, deployment scripts, or CI/CD configuration, I can prepare those on request.

---

If you'd like, I will now stop (or have already stopped) any assistant-added test servers and permanently delete any assistant-created files — confirm if you want me to proceed. Otherwise, this `README.md` is ready to use.
