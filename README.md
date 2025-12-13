# 🌱 Sustainability Tracker

<div align="center">

**Track your carbon footprint, protect our planet**

*A full-stack web application for monitoring personal carbon emissions with real-time analytics and beautiful visualizations.*

🔗 **[Live Demo](https://sustainability-tracker-rho.vercel.app)** • 📂 **[GitHub](https://github.com/Aishwarya-deoraj/Sustainability-tracker)** • 🎥 **[Video](https://youtu.be/aGd3UEuu2zA)**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [API Docs](#-api-documentation)

</div>

---

## 📖 About

Sustainability Tracker is an intuitive platform that empowers individuals to understand and reduce their environmental impact. By logging daily activities, users can visualize their carbon footprint across categories like transportation, energy, food, and more.

### Why This Matters

- 🌍 **Climate Action**: Understanding your impact is the first step toward reducing it
- 📊 **Data-Driven Decisions**: Make informed choices backed by real emissions data
- 🎯 **Goal Setting**: Track progress over time and celebrate wins
- 💡 **Eco-Awareness**: Discover which activities have the biggest environmental impact

---

## ✨ Features

### 🔐 User Authentication
- Secure email/password registration and login
- Session management with persistent storage
- Username-only login for quick access

### 📝 Activity Tracking
- Log carbon-emitting activities across multiple categories
- Automatic CO2 emission calculations
- Edit and delete activities with real-time updates
- Hybrid calculation support (quantity-based or monetary-based)

### 📊 Comprehensive Analytics
- **Physical Emissions Summary**: Track emissions by individual items
- **Economic Impact Analysis**: See how spending relates to carbon output
- **Category Breakdowns**: Visualize emissions by activity type
- **Biggest Impactors**: Identify your top carbon sources
- **Time-Based Trends**: Daily, weekly, and monthly emission summaries

### 📈 Beautiful Visualizations
- Interactive charts powered by Recharts
- Category comparison graphs
- Emissions trend lines over time
- Top emitters visualization
- Economic vs. environmental impact analysis

### 🎨 Modern UI/UX
- Responsive design with Tailwind CSS
- Clean, intuitive dashboard
- Real-time data updates
- Mobile-friendly interface

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Deployment**: Vercel

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Language**: Python 3.10+
- **Database**: MongoDB Atlas
- **Authentication**: bcrypt password hashing
- **Deployment**: Render

### Database Schema
- **Users**: Authentication and profile data
- **Activities**: Carbon emission records
- **Emission Factors**: CO2 calculation reference data
- **Categories**: Activity classification

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and npm
- **Python** 3.10+
- **MongoDB** (local instance or Atlas account)
- **Git**

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/Aishwarya-deoraj/Sustainability-tracker.git
cd Sustainability-tracker
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv myvenv
source myvenv/bin/activate  # On Windows: myvenv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sustainability?retryWrites=true&w=majority
EOF
```

The API will be available at `http://localhost:8000`

#### 3. Load Initial Data

```bash
# Make sure you're in the backend directory and virtual environment is activated
# Install Jupyter if not already installed
pip install jupyter

# Run the data loading notebook
jupyter notebook load.ipynb
```

**What this does:**
- Loads emission factors from `data/food_production.csv` (physical emissions)
- Loads emission factors from `data/epa_emmisions.csv` (economic emissions)
- Creates categories (Transportation, Food, Energy, etc.)
- Populates your MongoDB database with reference data

**Note:** You only need to run this once to populate your database with emission factors.

After loading the data, start the backend server:

```bash
# Run the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 4. Frontend Setup

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run the development server
npm run dev
```

The application will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
Sustainability-tracker/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py            # API routes & app initialization
│   │   ├── data_service.py    # Database operations
│   │   ├── models.py          # Pydantic models
│   │   └── __init__.py
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables (not tracked)
│
├── frontend/                   # Next.js frontend
│   ├── app/
│   │   ├── page.tsx           # Root redirect page
│   │   ├── layout.tsx         # App layout
│   │   ├── dashboard/         # Dashboard page
│   │   ├── login/             # Authentication page
│   │   ├── activities/        # Activity management
│   │   └── visualizations/    # Charts & graphs
│   ├── components/            # React components
│   │   ├── Sidebar.tsx
│   │   ├── CategoryChart.tsx
│   │   ├── EconomicImpact.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── api.ts            # API client functions
│   │   └── auth.ts           # Authentication utilities
│   ├── types/
│   │   └── index.ts          # TypeScript definitions
│   └── package.json          # Node dependencies
│
└── README.md                  # You are here!
```

---

## 🌍 Deployment

This project is deployed using free-tier services:

- **Frontend**: Deployed on [Vercel](https://vercel.com)
  - Auto-deploys from `main` branch
  - Global CDN for fast loading
  - Automatic HTTPS

- **Backend**: Deployed on [Render](https://render.com)
  - Auto-deploys from `main` branch
  - Free tier with 750 hours/month
  - Note: Spins down after 15 min of inactivity (30s cold start)

- **Database**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  - 512MB free tier
  - Automatic backups
  - Global clusters

### Deploy Your Own

1. Fork this repository
2. Set up MongoDB Atlas (free tier)
3. Deploy backend to Render:
   - Connect GitHub repo
   - Set root directory to `backend`
   - Add `MONGODB_URI` environment variable
4. Deploy frontend to Vercel:
   - Connect GitHub repo
   - Set root directory to `frontend`
   - Add `NEXT_PUBLIC_API_URL` environment variable
5. Update CORS settings in backend with your Vercel URL

## 🐛 Known Issues

- **Cold Starts**: Backend may take 30-60 seconds to respond after 15 minutes of inactivity (Render free tier limitation)

---

## 👨‍💻 Contributors

### **Aishwarya Deoraj** - Backend Lead & DevOps Engineer
- FastAPI API Development
- ETL Pipeline
- Authentication (bcrypt)
- Deployment (Render/Vercel/Atlas)

### **Anannya Khedekar** - Frontend Lead & UI/UX Architect
- Complete Next.js/React UI
- UI/UX Design (Tailwind CSS)
- Data Visualization (Recharts)

---

## 🙏 Acknowledgments

### Technical Frameworks
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework for building APIs
- [Next.js](https://nextjs.org/) - React framework for production-grade applications
- [MongoDB](https://www.mongodb.com/) - NoSQL database for flexible data storage
- [Recharts](https://recharts.org/) - Composable charting library for React
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Uvicorn](https://www.uvicorn.org/) - ASGI web server implementation
- [Pydantic](https://docs.pydantic.dev/) - Data validation using Python type annotations
- [bcrypt](https://github.com/pyca/bcrypt/) - Password hashing library

### Emission Data Sources
- **Environment Impact of Food Production** (2023). Kaggle. [Dataset Link](https://www.kaggle.com/datasets/selfvivek/environment-impact-of-food-production)  
  *Used for: Physical emission factors for food products (kg CO₂e per kg)*

- **Supply Chain Greenhouse Gas Emission Factors v1.3** (2023). U.S. Environmental Protection Agency. [Dataset Link](https://catalog.data.gov/dataset/supply-chain-greenhouse-gas-emission-factors-v1-3-by-naics-6)  
  *Used for: Economic emission factors for supply chain analysis (kg CO₂e per USD)*

### Deployment Platforms
- [Vercel](https://vercel.com) - Frontend hosting and deployment
- [Render](https://render.com) - Backend API hosting
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Cloud database service


<div align="center">

</div>
