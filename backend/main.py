"""
AI Second Brain - FastAPI Backend
RAG Pipeline with ChromaDB + OpenAI / OpenRouter
"""

import os
import sys
import uuid
import json
import hashlib
import re
import base64
from datetime import datetime
from pathlib import Path
from typing import Optional

# UTF-8 stdout configuration for Windows console
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Try importing optional dependencies
try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

# ─── App Setup ──────────────────────────────────────────────
app = FastAPI(
    title="AI Second Brain API",
    description="Personal RAG Assistant Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Storage Setup ──────────────────────────────────────────
BASE_DIR = Path(__file__).parent.resolve()
DATA_DIR = BASE_DIR / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
MEMORIES_DIR = DATA_DIR / "memories"
DB_DIR = DATA_DIR / "db"
DOCUMENTS_FILE = DATA_DIR / "documents.json"
MEMORIES_FILE = DATA_DIR / "memories.json"
CONVERSATIONS_FILE = DATA_DIR / "conversations.json"

for d in [UPLOADS_DIR, MEMORIES_DIR, DB_DIR]:
    d.mkdir(parents=True, exist_ok=True)

# ─── Documents Storage Helpers ──────────────────────────────
def load_documents() -> list:
    if DOCUMENTS_FILE.exists():
        try:
            with open(DOCUMENTS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_documents(docs: list):
    with open(DOCUMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)


def load_memories() -> list:
    if MEMORIES_FILE.exists():
        try:
            with open(MEMORIES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_memories(memories: list):
    with open(MEMORIES_FILE, "w", encoding="utf-8") as f:
        json.dump(memories, f, indent=2, ensure_ascii=False)


# ─── Conversations Storage Helpers ──────────────────────────
def load_conversations() -> list:
    if CONVERSATIONS_FILE.exists():
        try:
            with open(CONVERSATIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_conversations(convs: list):
    with open(CONVERSATIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(convs, f, indent=2, ensure_ascii=False)


def generate_conversation_title(message: str) -> str:
    """Generate a short conversation title from the first user message.
    Uses LLM if available, otherwise truncates the message."""
    if openai_client:
        try:
            resp = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": "Generate a very short title (3-7 words max) for a conversation that starts with this message. Return ONLY the title, no quotes, no explanation."},
                    {"role": "user", "content": message[:200]},
                ],
                max_tokens=20,
                temperature=0.5,
            )
            title = (resp.choices[0].message.content or "").strip().strip('"').strip("'")
            if title and len(title) <= 80:
                return title
        except Exception:
            pass
    # Fallback: smart truncation
    clean = message.strip()
    if len(clean) <= 50:
        return clean
    # Try to cut at a word boundary
    truncated = clean[:50]
    last_space = truncated.rfind(" ")
    if last_space > 20:
        truncated = truncated[:last_space]
    return truncated + "…"


# ─── ChromaDB Setup ─────────────────────────────────────────
chroma_client = None
collection = None

if CHROMA_AVAILABLE:
    try:
        chroma_client = chromadb.PersistentClient(path=str(DB_DIR / "chroma"))
        collection = chroma_client.get_or_create_collection(
            name="knowledge_base",
            metadata={"hnsw:space": "cosine"},
        )
        print("✅ ChromaDB initialized")
    except Exception as e:
        print(f"⚠️ ChromaDB init failed: {e}")

# ─── OpenAI / OpenRouter Setup ───────────────────────────────────
openai_client = None
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "").strip()
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "").strip()

IS_OPENROUTER = OPENAI_API_KEY.startswith("sk-or-v1") or "openrouter" in OPENAI_BASE_URL.lower()

if not OPENAI_BASE_URL and IS_OPENROUTER:
    OPENAI_BASE_URL = "https://openrouter.ai/api/v1"

CHAT_MODEL = os.environ.get(
    "CHAT_MODEL",
    "openai/gpt-4o-mini" if IS_OPENROUTER else "gpt-4o-mini"
)
EMBEDDING_MODEL = os.environ.get(
    "EMBEDDING_MODEL",
    "openai/text-embedding-3-small" if IS_OPENROUTER else "text-embedding-3-small"
)

if OPENAI_AVAILABLE and OPENAI_API_KEY:
    kwargs = {"api_key": OPENAI_API_KEY}
    if OPENAI_BASE_URL:
        kwargs["base_url"] = OPENAI_BASE_URL
        if IS_OPENROUTER:
            kwargs["default_headers"] = {
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI Second Brain",
            }
    openai_client = OpenAI(**kwargs)
    provider_name = "OpenRouter" if IS_OPENROUTER else ("Custom Endpoint" if OPENAI_BASE_URL else "OpenAI")
    print(f"✅ {provider_name} client initialized (model: {CHAT_MODEL})")
else:
    print("⚠️ LLM API Key not provided or invalid. Running in Local RAG mode.")


# ─── Multi-Engine Image OCR ───────────────────────────────
def extract_image_ocr(file_path: str) -> str:
    """Extract printed text from images using RapidOCR, EasyOCR, or PyTesseract."""
    if not file_path or not Path(file_path).exists():
        return ""

    # 1. Try RapidOCR (Fast, accurate CPU OCR)
    try:
        from rapidocr_onnxruntime import RapidOCR
        engine = RapidOCR()
        result, _ = engine(file_path)
        if result:
            lines = [item[1].strip() for item in result if item[1].strip()]
            if lines:
                return "\n".join(lines)
    except Exception as e:
        print(f"⚠️ RapidOCR error: {e}")

    # 2. Try EasyOCR
    try:
        import easyocr
        reader = easyocr.Reader(['en'], gpu=False)
        res = reader.readtext(file_path, detail=0)
        if res:
            lines = [str(r).strip() for r in res if str(r).strip()]
            if lines:
                return "\n".join(lines)
    except Exception as e:
        print(f"⚠️ EasyOCR error: {e}")

    # 3. Try PyTesseract
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(file_path)
        extracted = pytesseract.image_to_string(img).strip()
        if extracted:
            return extracted
    except Exception as e:
        print(f"⚠️ PyTesseract error: {e}")

    return ""


# ─── Text Extraction ────────────────────────────────────────
def extract_text(file_path: str, content_type: str = "") -> str:
    """Extract text from uploaded file or image."""
    text = ""
    file_str = str(file_path)

    if content_type == "application/pdf" or file_str.lower().endswith(".pdf"):
        try:
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception:
            try:
                import pdfplumber
                with pdfplumber.open(file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n"
            except Exception:
                text = "[PDF text extraction failed]"

    elif content_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ] or file_str.lower().endswith(".docx"):
        try:
            import docx
            doc = docx.Document(file_path)
            text = "\n".join([p.text for p in doc.paragraphs if p.text])
        except Exception:
            text = "[DOCX extraction failed]"

    elif content_type == "text/plain" or file_str.lower().endswith(".txt"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    elif content_type == "text/csv" or file_str.lower().endswith(".csv"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    elif (content_type and content_type.startswith("image/")) or any(file_str.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]):
        ocr_text = extract_image_ocr(file_path)
        if ocr_text:
            text = f"[Image OCR Content]\n{ocr_text}"
        else:
            text = f"[Image File: {Path(file_path).name}]"

    return text.strip()


# ─── Chunking ───────────────────────────────────────────────
def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks."""
    if not text:
        return []
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


# ─── Embedding ──────────────────────────────────────────────
def get_embedding(text: str) -> list[float]:
    """Get embedding vector via OpenAI/OpenRouter API, with hash fallback."""
    if openai_client:
        try:
            resp = openai_client.embeddings.create(
                model=EMBEDDING_MODEL,
                input=text[:8000],  # limit input length
            )
            return resp.data[0].embedding
        except Exception as e:
            print(f"⚠️ Embedding API error (falling back to hash): {e}")
    # Fallback: deterministic hash-based 128-dim vector
    h1 = hashlib.sha256(text.encode()).hexdigest()
    h2 = hashlib.sha512(text.encode()).hexdigest()
    combined = h1 + h2
    return [int(combined[i : i + 2], 16) / 255.0 for i in range(0, 256, 2)]


# ─── AI Content Analysis ────────────────────────────────────
def ai_analyze_content(filename: str, extracted_text: str, file_path: str = "") -> str:
    """Use LLM to analyze file content and generate a rich description.
    This ensures files can be found later by semantic search even without user notes."""
    if not openai_client:
        return ""

    is_image = any(filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"])

    # For images: try vision API with base64 image
    if is_image and file_path and Path(file_path).exists():
        try:
            with open(file_path, "rb") as f:
                img_data = base64.b64encode(f.read()).decode("utf-8")
            ext = filename.lower().split(".")[-1]
            mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}.get(ext, "image/jpeg")

            resp = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": (
                            "Analyze this image and describe what document or item it is. "
                            "Include: document type (e.g., Aadhaar card, PAN card, passport, certificate, ID card, photo, receipt, etc.), "
                            "any visible text, names, numbers, dates, organization names. "
                            "Be specific and comprehensive. This description will be used for search indexing. "
                            "Format: Start with the document type, then list key details."
                        )},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{img_data}", "detail": "low"}},
                    ],
                }],
                max_tokens=500,
                temperature=0.3,
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            print(f"⚠️ Vision analysis failed: {e}")

    # For text-based documents: summarize and extract key entities
    if extracted_text and not extracted_text.startswith("["):
        try:
            resp = openai_client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": (
                        "Analyze this document content and generate a rich, searchable description. "
                        "Include: document type, key entities (names, organizations, dates, ID numbers), "
                        "main topics, and what a user might search for to find this document. "
                        "Be comprehensive. Include alternate search terms and synonyms."
                    )},
                    {"role": "user", "content": f"Filename: {filename}\n\nContent:\n{extracted_text[:3000]}"},
                ],
                max_tokens=400,
                temperature=0.3,
            )
            return resp.choices[0].message.content or ""
        except Exception as e:
            print(f"⚠️ Content analysis failed: {e}")

    return ""


# ─── Auto-Categorization ────────────────────────────────────
def auto_categorize(filename: str, text: str) -> tuple[str, list[str]]:
    """Automatically categorize and tag a document or image."""
    lower = (filename + " " + text[:500]).lower()
    category = "Miscellaneous"
    tags = []

    rules = [
        ("Resume", ["resume", "cv", "curriculum vitae", "nelluru", "jaswanth"], ["resume", "career"]),
        ("Personal Documents", ["aadhaar", "aadhar", "pan card", "passport", "voter", "driving license", "id card"], ["identity", "government", "personal"]),
        ("Certificates", ["certificate", "certification", "diploma"], ["certificate"]),
        ("Education", ["marksheet", "semester", "grade card", "transcript", "marks memo"], ["education", "academic"]),
        ("Job Applications", ["offer letter", "appointment", "joining"], ["job", "offer"]),
        ("Finance", ["salary", "tax", "bank statement", "investment"], ["finance"]),
        ("Medical", ["medical", "prescription", "health", "hospital"], ["medical", "health"]),
        ("Study Notes", ["notes", "study", "lecture", "chapter", "java"], ["study", "notes"]),
        ("Projects", ["project", "architecture", "github", "repository"], ["project"]),
        ("Interview Experiences", ["interview", "coding round", "technical round"], ["interview"]),
    ]

    for cat, keywords, cat_tags in rules:
        if any(kw in lower for kw in keywords):
            category = cat
            tags.extend(cat_tags)
            break

    return category, list(set(tags))


# ─── Startup File Sync ──────────────────────────────────────
def sync_uploaded_files():
    """Sync any files on disk in UPLOADS_DIR with documents.json and ChromaDB."""
    docs = load_documents()
    existing_ids = {d["id"] for d in docs}
    
    updated = False
    for file_path in UPLOADS_DIR.iterdir():
        if file_path.is_file():
            doc_id = file_path.stem
            if doc_id not in existing_ids:
                extracted = extract_text(str(file_path))
                filename = file_path.name

                # AI analysis for auto-synced files
                ai_description = ai_analyze_content(filename, extracted, str(file_path))
                combined = f"{extracted} {ai_description}"
                auto_cat, auto_tags = auto_categorize(filename, combined)
                summary = ai_description[:400] if ai_description else (extracted[:250] + "..." if len(extracted) > 250 else extracted)

                # Build search entries
                search_entries = []
                meta_base = {"doc_id": doc_id, "filename": filename, "category": auto_cat, "user_note": "", "ai_description": ai_description[:500] if ai_description else ""}
                if ai_description:
                    search_entries.append({"id": f"{doc_id}_ai", "text": ai_description, "meta": {**meta_base, "entry_type": "ai_analysis"}})
                search_entries.append({"id": f"{doc_id}_meta", "text": f"{filename} {auto_cat}", "meta": {**meta_base, "entry_type": "file_meta"}})
                for i, chunk in enumerate(chunk_text(extracted)):
                    search_entries.append({"id": f"{doc_id}_chunk_{i}", "text": chunk, "meta": {**meta_base, "entry_type": "content"}})

                if collection and search_entries:
                    try:
                        ids = [e["id"] for e in search_entries]
                        texts = [e["text"] for e in search_entries]
                        metas = [e["meta"] for e in search_entries]
                        embs = [get_embedding(t) for t in texts]
                        collection.add(ids=ids, documents=texts, metadatas=metas, embeddings=embs)
                    except Exception as e:
                        print(f"Chroma sync warning: {e}")

                doc_obj = {
                    "id": doc_id,
                    "filename": filename,
                    "file_path": str(file_path),
                    "category": auto_cat,
                    "extracted_text": extracted,
                    "ai_description": ai_description,
                    "summary": summary,
                    "user_note": "",
                    "tags": auto_tags,
                    "chunks": len(search_entries),
                    "size": file_path.stat().st_size,
                    "uploaded_at": datetime.now().isoformat(),
                }
                docs.append(doc_obj)
                existing_ids.add(doc_id)
                updated = True

    if updated:
        save_documents(docs)
        print(f"✅ Synced {len(docs)} document(s) into knowledge base.")


def backfill_ai_descriptions():
    """Re-analyze existing documents that don't have ai_description yet."""
    if not openai_client:
        return
    docs = load_documents()
    backfilled = 0
    for d in docs:
        if not d.get("ai_description"):
            file_path = d.get("file_path", "")
            if file_path and Path(file_path).exists():
                ai_desc = ai_analyze_content(d["filename"], d.get("extracted_text", ""), file_path)
                if ai_desc:
                    d["ai_description"] = ai_desc
                    d["summary"] = ai_desc[:400]
                    # Re-categorize with AI info
                    combined = f"{d.get('extracted_text', '')} {ai_desc}"
                    new_cat, new_tags = auto_categorize(d["filename"], combined)
                    if d.get("category") in ("Miscellaneous", ""):
                        d["category"] = new_cat
                    d["tags"] = list(set(d.get("tags", []) + new_tags))
                    
                    # Add AI description to ChromaDB
                    if collection:
                        try:
                            doc_id = d["id"]
                            meta = {
                                "doc_id": doc_id,
                                "filename": d["filename"],
                                "category": d["category"],
                                "user_note": d.get("user_note", ""),
                                "ai_description": ai_desc[:500],
                                "entry_type": "ai_analysis",
                            }
                            collection.upsert(
                                ids=[f"{doc_id}_ai"],
                                documents=[ai_desc],
                                metadatas=[meta],
                                embeddings=[get_embedding(ai_desc)],
                            )
                        except Exception as e:
                            print(f"Chroma backfill warning: {e}")
                    
                    backfilled += 1
                    print(f"🔍 Backfilled AI analysis for: {d['filename']}")

    if backfilled > 0:
        save_documents(docs)
        print(f"✅ Backfilled {backfilled} document(s) with AI descriptions.")


def backfill_image_ocr():
    """Run multi-engine OCR on all image documents that lack extracted OCR text."""
    docs = load_documents()
    updated = False
    for d in docs:
        filename = d.get("filename", "")
        file_path = d.get("file_path", "")
        is_image = any(filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"])
        
        if is_image and file_path and Path(file_path).exists():
            curr_text = d.get("extracted_text", "")
            # Re-run OCR if missing or starts with generic fallback tag
            if not curr_text or curr_text.startswith("[Image File:"):
                print(f"🔍 Running multi-engine OCR scan on: {filename}...")
                ocr_text = extract_image_ocr(file_path)
                if ocr_text:
                    d["extracted_text"] = f"[Image OCR Content]\n{ocr_text}"
                    print(f"✅ OCR successfully extracted {len(ocr_text.splitlines())} text lines from {filename}")
                    
                    # Update AI description with extracted OCR text
                    if openai_client:
                        ai_desc = ai_analyze_content(filename, d["extracted_text"], file_path)
                        if ai_desc:
                            d["ai_description"] = ai_desc
                            d["summary"] = ai_desc[:400]
                    
                    new_cat, new_tags = auto_categorize(filename, f"{ocr_text} {d.get('ai_description', '')}")
                    if d.get("category") in ("Miscellaneous", ""):
                        d["category"] = new_cat
                    d["tags"] = list(set(d.get("tags", []) + new_tags))
                    
                    # Update ChromaDB vector index
                    if collection:
                        try:
                            doc_id = d["id"]
                            meta = {
                                "doc_id": doc_id,
                                "filename": filename,
                                "category": d["category"],
                                "user_note": d.get("user_note", ""),
                                "ai_description": d.get("ai_description", "")[:500],
                                "entry_type": "content",
                            }
                            collection.upsert(
                                ids=[f"{doc_id}_chunk_0"],
                                documents=[d["extracted_text"]],
                                metadatas=[meta],
                                embeddings=[get_embedding(d["extracted_text"])],
                            )
                        except Exception as e:
                            print(f"Chroma image OCR update warning: {e}")
                    
                    updated = True

    if updated:
        save_documents(docs)
        print("✅ Finished updating image OCR index in documents.json.")


@app.on_event("startup")
async def on_startup():
    try:
        sync_uploaded_files()
    except Exception as e:
        print(f"⚠️ File sync notice: {e}")
    try:
        backfill_image_ocr()
    except Exception as e:
        print(f"⚠️ Image OCR backfill notice: {e}")
    try:
        backfill_ai_descriptions()
    except Exception as e:
        print(f"⚠️ AI backfill notice: {e}")


# ─── Models ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    history: list[dict] = []


class SearchRequest(BaseModel):
    query: str
    limit: int = 10
    category: Optional[str] = None


class MemoryRequest(BaseModel):
    content: str
    category: str = "Personal Notes"
    tags: list[str] = []


class ConversationRenameRequest(BaseModel):
    title: str


# ─── Routes ─────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "status": "online",
        "app": "AI Second Brain",
        "version": "1.0.0",
        "chromadb": CHROMA_AVAILABLE and collection is not None,
        "openai": openai_client is not None,
        "documents": len(load_documents()),
    }


@app.get("/api/health")
async def health():
    doc_count = 0
    if collection:
        try:
            doc_count = collection.count()
        except Exception:
            pass
    return {
        "status": "healthy",
        "documents_indexed": doc_count,
        "documents_count": len(load_documents()),
        "memories_count": len(load_memories()),
        "openai_configured": openai_client is not None,
    }


@app.get("/api/documents")
async def get_documents():
    """Get list of all indexed documents."""
    return load_documents()


@app.get("/api/documents/file/{doc_id}")
async def get_document_file(doc_id: str):
    """Serve uploaded document or image file for inline viewing or download."""
    docs = load_documents()
    target_doc = None
    for d in docs:
        if d["id"] == doc_id or d["filename"] == doc_id or doc_id in d.get("file_path", ""):
            target_doc = d
            break

    if target_doc and Path(target_doc.get("file_path", "")).exists():
        file_path = Path(target_doc["file_path"])
        filename = target_doc.get("filename", file_path.name)
    else:
        matched_file = None
        for f in UPLOADS_DIR.iterdir():
            if doc_id in f.name:
                matched_file = f
                break
        if not matched_file:
            raise HTTPException(status_code=404, detail="Document file not found")
        file_path = matched_file
        filename = matched_file.name

    ext = filename.lower().split(".")[-1] if "." in filename else ""
    media_types = {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
        "gif": "image/gif",
        "txt": "text/plain; charset=utf-8",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(
        str(file_path),
        filename=filename,
        media_type=media_type,
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""}
    )


@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(""),
    user_note: str = Form(""),
):
    """Upload a document or image, extract text, store in vector DB & memories."""
    doc_id = str(uuid.uuid4())
    filename = file.filename or "uploaded_document"
    file_ext = Path(filename).suffix or ".pdf"
    save_path = UPLOADS_DIR / f"{doc_id}{file_ext}"

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    extracted_text = extract_text(str(save_path), file.content_type or "")

    # ── AI-powered content analysis ──
    # Automatically analyze what the file/image contains using LLM
    ai_description = ai_analyze_content(filename, extracted_text, str(save_path))
    print(f"🔍 AI Analysis for {filename}: {ai_description[:200]}..." if ai_description else f"ℹ️ No AI analysis for {filename}")

    # Combine all text for categorization: user_note + extracted_text + AI analysis
    combined_for_cat = f"{extracted_text} {user_note} {ai_description}"
    auto_cat, auto_tags = auto_categorize(filename, combined_for_cat)
    if not category:
        category = auto_cat

    # Generate a meaningful summary
    if ai_description:
        summary = ai_description[:400]
    elif extracted_text and not extracted_text.startswith("["):
        summary = extracted_text[:300] + "..." if len(extracted_text) > 300 else extracted_text
    else:
        summary = f"File ({filename}) stored as {category}." + (f" Note: {user_note}" if user_note else "")

    # ── Build searchable entries for ChromaDB ──
    search_entries = []
    meta_base = {
        "doc_id": doc_id,
        "filename": filename,
        "category": category,
        "user_note": user_note,
        "ai_description": ai_description[:500] if ai_description else "",
    }

    # Entry 1: The user's own description (highest priority for retrieval)
    if user_note:
        label = f"{user_note} | file: {filename} | category: {category}"
        search_entries.append({"id": f"{doc_id}_note", "text": label, "meta": {**meta_base, "entry_type": "user_note"}})

    # Entry 2: AI-generated description (critical for finding files by content)
    if ai_description:
        search_entries.append({"id": f"{doc_id}_ai", "text": ai_description, "meta": {**meta_base, "entry_type": "ai_analysis"}})

    # Entry 3: Filename + category as searchable text
    search_entries.append({"id": f"{doc_id}_meta", "text": f"{filename} {category} {' '.join(auto_tags)}", "meta": {**meta_base, "entry_type": "file_meta"}})

    # Entry 4+: Content chunks from extracted text
    chunks = chunk_text(extracted_text)
    for i, chunk in enumerate(chunks):
        search_entries.append({"id": f"{doc_id}_chunk_{i}", "text": chunk, "meta": {**meta_base, "entry_type": "content", "chunk_index": str(i)}})

    # Fallback: if no content & no AI analysis, ensure something is indexed
    if not chunks and not ai_description and not user_note:
        search_entries.append({"id": f"{doc_id}_fallback", "text": f"{filename} {category}", "meta": {**meta_base, "entry_type": "fallback"}})

    if collection and search_entries:
        try:
            ids = [e["id"] for e in search_entries]
            docs_text = [e["text"] for e in search_entries]
            metas = [e["meta"] for e in search_entries]
            embeddings = [get_embedding(t) for t in docs_text]
            collection.add(ids=ids, documents=docs_text, metadatas=metas, embeddings=embeddings)
        except Exception as e:
            print(f"ChromaDB store warning: {e}")

    doc_obj = {
        "id": doc_id,
        "filename": filename,
        "file_path": str(save_path),
        "category": category,
        "extracted_text": extracted_text,
        "ai_description": ai_description,
        "summary": summary,
        "user_note": user_note,
        "tags": auto_tags,
        "chunks": len(search_entries),
        "size": len(content),
        "uploaded_at": datetime.now().isoformat(),
    }

    docs = load_documents()
    docs.append(doc_obj)
    save_documents(docs)

    # Always save a memory entry for retrieval
    memories = load_memories()
    mem_content = user_note if user_note else (ai_description[:200] if ai_description else f"Stored file: {filename} ({category})")
    mem_obj = {
        "id": str(uuid.uuid4()),
        "doc_id": doc_id,
        "filename": filename,
        "content": mem_content,
        "category": category,
        "tags": auto_tags,
        "created_at": datetime.now().isoformat(),
    }
    memories.append(mem_obj)
    save_memories(memories)

    return doc_obj


# ─── Document Presentation Helper ───────────────────────────
def format_document_response(doc: dict, sources: Optional[list] = None, include_details: bool = False) -> str:
    """Format direct document or image/PDF response. Compact card by default; detailed analysis only when requested."""
    filename = doc.get("filename", "Document.pdf")
    category = doc.get("category", "Document")
    doc_id = doc.get("id", "")
    extracted_text = doc.get("extracted_text", "")
    ai_description = doc.get("ai_description", "")
    user_note = doc.get("user_note", "")
    size_bytes = doc.get("size", 0)
    size_str = f"{round(size_bytes / 1024, 1)} KB" if size_bytes else "Unknown size"
    
    file_url = f"http://localhost:8000/api/documents/file/{doc_id}"
    is_image = any(filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"])

    md = f"📄 **Document File:** `{filename}`\n"
    md += f"📂 **Category:** `{category}` | 📦 **Size:** `{size_str}`\n\n"

    if is_image:
        md += f"🖼️ **Image Preview:**\n\n"
        md += f"![{filename}]({file_url})\n\n"
        md += f"📥 [**Click Here to View / Download Full Image**]({file_url})\n\n"
    else:
        md += f"📥 [**Click Here to View / Download Document File**]({file_url})\n\n"
        
    if user_note:
        md += f"💡 **Stored Memory Note:** *\"{user_note}\"*\n\n"

    # Include detailed AI analysis & extracted text ONLY if explicitly requested by user
    if include_details:
        md += "---\n\n"
        if ai_description:
            md += "### 🤖 AI Analysis\n\n"
            md += f"{ai_description}\n\n"
            md += "---\n\n"

        md += "### 📊 Document Content Details\n\n"
        lines = [line.strip() for line in extracted_text.split("\n") if line.strip()]
        if lines and not lines[0].startswith("[Image File:"):
            for line in lines[:30]:
                if any(k in line.lower() for k in ["name", "email", "phone", "education", "experience", "skills", "summary", "projects", "certif", "aadhar", "identity"]):
                    md += f"- **{line}**\n"
                else:
                    md += f"- {line}\n"
        else:
            md += f"- **File Name:** `{filename}`\n"
            md += f"- **Category:** `{category}`\n"
            if user_note:
                md += f"- **User Description:** *{user_note}*\n"
            if ai_description:
                md += f"- **AI Identified As:** *{ai_description[:200]}*\n"

    return md.strip()


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """RAG-powered chat: store memories, retrieve docs by user description, generate response."""
    message = request.message
    message_lower = message.lower().strip()

    # ── 1. STORE: detect memory-save commands (text-only, no file) ──
    store_triggers = ["remember", "save", "store", "note", "memorize", "keep"]
    is_store_cmd = any(t in message_lower for t in store_triggers) and not any(
        ext in message_lower for ext in [".jpeg", ".jpg", ".png", ".pdf", ".docx"]
    )

    if is_store_cmd:
        # Strip the trigger word to get the actual content
        mem_text = message
        for t in store_triggers:
            for phrase in [f"{t} this", f"{t} that", f"please {t}", t]:
                mem_text = mem_text.replace(phrase, "").replace(phrase.capitalize(), "")
        mem_text = mem_text.strip().strip(":").strip()
        if not mem_text:
            mem_text = message

        memories = load_memories()
        new_mem = {
            "id": str(uuid.uuid4()),
            "content": mem_text,
            "category": "Personal Notes",
            "tags": [],
            "created_at": datetime.now().isoformat(),
        }
        memories.append(new_mem)
        save_memories(memories)

        # Also index in ChromaDB for vector retrieval
        if collection:
            try:
                collection.add(
                    ids=[new_mem["id"]],
                    documents=[mem_text],
                    metadatas=[{"entry_type": "memory", "doc_id": "", "filename": "", "category": "Personal Notes", "user_note": mem_text}],
                    embeddings=[get_embedding(mem_text)],
                )
            except Exception:
                pass

        return {
            "response": f"✅ **Saved to memory!**\n\n> {mem_text}\n\nAsk me anytime to recall this.",
            "sources": [],
            "memory_saved": True,
        }

    # ── 1b. LIST: detect listing/browsing intents ──
    list_patterns = [
        "show my documents", "show my files", "show all documents", "show all files",
        "list my documents", "list my files", "list all documents", "list all files",
        "what did i store", "what have i stored", "what did i upload", "what have i uploaded",
        "what documents", "what files", "my documents", "my files",
        "show documents", "show files", "list documents", "list files",
        "all documents", "all files", "show everything", "show all",
        "what do i have", "what's in my", "what is in my",
        "show stored", "list stored", "view documents", "view files",
        "view my documents", "view my files", "get my documents", "get my files",
    ]
    is_list_cmd = any(pat in message_lower for pat in list_patterns)

    if is_list_cmd:
        all_docs = load_documents()
        all_memories = load_memories()

        if not all_docs and not all_memories:
            return {
                "response": "📂 Your knowledge base is empty.\n\n**To get started:**\n- Attach a file using the 📎 button and describe what it is.\n- Type \"remember ...\" to save a note.",
                "sources": [],
                "context_found": False,
            }

        md = f"📂 **Your Knowledge Base** — {len(all_docs)} document(s), {len(all_memories)} memory/memories\n\n"

        if all_docs:
            md += "### 📄 Documents\n\n"
            for d in all_docs:
                doc_id = d.get("id", "")
                fname = d.get("filename", "Unknown")
                cat = d.get("category", "Miscellaneous")
                note = d.get("user_note", "")
                size = d.get("size", 0)
                size_str = f"{round(size / 1024, 1)} KB" if size else ""
                url = f"http://localhost:8000/api/documents/file/{doc_id}"
                md += f"- 📎 **{fname}** — `{cat}`"
                if size_str:
                    md += f" · {size_str}"
                if note:
                    md += f"\n  💡 *{note}*"
                md += f"\n  📥 [View / Download]({url})\n\n"

        if all_memories:
            non_doc_memories = [m for m in all_memories if not m.get("doc_id")]
            if non_doc_memories:
                md += "### 🧠 Saved Memories\n\n"
                for m in non_doc_memories[:10]:
                    md += f"- 💡 {m['content']}\n"

        sources = [
            {
                "docId": d["id"],
                "docName": d["filename"],
                "snippet": d.get("user_note") or d.get("summary", "")[:100],
                "relevance": 1.0,
            }
            for d in all_docs[:5]
        ]
        return {"response": md.strip(), "sources": sources, "context_found": True}

    # ── 2. RETRIEVE: search documents, memories, and ChromaDB ──
    # 2a. Tokenize query — remove common stop words to get meaningful keywords
    STOP = {"show", "give", "find", "view", "get", "what", "where", "which",
            "my", "me", "the", "is", "this", "that", "it", "in", "your",
            "memory", "please", "can", "you", "do", "have", "of", "a", "an",
            "to", "for", "and", "or", "from", "about", "with", "i", "want",
            "need", "see", "open", "tell", "look", "up", "documents", "files",
            "document", "file", "all", "everything", "stored", "uploaded"}
    raw_words = [w.strip(".,!?\"'()") for w in message_lower.split() if len(w) > 1]
    keywords = [w for w in raw_words if w not in STOP]
    if not keywords:
        # If all words are stop words, this is likely a generic query — return all docs
        all_docs = load_documents()
        if all_docs:
            keywords = raw_words  # fallback: use all words
        else:
            keywords = raw_words

    # 2a-ii. Expand keywords with common synonyms/spelling variants
    SYNONYMS = {
        "aadhaar": ["aadhar", "adhar", "aadhaar", "aadhar", "uidai", "uid", "aadhaar card", "aadhar card"],
        "aadhar": ["aadhaar", "adhar", "uidai", "uid", "aadhaar card"],
        "adhar": ["aadhaar", "aadhar", "uidai"],
        "pan": ["pan card", "pancard", "income tax", "permanent account number"],
        "passport": ["passport", "travel document"],
        "resume": ["cv", "curriculum vitae", "biodata"],
        "cv": ["resume", "curriculum vitae"],
        "certificate": ["cert", "certification", "diploma"],
        "marksheet": ["marks memo", "grade card", "transcript", "marks sheet"],
        "license": ["licence", "driving license", "dl"],
        "voter": ["voter id", "election card", "epic"],
        "photo": ["photograph", "picture", "image", "selfie"],
    }
    expanded_keywords = list(keywords)
    for kw in keywords:
        if kw in SYNONYMS:
            expanded_keywords.extend(SYNONYMS[kw])
    expanded_keywords = list(set(expanded_keywords))

    # 2b. Search documents.json by user_note, filename, category, tags, ai_description
    all_docs = load_documents()
    scored_docs = []

    for d in all_docs:
        note = (d.get("user_note") or "").lower()
        fname = d.get("filename", "").lower()
        cat = d.get("category", "").lower()
        tags = " ".join(d.get("tags", [])).lower()
        text = (d.get("extracted_text") or "").lower()[:2000]
        ai_desc = (d.get("ai_description") or "").lower()
        summary = (d.get("summary") or "").lower()

        score = 0
        for kw in expanded_keywords:
            if kw in note:      score += 10  # user's own words = highest priority
            if kw in ai_desc:   score += 8   # AI analysis = very high priority
            if kw in fname:     score += 5
            if kw in cat:       score += 3
            if kw in tags:      score += 3
            if kw in summary:   score += 2
            if kw in text:      score += 1

        if score > 0:
            scored_docs.append((score, d))

    scored_docs.sort(key=lambda x: x[0], reverse=True)
    matched_doc = scored_docs[0][1] if scored_docs else None
    match_score = scored_docs[0][0] if scored_docs else 0

    # 2c. Search memories
    all_memories = load_memories()
    matched_memories = []
    for mem in all_memories:
        content_lower = mem["content"].lower()
        mem_score = sum(3 for kw in keywords if kw in content_lower)
        if mem_score > 0:
            matched_memories.append((mem_score, mem))
    matched_memories.sort(key=lambda x: x[0], reverse=True)

    # 2d. ChromaDB vector search (with strict relevance threshold)
    chroma_sources = []
    chroma_context = []
    if collection and collection.count() > 0:
        try:
            q_emb = get_embedding(message)
            results = collection.query(query_embeddings=[q_emb], n_results=5)
            if results and results.get("documents") and results["documents"][0]:
                for i, doc_text in enumerate(results["documents"][0]):
                    meta = results["metadatas"][0][i] if results.get("metadatas") else {}
                    dist = results["distances"][0][i] if results.get("distances") else 1.0
                    relevance = round(1 - dist, 2)
                    # Filter out low-relevance results (cosine distance > 0.45 means not relevant)
                    if dist <= 0.45:
                        chroma_context.append(doc_text)
                        chroma_sources.append({
                            "docId": meta.get("doc_id", ""),
                            "docName": meta.get("filename") or meta.get("user_note", "")[:40] or "Document",
                            "snippet": (meta.get("user_note") or doc_text)[:200],
                            "relevance": relevance,
                        })
        except Exception as e:
            print(f"⚠️ ChromaDB search error: {e}")

    # ── 3. BUILD RESPONSE ──
    # Helper Intent Detectors
    question_triggers = [
        "what", "who", "where", "when", "why", "how", "tell me", "can you",
        "do i", "is there", "what's", "my name", "my phone", "my email",
        "my age", "my address", "my skills", "who am i", "hi", "hello", "hey"
    ]
    is_question_query = any(qt in message_lower for qt in question_triggers) or "?" in message

    explain_triggers = [
        "explain", "summarize", "summary", "analyze", "analysis", "details",
        "what is inside", "what's in", "read", "describe", "overview", "contents"
    ]
    is_explain_requested = any(et in message_lower for et in explain_triggers)

    # ── CASE A: Conversational QA / Personal Questions ("what is my father name?", "what is my name?", "who am I?") ──
    # ALWAYS scan across ALL documents and memories in the user's personal knowledge base to find the exact answer!
    if is_question_query:
        context_snippets = []
        sources = []

        all_docs = load_documents()
        all_memories = load_memories()

        # Build comprehensive personal knowledge context from ALL uploaded documents
        for d in all_docs:
            fname = d.get("filename", "Document")
            doc_id = d.get("id", "")
            cat = d.get("category", "")
            user_note = d.get("user_note", "")
            ai_desc = d.get("ai_description", "")
            extracted = d.get("extracted_text", "")
            if extracted.startswith("[Image File:"):
                extracted = ""
            else:
                extracted = extracted[:1500]

            doc_entry = f"📄 Document File: '{fname}' (Category: {cat})\n"
            if user_note:
                doc_entry += f"User Description Note: {user_note}\n"
            if ai_desc:
                doc_entry += f"AI Extracted Summary & Details:\n{ai_desc}\n"
            if extracted:
                doc_entry += f"Extracted Text Content:\n{extracted}\n"

            context_snippets.append(doc_entry.strip())
            sources.append({
                "docId": doc_id,
                "docName": fname,
                "snippet": user_note or ai_desc[:120] or extracted[:120] or cat,
                "relevance": 1.0
            })

        # Add all saved memory notes
        non_doc_memories = [m for m in all_memories if not m.get("doc_id")]
        if non_doc_memories:
            mem_text = "🧠 Saved Personal Notes & Memories:\n"
            for m in non_doc_memories:
                mem_text += f"- {m['content']}\n"
            context_snippets.append(mem_text.strip())

        # Add ChromaDB vector context if any
        for c in chroma_context[:3]:
            if c not in context_snippets:
                context_snippets.append(f"Vector Context Snippet: {c}")

        if context_snippets and openai_client:
            try:
                context_text = "\n\n---\n\n".join(context_snippets)
                llm_messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are Nuvio, an intelligent Personal AI Assistant. "
                            "You have full access to the user's personal knowledge base containing all their uploaded documents (Resumes, Marklists, Identity Cards, Photos, Certificates) and saved memories. "
                            "When the user asks any personal question (e.g. about their name, father's name, mother's name, DOB, roll number, address, phone number, skills, marks, etc.):\n"
                            "1. Search across ALL provided documents and memories to find the exact answer.\n"
                            "2. Answer directly, accurately, and concisely. Mention which document (e.g., 10th marklist, Resume, Aadhaar card) the information came from.\n"
                            "3. If the requested information is NOT present in any of their uploaded documents or memories, state clearly that it is not found in their current documents, list the document names checked, and invite them to share it so you can remember it.\n"
                            "4. Keep your answer direct and helpful. Do NOT dump raw file schemas or unrequested file lists unless explicitly asked."
                        )
                    },
                    {"role": "system", "content": f"User's Complete Personal Knowledge Base Context:\n\n{context_text}"},
                ]
                for h in request.history[-6:]:
                    llm_messages.append({"role": h["role"], "content": h["content"]})
                llm_messages.append({"role": "user", "content": message})

                resp = openai_client.chat.completions.create(
                    model=CHAT_MODEL,
                    messages=llm_messages,
                    max_tokens=500,
                    temperature=0.3,
                )
                answer = (resp.choices[0].message.content or "").strip()
                if answer:
                    return {"response": answer, "sources": sources, "context_found": True}
            except Exception as e:
                print(f"⚠️ LLM question QA error: {e}")

    # ── CASE B: Specific Document Retrieval / View Request (e.g. "show my resume", "give aadhar card") ──
    if matched_doc and match_score >= 3:
        second_score = scored_docs[1][0] if len(scored_docs) > 1 else 0
        is_unambiguous = (len(scored_docs) == 1) or (second_score < match_score * 0.75)
        
        if is_unambiguous:
            doc_response = format_document_response(matched_doc, include_details=is_explain_requested)
            sources = [{
                "docId": matched_doc["id"],
                "docName": matched_doc["filename"],
                "snippet": matched_doc.get("user_note") or matched_doc.get("summary", "")[:200],
                "relevance": 1.0,
            }]
            return {"response": doc_response, "sources": sources, "context_found": True}
        else:
            high_scoring_docs = [d for sc, d in scored_docs if sc >= match_score * 0.75]
            multi_response = "📚 **Found Matching Documents:**\n\n"
            sources = []
            for d in high_scoring_docs:
                multi_response += format_document_response(d, include_details=is_explain_requested) + "\n\n---\n\n"
                sources.append({
                    "docId": d["id"],
                    "docName": d["filename"],
                    "snippet": d.get("user_note") or d.get("summary", "")[:200],
                    "relevance": 1.0,
                })
            return {"response": multi_response.strip(), "sources": sources, "context_found": True}

    # ── CASE C: Memory Match Found ──
    if matched_memories:
        mem_lines = []
        sources = []
        for _, mem in matched_memories[:5]:
            doc_id = mem.get("doc_id", "")
            fname = mem.get("filename", "")
            if doc_id and fname:
                url = f"http://localhost:8000/api/documents/file/{doc_id}"
                mem_lines.append(f"- 📎 **{fname}** — *{mem['content']}*\n  📥 [View/Download]({url})")
                sources.append({
                    "docId": doc_id,
                    "docName": fname,
                    "snippet": mem['content'][:200],
                    "relevance": 1.0,
                })
            else:
                mem_lines.append(f"- 💡 {mem['content']}")
        answer = "📚 **From your memory:**\n\n" + "\n\n".join(mem_lines)
        return {"response": answer, "sources": sources if sources else chroma_sources, "context_found": True}

    # ── CASE D: ChromaDB / LLM General Context ──
    if chroma_context:
        context_text = "\n\n---\n\n".join(chroma_context)

        if openai_client:
            try:
                llm_messages = [
                    {"role": "system", "content": "You are Nuvio, a personal AI assistant. Answer using ONLY the provided context concisely. Do not dump unnecessary files."},
                    {"role": "system", "content": f"Context from knowledge base:\n\n{context_text}"},
                ]
                for h in request.history[-6:]:
                    llm_messages.append({"role": h["role"], "content": h["content"]})
                llm_messages.append({"role": "user", "content": message})

                resp = openai_client.chat.completions.create(
                    model=CHAT_MODEL, messages=llm_messages, max_tokens=600, temperature=0.4,
                )
                return {"response": resp.choices[0].message.content or "", "sources": chroma_sources, "context_found": True}
            except Exception as e:
                print(f"⚠️ LLM error: {e}")

        return {
            "response": f"📚 **Retrieved from your knowledge base:**\n\n{context_text}",
            "sources": chroma_sources,
            "context_found": True,
        }

    # ── CASE E: Nothing Found ──
    return {
        "response": f"I searched your knowledge base for: *\"{message}\"*\n\n> No matching documents or memories found.\n\n**To store data:** Attach a file using the 📎 button and describe what it is.\n**To save a note:** Type \"remember my phone is 9876543210\"",
        "sources": [],
        "context_found": False,
    }


