# Professor Pepe

A clean, animated web AI assistant powered by **Google Gemini**. Chat about specific topics and request relevant images from an image API.

![stack](https://img.shields.io/badge/FastAPI-Python-green?logo=fastapi)
![stack](https://img.shields.io/badge/React-Vite-blue?logo=react)
![stack](https://img.shields.io/badge/Tailwind_CSS-38bdf8?logo=tailwindcss)

## Features

- 💬 **Topic-based chat** — switch between topics like Science, History, Coding, Art, etc.
- 🖼️ **Image support** — mention “show me” / “image” and Zen fetches a relevant picture.
- 🌙 **Dark & light themes** with smooth transitions.
- ✨ **Polished animations** via Framer Motion.
- 📝 **Markdown rendering** for assistant responses.
- 🔄 **Streaming responses** for a snappy feel.

## Project structure

```
zen-ai-agent/
├── backend/
│   ├── main.py              # FastAPI + Gemini + image proxy
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   ├── hooks/
    │   └── styles/
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## Setup

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and add your Gemini API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-1.5-flash-latest
IMAGE_API_BASE=https://onlypepes.com
```

Run the server:

```bash
uvicorn main:app --reload
```

Backend runs on `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies API calls to the backend.

## Usage

1. Open `http://localhost:5173`.
2. Pick a topic from the sidebar.
3. Type a question or ask for an image, e.g.:
   - “Explain black holes”
   - “Show me a picture related to space”

## Customization

- **Image API**: Change `IMAGE_API_BASE` in `backend/.env`. The backend expects an endpoint at `/api/pepe` that supports `?search=...` and `?random=true`.
- **Topics**: Edit the `TOPICS` array in `frontend/src/App.jsx`.
- **Theme**: Default is dark. Toggle with the moon/sun button.

## License

MIT
