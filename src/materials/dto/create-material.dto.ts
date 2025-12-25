import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  unit: string;
}
