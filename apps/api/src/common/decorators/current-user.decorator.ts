import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../../_shared/types/jwt";

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
