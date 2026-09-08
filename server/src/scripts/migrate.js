const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config();
const { getSql } = require('../config/db');

function splitStatements(sql) {
  const statements = [];
  let statement = '';
  let inSingleQuote = false;
  let inDollarQuote = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const nextCharacter = sql[index + 1];

    if (character === "'" && !inDollarQuote) {
      if (inSingleQuote && nextCharacter === "'") {
        statement += "''";
        index += 1;
        continue;
      }
      inSingleQuote = !inSingleQuote;
    } else if (character === '$' && nextCharacter === '$' && !inSingleQuote) {
      inDollarQuote = !inDollarQuote;
      statement += '$$';
      index += 1;
      continue;
    }

    if (character === ';' && !inSingleQuote && !inDollarQuote) {
      if (statement.trim()) statements.push(statement.trim());
      statement = '';
    } else {
      statement += character;
    }
  }

  if (statement.trim()) statements.push(statement.trim());
  return statements;
}

async function migrate() {
  const migrationFiles = [
    '001_create_users.sql',
    '002_create_tasks.sql',
    '003_add_task_productivity_fields.sql',
    '004_create_projects.sql',
    '005_add_task_project_id.sql',
  ];

  for (const migrationFile of migrationFiles) {
    const migrationPath = path.join(__dirname, '../sql', migrationFile);
    const migration = await fs.readFile(migrationPath, 'utf8');
    const statements = splitStatements(migration);

    for (const statement of statements) {
      await getSql().query(statement);
    }
  }

  console.log('Database migration complete');
}

migrate().catch((error) => {
  console.error(`Database migration failed: ${error.message}`);
  process.exit(1);
});