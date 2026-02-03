import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class EventOrganizerGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userContext = request.userContext;
    const event = request.event; // inyectado por middleware o interceptor

    if (!event) {
      throw new ForbiddenException('Event not found');
    }

    const requesterId =
      userContext?.promoterId ??
      userContext?.venueId ??
      user?.sub ??
      user?.id;

    if (
      event.organizerPromoterId !== requesterId &&
      event.organizerVenueId !== requesterId &&
      event.ownerId !== requesterId
    ) {
      throw new ForbiddenException(
        'Only the event organizer can perform this action'
      );
    }

    return true;
  }
}