# ─── Conversation History API ───────────────────────────────

@app.get("/api/conversations")
async def list_conversations(page: int = 0, size: int = 50, search: Optional[str] = None):
    """List conversations, sorted by last_message_at DESC. Supports pagination and title search."""
    convs = load_conversations()
    
    # Search filter
    if search:
        search_lower = search.lower()
        convs = [c for c in convs if search_lower in c.get("title", "").lower()]
    
    # Sort by last_message_at descending
    convs.sort(key=lambda c: c.get("last_message_at", c.get("created_at", "")), reverse=True)
    
    total = len(convs)
    start = page * size
    end = start + size
    paginated = convs[start:end]
    
    # Return summary (without full messages for performance)
    result = []
    for c in paginated:
        msgs = c.get("messages", [])
        result.append({
            "id": c["id"],
            "title": c.get("title", "New Chat"),
            "created_at": c.get("created_at", ""),
            "updated_at": c.get("updated_at", ""),
            "last_message_at": c.get("last_message_at", c.get("created_at", "")),
            "message_count": len(msgs),
            "last_message_preview": msgs[-1]["content"][:80] if msgs else "",
        })
    
    return {"conversations": result, "total": total, "page": page, "size": size}


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get a single conversation with all messages."""
    convs = load_conversations()
    conv = next((c for c in convs if c["id"] == conversation_id), None)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation": {
            "id": conv["id"],
            "title": conv.get("title", "New Chat"),
            "created_at": conv.get("created_at", ""),
            "updated_at": conv.get("updated_at", ""),
            "last_message_at": conv.get("last_message_at", ""),
        },
        "messages": conv.get("messages", []),
    }


@app.post("/api/conversations")
async def create_conversation():
    """Create a new empty conversation. Usually called when user sends first message."""
    convs = load_conversations()
    now = datetime.now().isoformat()
    new_conv = {
        "id": str(uuid.uuid4()),
        "title": "New Chat",
        "messages": [],
        "created_at": now,
        "updated_at": now,
        "last_message_at": now,
    }
    convs.append(new_conv)
    save_conversations(convs)
    return new_conv


@app.patch("/api/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, request: ConversationRenameRequest):
    """Rename a conversation."""
    convs = load_conversations()
    conv = next((c for c in convs if c["id"] == conversation_id), None)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conv["title"] = request.title[:80]
    conv["updated_at"] = datetime.now().isoformat()
    save_conversations(convs)
    return {"id": conv["id"], "title": conv["title"]}


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation and all its messages."""
    convs = load_conversations()
    original_len = len(convs)
    convs = [c for c in convs if c["id"] != conversation_id]
    if len(convs) == original_len:
        raise HTTPException(status_code=404, detail="Conversation not found")
    save_conversations(convs)
    return {"status": "deleted", "conversation_id": conversation_id}


