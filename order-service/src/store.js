const { randomUUID } = require("crypto");

class OrderStore {
  constructor() {
    this._orders = new Map();
  }

  list() {
    return Array.from(this._orders.values());
  }

  get(id) {
    return this._orders.get(id);
  }

  create(payload) {
    const id = payload.id || randomUUID();
    const order = {
      id,
      item: payload.item || "widget",
      quantity: Number(payload.quantity) || 1,
      status: payload.status || "processed",
      createdAt: new Date().toISOString(),
    };
    this._orders.set(id, order);
    return order;
  }
}

module.exports = OrderStore;
