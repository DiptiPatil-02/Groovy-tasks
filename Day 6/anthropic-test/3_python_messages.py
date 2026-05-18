# Task 2: Repeat in Python SDK (Gemini API)
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
import google.generativeai as genai

# Load environment variables from .env
load_dotenv()

# Configure the Gemini API client
# Note: You need to install the SDK first using `pip install google-generativeai`
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

def main():
    print("Making request using Python SDK (Gemini)...")
    try:
        # Initialize the model
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Generate content
        response = model.generate_content("Hello from Python SDK!")
        
        # Extract and print the response text
        print("Response:", response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
