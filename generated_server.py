import os
import base64
import requests
import json
import logging
from datetime import datetime
from decimal import Decimal
from typing import List
import re
from PIL import Image
import io
import math
import secrets
import hashlib

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient

from dotenv import load_dotenv
from pydantic import BaseModel

from sqlalchemy import create_engine, Column, Integer, String, Numeric, DateTime, ForeignKey, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker, relationship, Session

# --- CONFIGURATION & ENV ---
load_dotenv()
OPENROUTER_API_KEY = os.getenv("PM_API_KEY") 
CLERK_FRONTEND_API = os.getenv("CLERK_FRONTEND_API")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- DATABASE SETUP ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing from the .env file!")

Base = declarative_base()
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 1. ORGANIZATIONS (The Core Tenant)
class Organization(Base):
    __tablename__ = "organizations"
    org_id = Column(String, primary_key=True, index=True) 
    name = Column(String, nullable=False)
    api_credits = Column(Integer, default=50) # Prevents OpenRouter abuse!
    created_at = Column(DateTime, default=datetime.utcnow)
    
    users = relationship("OrganizationMember", back_populates="organization")
    invoices = relationship("Invoice", back_populates="organization")

# 2. USERS (The Individuals)
class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, index=True) 
    email = Column(String, default="user@example.com")
    
    organizations = relationship("OrganizationMember", back_populates="user")

# 3. ROLES & ACCESS (The Delegation Engine)
class OrganizationMember(Base):
    __tablename__ = "organization_members"
    id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, ForeignKey("organizations.org_id"))
    user_id = Column(String, ForeignKey("users.user_id"))
    role = Column(String, default="owner") 
    
    organization = relationship("Organization", back_populates="users")
    user = relationship("User", back_populates="organizations")

# 4. INVOICES (Secured to an Organization)
class Invoice(Base):
    __tablename__ = "invoices"
    invoice_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, ForeignKey("organizations.org_id"), nullable=False) # SECURITY LOCK
    vendor_name = Column(String, nullable=False)
    invoice_number = Column(String)
    amount = Column(Numeric(10, 2))
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    organization = relationship("Organization", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    item_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"))
    description = Column(String)
    quantity = Column(Numeric(10, 2))
    unit_price = Column(Numeric(10, 2))
    total_price = Column(Numeric(10, 2))
    
    invoice = relationship("Invoice", back_populates="items")

Base.metadata.create_all(bind=engine)

# 5. API KEYS (Machine-to-Machine Access)
class ApiKey(Base):
    __tablename__ = "api_keys"
    key_id = Column(Integer, primary_key=True, index=True)
    org_id = Column(String, ForeignKey("organizations.org_id"), nullable=False)
    name = Column(String, nullable=False) # e.g., "Zapier Integration"
    hashed_key = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)

