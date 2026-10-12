import collections
import hashlib
from typing import Any, Dict, List, Optional
import threading

class LRUCache:
    def __init__(self, capacity: int = 500):
        self.capacity = capacity
        self.cache: collections.OrderedDict = collections.OrderedDict()
        self.lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self.lock:
            if key not in self.cache:
                return None
            self.cache.move_to_end(key)
            return self.cache[key]

    def put(self, key: str, value: Any):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
            self.cache[key] = value
            if len(self.cache) > self.capacity:
                self.cache.popitem(last=False)

    def clear(self):
        with self.lock:
            self.cache.clear()

def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

embedding_cache = LRUCache(capacity=1000)
answer_cache = LRUCache(capacity=200)
tts_audio_cache = LRUCache(capacity=300)
translation_cache = LRUCache(capacity=500)
