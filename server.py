import os
import base64
import requests
import json
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import uvicorn

# Load API key from your .env file
load_dotenv()
OPENROUTER_API_KEY = os.getenv("PM_API_KEY") # Reusing the PM key for the AI model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Universal AI Accounting API")

# Allow the frontend web page to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def process_invoice_with_vision(file_bytes: bytes, mime_type: str):
    """Sends the image to OpenRouter's Vision model to extract invoice data."""
    # 1. Encode the image to Base64 so the AI can read it
    base64_image = base64.b64encode(file_bytes).decode('utf-8')
    
    # 2. Set up the payload for OpenRouter
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "openai/gpt-4o-mini",
        "response_format": { "type": "json_object" }, # Forces AI to return clean JSON
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text", 
                        "text": "Analyze this invoice. Extract the following details and return them STRICTLY as a JSON object with these exact keys: 'vendor_name', 'invoice_number', 'total_amount' (just the number), and 'due_date'. If you can't find a field, return null."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ]
    }

    # 3. Send the request
    logger.info("Sending image to OpenRouter Vision AI...")
    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    
    if response.status_code != 200:
        raise Exception(f"AI API Error: {response.text}")
        
    # 4. Parse the AI's response
    result_content = response.json()['choices'][0]['message']['content']
    return json.loads(result_content)

@app.post("/upload-invoice/")
async def upload_invoice(file: UploadFile = File(...)):
    try:
        # Read the file
        file_bytes = await file.read()
        
        # Verify it's an image
        valid_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
        if file.content_type not in valid_types:
            raise HTTPException(status_code=400, detail="Please upload a JPG, PNG, or WEBP image of the invoice.")

        # Process via AI
        extracted_data = process_invoice_with_vision(file_bytes, file.content_type)

        return JSONResponse(status_code=200, content={
            "message": "AI successfully parsed the invoice.", 
            "data": extracted_data
        })

    except Exception as e:
        logger.error("Error: %s", e)
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)