@app.post("/api/conversations/{conversation_id}/chat")
async def conversation_chat(conversation_id: str, request: ChatRequest):
    """Send a message in an existing conversation. Runs the full RAG pipeline and saves both messages."""
    convs = load_conversations()
    conv = next((c for c in convs if c["id"] == conversation_id), None)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    now = datetime.now().isoformat()
    
    # Save user message
    user_msg = {"role": "user", "content": request.message, "timestamp": now}
    conv["messages"].append(user_msg)
    
    # Auto-generate title on first user message
    is_first_message = sum(1 for m in conv["messages"] if m["role"] == "user") == 1
    if is_first_message and conv.get("title") in ("New Chat", ""):
        conv["title"] = generate_conversation_title(request.message)
    
    # Build history from conversation messages for RAG context
    request.history = [{"role": m["role"], "content": m["content"]} for m in conv["messages"][-8:]]
    
    # Run the RAG chat pipeline (reuse the existing chat logic)
    # We call the internal chat logic directly
    result = await chat(request)
    
    # Save assistant response
    assistant_msg = {
        "role": "assistant",
        "content": result.get("response", ""),
        "timestamp": datetime.now().isoformat(),
        "sources": result.get("sources", []),
    }
    conv["messages"].append(assistant_msg)
    
    # Update timestamps
    conv["updated_at"] = datetime.now().isoformat()
    conv["last_message_at"] = datetime.now().isoformat()
    
    save_conversations(convs)
    
    return {
        **result,
        "conversation_id": conversation_id,
        "title": conv["title"],
    }


