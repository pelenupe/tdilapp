const fs = require('fs');
const path = require('path');

// Fix SQLite compatibility issues
const filesToFix = [
  'backend/controllers/connectionController.js',
  'backend/routes/eventRoutes.js',
  'backend/middleware/enhancedAuthMiddleware.js'
];

let totalFixes = 0;

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fixes = 0;
  
  // Replace NOW() with datetime('now') for SQLite
  const nowMatches = content.match(/\bNOW\(\)/g);
  if (nowMatches) {
    fixes += nowMatches.length;
    content = content.replace(/\bNOW\(\)/g, "datetime('now')");
  }
  
  // Replace UPDATE users SET updatedat = NOW() 
  content = content.replace(/updatedat = datetime\('now'\)/g, "updatedAt = datetime('now')");
  
  if (fixes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: ${fixes} NOW() → datetime('now') fixes`);
    totalFixes += fixes;
  } else {
    console.log(`➖ ${file}: no changes needed`);
  }
});

console.log(`\n🎉 Total fixes: ${totalFixes}`);
console.log('✅ SQLite compatibility fixed!');
