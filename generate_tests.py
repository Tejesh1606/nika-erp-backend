import json
import random
from PIL import Image, ImageDraw, ImageFont
from faker import Faker
import os

fake = Faker()
Faker.seed(42)

# Create folders to hold our test data
os.makedirs("test_data/images", exist_ok=True)
os.makedirs("test_data/answers", exist_ok=True)

def generate_invoice(index):
    # 1. GENERATE THE "GROUND TRUTH" DATA (The Answer Key)
    vendor = fake.company()
    invoice_num = f"INV-{fake.random_int(min=10000, max=99999)}"
    date = fake.date_between(start_date='-1y', end_date='today').strftime('%Y-%m-%d')
    
    items = []
    total = 0
    for _ in range(random.randint(1, 4)):
        qty = random.randint(1, 10)
        price = round(random.uniform(10.0, 500.0), 2)
        item_total = round(qty * price, 2)
        total += item_total
        items.append({
            "description": fake.catch_phrase(),
            "quantity": qty,
            "unit_price": price,
            "total_price": item_total
        })
    
    ground_truth = {
        "vendor_name": vendor,
        "invoice_number": invoice_num,
        "date": date,
        "items": items,
        "amount": round(total, 2)
    }

    # 2. DRAW THE IMAGE
    # Create a blank white image (800x1000 pixels)
    img = Image.new('RGB', (800, 1000), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    
    # Try to load a default font, otherwise use PIL's basic font
    try:
        font_title = ImageFont.truetype("arial.ttf", 36)
        font_text = ImageFont.truetype("arial.ttf", 20)
        font_bold = ImageFont.truetype("arialbd.ttf", 24)
    except IOError:
        font_title = font_text = font_bold = ImageFont.load_default()

    # Draw Text onto the image
    d.text((50, 50), "INVOICE", fill=(0, 0, 0), font=font_title)
    d.text((50, 120), f"From: {vendor}", fill=(0, 0, 0), font=font_bold)
    d.text((500, 50), f"Invoice #: {invoice_num}", fill=(0, 0, 0), font=font_text)
    d.text((500, 80), f"Date: {date}", fill=(0, 0, 0), font=font_text)

    # Draw Items
    y_text = 250
    d.text((50, y_text), "Description", fill=(100, 100, 100), font=font_text)
    d.text((450, y_text), "Qty", fill=(100, 100, 100), font=font_text)
    d.text((550, y_text), "Price", fill=(100, 100, 100), font=font_text)
    d.text((650, y_text), "Total", fill=(100, 100, 100), font=font_text)
    
    y_text += 40
    d.line([(50, y_text), (750, y_text)], fill=(0,0,0), width=2)
    y_text += 20

    for item in items:
        d.text((50, y_text), item['description'][:30], fill=(0, 0, 0), font=font_text)
        d.text((450, y_text), str(item['quantity']), fill=(0, 0, 0), font=font_text)
        d.text((550, y_text), f"${item['unit_price']}", fill=(0, 0, 0), font=font_text)
        d.text((650, y_text), f"${item['total_price']}", fill=(0, 0, 0), font=font_text)
        y_text += 40

    # Draw Total
    y_text += 40
    d.line([(400, y_text), (750, y_text)], fill=(0,0,0), width=2)
    y_text += 20
    d.text((450, y_text), "GRAND TOTAL:", fill=(0, 0, 0), font=font_bold)
    d.text((650, y_text), f"${ground_truth['amount']}", fill=(255, 0, 0), font=font_bold)

    # 3. SAVE BOTH FILES
    img.save(f"test_data/images/invoice_{index}.png")
    with open(f"test_data/answers/invoice_{index}.json", "w") as f:
        json.dump(ground_truth, f, indent=4)

if __name__ == "__main__":
    print("Generating 10 synthetic test invoices...")
    for i in range(1, 10000):
        generate_invoice(i)
    print("Done! Check the 'test_data' folder.")