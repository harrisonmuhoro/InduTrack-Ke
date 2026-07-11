const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'pages');

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Add import
  if (content.includes('localStorage') && !content.includes("useAuth")) {
    content = content.replace(
      "import api from '../axios';",
      "import api from '../axios';\nimport { useAuth } from '../context/AuthContext';"
    );
    
    // Some files might not have api imported, but we know they all use api except maybe some edge case
    if (!content.includes("useAuth")) {
        content = content.replace(
            "import { Link",
            "import { useAuth } from '../context/AuthContext';\nimport { Link"
        );
    }
    
    // Inject hook at top of component
    const compMatch = content.match(/export default function ([A-Za-z0-9_]+)\([^)]*\) {/);
    if (compMatch) {
      const hookStr = "\n  const { role, context, logout } = useAuth();\n";
      content = content.replace(compMatch[0], compMatch[0] + hookStr);
    } else {
        // Look for const Component = () => {
        const compMatch2 = content.match(/const ([A-Za-z0-9_]+) = \([^)]*\) => {/);
        if (compMatch2) {
            const hookStr = "\n  const { role, context, logout } = useAuth();\n";
            content = content.replace(compMatch2[0], compMatch2[0] + hookStr);
        }
    }
  }

  // Replace usages
  if (content.includes('localStorage.getItem(\'context\')')) {
    content = content.replace(/localStorage\.getItem\('context'\)/g, "context");
    changed = true;
  }
  
  if (content.includes('localStorage.getItem(\'role\')')) {
    content = content.replace(/localStorage\.getItem\('role'\)/g, "role");
    changed = true;
  }

  if (content.includes('localStorage.removeItem(\'token\');')) {
    content = content.replace(/localStorage\.removeItem\('token'\);\s*localStorage\.removeItem\('role'\);/g, "await logout();");
    
    // handleLogout might not be async
    if (content.includes('const handleLogout = () => {')) {
        content = content.replace('const handleLogout = () => {', 'const handleLogout = async () => {');
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
