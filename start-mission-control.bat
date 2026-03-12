@echo off
echo Starting OpenClaw Gateway...
start "" "C:\Users\benit\.openclaw\gateway.cmd"

echo Starting Mission Control...
cd /d "c:\Users\benit\.gemini\antigravity\Open claw\mission-control"
npm run dev
