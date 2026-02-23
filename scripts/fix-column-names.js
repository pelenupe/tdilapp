const fs = require('fs');
const path = require('path');

// Column name replacements (snake_case -> camelCase)
const replacements = [
  { from: /\bfirstname\b/g, to: 'firstName' },
  { from: /\blastname\b/g, to: 'lastName' },
  { from: /\bprofile_image\b/g, to: 'profileImage' },
  { from: /\bjobtitle\b/g, to: 'jobTitle' },
  { from: /\busertype\b/g, to: 'userType' },
  { from: /\balma_mater\b/g, to: 'almaMater' },
  { from: /\bgraduation_year\b/g, to: 'graduationYear' },
  { from: /\bcurrent_school\b/g, to: 'currentSchool' },
  { from: /\bjob_title\b/g, to: 'jobTitle' },
  { from: /\bschool_name\b/g, to: 'schoolName' },
  { from: /\bcreated_by\b/g, to: 'createdBy' },
  { from: /\bis_active\b/g, to: 'isActive' }
];

// Files to process
const filesToProcess = [
  'backend/controllers/authController.js',
  'backend/controllers/connectionController.js',
  'backend/controllers/pointsController.js',
  'backend/controllers/analyticsController.js',
  'backend/controllers/jobController.js',
  'backend/controllers/cohortController.js',
  'backend/controllers/inviteController.js',
  'backend/routes/activityRoutes.js',
  'backend/routes/leaderboardRoutes.js',
  'backend/routes/eventRoutes.js',
  'backend/routes/merchRoutes.js',
  'backend/middleware/enhancedAuthMiddleware.js'
];

let totalReplacements = 0;

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let fileReplacements = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      fileReplacements += matches.length;
      content = content.replace(from, to);
    }
  });
  
  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: ${fileReplacements} replacements`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`➖ ${file}: no changes needed`);
  }
});

console.log(`\n🎉 Total replacements: ${totalReplacements}`);
console.log('✅ All column names fixed!');
