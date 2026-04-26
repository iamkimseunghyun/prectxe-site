import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createHaboAdmin() {
  try {
    const username = 'habo';
    const password = 'admin123';
    const email = 'habo@prectxe.com';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      console.log(`⚠️  User "${username}" already exists`);

      // Update to ADMIN if not already
      if (existingUser.role !== 'ADMIN') {
        const updated = await prisma.user.update({
          where: { username },
          data: { role: 'ADMIN' },
        });
        console.log(`✅ Updated "${username}" to ADMIN role`);
        return updated;
      }

      return existingUser;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new admin user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    console.log(`✅ Successfully created ADMIN user "${username}"`);
    console.log('User details:', {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    });
    console.log(`\n🔑 Login credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);

    return newUser;
  } catch (error) {
    console.error('❌ Error creating user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createHaboAdmin();