@app.post("/api/search")
async def search(request: SearchRequest):
    """Hybrid search across documents and memories."""
    results = []

    docs = load_documents()
    query_words = [w.lower() for w in request.query.split() if len(w) > 2]

    for d in docs:
        combined = (d.get("filename", "") + " " + d.get("category", "") + " " + d.get("user_note", "") + " " + d.get("ai_description", "") + " " + d.get("extracted_text", "")).lower()
        matches = sum(1 for w in query_words if w in combined)
        if matches > 0:
            results.append({
                "type": "document",
                "id": d["id"],
                "title": d["filename"],
                "snippet": d.get("user_note") or d.get("summary") or d.get("extracted_text", "")[:200],
                "relevance": min(matches / max(len(query_words), 1), 1.0),
                "category": d.get("category", "Document"),
                "timestamp": d.get("uploaded_at", ""),
                "file_url": f"http://localhost:8000/api/documents/file/{d['id']}",
            })

    memories = load_memories()
    for mem in memories:
        content_lower = mem["content"].lower()
        matches = sum(1 for w in query_words if w in content_lower)
        if matches > 0:
            results.append({
                "type": "memory",
                "id": mem["id"],
                "title": mem["content"][:60],
                "snippet": mem["content"],
                "relevance": min(matches / max(len(query_words), 1), 1.0),
                "category": mem.get("category", "Memory"),
                "timestamp": mem.get("created_at", ""),
            })

    seen = set()
    unique_results = []
    for r in sorted(results, key=lambda x: x["relevance"], reverse=True):
        if r["id"] not in seen:
            seen.add(r["id"])
            unique_results.append(r)

    return {"results": unique_results[: request.limit], "total": len(unique_results)}


