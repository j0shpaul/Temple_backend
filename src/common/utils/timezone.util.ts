export const TEMPLE_TIMEZONE = "Asia/Kolkata";

export class TimezoneUtil {
  static now(): Date {
    return new Date();
  }

  static toTempleTime(date: Date): string {
    return date.toLocaleString("en-IN", {
      timeZone: TEMPLE_TIMEZONE,
      hour12: false,
    });
  }

  static startOfDay(date: Date = new Date()): Date {
    const templeDate = new Date(
      date.toLocaleString("en-US", { timeZone: TEMPLE_TIMEZONE }),
    );
    templeDate.setHours(0, 0, 0, 0);
    return templeDate;
  }

  static endOfDay(date: Date = new Date()): Date {
    const templeDate = new Date(
      date.toLocaleString("en-US", { timeZone: TEMPLE_TIMEZONE }),
    );
    templeDate.setHours(23, 59, 59, 999);
    return templeDate;
  }

  static isSameTempleDay(date1: Date, date2: Date): boolean {
    const d1 = date1.toLocaleDateString("en-CA", { timeZone: TEMPLE_TIMEZONE });
    const d2 = date2.toLocaleDateString("en-CA", { timeZone: TEMPLE_TIMEZONE });
    return d1 === d2;
  }

  static parseTempleDate(dateString: string): Date {
    return new Date(`${dateString}T00:00:00+05:30`);
  }

  static formatDateForDb(date: Date): string {
    return date.toLocaleDateString("en-CA", { timeZone: TEMPLE_TIMEZONE });
  }
}
