# Local Offline AI Chat Application

## Overview
Local Offline AI Chat is a full-stack chat experience that runs entirely on your own machine. The application combines a FastAPI backend, a React + TypeScript + TailwindCSS frontend, and the Ollama runtime to serve open-source LLMs locally. Once the chosen Ollama model is downloaded, every interaction happens offline – no external APIs, no internet requirement, and no Docker dependencies. The architecture features:

- **Backend (FastAPI)** for chat orchestration, SQLite persistence, document text extraction, and Ollama streaming.
- **Frontend (React + Vite + TailwindCSS)** for a modern chat UI with markdown rendering, adjustable model parameters, and responsive layout.
- **SQLite database** for local chat history.
- **Ollama CLI** for running open-source large language models entirely on-device.

## System Requirements
- macOS or Linux
- Python ≥ 3.10
- Node.js ≥ 18
- [Ollama](https://ollama.ai) installed locally
- Git (optional, for cloning this repository)

## Installation (No Docker)

### 1. Clone or download the project
```bash
cd /path/to/projects
git clone <repository-url> local-ai-chat
cd local-ai-chat
```
*(If you downloaded a ZIP archive, extract it and open the folder instead.)*

### 2. Prepare the Python backend
Create and activate a virtual environment, then install dependencies:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Prepare the React frontend
Install Node.js dependencies:
```bash
cd ../frontend
npm install
```

### 4. Install Ollama and download a model
If you have not already installed Ollama, follow the instructions at [https://ollama.ai](https://ollama.ai). Once installed, download an open-source model – for example `llama2`:
```bash
ollama pull llama2
```

> **Offline operation**: After pulling the model one time, Ollama serves it locally. The chat application never calls external APIs.

## Running the App
Open two terminal windows/tabs.

**Terminal 1 – Backend**
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 – Frontend**
```bash
cd frontend
npm run dev
```

Now open your browser to [http://localhost:5173](http://localhost:5173).

## Features
- Conversational UI with markdown rendering and syntax-friendly formatting.
- Live streaming responses from local LLMs via Server-Sent Events.
- Sidebar with persistent chat history stored in SQLite.
- Settings panel for adjusting model name, temperature, and maximum tokens.
- Light/dark theme toggle with preference saved locally.
- Local file upload (TXT, MD, PDF, DOCX) with text extraction and insertion into the prompt area.

## Configuration
- **Model configuration**: Use the settings panel on the right side of the UI to change the model name (e.g., `llama2`), temperature, and token limit. These values are sent to the backend with each prompt.
- **SQLite database**: Stored at `backend/chat.db`. Delete this file to reset chat history.
- **Logs**: Uvicorn prints logs to the terminal running the backend server. Frontend logs appear in the browser console.

## Offline Verification
1. Pull the model while you still have internet access (`ollama pull llama2`).
2. Disconnect from the internet.
3. Start the backend and frontend as described above.
4. Interact with the chat. All inference requests are handled by the local Ollama runtime with no external calls.

## Troubleshooting
- **Ollama CLI not found**: Ensure `ollama` is on your PATH. You may need to restart your terminal after installation or specify the binary location via the `OLLAMA_PATH` environment variable.
- **Model errors**: Verify that the model name in the settings panel exactly matches the model installed with Ollama.
- **Port conflicts**: The backend runs on port `8000` and the frontend on `5173`. If either port is busy, stop the other service using the port or modify the command line options (`uvicorn main:app --port <new-port>`, `npm run dev -- --port <new-port>`).
- **Resetting chat history**: Stop the backend server, delete `backend/chat.db`, and restart the backend. A fresh database will be created automatically.
- **PDF/DOCX extraction issues**: Install the optional dependencies listed in `backend/requirements.txt` (`PyPDF2`, `python-docx`). These are installed by default but ensure the virtual environment is activated when running the backend.
- **File upload fails offline**: Large or encrypted PDFs may not extract cleanly. Convert them to plain text first when possible.

## License & Credits
This project uses the following open-source technologies:
- [FastAPI](https://fastapi.tiangolo.com)
- [Ollama](https://ollama.ai)
- [React](https://react.dev)
- [TailwindCSS](https://tailwindcss.com)
- [SQLite](https://www.sqlite.org)

All components are open source, allowing the application to run entirely offline once dependencies and models are installed locally.
