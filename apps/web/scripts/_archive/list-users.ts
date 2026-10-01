import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`\n📋 Total users: ${users.length}\n`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username || user.email || 'No name'}`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email || 'N/A'}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Created: ${user.createdAt?.toLocaleString('ko-KR')}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
