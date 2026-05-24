import json
import re
import html
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Read current JSON
json_path = os.path.join('src', 'data', 'codeData.json')
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

admin_json = [c for c in data['chapters'] if c['id'] == 'admin'][0]

def strip_html(text):
    text = re.sub(r'\\n', '\n', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

print("Checking JSON Admin section for issues...")
issues = 0

# Since PDF text contains page headers like "MEDTECH EUROPE - CODE OF ETHICAL BUSINESS PRACTICE", 
# it's tricky to compare directly without complex filtering. 
# Let's just dump the JSON stripped text so we can spot-check it.
for section in admin_json['sections']:
    print(f"\n--- Section: {section['title']} ---")
    text = strip_html(section['legalText'])
    print(text)
