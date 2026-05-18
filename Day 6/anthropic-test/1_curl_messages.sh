#!/bin/bash
# Task 1: First curl call to messages (Gemini API)
# This script makes a basic POST request to the Gemini API.
# Make sure to set your GEMINI_API_KEY environment variable.

echo "Making curl request to Gemini API..."
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "contents": [{
      "parts": [{"text": "Hello, world!"}]
    }]
  }'
echo -e "\nRequest completed."
