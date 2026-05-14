const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

let todos = [
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Learn Node.js', completed: false }
];

// Get all todos/
app.get('/api/todos', (req, res) => {
    res.json(todos);
});

// Add a new todo
app.post('/api/todos', (req, res) => {
    const text = req.body?.text?.trim();
    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }
    const newTodo = {
        id: Date.now(),
        text,
        completed: false
    };
    todos.push(newTodo);
    res.status(201).json(newTodo);
});

// Delete a todo
app.delete('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    todos = todos.filter(todo => todo.id !== parseInt(id));
    res.status(204).send();
});

// Toggle todo completion
app.patch('/api/todos/:id', (req, res) => {
    const { id } = req.params;
    const todo = todos.find(t => t.id === parseInt(id));
    if (todo) {
        todo.completed = !todo.completed;
        res.json(todo);
    } else {
        res.status(404).send('Todo not found');
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
