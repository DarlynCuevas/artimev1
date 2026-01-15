import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { BookingStatus } from '../../bookings/booking-status.enum';

@Injectable()
export class BookingConfirmedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const booking = request.booking;

    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    if (booking.status !== BookingStatus.CONTRACT_SIGNED &&
        booking.status !== BookingStatus.PAID_PARTIAL &&
        booking.status !== BookingStatus.PAID_FULL &&
        booking.status !== BookingStatus.COMPLETED) {
      throw new ForbiddenException(
        'Only confirmed bookings can be organized in an event'
      );
    }

    return true;
  }
}