# 6. AUDIT LOGS (The Accountability Trail)
class AuditLog(Base):
    __tablename__ = "audit_logs"
    log_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), nullable=False)
    changed_by = Column(String, nullable=False) # Clerk User ID or "API Key: Zapier"
    field_name = Column(String, nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
# --- PYDANTIC MODELS ---
class InvoiceItemEdit(BaseModel):
    description: str
    quantity: float
    unit_price: float
    total_price: float

class InvoiceEditRequest(BaseModel):
    vendor_name: str
    invoice_number: str
    amount: float
    status: str
    items: List[InvoiceItemEdit] = []

class QueryRequest(BaseModel):
    query: str

# --- FASTAPI APP ---
app = FastAPI(title="AI ERP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- CLERK SECURITY MIDDLEWARE ---
security = HTTPBearer()

# Fetches Clerk's public keys to verify the ID Badges
jwks_url = f"{CLERK_FRONTEND_API.rstrip('/')}/.well-known/jwks.json"
jwks_client = PyJWKClient(jwks_url)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_auth_context(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """Verifies either a Clerk JWT OR an M2M API Key. Returns an Auth Context dictionary."""
    token = credentials.credentials
    
    # Pathway A: Machine-to-Machine API Key
    if token.startswith("nk_live_"):
        hashed_token = hashlib.sha256(token.encode()).hexdigest()
        api_key_record = db.query(ApiKey).filter(ApiKey.hashed_key == hashed_token).first()
        
        if not api_key_record:
            raise HTTPException(status_code=401, detail="Invalid API Key")
            
        # Update last used timestamp
        api_key_record.last_used = datetime.utcnow()
        db.commit()
        
        return {"auth_type": "api_key", "org_id": api_key_record.org_id, "identifier": f"API Key ({api_key_record.name})"}
        
    # Pathway B: Human User Clerk JWT
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, signing_key.key, algorithms=["RS256"])
        user_id = payload.get("sub")
        org_id = get_or_create_user_org(db, user_id)
        
        return {"auth_type": "human", "org_id": org_id, "identifier": user_id}
    except Exception as e:
        logger.error(f"Token Verification Failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid Authentication Token")

# --- AUTO-PROVISIONING ENGINE ---
def get_or_create_user_org(db, user_id: str):
    """If a new user logs in, instantly build their workspace!"""
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        # 1. Create User
        user = User(user_id=user_id)
        db.add(user)
        # 2. Create Workspace
        org_id = f"org_{user_id}"
        org = Organization(org_id=org_id, name="My Personal Workspace", api_credits=50)
        db.add(org)
        # 3. Make User the Owner
        db.add(OrganizationMember(org_id=org_id, user_id=user_id, role="owner"))
        db.commit()
    
    # Return their primary organization ID
    member = db.query(OrganizationMember).filter(OrganizationMember.user_id == user_id).first()
    return member.org_id

def optimize_image_for_llm(file_bytes: bytes) -> tuple[bytes, str]:
    """
    Compresses and resizes an image to cap LLM token costs.
    Returns the optimized bytes and the new mime type.
    """
    # Load the image into memory
    image = Image.open(io.BytesIO(file_bytes))
    
    # Strip alpha channels (transparency) to prevent JPEG export errors
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")
        
    # Cap the maximum dimensions to 1024x1024 to enforce strict token limits
    max_size = (1024, 1024)
    image.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    # Save the optimized image to a new buffer
    output_buffer = io.BytesIO()
    image.save(output_buffer, format="JPEG", quality=85)
    
    return output_buffer.getvalue(), "image/jpeg"

def process_invoice_with_vision(file_bytes: bytes, mime_type: str):
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "openai/gpt-4o",
        "response_format": { "type": "json_object" }, 
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": """Extract data into this exact JSON structure. Null if missing: { "vendor": { "name": "string" }, "invoice_details": { "invoice_number": "string" }, "line_items": [ { "description": "string", "quantity": 1, "unit_price": 0.00, "total_price": 0.00 } ], "financials": { "grand_total": 0.00 }, "ai_metadata": { "confidence_score": 0, "image_quality_warning": false } } Ensure confidence_score is an integer between 0 and 100."""},
            {"type": "image_url", "image_url": { "url": f"data:{mime_type};base64,{base64_image}" }}
        ]}]
    }
    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    if response.status_code != 200: raise Exception(f"AI Error: {response.text}")
    
    response_data = response.json()
    parsed_content = json.loads(response_data['choices'][0]['message']['content'])
    
    # --- 1. EXTRACT USAGE ---
    usage = response_data.get('usage', {})
    prompt_tokens = usage.get('prompt_tokens', 0)
    completion_tokens = usage.get('completion_tokens', 0)
    
    # --- 2. CALCULATE BASE COST (GPT-4o Rates) ---
    # Input: $0.000005 per token ($5/1M) | Output: $0.000015 per token ($15/1M)
    actual_cost_usd = (prompt_tokens * 0.000005) + (completion_tokens * 0.000015)
    
    # --- 3. APPLY 100% MARKUP (Your Profit Margin) ---
    retail_price_usd = actual_cost_usd * 2.0 
    
    # --- 4. CONVERT TO CREDITS (1 Credit = 1 Cent) ---
    # math.ceil ensures if the cost is 3.1 cents, we charge 4 credits. 
    credits_to_deduct = math.ceil(retail_price_usd * 100)
    
    # Hard floor: Never charge 0 credits for a transaction
    if credits_to_deduct < 1:
        credits_to_deduct = 1
        
    return parsed_content, credits_to_deduct

# --- SECURED API ENDPOINTS ---

@app.post("/upload-invoice/")
async def upload_invoice(file: UploadFile = File(...), auth_context: dict = Depends(get_auth_context), db: Session = Depends(get_db)):
    try:
        org_id = auth_context["org_id"]
        org = db.query(Organization).filter(Organization.org_id == org_id).first()
        
        if org.api_credits <= 0:
            return JSONResponse(status_code=403, content={"error": "Out of API credits. Please upgrade your plan."})
        
        raw_file_bytes = await file.read()
        
        if len(raw_file_bytes) > 10 * 1024 * 1024:
            return JSONResponse(status_code=413, content={"error": "File too large. Maximum size is 10MB."})
            
        optimized_bytes, new_mime_type = optimize_image_for_llm(raw_file_bytes)
        
        parsed_data, credits_to_deduct = process_invoice_with_vision(optimized_bytes, new_mime_type)
        
        if org.api_credits < credits_to_deduct:
            return JSONResponse(status_code=402, content={"error": "Insufficient credits to process this invoice."})
            
        org.api_credits -= credits_to_deduct
        
        reported_total = float(parsed_data.get("financials", {}).get("grand_total") or 0.00)
        
        calculated_total = 0.0
        for item in parsed_data.get("line_items", []):
            calculated_total += float(item.get("total_price") or 0.00)
            
        is_math_valid = abs(reported_total - calculated_total) <= 0.02
        confidence_score = int(parsed_data.get("ai_metadata", {}).get("confidence_score") or 100)
        is_confident = confidence_score >= 85
        
        final_status = "Pending" if (is_math_valid and is_confident) else "Needs Review"
        
        new_invoice = Invoice(
            org_id=org_id, 
            vendor_name=parsed_data.get("vendor", {}).get("name") or "Unknown",
            invoice_number=str(parsed_data.get("invoice_details", {}).get("invoice_number") or f"UNK-{datetime.now().timestamp()}"),
            amount=reported_total,
            status=final_status 
        )
        
        db.add(new_invoice)
        db.flush()
        
        for item in parsed_data.get("line_items", []):
            db.add(InvoiceItem(invoice_id=new_invoice.invoice_id, description=item.get("description", "Item"), quantity=float(item.get("quantity") or 1), unit_price=float(item.get("unit_price") or 0), total_price=float(item.get("total_price") or 0)))
            
        db.commit()
        return JSONResponse(status_code=200, content={"message": "Success", "data": parsed_data, "credits_remaining": org.api_credits})
    except IntegrityError as e:
        db.rollback()
        return JSONResponse(status_code=400, content={"error": f"Database Integrity Error: {str(e.orig)}"})
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/invoices/")
async def get_historical_invoices(skip: int = 0, limit: int = 50, auth_context: dict = Depends(get_auth_context), db: Session = Depends(get_db)):
    try:
        org_id = auth_context["org_id"]
        
        total_count = db.query(Invoice).filter(Invoice.org_id == org_id).count()
        invoices = db.query(Invoice).filter(Invoice.org_id == org_id).order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
        
        history = []
        for inv in invoices:
            items_list = [{"description": i.description or "-", "quantity": float(i.quantity) if i.quantity is not None else 1.0, "unit_price": float(i.unit_price) if i.unit_price is not None else 0.0, "total_price": float(i.total_price) if i.total_price is not None else 0.0} for i in inv.items]
            
            # --- FETCH AUDIT LOGS ---
            logs = db.query(AuditLog).filter(AuditLog.invoice_id == inv.invoice_id).order_by(AuditLog.timestamp.desc()).all()
            audit_list = [{"field": l.field_name, "old": l.old_value, "new": l.new_value, "by": l.changed_by, "time": l.timestamp.strftime("%Y-%m-%d %H:%M:%S")} for l in logs]
            
            history.append({
                "id": inv.invoice_id, 
                "vendor_name": inv.vendor_name or "Unknown", 
                "invoice_number": inv.invoice_number or "N/A", 
                "amount": float(inv.amount) if inv.amount is not None else 0.0, 
                "status": inv.status or "Pending", 
                "date": inv.created_at.strftime("%Y-%m-%d"), 
                "items": items_list,
                "audit_logs": audit_list 
            })
            
        return JSONResponse(status_code=200, content={"data": history, "pagination": {"total_records": total_count, "skip": skip, "limit": limit}})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, request: InvoiceEditRequest, auth_context: dict = Depends(get_auth_context), db: Session = Depends(get_db)):
    try:
        org_id = auth_context["org_id"]
        user_identifier = auth_context.get("identifier", "Unknown User")
        
        invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id, Invoice.org_id == org_id).first()
        if not invoice:
            return JSONResponse(status_code=404, content={"error": "Invoice not found or access denied."})
        
        # --- THE AUDIT TRACKER ---
        def log_change(field, old_val, new_val):
            if str(old_val) != str(new_val):
                db.add(AuditLog(invoice_id=invoice_id, changed_by=user_identifier, field_name=field, old_value=str(old_val), new_value=str(new_val)))

        log_change("Vendor", invoice.vendor_name, request.vendor_name)
        log_change("Invoice Number", invoice.invoice_number, request.invoice_number)
        log_change("Total Amount", invoice.amount, request.amount)
        log_change("Status", invoice.status, request.status)
        
        invoice.vendor_name = request.vendor_name
        invoice.invoice_number = request.invoice_number
        invoice.amount = request.amount
        invoice.status = request.status
        
        db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice_id).delete()
        for item in request.items:
            db.add(InvoiceItem(invoice_id=invoice_id, description=item.description, quantity=item.quantity, unit_price=item.unit_price, total_price=item.total_price))
            
        db.commit()
        return JSONResponse(status_code=200, content={"message": "Updated successfully!"})
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.get("/workspace/")
async def get_workspace_details(auth_context: dict = Depends(get_auth_context), db: Session = Depends(get_db)):
    try:
        org_id = auth_context["org_id"]
        org = db.query(Organization).filter(Organization.org_id == org_id).first()
        
        return JSONResponse(status_code=200, content={
            "org_id": org.org_id,
            "name": org.name,
            "api_credits": org.api_credits,
            "dollar_value": f"${org.api_credits / 100:.2f}"
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


class ApiKeyCreateRequest(BaseModel):
    name: str

@app.post("/api-keys/")
async def create_api_key(request: ApiKeyCreateRequest, auth_context: dict = Depends(get_auth_context), db: Session = Depends(get_db)):
    try:
        if auth_context["auth_type"] != "human":
             return JSONResponse(status_code=403, content={"error": "Machines cannot generate new keys."})
             
        org_id = auth_context["org_id"]
        
        raw_token = secrets.token_hex(32)
        raw_api_key = f"nk_live_{raw_token}"
        hashed_key = hashlib.sha256(raw_api_key.encode()).hexdigest()
        
        new_key = ApiKey(org_id=org_id, name=request.name, hashed_key=hashed_key)
        db.add(new_key)
        db.commit()
        
        return JSONResponse(status_code=200, content={
            "message": "Success",
            "raw_api_key": raw_api_key,
            "name": request.name
        })
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)