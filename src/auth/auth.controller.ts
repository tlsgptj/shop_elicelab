import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from '../user/entities/user.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginUserDto } from '../user/dto/login-user.dto';
import { LocalAuthGuard } from './guards/localAuth.guard';
import { RequestWithUser } from './interfaces/RequestWithUser';
import { AccessTokenGuard } from './guards/accessToken.guard';
import { TokenType } from '../common/enums/tokenType.enum';
import { Response } from 'express';
import { EmailDto } from '../user/dto/email.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/signup')
  @ApiOperation({ summary: 'User Signup', description: 'User Signup' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Signup success',
    type: User,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  async registerMember(@Body() createUserDto: CreateUserDto): Promise<User> {
    console.log(createUserDto);
    return await this.authService.registerUser(createUserDto);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'login success' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'forbidden' })
  @ApiOperation({
    summary: 'Member Login',
    description: 'Member Login',
  })
  async logIn(
    @Req() req: RequestWithUser,
    @Res() response: Response,
  ): Promise<void> {
    const { user } = req;
    const { token: accessToken, cookie: accessTokenCookie } =
      await this.authService.generateToken(user.id, TokenType.ACCESS);
    const { token: refreshToken, cookie: refreshTokenCookie } =
      await this.authService.generateToken(user.id, TokenType.REFRESH);

    user.password = undefined;
    req.res.setHeader('Set-Cookie', [accessTokenCookie, refreshTokenCookie]);

    response.send({ user, accessToken, refreshToken });
  }

  @Get()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get User Info', description: 'Get User Info' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User Info success',
    type: User,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'forbidden' })
  async authenticate(@Req() req: RequestWithUser): Promise<User> {
    return await req.user;
  }

  @UseGuards(AccessTokenGuard)
  @Post('/logout')
  @ApiOperation({ summary: 'Logout', description: 'Logout' })
  @ApiResponse({ status: HttpStatus.OK, description: 'logout success' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'forbidden' })
  async logOut(@Req() req: RequestWithUser): Promise<boolean> {
    req.res.setHeader('Set-Cookie', this.authService.getCookiesForLogOut());
    return true;
  }

  @Post('/email/send')
  @ApiBody({ type: EmailDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Send Email for Verification',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Bad Request' })
  @ApiOperation({
    summary: 'Send Email',
    description: 'Send Email',
  })
  async initiateEmailAddressVerification(
    @Body() emailDto: EmailDto,
  ): Promise<void> {
    return await this.authService.initiateEmailAddressVerification(
      emailDto.email,
    );
  }
}
