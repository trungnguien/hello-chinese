/** Store tối giản: trạng thái bất biến + thông báo thay đổi qua bus. */
export class Store {
  constructor({ bus, initial }) {
    this.bus = bus;
    this.state = initial;
  }

  get() {
    return this.state;
  }

  update(fn) {
    const prev = this.state;
    this.state = { ...prev, ...fn(prev) };
    this.bus.emit('state.changed', { state: this.state, prev });
  }
}

export const initialState = {
  connection: 'connecting',
  me: null,
  catalog: { games: [], timeControls: [] },
  lobby: [],
  route: { view: 'market' },
  rooms: {},
  chat: {},
  ui: { flipped: false },
};
