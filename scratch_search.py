import json
import os

transcript_path = r"C:\Users\ARINDAM PUJA\.gemini\antigravity\brain\13fa6b5a-9171-4364-84d4-63f78df1b4eb\.system_generated\logs\transcript_full.jsonl"

if os.path.exists(transcript_path):
    with open(transcript_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line.strip())
                content = str(data)
                if "Privacy Policy" in content or "Terms of Service" in content:
                    print(f"=== STEP {data.get('step_index')} ({data.get('type')}) ===")
                    # print first 200 chars and last 200 chars or just find specific headers
                    text = data.get('content', '')
                    if text:
                        print(text[:400] + "\n... [TRUNCATED] ...\n" + text[-400:])
                    else:
                        print("No content field, representation:")
                        print(str(data)[:400])
                    print("====================\n")
            except Exception as e:
                pass
else:
    print("Transcript not found")
