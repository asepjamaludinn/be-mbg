import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('API Manajemen Dapur MBG')
    .setDescription(
      'Dokumentasi API lengkap untuk sistem logistik dan distribusi Makan Bergizi Gratis.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Autentikasi & Manajemen Akun')
    .addTag('Users', 'Manajemen Pengguna')
    .addTag('Materials', 'Master Data Bahan Baku')
    .addTag('Branches', 'Master Data Cabang/Dapur')
    .addTag('Stocks', 'Manajemen Stok & Opname')
    .addTag('Requests', 'Transaksi Permintaan & Pengiriman Barang')
    .addTag('Distributions', 'Distribusi ke Sekolah & Aset Wadah')
    .addTag('Reports', 'Laporan & Rekapitulasi')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}
bootstrap();
