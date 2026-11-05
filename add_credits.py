import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 1. Load the environment variables from your local .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env file.")
    exit()

# 2. Connect directly to the remote Render PostgreSQL database
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        # 3. Forcefully update the balance for all organizations
        conn.execute(text("UPDATE organizations SET api_credits = 500;"))
        conn.commit()
        print("Success: API Credits replenished to 500.")
except Exception as e:
    print(f"Database Error: {str(e)}")