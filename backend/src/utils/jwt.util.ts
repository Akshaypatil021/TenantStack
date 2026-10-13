import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const getSecret = (): string => process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';
const getExpiresIn = (): string => process.env.JWT_EXPIRES_IN || '1d';

export interface JwtPayload {
  userId: string;
  tenantId?: string;
  roleId?: string;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getSecret(), { expiresIn: getExpiresIn() as any });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, getSecret()) as JwtPayload;
  } catch (error) {
    return null;
  }
};

