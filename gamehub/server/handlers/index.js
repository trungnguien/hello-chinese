import * as session from './session.js';
import * as room from './room.js';

/** Danh sách handler mặc định. Plugin có thể register thêm vào registry `handlers`. */
export const defaultHandlers = [...Object.values(session), ...Object.values(room)];
