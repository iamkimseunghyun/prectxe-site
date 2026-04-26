import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updatePassword() {
  const hashedPassword =
    '$2b$12$Zua0Ui0k9uOrG7GdJDRFA.lDN47qjAlBgRVS2KOgJ2ZzvK5MhROJi';

  const user = await prisma.user.update({
    where: { username: 'testadmin' },
    data: { password: hashedPassword },
    select: { id: true, username: true, role: true },
  });

  console.log('✅ Password updated successfully!');
  console.log('User:', user);
  console.log('\nTest account credentials:');
  console.log('Username: testadmin');
  console.log('Password: test1234');

  await prisma.$disconnect();
}

updatePassword().catch((error) => {
  console.error('❌ Error updating password:', error);
  process.exit(1);
});
