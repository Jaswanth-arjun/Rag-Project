"""Quick test: does 'Show my documents' return the right response?"""
import requests

r = requests.post("http://localhost:8000/api/chat", json={"message": "Show my documents"})
data = r.json()
print("Status:", r.status_code)
print("Context found:", data.get("context_found"))
print("Sources count:", len(data.get("sources", [])))
print()
print("--- Response ---")
print(data["response"][:1500])
