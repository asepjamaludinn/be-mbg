import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { createClient } from '@supabase/supabase-js';
import { extname } from 'path';
import { ConfigService } from '@nestjs/config';

@Controller('uploads')
export class UploadsController {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_KEY'),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: true,
        }),
    )
    file: Express.Multer.File,
  ) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    const filename = `avatar-${uniqueSuffix}${ext}`;

    const { data, error } = await this.supabase.storage
      .from('avatars')
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase Upload Error:', error);
      throw new BadRequestException('Gagal mengupload gambar ke Cloud Storage');
    }

    const { data: publicUrlData } = this.supabase.storage
      .from('avatars')
      .getPublicUrl(filename);

    return {
      message: 'Upload berhasil',
      url: publicUrlData.publicUrl,
    };
  }
}
