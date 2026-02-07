export type ArtistDashboardDto = {
  metrics: {
    activeBookingsCount: number;
    upcomingBookingsCount: number;
    expectedIncome: number;
    confirmedIncome: number;
    pendingActionsCount: number;
    forecastIncome: number;
    occupancyRate: number; // 0-1
    reservedDaysCount: number;
    blockedDaysCount: number;
  };
  upcomingBookings: Array<{
    bookingId: string;
    venueName: string;
    startDate: string;
    status: string;
    totalAmount: number;
    currency: string;
  }>;
  pendingActions: Array<{
    bookingId: string;
    venueName: string;
    status: string;
    startDate: string | null;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
};
