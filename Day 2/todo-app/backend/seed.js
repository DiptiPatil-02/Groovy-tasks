require('dotenv').config();
const mongoose = require('mongoose');
const Todo = require('./models/Todo');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/todoapp';

const sampleTodos = [
  { text: 'Learn MongoDB with Mongoose', completed: true },
  { text: 'Build a REST API with Express', completed: true },
  { text: 'Connect React frontend to Node backend', completed: false },
  { text: 'Add authentication with JWT', completed: false },
  { text: 'Deploy the app to cloud', completed: false },
  { text: 'Write unit tests for all routes', completed: false },
  { text: 'Set up CI/CD pipeline', completed: false },
];

async function seedDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing todos
    await Todo.deleteMany({});
    console.log('🗑️  Cleared existing todos');

    // Insert sample todos
    const inserted = await Todo.insertMany(sampleTodos);
    console.log(`🌱 Seeded ${inserted.length} todos into the database!\n`);

    inserted.forEach((todo, i) => {
      console.log(`  ${i + 1}. [${todo.completed ? '✓' : ' '}] ${todo.text}`);
      console.log(`     _id: ${todo._id}`);
    });

    console.log('\n✨ Done! Open MongoDB Compass → todoapp → todos to see your data.');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

seedDB();