@app.post("/api/memories")
async def create_memory(request: MemoryRequest):
    """Save a new memory."""
    memories = load_memories()
    new_memory = {
        "id": str(uuid.uuid4()),
        "content": request.content,
        "category": request.category,
        "tags": request.tags,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
    }
    memories.append(new_memory)
    save_memories(memories)

    if collection:
        try:
            collection.add(
                ids=[new_memory["id"]],
                documents=[request.content],
                metadatas=[{"type": "memory", "category": request.category}],
            )
        except Exception:
            pass

    return new_memory


@app.get("/api/memories")
async def list_memories():
    """List all memories."""
    return load_memories()


@app.delete("/api/memories/{memory_id}")
async def delete_memory(memory_id: str):
    """Delete a memory."""
    memories = load_memories()
    memories = [m for m in memories if m["id"] != memory_id]
    save_memories(memories)

    if collection:
        try:
            collection.delete(ids=[memory_id])
        except Exception:
            pass

    return {"status": "deleted"}


@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document from documents.json, file storage, and ChromaDB."""
    docs = load_documents()
    target_doc = next((d for d in docs if d["id"] == doc_id), None)
    
    if not target_doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove from list
    docs = [d for d in docs if d["id"] != doc_id]
    save_documents(docs)

    # Also delete associated memories if any
    memories = load_memories()
    memories = [m for m in memories if m.get("doc_id") != doc_id]
    save_memories(memories)

    # Delete physical file
    file_path = Path(target_doc.get("file_path", ""))
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            print(f"Warning: Failed to delete file {file_path}: {e}")

    # Remove from ChromaDB collection
    if collection:
        try:
            # Delete all entries starting with doc_id (chunks, note, meta)
            results = collection.get(where={"doc_id": doc_id})
            if results and results.get("ids"):
                collection.delete(ids=results["ids"])
        except Exception as e:
            print(f"ChromaDB delete warning: {e}")

    return {"status": "deleted", "doc_id": doc_id}


# ─── Run ────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    print("\n🧠 AI Second Brain Backend Starting...")
    print(f"   ChromaDB:  {'✅' if CHROMA_AVAILABLE else '❌'}")
    print(f"   OpenAI:    {'✅' if openai_client else '⚠️ Running in Local RAG Mode'}")
    print(f"   Documents: {len(load_documents())} indexed")
    print(f"   Data Dir:  {DATA_DIR.absolute()}\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
