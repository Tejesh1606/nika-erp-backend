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

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verifies the JWT token and returns the Clerk User ID."""
    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(token, signing_key.key, algorithms=["RS256"])
        return payload.get("sub") # The Clerk User ID
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

# --- AI VISION ENGINE ---
def process_invoice_with_vision(file_bytes: bytes, mime_type: str):
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": "openai/gpt-4o",
        "response_format": { "type": "json_object" }, 
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": """Extract data into this exact JSON structure. Null if missing: { "vendor": { "name": "string" }, "invoice_details": { "invoice_number": "string" }, "line_items": [ { "description": "string", "quantity": 1, "unit_price": 0.00, "total_price": 0.00 } ], "financials": { "grand_total": 0.00 } }"""},
            {"type": "image_url", "image_url": { "url": f"data:{mime_type};base64,{base64_image}" }}
        ]}]
    }
    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    if response.status_code != 200: raise Exception(f"AI Error: {response.text}")
    return json.loads(response.json()['choices'][0]['message']['content'])


# --- SECURED API ENDPOINTS ---

@app.post("/upload-invoice/")
async def upload_invoice(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        org_id = get_or_create_user_org(db, user_id)
        org = db.query(Organization).filter(Organization.org_id == org_id).first()
        
        if org.api_credits <= 0:
            return JSONResponse(status_code=403, content={"error": "Out of API credits. Please upgrade your plan."})
        
        # --- NEW OPTIMIZATION PIPELINE ---
        raw_file_bytes = await file.read()
        
        # Hard cap: Reject payloads over 10MB to prevent RAM exhaustion attacks
        if len(raw_file_bytes) > 10 * 1024 * 1024:
            return JSONResponse(status_code=413, content={"error": "File too large. Maximum size is 10MB."})
            
        # Compress the image before sending to OpenRouter
        optimized_bytes, new_mime_type = optimize_image_for_llm(raw_file_bytes)
        
        # Feed the COMPRESSED bytes to the AI, not the raw bytes
        parsed_data = process_invoice_with_vision(optimized_bytes, new_mime_type)
        # ---------------------------------
        
        org.api_credits -= 1
        
        new_invoice = Invoice(
            org_id=org_id, 
            vendor_name=parsed_data.get("vendor", {}).get("name") or "Unknown",
            invoice_number=str(parsed_data.get("invoice_details", {}).get("invoice_number") or f"UNK-{datetime.now().timestamp()}"),
            amount=float(parsed_data.get("financials", {}).get("grand_total") or 0.00),
            status="Pending"
        )
        
        db.add(new_invoice)
        db.flush() 
        for item in parsed_data.get("line_items", []):
            db.add(InvoiceItem(invoice_id=new_invoice.invoice_id, description=item.get("description", "Item"), quantity=float(item.get("quantity") or 1), unit_price=float(item.get("unit_price") or 0), total_price=float(item.get("total_price") or 0)))
            
        db.commit()
        return JSONResponse(status_code=200, content={"message": "Success", "data": parsed_data, "credits_remaining": org.api_credits})
    except IntegrityError:
        db.rollback()
        return JSONResponse(status_code=400, content={"error": "Invoice number already exists."})
    except Exception as e:
        db.rollback()
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        db.close()

@app.get("/invoices/")
async def get_historical_invoices(user_id: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        org_id = get_or_create_user_org(db, user_id)
        invoices = db.query(Invoice).filter(Invoice.org_id == org_id).all()
        
        history = []
        for inv in invoices:
            items_list = [{"description": i.description or "-", "quantity": float(i.quantity) if i.quantity is not None else 1.0, "unit_price": float(i.unit_price) if i.unit_price is not None else 0.0, "total_price": float(i.total_price) if i.total_price is not None else 0.0} for i in inv.items]
            history.append({"id": inv.invoice_id, "vendor_name": inv.vendor_name or "Unknown", "invoice_number": inv.invoice_number or "N/A", "amount": float(inv.amount) if inv.amount is not None else 0.0, "status": inv.status or "Pending", "date": inv.created_at.strftime("%Y-%m-%d"), "items": items_list})
        return JSONResponse(status_code=200, content={"data": history})
    finally:
        db.close()

@app.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: int, request: InvoiceEditRequest, user_id: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        org_id = get_or_create_user_org(db, user_id)
        
        invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id, Invoice.org_id == org_id).first()
        if not invoice:
            return JSONResponse(status_code=404, content={"error": "Invoice not found or access denied."})
        
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
    finally:
        db.close()

@app.post("/api/inspector/query")
async def run_sql_query(request: QueryRequest, user_id: str = Depends(get_current_user)):
    db = SessionLocal()
    try:
        sql_query = request.query.strip()
        
        if not sql_query:
            return JSONResponse(status_code=400, content={"error": "Query cannot be empty"})

        # 1. Establish a strict Read-Only transaction at the PostgreSQL engine level.
        # This physically prevents INSERT, UPDATE, DELETE, DROP, or ALTER commands.
        db.execute(text("SET LOCAL default_transaction_read_only = 'on';"))
        
        # 2. Execute the arbitrary user query inside the Read-Only sandbox.
        result = db.execute(text(sql_query))
        
        # 3. Extract the data.
        rows = result.mappings().all()
        
        formatted_rows = []
        for row in rows:
            row_dict = dict(row)
            for key, value in row_dict.items():
                if isinstance(value, datetime):
                    row_dict[key] = value.isoformat()
                elif isinstance(value, Decimal):
                    row_dict[key] = float(value)
            formatted_rows.append(row_dict)
            
        # 4. The Fail-Safe: Force a rollback to destroy the transaction state.
        db.rollback() 
        
        return {"results": formatted_rows}
        
    except Exception as e:
        # If the user tries to mutate data, PostgreSQL will throw a Read-Only error here.
        db.rollback()
        return JSONResponse(status_code=400, content={"error": f"SQL Execution Error: {str(e)}"})
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)