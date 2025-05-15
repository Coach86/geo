import { SetMetadata } from '@nestjs/common';

export const IS_TOKEN_ROUTE_KEY = 'isTokenRoute';
export const TokenRoute = () => SetMetadata(IS_TOKEN_ROUTE_KEY, true);