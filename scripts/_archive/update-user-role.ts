import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    const username = 'habo';

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.error(`❌ User "${username}" not found`);
      return;
    }

    // Update role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { username },
      data: { role: 'ADMIN' },
    });

    console.log(`✅ Successfully updated user "${username}" to ADMIN role`);
    console.log('User details:', {
      id: updatedUser.id,
      username: updatedUser.username,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    console.error('❌ Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();
