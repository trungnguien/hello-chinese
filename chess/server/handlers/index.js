import * as session from './session.js';
import * as game from './game.js';

/** Danh sách handler mặc định. Plugin có thể register thêm vào registry `handlers`. */
export const defaultHandlers = [...Object.values(session), ...Object.values(game)];
