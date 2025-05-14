import { MongoClient } from 'mongodb';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminUser() {
  // Get input from user
  const email = await new Promise<string>(resolve => {
    rl.question('Enter admin email: ', (answer) => resolve(answer));
  });
  
  const password = await new Promise<string>(resolve => {
    rl.question('Enter admin password (min 8 characters): ', (answer) => resolve(answer));
  });
  
  if (password.length < 8) {
    console.error('Password must be at least 8 characters long');
    rl.close();
    return;
  }
  
  // Connect to MongoDB
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/geo';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Check if admin already exists in the admins collection
    const adminsCollection = db.collection('admins');
    const existingAdmin = await adminsCollection.findOne({ email });
    
    if (existingAdmin) {
      console.log(`Admin with email ${email} already exists. Updating password...`);
      
      // Update existing admin's password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      await adminsCollection.updateOne(
        { email },
        { 
          $set: { 
            passwordHash,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('Admin password updated successfully');
    } else {
      // Create new admin user
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      const adminId = uuidv4();
      
      await adminsCollection.insertOne({
        id: adminId,
        email,
        passwordHash,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`Admin user created successfully with ID: ${adminId}`);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await client.close();
    rl.close();
  }
}

// Run the function
createAdminUser().catch(console.error);