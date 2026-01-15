import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class BookingBelongsToOrganizerGuard
  implements CanActivate
{
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const booking = request.booking;
    const user = request.user;

    if (!booking) {
      throw new ForbiddenException('Booking not found');
    }

    if (booking.created_by !== user.id) {
      throw new ForbiddenException(
        'You cannot use a booking you do not own'
      );
    }

    return true;
  }
}
