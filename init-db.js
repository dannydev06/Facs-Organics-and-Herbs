// Simple script to initialize the database
// Run this with: node init-db.js

const { initializeDatabase } = require('./server/scripts/init-database');

console.log('🚀 Initializing FACS Organics Database...\n');

initializeDatabase();
