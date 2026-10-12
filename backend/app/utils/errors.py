from typing import Optional
from fastapi import Request
from fastapi.responses import JSONResponse
from app.utils.logging import logger

class AppError(Exception):
    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500, details: Optional[dict] = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}

class ModelValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, code="MODEL_CONFIG_INVALID", status_code=500)

class IngestionError(AppError):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, code="INGESTION_ERROR", status_code=500, details=details)

class RateLimitError(AppError):
    def __init__(self, message: str = "Rate limit exceeded. Please wait a moment."):
        super().__init__(message, code="RATE_LIMIT_EXCEEDED", status_code=429)

class AudioProcessingError(AppError):
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, code="AUDIO_ERROR", status_code=400, details=details)


LOCALIZED_ERRORS = {
    "RATE_LIMIT_EXCEEDED": {
        "en": "You have sent too many requests. Please pause for a moment.",
        "ta": "நீங்கள் பல கோரிக்கைகளை அனுப்பியுள்ளீர்கள். சிறிது நேரம் காத்திருக்கவும்.",
        "hi": "आपने बहुत सारे अनुरोध भेजे हैं। कृपया कुछ समय प्रतीक्षा करें।",
    },
    "INTERNAL_ERROR": {
        "en": "An unexpected error occurred while processing your request.",
        "ta": "உங்கள் கோரிக்கையை செயலாக்குவதில் எதிர்பாராத பிழை ஏற்பட்டது.",
        "hi": "आपके अनुरोध को संसाधित करते समय एक अप्रत्याशित त्रुटि हुई।",
    },
    "DOCUMENT_NOT_FOUND": {
        "en": "The requested handbook document could not be found.",
        "ta": "கோரப்பட்ட கையேடு ஆவணம் கிடைக்கவில்லை.",
        "hi": "अनुरोधित हैंडबुक दस्तावेज़ नहीं मिला।",
    }
}

async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.error(f"Application error: {exc.code} - {exc.message}", extra={"code": exc.code, "details": exc.details})
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
            }
        }
    )

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(f"Unhandled server error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "A server error occurred. Please try again shortly.",
                "details": str(exc) if request.app.debug else None
            }
        }
    )
