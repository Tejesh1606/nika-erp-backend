import os
import json
import base64
import requests
import time
import random

# --- CONFIGURATION ---
OPENROUTER_API_KEY = "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" # <-- PASTE YOUR KEY HERE
MODEL = "google/gemini-flash-1.5-8b" 
TEST_LIMIT = 10 # How many random invoices to test from the vault

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def extract_with_ai(image_path):
    base64_image = encode_image(image_path)
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": MODEL,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Extract the vendor_name, invoice_number, date (YYYY-MM-DD), amount (number only), and an array of items (description, quantity, unit_price, total_price). Return strictly as JSON."},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                ]
            }
        ]
    }

    response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
    
    try:
        content = response.json()['choices'][0]['message']['content']
        # Strip out markdown blocks if the AI accidentally includes them
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        return json.loads(content)
    except Exception as e:
        print(f"AI failed to return valid JSON: {e}")
        return None

def run_grader():
    images_dir = "test_data/images"
    answers_dir = "test_data/answers"
    
    if not os.path.exists(images_dir):
        print("Run generate_tests.py first to create the vault!")
        return

    # --- THE RANDOM SAMPLING LOGIC ---
    all_files = [f for f in os.listdir(images_dir) if f.endswith(".png")]
    if len(all_files) == 0:
        print("No images found in the test_data/images folder.")
        return
        
    sample_size = min(TEST_LIMIT, len(all_files))
    test_files = random.sample(all_files, sample_size)
    
    total_tests = 0
    perfect_matches = 0
    
    print(f"🚀 Starting AI Accuracy Grader on a random sample of {sample_size} invoices...\n")

    for filename in test_files:
        total_tests += 1
        invoice_id = filename.split('.')[0] # e.g., 'invoice_4829'
        
        # 1. Get Answer Key
        with open(os.path.join(answers_dir, f"{invoice_id}.json"), "r") as f:
            answer_key = json.load(f)
            
        # 2. Get AI Prediction
        image_path = os.path.join(images_dir, filename)
        ai_prediction = extract_with_ai(image_path)
        
        # 3. Compare Results
        if ai_prediction:
            try:
                ai_amount = float(ai_prediction.get('amount', 0))
                ai_vendor = str(ai_prediction.get('vendor_name', '')).lower().strip()
                
                real_amount = float(answer_key.get('amount', 0))
                real_vendor = str(answer_key.get('vendor_name', '')).lower().strip()
                
                # Check if the real vendor is at least partially in the AI vendor name, and amounts match exactly
                if ai_amount == real_amount and (real_vendor in ai_vendor or ai_vendor in real_vendor):
                    print(f"   ✅ PASS: {invoice_id}")
                    perfect_matches += 1
                else:
                    print(f"   ❌ FAIL: {invoice_id}")
                    print(f"      Expected: '{real_vendor}' / ${real_amount}")
                    print(f"      AI Saw:   '{ai_vendor}' / ${ai_amount}")
            except ValueError:
                print(f"   ❌ FAIL: {invoice_id} - AI returned amounts that couldn't be parsed as numbers.")
        else:
            print(f"   ❌ FAIL: {invoice_id} - AI crashed or hallucinated invalid JSON.")

        # Pause to prevent the API from rate-limiting us
        time.sleep(2) 
        
    accuracy = (perfect_matches / total_tests) * 100
    print("\n" + "="*45)
    print(f"📊 FINAL SCORE: {accuracy:.1f}% ({perfect_matches}/{total_tests})")
    print("="*45)

if __name__ == "__main__":
    run_grader()