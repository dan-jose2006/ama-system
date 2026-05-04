/**
 * Database Seed Script
 * Seeds default users into SQLite database
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const path = require('path');

async function seed() {
  // Import after dotenv
  const { connectDB, getDB } = require('../src/config/database');
  
  try {
    await connectDB();
    const db = getDB();

    const password = 'AMA2026!';
    const hash = bcrypt.hashSync(password, 12);

    console.log('Seeding users...');

    const users = [
      { name: 'Demo Trainer', email: 'trainer@company.com', role: 'trainer' },
      { name: 'Marketing Head', email: 'marketing@company.com', role: 'marketing_head' },
      { name: 'System Admin', email: 'admin@company.com', role: 'admin' },
    ];

    const stmt = db.prepare(
      `INSERT OR REPLACE INTO users (id, name, email, password_hash, role) 
       VALUES (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-a' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))), ?, ?, ?, ?)`
    );

    for (const user of users) {
      // Check if user already exists
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
      if (existing) {
        db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, user.email);
        console.log(`✅ Updated: ${user.email} (${user.role})`);
      } else {
        stmt.run(user.name, user.email, hash, user.role);
        console.log(`✅ Created: ${user.email} (${user.role})`);
      }
    }

    console.log(`\n✅ Seeding complete!`);
    console.log(`\nDefault credentials:`);
    console.log(`  Email: trainer@company.com / marketing@company.com / admin@company.com`);
    console.log(`  Password: ${password}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
