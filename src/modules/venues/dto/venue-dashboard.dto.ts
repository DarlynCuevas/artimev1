export interface VenueDashboardDto {
  metrics: {
    activeBookingsCount: number;
    upcomingBookingsCount: number;
    confirmedSpent: number;
    expectedSpent: number;
    pendingContractsCount: number;
    pendingPaymentsCount: number;
    pendingResponsesCount: number;
    pendingActionsCount: number;
  };

  upcomingBookings: {
    bookingId: string;
    artistName: string;
    startDate: string;
    status: string;
    totalAmount: number;
    currency: string;
  }[];
}
