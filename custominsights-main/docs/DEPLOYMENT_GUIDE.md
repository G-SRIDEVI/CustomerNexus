# ShopSense – Deployment Guide
> Complete deployment reference for Docker, CI/CD, and cloud hosting.

---

## Prerequisites

| Tool | Minimum Version | Install |
|---|---|---|
| Node.js | 20.x LTS | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| Docker Desktop | 24.x | https://docker.com |
| Docker Compose | V2 (built-in) | bundled with Docker Desktop |
| Git | 2.40+ | https://git-scm.com |

---

## 1. Local Development (No Docker)

### Step 1 – Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/shopsense.git
cd shopsense
```

### Step 2 – Configure Environment Variables
Create `backend/.env` (never commit this file):
```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/shopsense?retryWrites=true&w=majority
JWT_SECRET=your_strong_jwt_secret_here
PORT=5000
```

### Step 3 – Start the Node.js Express Backend (Port 5000)
```bash
cd backend
npm install
node server.js
```
Verify: `http://localhost:5000/api/products`

### Step 4 – Start the Python FastAPI Analytics Engine (Port 8000)
```bash
cd backend/python_app/app
pip install -r ../requirements.txt
python main.py
```
Verify: `http://localhost:8000/docs` (Swagger UI)

### Step 5 – Open the Frontend
Open `frontend/pages/index.html` in your browser, or serve it via:
```bash
# From project root
npx serve frontend
```

---

## 2. Docker Deployment (Recommended for Production)

### Step 1 – Create a `.env` file in the project root
```env
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/shopsense
JWT_SECRET=your_strong_jwt_secret_here
```

### Step 2 – Build Both Images
```bash
# Build Node.js Express backend image
docker build -t shopsense-node:latest ./backend

# Build Python FastAPI analytics image
docker build -t shopsense-fastapi:latest ./backend/python_app
```

### Step 3 – Start All Services with Docker Compose
```bash
docker-compose up --build -d
```

### Step 4 – Verify Services Are Running
```bash
docker-compose ps
# Both services should show status: healthy

docker-compose logs -f node-backend       # Express logs
docker-compose logs -f fastapi-analytics  # FastAPI logs
```

### Step 5 – Access the Platform
| Service | URL |
|---|---|
| Node.js API | http://localhost:5000 |
| FastAPI Analytics | http://localhost:8000 |
| FastAPI Swagger UI | http://localhost:8000/docs |
| Frontend BI Dashboard | http://localhost:5000/pages/admin_bi.html |

### Step 6 – Shutdown
```bash
docker-compose down          # Stop and remove containers
docker-compose down -v       # Also remove named volumes (MLflow + SQLite data)
```

---

## 3. CI/CD Pipeline (GitHub Actions)

The pipeline is configured in `.github/workflows/deploy.yml` and runs automatically on every push to `main`.

### Pipeline Jobs

| Job | Trigger | Actions |
|---|---|---|
| `node-backend-ci` | Push / PR | npm install, syntax check, smoke test |
| `python-analytics-ci` | Push / PR | pip install, `pytest tests/ -v` |
| `docker-build` | After both CI jobs pass | Build both Docker images, validate compose |
| `deploy` | Push to `main` only | Push images to GitHub Container Registry |

### Required GitHub Secrets

Go to **Repository → Settings → Secrets and variables → Actions** and add:

| Secret Name | Value |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Your JWT signing secret |
| `GITHUB_TOKEN` | Auto-provided by GitHub (no action needed) |

### Optional: Push to DockerHub Instead of GHCR
Uncomment the DockerHub section in `deploy.yml` and add:
- `DOCKERHUB_USERNAME` – your Docker Hub username
- `DOCKERHUB_TOKEN` – your Docker Hub access token

---

## 4. Cloud Hosting

### Option A: Railway (Recommended – Easy)
```bash
npm install -g @railway/cli
railway login
railway up
```
Railway auto-detects the `docker-compose.yml` and deploys both services.

### Option B: Render
1. Create two Web Services on https://render.com
2. Point each to the respective Dockerfile
3. Set environment variables in the Render dashboard

### Option C: AWS ECS / Azure Container Apps
Replace the push step in `deploy.yml` with your cloud CLI commands:
```yaml
# AWS ECR example
- name: Push to AWS ECR
  run: |
    aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
    docker tag shopsense-node:latest $ECR_REGISTRY/shopsense-node:${{ github.sha }}
    docker push $ECR_REGISTRY/shopsense-node:${{ github.sha }}
```

---

## 5. Running Tests

### Node.js API Tests (Milestone Validation)
```bash
cd d:/shopsense  # project root
node backend/validate_milestone4.js
# Expected: 12 PASSED | 0 FAILED
```

### Python FastAPI Pytest Suite
```bash
cd backend/python_app
pytest tests/ -v
# Expected: All tests PASSED
```

---

## 6. Persistent Data

| Data | Storage | Docker Volume |
|---|---|---|
| MongoDB (users, orders, vendors, products) | Atlas Cloud | N/A (cloud) |
| SQLite analytical database | `shopsense.db` | `sqlite_data` |
| MLflow experiment runs | `mlruns/` | `mlflow_data` |
| Uploaded product images | `backend/uploads/` | `./backend/uploads` (bind mount) |
