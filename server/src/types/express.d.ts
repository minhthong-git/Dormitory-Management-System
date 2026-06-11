// Augment Express Request để thêm `user` payload từ JWT middleware
import { JwtPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
