// update-logo.mjs
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const filePath = join(process.cwd(), 'index.html');
const logoFileName = 'logo.png'; // Agar aapka file name alag hai toh yahan change karein

try {
  let html = readFileSync(filePath, 'utf-8');

  // 1. CSS Update: .brand .logo ke liye image support add karna
  // Hum existing .brand .logo style ko find karke usme height:auto add karenge
  const cssUpdate = html.replace(
    /(\.brand \.logo\{[^}]*)(width:\s*\d+px;)/,
    `$1$2 height:auto; display:block; object-fit:contain;`
  );
  
  // Agar upar wala match na ho, toh simple replacement for safety
  html = cssUpdate !== html ? cssUpdate : html;

  // 2. JavaScript Update: LOGO_SVG constant ko replace karna
  // Hum purane SVG string ko dhundh kar uski jagah img tag daal denge
  const newLogoJS = `const LOGO_IMG_SRC = "${logoFileName}";\nconst LOGO_SVG = \`<img src="\${LOGO_IMG_SRC}" alt="Scenezy Logo" class="logo">\`;`;
  
  // Regex to find the old LOGO_SVG definition (multiline safe)
  const oldLogoRegex = /const LOGO_SVG = `[\s\S]*?`;/;
  
  if (oldLogoRegex.test(html)) {
    html = html.replace(oldLogoRegex, newLogoJS);
    console.log(`✅ Successfully updated logo to use '${logoFileName}'.`);
  } else {
    console.log("⚠️ Could not find the exact LOGO_SVG pattern. Manual check might be needed.");
  }

  // 3. File Save karna
  writeFileSync(filePath, html, 'utf-8');
  console.log("💾 index.html saved successfully.");

} catch (error) {
  console.error("❌ Error updating file:", error.message);
}