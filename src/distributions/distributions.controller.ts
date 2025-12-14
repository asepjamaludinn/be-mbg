import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { UpdateDistributionDto } from './dto/update-distribution.dto';

@Controller('distributions')
export class DistributionsController {
  constructor(private readonly distributionsService: DistributionsService) {}

  @Post()
  create(@Body() createDistributionDto: CreateDistributionDto) {
    return this.distributionsService.create(createDistributionDto);
  }

  @Get()
  findAll() {
    return this.distributionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.distributionsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDistributionDto: UpdateDistributionDto) {
    return this.distributionsService.update(+id, updateDistributionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.distributionsService.remove(+id);
  }
}
