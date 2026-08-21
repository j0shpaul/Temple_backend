export class MoneyUtil {
  static toPaise(rupees: number): number {
    return Math.round(rupees * 100);
  }

  static toRupees(paise: number): number {
    return paise / 100;
  }

  static add(a: number, b: number): number {
    return a + b;
  }

  static subtract(a: number, b: number): number {
    return a - b;
  }

  static multiply(paise: number, quantity: number): number {
    return paise * quantity;
  }

  static format(paise: number): string {
    return (paise / 100).toFixed(2);
  }

  static parse(amount: string | number): number {
    if (typeof amount === "number") {
      return this.toPaise(amount);
    }
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) {
      throw new Error("Invalid amount");
    }
    return this.toPaise(parsed);
  }
}
