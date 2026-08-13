import { Role } from '@prisma/client';
export declare class AuthUserDto {
    id: string;
    email: string;
    name: string;
    role: Role;
}
export declare class AuthResponseDto {
    accessToken: string;
    user: AuthUserDto;
}
