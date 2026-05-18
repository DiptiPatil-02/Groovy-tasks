const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function validatePayload(body, partial = false) {
  const { name, email, course, age } = body || {};
  const errors = [];

  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) errors.push('name is required');
  }
  if (!partial || email !== undefined) {
    if (typeof email !== 'string' || !email.trim()) errors.push('email is required');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('email is invalid');
  }
  if (!partial || course !== undefined) {
    if (typeof course !== 'string' || !course.trim()) errors.push('course is required');
  }
  if (!partial || age !== undefined) {
    const n = Number(age);
    if (!Number.isInteger(n) || n < 1 || n > 120) errors.push('age must be an integer between 1 and 120');
  }

  return errors;
}

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, course, age FROM students ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load students' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, course, age FROM students WHERE id = $1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load student' });
  }
});

router.post('/', async (req, res) => {
  const errors = validatePayload(req.body, false);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const { name, email, course, age } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO students (name, email, course, age)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, course, age`,
      [name.trim(), email.trim().toLowerCase(), course.trim(), Number(age)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }

  const errors = validatePayload(req.body, true);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const { name, email, course, age } = req.body;
  const fields = [];
  const values = [];
  let i = 1;

  if (name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(String(name).trim());
  }
  if (email !== undefined) {
    fields.push(`email = $${i++}`);
    values.push(String(email).trim().toLowerCase());
  }
  if (course !== undefined) {
    fields.push(`course = $${i++}`);
    values.push(String(course).trim());
  }
  if (age !== undefined) {
    fields.push(`age = $${i++}`);
    values.push(Number(age));
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(id);

  try {
    const { rows } = await pool.query(
      `UPDATE students SET ${fields.join(', ')} WHERE id = $${i}
       RETURNING id, name, email, course, age`,
      values
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const { rowCount } = await pool.query('DELETE FROM students WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Student not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

module.exports = router;
