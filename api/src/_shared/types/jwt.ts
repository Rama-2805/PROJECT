export interface JwtPayload {
  sub: string;
  email: string;
  institutionId: string;
  roles: string[];
}
