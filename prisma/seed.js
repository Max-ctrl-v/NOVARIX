import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Admin-Benutzer erstellen
  const adminEmail = process.env.ADMIN_EMAIL || 'maxnodes@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'NovarixAdmin2024!';
  const adminName = process.env.ADMIN_NAME || 'Max';

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
        role: 'admin',
      },
    });
    console.log(`Admin-Account erstellt: ${adminEmail}`);
  } else {
    console.log(`Admin-Account existiert bereits: ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    console.error('Seed-Fehler:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
