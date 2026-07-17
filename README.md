# 🤖 AI Resume Analyzer

> A full-stack AI-powered Resume Analyzer — **React + Vite** frontend and **Spring Boot** backend packaged as a single unified Maven monorepo.

---

## 📑 Table of Contents

- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Configuration](#-configuration)
- [How to Run](#-how-to-run)
  - [Mode 1 — Full Build & Run](#mode-1--full-build--run-recommended)
  - [Mode 2 — Frontend Development with Hot Reload](#mode-2--frontend-development-with-hot-reload)
- [Maven Build Lifecycle](#-maven-build-lifecycle)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)

---

## 🧰 Tech Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend** | React + Vite + Tailwind CSS | React 19, Vite 8 |
| **Backend** | Spring Boot + Apache Tomcat | Spring Boot 4.1 |
| **AI Engine** | Google Gemini API (gemini-2.0-flash) | REST |
| **Embeddings** | Google Gemini Embedding API (gemini-embedding-001) | 768-dim vectors |
| **RAG Store** | In-Memory Vector Store | Cosine Similarity |
| **File Parsing** | Apache PDFBox + Apache POI | PDF + DOCX |
| **Build** | Maven Wrapper + frontend-maven-plugin | Node v22.12.0 |
| **Language** | Java 17+ | JDK 17 minimum |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  React UI  (served at http://localhost:8081)            │  │
│   │  - Resume upload + Job role selection                   │  │
│   │  - AI Analysis report rendering                         │  │
│   │  - Semantic chat / Q&A interface                        │  │
│   └──────────────────────┬──────────────────────────────────┘  │
│                          │  HTTP requests to /api               │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              Spring Boot Server  :8081                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SpaController      → serves index.html for UI routes   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ResumeController   → POST /api/resume/analyze          │   │
│  │                     → POST /api/resume/chat             │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │  ResumeService      → parses file, chunks text          │   │
│  │  VectorStoreService → stores & searches embeddings      │   │
│  │  GeminiService      → calls Gemini AI REST APIs         │   │
│  └────────────────┬─────────────────┬───────────────────────   │
│                   │                 │                           │
└───────────────────┼─────────────────┼───────────────────────────┘
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐   ┌─────────────────────┐
         │ Google Gemini AI │   │ In-Memory Vector     │
         │  - Embeddings    │   │ Store (RAG)          │
         │  - Generation    │   │  - Cosine similarity │
         └──────────────────┘   └─────────────────────┘
```

**How it works:**
1. User uploads a resume (PDF/DOCX) and selects a target job role.
2. Spring Boot parses the file and extracts plain text.
3. Text is chunked and sent to Gemini Embedding API to generate semantic vectors.
4. Vectors are stored in-memory for the session.
5. Gemini 2.5 Flash generates a structured JSON analysis report.
6. User can ask follow-up questions — matched against stored vectors (RAG), then answered by Gemini.

---

## 🗂️ Project Structure

```
resume-analyzer-service/                      ← Monorepo Root
│
├── frontend/                                 ← React + Vite Application
│   ├── src/
│   │   ├── pages/
│   │   │   └── AnalyzerPage.jsx             ← Main page (upload + results + chat)
│   │   ├── components/common/               ← Shared UI components
│   │   ├── services/
│   │   │   ├── api.js                       ← Axios client (baseURL: /api)
│   │   │   └── analyzerService.js           ← analyze() and askQuestion() calls
│   │   ├── utils/                           ← Helper utilities
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js                       ← Dev proxy: /api → localhost:8081
│   ├── tailwind.config.js
│   ├── package.json
│   └── index.html
│
├── src/
│   └── main/
│       ├── java/com/example/backend/
│       │   ├── BackendApplication.java      ← @SpringBootApplication entry point
│       │   ├── controller/
│       │   │   ├── ResumeController.java    ← REST: /api/resume/analyze & /chat
│       │   │   └── SpaController.java       ← Forwards SPA routes to index.html
│       │   ├── service/
│       │   │   ├── ResumeService.java       ← Orchestrates parsing + AI flow
│       │   │   ├── GeminiService.java       ← Google Gemini REST client
│       │   │   └── VectorStoreService.java  ← Cosine similarity vector search
│       │   ├── parser/                      ← PDF (PDFBox) + DOCX (POI) parsers
│       │   └── dto/                         ← AnalysisReportDto, ChatRequest/Response
│       └── resources/
│           ├── application.properties       ← Port, upload limits, API key
│           └── static/                      ← Built React files are copied here
│
├── pom.xml                                  ← Master Maven POM (builds everything)
├── mvnw.cmd                                 ← Maven Wrapper (Windows)
├── mvnw                                     ← Maven Wrapper (Linux/macOS)
└── README.md                                ← This file
```

---

## ✅ Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Java JDK** | 17 or higher | `java -version` to verify |
| **Maven** | Not required | `mvnw.cmd` wrapper is included |
| **Node.js** | Not required | Auto-downloaded by Maven plugin |
| **Google Gemini API Key** | Valid key | Get one at [aistudio.google.com](https://aistudio.google.com) |

> **Note:** You do **not** need to install Maven or Node.js globally. The included Maven Wrapper (`mvnw.cmd`) and `frontend-maven-plugin` handle everything automatically — including downloading Node.js `v22.12.0`.

---

## 🔑 Configuration

Open `src/main/resources/application.properties` and set your Gemini API key:

```properties
# Server
server.port=8081

# File upload limits
spring.servlet.multipart.max-file-size=15MB
spring.servlet.multipart.max-request-size=15MB

# Google Gemini API Key — REQUIRED
gemini.api.key=YOUR_GEMINI_API_KEY_HERE
```

---

## 🚀 How to Run

### Mode 1 — Full Build & Run (Recommended)

This is the standard production-ready way to run the application.
A single Maven command builds both the frontend and backend and starts the server.

**Step 1: Build the entire project**

```powershell
.\mvnw.cmd clean install
```

What this does internally:
- Downloads **Node.js v22.12.0** locally (first run only, ~10 seconds)
- Runs `npm install` in the `frontend/` directory
- Runs `npm run build` → Vite compiles React to `frontend/dist/`
- Copies compiled assets from `frontend/dist/` → `target/classes/static/`
- Compiles Java source code
- Runs unit tests
- Packages everything into a single fat JAR: `target/resume-analyzer-0.0.1-SNAPSHOT.jar`

Expected output at the end:
```
[INFO] ✓ built in 755ms
[INFO] Copying 5 resources from frontend\dist to target\classes\static
[INFO] BUILD SUCCESS
[INFO] Total time: ~40s
```

---

**Step 2: Start the application**

```powershell
.\mvnw.cmd spring-boot:run
```

Wait for this line in the logs:
```
o.s.boot.tomcat.TomcatWebServer : Tomcat started on port 8081 (http)
```

---

**Step 3: Open the UI**

```
http://localhost:8081
```

**To stop the server:** Press `Ctrl + C` in the terminal.

---

### Mode 2 — Frontend Development with Hot Reload

Use this when actively working on the React frontend.
The Vite dev server provides **instant hot-reload** on every file save — no need to rebuild.

You need **two separate terminals** open at the same time:

**Terminal 1 — Start the backend**
```powershell
# From the project root
.\mvnw.cmd spring-boot:run
```

**Terminal 2 — Start the Vite dev server**
```powershell
# Navigate to frontend folder
cd frontend

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

Expected output in Terminal 2:
```
  VITE v8.1.3  ready in 312 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open the UI at: `http://localhost:5173`

> **How the proxy works:** When the React app (on port 5173) makes a call to `/api/...`, Vite automatically forwards it to `http://localhost:8081/api/...`. This is configured in `vite.config.js` and prevents CORS errors in development.

---

## ⚙️ Maven Build Lifecycle

```
mvnw.cmd clean install
│
├── [clean]               Delete the target/ directory
│
├── [generate-resources]  frontend-maven-plugin
│   ├── install-node-and-npm  → Downloads Node.js v22.12.0 (cached after first run)
│   ├── npm install           → Fetches all React dependencies
│   └── npm run build         → Compiles React/Vite → frontend/dist/
│
├── [process-resources]   maven-resources-plugin
│   └── copy-resources        → Copies frontend/dist/** → target/classes/static/
│
├── [compile]             maven-compiler-plugin
│   └── Compiles all Java source files
│
├── [test]                spring-boot-maven-plugin
│   └── Runs unit tests (BackendApplicationTests)
│
└── [package]             spring-boot-maven-plugin
    └── Packages into target/resume-analyzer-0.0.1-SNAPSHOT.jar
        ├── Java classes
        ├── application.properties
        └── static/  ← compiled React app lives here
```

When you run `spring-boot:run`, all phases up through `test-compile` are also executed first — meaning every run automatically **rebuilds the frontend**.

---

## 📡 API Reference

Base URL: `http://localhost:8081/api`

### `POST /api/resume/analyze`

Uploads a resume file, analyzes it against a target job role using Gemini AI, and returns a structured report.

**Request** (`multipart/form-data`):

| Field | Type | Description |
|---|---|---|
| `file` | File | Resume document (`.pdf` or `.docx`, max 15 MB) |
| `role` | String | Target job role (e.g. `"Senior Java Developer"`) |

**Response** (`200 OK`, `application/json`):
```json
{
  "documentId": "abc-123-xyz",
  "overallScore": 78,
  "summary": "...",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "recommendations": ["..."],
  "skillsMatch": { ... }
}
```

**Error Responses:**

| Code | Reason |
|---|---|
| `400` | Empty file or missing role |
| `500` | File parsing error or AI API failure |

---

### `POST /api/resume/chat`

Ask a semantic question about a previously analyzed resume using RAG (Retrieval-Augmented Generation).

**Request** (`application/json`):
```json
{
  "documentId": "abc-123-xyz",
  "query": "What are the candidate's strongest technical skills?"
}
```

| Field | Type | Description |
|---|---|---|
| `documentId` | String | ID returned from the `/analyze` endpoint |
| `query` | String | Natural language question about the resume |

**Response** (`200 OK`):
```json
{
  "answer": "The candidate demonstrates strong expertise in Java, Spring Boot, and microservices architecture..."
}
```

---

## 🔧 Troubleshooting

| Problem | Likely Cause | Solution |
|---|---|---|
| `Port 8081 already in use` | Another process is running on the port | Run `netstat -ano \| findstr :8081` to find the PID, then `taskkill /PID <pid> /F` |
| `npm run build` fails with `SyntaxError` | Node version too old | Ensure `pom.xml` has `<nodeVersion>v22.12.0</nodeVersion>` or higher |
| `401 Unauthorized` from Gemini | Missing or expired API key | Update `gemini.api.key` in `application.properties` |
| React route returns `404` | Spring Boot intercepting SPA routes | Ensure `SpaController.java` exists in the `controller` package |
| `npm install` fails | Corrupted `node_modules` | Delete `frontend/node_modules/` and `frontend/package-lock.json`, then run `.\mvnw.cmd clean install` again |
| `BUILD FAILURE` on first run | Maven downloading dependencies | Wait — the first build downloads all dependencies. Should succeed on retry if internet is available. |
| File upload fails at 15MB limit | Default multipart limit hit | Increase `spring.servlet.multipart.max-file-size` in `application.properties` |

---

## 📄 License

This project is for educational and demonstration purposes.
