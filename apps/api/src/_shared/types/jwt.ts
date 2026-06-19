export interface JwtPayload {
  id: string;
  sub: string;
  email: string;
  institutionId: string;
  roles: string[];
}
