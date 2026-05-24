"""
Extract the Glossary section from the MedTech Code PDF.
Also extract a few key chapters for comparison.
"""
import fitz  # PyMuPDF
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r"C:\Users\dicmi\.gemini\antigravity\brain\58b0b3ae-ed37-4c3e-a259-10017ea202d3\.tempmediaStorage\fad5f3a1da3d43d4.pdf"

if not os.path.exists(pdf_path):
    # Try the local copy
    pdf_path = r"c:\Users\dicmi\Documents\GitHub\MTE-Code-App\src\data\code-september-2024.pdf"

doc = fitz.open(pdf_path)

print(f"PDF has {len(doc)} pages")
print()

# Extract ALL text, page by page
full_text = []
for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    full_text.append(f"\n--- PAGE {page_num + 1} ---\n{text}")

all_text = "\n".join(full_text)

# Find glossary section
glossary_start = all_text.lower().find("glossary")
if glossary_start >= 0:
    # Find a reasonable chunk around the glossary
    # Look for the main Glossary header (not table of contents references)
    import re
    glossary_matches = list(re.finditer(r'Glossary\n', all_text))
    print(f"Found {len(glossary_matches)} 'Glossary' header matches")
    for i, m in enumerate(glossary_matches):
        context = all_text[max(0, m.start()-50):m.start()+100]
        print(f"  Match {i}: pos {m.start()}, context: ...{repr(context[:80])}...")
    print()

# Write full text to file for analysis
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "online_pdf_full_text.txt")
with open(output_path, 'w', encoding='utf-8') as f:
    f.write(all_text)

print(f"Full text written to: {output_path}")
print(f"Total characters: {len(all_text)}")

doc.close()
