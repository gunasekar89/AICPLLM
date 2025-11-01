from __future__ import annotations

import io
from pathlib import Path

from fastapi import UploadFile

try:
    from docx import Document  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Document = None

try:
    from PyPDF2 import PdfReader  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    PdfReader = None


SUPPORTED_EXTENSIONS = {".txt", ".md", ".pdf", ".docx"}


def extract_text_from_upload(upload: UploadFile) -> str:
    suffix = Path(upload.filename or "").suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {suffix}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")

    if suffix in {".txt", ".md"}:
        content = upload.file.read()
        if isinstance(content, bytes):
            return content.decode("utf-8", errors="ignore")
        return content

    if suffix == ".pdf":
        if PdfReader is None:
            raise RuntimeError("PyPDF2 is required for PDF extraction. Install with 'pip install PyPDF2'.")
        reader = PdfReader(upload.file)
        text = []
        for page in reader.pages:
            extracted = page.extract_text()
            if extracted:
                text.append(extracted)
        return "\n".join(text)

    if suffix == ".docx":
        if Document is None:
            raise RuntimeError("python-docx is required for DOCX extraction. Install with 'pip install python-docx'.")
        temp_bytes = io.BytesIO(upload.file.read())
        doc = Document(temp_bytes)
        return "\n".join(paragraph.text for paragraph in doc.paragraphs)

    raise ValueError("Unsupported file type")
