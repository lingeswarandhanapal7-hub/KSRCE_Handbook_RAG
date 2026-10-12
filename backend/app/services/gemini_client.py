from typing import Set, Tuple
from google import genai
from google.genai import types
from google.genai.errors import APIError
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import settings
from app.utils.errors import ModelValidationError
from app.utils.logging import logger

_clients: list[genai.Client] = []

def get_all_genai_clients() -> list[genai.Client]:
    global _clients
    if not _clients:
        keys = [settings.GEMINI_API_KEY]
        if settings.GEMINI_API_KEY_FALLBACK and settings.GEMINI_API_KEY_FALLBACK != settings.GEMINI_API_KEY:
            keys.append(settings.GEMINI_API_KEY_FALLBACK)
        _clients = [genai.Client(api_key=k) for k in keys if k]
    return _clients

def get_genai_client(client_idx: int = 0) -> genai.Client:
    clients = get_all_genai_clients()
    if not clients:
        raise ValueError("No GEMINI_API_KEY configured.")
    return clients[client_idx % len(clients)]

def validate_models() -> Tuple[bool, str]:
    """
    Validates configured model IDs against client.models.list().
    Fails fast with a clear error message if any configured ID is not supported.
    """
    client = get_genai_client()
    try:
        available_models: Set[str] = set()
        for m in client.models.list():
            name = m.name or ""
            available_models.add(name)
            if name.startswith("models/"):
                available_models.add(name[7:])

        configured_models = {
            "GEMINI_CHAT_MODEL": settings.GEMINI_CHAT_MODEL,
            "GEMINI_EMBED_MODEL": settings.GEMINI_EMBED_MODEL,
            "GEMINI_TTS_MODEL": settings.GEMINI_TTS_MODEL,
        }

        invalid = []
        for key, model_id in configured_models.items():
            clean_id = model_id[7:] if model_id.startswith("models/") else model_id
            if clean_id not in available_models and f"models/{clean_id}" not in available_models:
                invalid.append(f"{key}='{model_id}'")

        if invalid:
            error_msg = (
                f"Configured Gemini model ID(s) are invalid or inaccessible: {', '.join(invalid)}. "
                f"Please update backend/.env. Sample accessible models include: "
                f"{', '.join(sorted([m for m in available_models if not m.startswith('models/')])[:8])}"
            )
            logger.error(error_msg)
            raise ModelValidationError(error_msg)

        logger.info(
            f"Model validation succeeded: Chat='{settings.GEMINI_CHAT_MODEL}', "
            f"Embed='{settings.GEMINI_EMBED_MODEL}', TTS='{settings.GEMINI_TTS_MODEL}'"
        )
        return True, "All models validated successfully"
    except Exception as e:
        if isinstance(e, ModelValidationError):
            raise
        logger.exception("Failed to connect to Google GenAI to validate models")
        raise ModelValidationError(f"Could not reach Google GenAI API to validate models: {str(e)}")

def get_chat_config(
    temperature: float = 0.2,
    system_instruction: str | None = None,
    json_mode: bool = False
) -> types.GenerateContentConfig:
    """
    Builds GenerateContentConfig for gemini-3.8-flash.
    Uses thinking_budget=0 (lowest supported thinking level for maximum speed;
    'minimal' is not supported by this model).
    """
    kwargs = {
        "temperature": temperature,
        "thinking_config": types.ThinkingConfig(thinking_budget=0),
    }
    if system_instruction:
        kwargs["system_instruction"] = system_instruction
    if json_mode:
        kwargs["response_mime_type"] = "application/json"

    return types.GenerateContentConfig(**kwargs)

# Resilient decorator for API calls
api_retry = retry(
    retry=retry_if_exception_type((APIError, ConnectionError, TimeoutError)),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    stop=stop_after_attempt(4),
    reraise=True
)
