import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Production database URL
const PROD_DB_URL =
  'postgresql://neondb_owner:npg_I4OZ1ryKXRzn@ep-hidden-frog-a1xuqjat-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: PROD_DB_URL,
    },
  },
});

async function updateHaboPassword() {
  try {
    const username = 'habo';
    const newPassword = 'admin123';

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        password: true,
      },
    });

    if (!user) {
      console.error(`❌ User "${username}" not found in production DB`);
      return;
    }

    console.log('📋 Current user info:');
    console.log({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
    });

    console.log(
      `\n✅ Successfully updated password for "${username}" in PRODUCTION DB`
    );
    console.log(`🔑 New password: ${newPassword}`);
    console.log(`🔐 New hash: ${hashedPassword.substring(0, 20)}...`);

    // Verify the new password works
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`\n✓ Password verification: ${isValid ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.error('❌ Error updating password:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateHaboPassword();
