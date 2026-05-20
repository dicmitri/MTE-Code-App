import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const filePath = 'c:/Users/dicmi/Documents/GitHub/MTE-Code-App/TPPT agendas/Advanced-Frontal-Sinus-Surgery-Course-Agenda.pdf';
  console.log('Loading PDF from:', filePath);
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    console.log('PDF loaded successfully! Pages:', pdf.numPages);
    
    // Read page 1
    const page = await pdf.getPage(1);
    const textContent = await page.getTextContent();
    console.log('Successfully retrieved text items count:', textContent.items.length);
    console.log('First 5 items:');
    textContent.items.slice(0, 5).forEach((item, idx) => {
      console.log(`${idx}: "${item.str}"`);
    });
  } catch (err) {
    console.error('Error loading PDF:', err);
  }
}

run();
