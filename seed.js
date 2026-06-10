require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
const Department = require('./models/Department');

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create default admin if not exists
    const adminExists = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      await Admin.create({
        username: process.env.ADMIN_USERNAME,
        password: hashedPassword,
      });
      console.log('Default admin created');
    }

    // Create sample departments
    const departments = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];
    for (const deptName of departments) {
      const exists = await Department.findOne({ name: deptName });
      if (!exists) {
        await Department.create({
          name: deptName,
          code: deptName.substring(0, 3).toUpperCase(),
          description: `${deptName} Department`,
        });
        console.log(`Department created: ${deptName}`);
      }
    }

    console.log('Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();