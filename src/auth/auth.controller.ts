import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login User' })
  signIn(@Body() signInDto: LoginDto) {
    return this.authService.login(signInDto.email, signInDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Token Access' })
  refreshTokens(
    @Body('userId') userId: string,
    @Body('refresh_token') refreshToken: string,
  ) {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Logout User' })
  logout(@Request() req) {
    return this.authService.logout(req.user.id);
  }

  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('request-otp')
  @ApiOperation({ summary: 'Request OTP Email' })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verifikasi OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Lupa Password (Kirim Link Reset)' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset Password (Pakai Token)' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('change-password')
  @ApiOperation({ summary: 'Ganti Password (Saat Login)' })
  changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, dto);
  }
}
