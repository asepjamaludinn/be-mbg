import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      'Error: ADMIN_EMAIL atau ADMIN_PASSWORD belum di-set di file .env',
    );
    process.exit(1);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        name: 'Super Admin Pusat',
        password: hashedPassword,
        role: Role.ADMIN_PUSAT,
        isActive: true,
      },
    });

    console.log(`Super Admin created: ${email}`);
  } else {
    console.log('Super Admin already exists.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
