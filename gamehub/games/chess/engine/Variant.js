import { movementKinds as defaultMovementKinds } from './movement/index.js';
import { ruleFactories as defaultRuleFactories } from './rules/index.js';
import { endConditionFactories as defaultEndConditionFactories } from './endConditions/index.js';

/**
 * Lắp ráp một Variant từ MÔ TẢ DỮ LIỆU (nguyên tắc 3) bằng composition (nguyên tắc 6).
 * Các id trong mô tả chỉ được phân giải thành implementation tại thời điểm build
 * (late binding — nguyên tắc 2), dựa trên các registry được truyền vào.
 *
 * @typedef {{ id: string, options?: object }} Ref
 * @typedef {{
 *   id: string, name: string, description?: string, initialFen: string,
 *   pieces: object, rules: Ref[], endConditions: Ref[]
 * }} VariantDefinition
 */
export class Variant {
  constructor({ definition, movementKinds, rules, endConditions }) {
    this.definition = definition;
    this.id = definition.id;
    this.name = definition.name;
    this.description = definition.description ?? '';
    this.initialFen = definition.initialFen;
    this.pieces = definition.pieces;
    this.movementKinds = movementKinds;
    this.rules = rules;
    this.endConditions = endConditions;
  }

  /** Phần công khai (contract) để hiển thị cho client. */
  describe() {
    return { id: this.id, name: this.name, description: this.description };
  }
}

export function buildVariant(
  definition,
  {
    movementKinds = defaultMovementKinds,
    ruleFactories = defaultRuleFactories,
    endConditionFactories = defaultEndConditionFactories,
  } = {},
) {
  for (const [type, def] of Object.entries(definition.pieces)) {
    for (const spec of def.movement) {
      if (!movementKinds.has(spec.kind)) throw new Error(`Piece "${type}" uses unknown movement kind "${spec.kind}"`);
    }
  }
  return new Variant({
    definition,
    movementKinds,
    rules: definition.rules.map((ref) => ruleFactories.get(ref.id)(ref.options ?? {})),
    endConditions: definition.endConditions.map((ref) => endConditionFactories.get(ref.id)(ref.options ?? {})),
  });
}
