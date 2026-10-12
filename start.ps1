# KSRCE Handbook RAG Assistant - One-Click Launcher (PowerShell)
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   KSRCE Multilingual AI Handbook Assistant Launcher      " -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot
$BackendDir = Join-Path $WorkspaceRoot "backend"
$FrontendDir = Join-Path $WorkspaceRoot "frontend"

# 1. Environment Checks
if (-not (Test-Path (Join-Path $BackendDir ".env"))) {
    Write-Warning "backend/.env not found! Copying from .env.example..."
    Copy-Item (Join-Path $BackendDir ".env.example") (Join-Path $BackendDir ".env")
    Write-Host "Please ensure your GEMINI_API_KEY is configured in backend/.env" -ForegroundColor Yellow
}

# 2. Start Backend API
Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$BackendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# 3. Start Frontend UI
Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
$FrontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev" -PassThru

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Applications are launching:                              " -ForegroundColor White
Write-Host " -> Chat UI:             http://localhost:5173           " -ForegroundColor Cyan
Write-Host " -> Backend API:         http://localhost:8000           " -ForegroundColor Green
Write-Host " -> Swagger Docs:        http://localhost:8000/docs      " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Press Enter to stop both servers..." -ForegroundColor DarkGray
Read-Host

# Cleanup on exit
Write-Host "Stopping servers..." -ForegroundColor Red
Stop-Process -Id $BackendProcess.Id -ErrorAction SilentlyContinue
Stop-Process -Id $FrontendProcess.Id -ErrorAction SilentlyContinue
Write-Host "Done. Goodbye!" -ForegroundColor Green
