import os
import base64
import uvicorn
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

load_dotenv()

# --- 1. CONFIGURATION ---
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("CRITICAL: GEMINI_API_KEY not found in environment.")

# NEW - This uses the latest stable 2026 model
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key={api_key}"
app = FastAPI(title="Gemini Mechanic Pro")
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)
app.mount("/static", StaticFiles(directory="."), name="static")

class DiagnosisRequest(BaseModel):
    image_b64: str

class ChatRequest(BaseModel):
    message: str

# --- 2. ENDPOINTS ---

@app.get("/", response_class=HTMLResponse)
async def serve_gui():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

@app.post("/analyze")
@limiter.limit("10/minute")
async def analyze_frame(request: Request, body: DiagnosisRequest):
    try:
        header, encoded = body.image_b64.split(",", 1)
        payload = {
            "contents": [{
                "parts": [{"text": """You are Gemini Mechanic, a professional AI repair technician. 
Analyze the image and respond in this EXACT format:

DIAGNOSIS: [One sentence identifying the object and main issue]

REPAIR STEPS:
1. [Step 1]
2. [Step 2]
3. [Step 3]
(add more steps as needed)

PARTS NEEDED:
- [Part name] — [where to buy / estimated cost]
(list all parts if user does DIY repair)

Keep it professional, clear, and actionable."""},
                    {"inline_data": {"mime_type": "image/jpeg", "data": encoded}}
                ]
            }]
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(GEMINI_URL, json=payload, timeout=30.0)
            data = response.json()
            if response.status_code != 200:
                return {"error": data.get("error", {}).get("message", "API Error")}
            return {"analysis": data['candidates'][0]['content']['parts'][0]['text']}
    except Exception as e:
        return {"error": str(e)}

@app.post("/chat")
@limiter.limit("20/minute")
async def chat_with_mechanic(request: Request, body: ChatRequest):
    try:
        payload = {
            "contents": [{
                "parts": [{"text": f"""You are Gemini Mechanic, a professional AI repair technician. 
The user says: {body.message}

If they describe a broken item or ask for repair help, respond using this format:
DIAGNOSIS: [what the problem likely is]
REPAIR STEPS: [numbered steps]
PARTS NEEDED: [list with costs if applicable]

If they haven't shown you the item yet, ask them to take a photo using the camera button (📸) so you can visually inspect it. Keep responses concise and professional."""}]
            }]
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(GEMINI_URL, json=payload, timeout=30.0)
            data = response.json()
            if response.status_code != 200:
                return {"reply": "Communication Error: " + data.get("error", {}).get("message", "Unknown")}
            return {"reply": data['candidates'][0]['content']['parts'][0]['text']}
    except Exception as e:
        return {"reply": f"System Error: {str(e)}"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)