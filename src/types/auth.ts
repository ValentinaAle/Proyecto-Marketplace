import type { JwtPayload } from 'jsonwebtoken';

export interface AuthenticatedUser extends JwtPayload {
  id_user: number;
  email: string;
}
