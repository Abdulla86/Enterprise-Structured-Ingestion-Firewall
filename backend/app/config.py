# config.py file is used for loading environment variables from the .env file and making them accessible in the application.
import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent # Define the backend directory path based on the location of this config.py file
load_dotenv(BACKEND_DIR / ".env")  # Load environment variables from the .env file located in the backend directory
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY","").strip()
# Retrieve the GROQ_API_KEY from environment variables
GROQ_MODEL = os.getenv("GROQ_MODEL","openai/gpt-oss-120b").strip() 
# Retrieve the GROQ_MODEL from environment variables

# Relative paths are resolved from the backend folder, not the current directory.
SQLITE_PATH = str(BACKEND_DIR / (os.getenv("SQLITE_PATH", "").strip() or "data/chat.db"))