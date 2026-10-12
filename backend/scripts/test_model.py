import sys
sys.path.insert(0, '.')
from app.services.gemini_client import get_genai_client

client = get_genai_client()
models = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
]

for m in models:
    try:
        r = client.models.generate_content(model=m, contents='Say hello in one word')
        print(f"{m}: SUCCESS -> {r.text.strip()}", flush=True)
    except Exception as e:
        print(f"{m}: ERROR -> {str(e)[:100]}", flush=True)
