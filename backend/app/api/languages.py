from typing import List
from fastapi import APIRouter
from app.schemas import LanguageInfo

router = APIRouter(prefix="/api", tags=["Languages"])

# Config-driven language registry: adding one language = one registry entry + one i18n JSON
SUPPORTED_LANGUAGES: List[LanguageInfo] = [
    LanguageInfo(code="auto", name="Auto-detect", native_name="தானியங்கு / स्वतः", script="auto", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="en-IN", name="English (India)", native_name="English (India)", script="Latn", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="ta-IN", name="Tamil", native_name="தமிழ்", script="Taml", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="hi-IN", name="Hindi", native_name="हिन्दी", script="Deva", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="te-IN", name="Telugu", native_name="తెలుగు", script="Telu", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="ml-IN", name="Malayalam", native_name="മലയാളം", script="Mlym", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="kn-IN", name="Kannada", native_name="ಕನ್ನಡ", script="Knda", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="bn-IN", name="Bengali", native_name="বাংলা", script="Beng", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="mr-IN", name="Marathi", native_name="मराठी", script="Deva", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="gu-IN", name="Gujarati", native_name="ગુજરાતી", script="Gujr", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="pa-IN", name="Punjabi", native_name="ਪੰਜਾਬੀ", script="Guru", direction="ltr", stt=True, tts=True, ui=True),
    LanguageInfo(code="ur-IN", name="Urdu", native_name="اردو", script="Arab", direction="rtl", stt=True, tts=True, ui=True),
    LanguageInfo(code="or-IN", name="Odia", native_name="ଓଡ଼ିଆ", script="Orya", direction="ltr", stt=True, tts=True, ui=True),
]

@router.get("/languages", response_model=List[LanguageInfo])
async def get_languages():
    """Returns supported languages with native scripts and capability flags."""
    return SUPPORTED_LANGUAGES
