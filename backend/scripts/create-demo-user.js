// Create a demo user in MongoDB
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

async function createDemoUser() {
  // Connect to MongoDB
  const uri = process.env.DB_HOST || 'mongodb://localhost:27017/geo';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Create user schema
  const userSchema = new mongoose.Schema({
    id: String,
    email: String,
    language: String,
    createdAt: Date,
    updatedAt: Date
  }, { collection: 'users' });

  const User = mongoose.model('User', userSchema);

  // Create demo user
  const user = new User({
    id: uuidv4(),
    email: "demo@example.com",
    language: "en",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Save to database
  await user.save();
  console.log('Demo user created with ID:', user.id);
  console.log('User details:', user);

  // Disconnect
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
}

createDemoUser().catch(console.error);