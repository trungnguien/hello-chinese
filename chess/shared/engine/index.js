/** Mặt tiền (facade) của engine — contract công khai cho server, client, test. */
export { Game, GameError, SCORE } from './Game.js';
export { Engine } from './Engine.js';
export { buildVariant, Variant } from './Variant.js';
export { variantDefinitions, STANDARD } from './variants/index.js';
export { movementKinds } from './movement/index.js';
export { ruleFactories } from './rules/index.js';
export { endConditionFactories } from './endConditions/index.js';
export { parseFen, toFen } from './fen.js';
export { toUci, parseUci } from './move.js';
export { toPgn } from './pgn.js';
