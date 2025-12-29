const express = require('express');
const path = require('path');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_FILE = path.join(__dirname, 'taskflow.db');
const PORT = process.env.PORT || 5173;

async function initDb(){
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });
  await db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due TEXT,
      priority TEXT,
      createdAt INTEGER,
      updatedAt INTEGER
    )
  `);
  return db;
}

async function main(){
  const db = await initDb();
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API
  app.get('/api/tasks', async (req, res) => {
    const rows = await db.all('SELECT * FROM tasks ORDER BY updatedAt DESC');
    res.json(rows);
  });

  app.get('/api/tasks/:id', async (req, res) => {
    const row = await db.get('SELECT * FROM tasks WHERE id = ?', req.params.id);
    if(!row) return res.status(404).json({error:'not found'});
    res.json(row);
  });

  app.post('/api/tasks', async (req, res) => {
    const t = req.body;
    const now = Date.now();
    const id = t.id || (now.toString(36) + Math.random().toString(36).slice(2,6));
    await db.run(
      `INSERT INTO tasks(id,title,description,due,priority,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)`,
      id, t.title||'', t.description||'', t.due||null, t.priority||'medium', t.createdAt||now, t.updatedAt||now
    );
    const row = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    res.status(201).json(row);
  });

  app.put('/api/tasks/:id', async (req, res) => {
    const id = req.params.id;
    const t = req.body;
    const now = Date.now();
    await db.run(
      `UPDATE tasks SET title=?,description=?,due=?,priority=?,updatedAt=? WHERE id=?`,
      t.title||'', t.description||'', t.due||null, t.priority||'medium', now, id
    );
    const row = await db.get('SELECT * FROM tasks WHERE id = ?', id);
    if(!row) return res.status(404).json({error:'not found'});
    res.json(row);
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    const id = req.params.id;
    await db.run('DELETE FROM tasks WHERE id = ?', id);
    res.status(204).end();
  });

  // Serve static frontend files (this folder)
  app.use(express.static(path.join(__dirname)));
  app.get('*', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));

  app.listen(PORT, ()=>console.log(`TaskFlow server running on http://localhost:${PORT}`));
}

main().catch(err=>{console.error(err);process.exit(1)});
