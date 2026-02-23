#!/bin/bash

# Fix all datetime('now') syntax errors by changing outer quotes to double quotes

cd /Users/tchadblair/Desktop/_sites/uxpertism/_clients/tdil/_final

# Fix eventRoutes.js
sed -i.bak "s/'INSERT INTO event_registrations (event_id, user_id, registered_at) VALUES (\$1, \$2, datetime('now'))'/\"INSERT INTO event_registrations (event_id, user_id, registered_at) VALUES (\$1, \$2, datetime('now'))\"/g" backend/routes/eventRoutes.js
sed -i.bak "s/'SELECT .*WHERE e.date >= datetime('now')/\"SELECT \\0\"/g" backend/routes/eventRoutes.js

# Fix connectionController.js  
sed -i.bak "s/'INSERT INTO connections (user_id, connected_user_id, status, created_at) VALUES (\$1, \$2, \$3, datetime('now'))'/\"INSERT INTO connections (user_id, connected_user_id, status, created_at) VALUES (\$1, \$2, \$3, datetime('now'))\"/g" backend/controllers/connectionController.js

echo "✅ Fixed all datetime syntax errors"
