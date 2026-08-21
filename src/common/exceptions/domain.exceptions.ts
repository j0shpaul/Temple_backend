export class DomainException extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "DomainException";
  }
}

export class SlotFullException extends DomainException {
  constructor() {
    super("SLOT_FULL", "This slot is no longer available.", 400);
  }
}

export class BookingNotFoundException extends DomainException {
  constructor() {
    super("BOOKING_NOT_FOUND", "Booking not found.", 404);
  }
}

export class BookingAlreadyCancelledException extends DomainException {
  constructor() {
    super("BOOKING_ALREADY_CANCELLED", "Booking is already cancelled.", 400);
  }
}

export class PaymentFailedException extends DomainException {
  constructor(message = "Payment failed.") {
    super("PAYMENT_FAILED", message, 400);
  }
}

export class PaymentNotVerifiedException extends DomainException {
  constructor() {
    super("PAYMENT_NOT_VERIFIED", "Payment could not be verified.", 400);
  }
}

export class InvalidQRException extends DomainException {
  constructor() {
    super("INVALID_QR", "Invalid QR code.", 400);
  }
}

export class AlreadyCheckedInException extends DomainException {
  constructor() {
    super("ALREADY_CHECKED_IN", "Already checked in for this booking.", 400);
  }
}

export class EventFullException extends DomainException {
  constructor() {
    super("EVENT_FULL", "This event is full.", 400);
  }
}

export class DuplicateRegistrationException extends DomainException {
  constructor() {
    super("DUPLICATE_REGISTRATION", "Already registered for this event.", 400);
  }
}

export class RoomUnavailableException extends DomainException {
  constructor() {
    super(
      "ROOM_UNAVAILABLE",
      "This room is unavailable for the selected dates.",
      400,
    );
  }
}

export class UnauthorizedException extends DomainException {
  constructor(message = "Unauthorized.") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenException extends DomainException {
  constructor(message = "Forbidden.") {
    super("FORBIDDEN", message, 403);
  }
}
