from __future__ import annotations

import json
import os
import shutil
import subprocess
from typing import Generator, Iterable, Optional

from config import settings


class OllamaInterface:
    """Wrapper around the Ollama CLI that streams tokens as they are generated."""

    def __init__(self, binary_path: Optional[str] = None) -> None:
        self.binary_path = binary_path or os.getenv("OLLAMA_PATH", "ollama")
        self.host = settings.ollama_host

    def _build_env(self) -> dict[str, str]:
        env = os.environ.copy()
        if self.host:
            env["OLLAMA_HOST"] = self.host
        return env

    def ensure_binary(self) -> None:
        if shutil.which(self.binary_path) is None:
            raise RuntimeError(
                "Ollama CLI not found. Please install Ollama and ensure it is available on your PATH."
            )

    def stream_chat(
        self,
        prompt: str,
        model: str,
        temperature: float,
        max_tokens: int,
        chat_history: Optional[Iterable[dict[str, str]]] = None,
    ) -> Generator[str, None, None]:
        """Stream the output from the Ollama CLI."""
        self.ensure_binary()
        history_payload = list(chat_history or [])
        history_payload.append({"role": "user", "content": prompt})

        payload = {"model": model, "messages": history_payload, "options": {"temperature": temperature}}
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        command = [self.binary_path, "run", model, "--json"]
        process = subprocess.Popen(
            command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env=self._build_env(),
            text=True,
        )
        if process.stdin is None or process.stdout is None:
            raise RuntimeError("Failed to communicate with Ollama process")

        try:
            stdin_payload = json.dumps(payload) + "\n"
            process.stdin.write(stdin_payload)
            process.stdin.flush()
            for line in iter(process.stdout.readline, ""):
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if data.get("done"):
                    break
                token = data.get("response")
                if token:
                    yield token
        finally:
            process.kill()


def iter_messages_for_chat(messages: Iterable[dict[str, str]]) -> Iterable[dict[str, str]]:
    for message in messages:
        if message["role"] == "assistant":
            yield {"role": "assistant", "content": message["content"]}
        elif message["role"] == "user":
            yield {"role": "user", "content": message["content"]}


ollama = OllamaInterface()
