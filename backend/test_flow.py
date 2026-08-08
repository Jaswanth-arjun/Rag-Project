"""End-to-end test: STORE files with user_note, then RETRIEVE by description."""
import urllib.request
import json

BACKEND = "http://localhost:8000"

def upload_file(filename, content_type, user_note, fake_bytes=b"\xFF\xD8\xFF\xE0"):
    url = f"{BACKEND}/api/documents/upload"
    boundary = "----TestBoundary7890"
    parts = []
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{filename}\"\r\nContent-Type: {content_type}\r\n\r\n".encode())
    parts.append(fake_bytes + b"\r\n")
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"user_note\"\r\n\r\n{user_note}\r\n".encode())
    parts.append(f"--{boundary}--\r\n".encode())
    payload = b"".join(parts)
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def chat(message):
    url = f"{BACKEND}/api/chat"
    data = json.dumps({"message": message}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

# ── TEST 1: STORE Aadhaar card image ──
print("=" * 60)
print("TEST 1: STORE - Upload image with note 'this is my aadhar card'")
r = upload_file("WhatsApp Image 2026-08-03.jpeg", "image/jpeg", "this is my aadhar card")
print(f"  OK: {r['filename']} | Cat: {r['category']} | Note: {r['user_note']}")

# ── TEST 2: STORE Resume PDF ──
print("\nTEST 2: STORE - Upload PDF with note 'my resume'")
r2 = upload_file("Nelluru_Resume.pdf", "application/pdf", "my resume")
print(f"  OK: {r2['filename']} | Cat: {r2['category']} | Note: {r2['user_note']}")

# ── TEST 3: RETRIEVE Aadhaar ──
print("\nTEST 3: RETRIEVE - 'show my aadhar card'")
r3 = chat("show my aadhar card")
print(f"  Found: {'context_found' in r3 and r3['context_found']}")
print(f"  Response preview: {r3['response'][:300]}")

# ── TEST 4: RETRIEVE Resume ──
print("\nTEST 4: RETRIEVE - 'give me my resume'")
r4 = chat("give me my resume")
print(f"  Found: {r4.get('context_found', False)}")
print(f"  Response preview: {r4['response'][:300]}")

# ── TEST 5: STORE text memory ──
print("\nTEST 5: STORE - 'remember my phone is 9876543210'")
r5 = chat("remember my phone is 9876543210")
print(f"  Response: {r5['response']}")

# ── TEST 6: RETRIEVE text memory ──
print("\nTEST 6: RETRIEVE - 'what is my phone number'")
r6 = chat("what is my phone number")
print(f"  Found: {r6.get('context_found', False)}")
print(f"  Response: {r6['response'][:300]}")

print("\n" + "=" * 60)
print("ALL TESTS COMPLETE")
