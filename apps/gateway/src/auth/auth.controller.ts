import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser, ParsePgUuidPipe, Public, Role, Roles } from '@lms/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateRoleDto } from './dto/auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign in with email & password (rate-limited)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new student account (rate-limited)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user and profile' })
  async me(@CurrentUser() user: AuthUser) {
    const profile = await this.authService.getProfile(user.id);
    return { user, profile };
  }

  @Get('student-area')
  @ApiBearerAuth()
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Route accessible by students, instructors, and admins' })
  studentArea(@CurrentUser() user: AuthUser) {
    return { message: 'Welcome to the student area', user };
  }

  @Get('instructor-area')
  @ApiBearerAuth()
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Route restricted to instructors and admins' })
  instructorArea(@CurrentUser() user: AuthUser) {
    return { message: 'Welcome to the instructor area', user };
  }

  @Patch('users/:id/role')
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin-only: update a user role in Supabase app_metadata' })
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.authService.updateUserRole(id, dto.role);
  }
}
