export type ArtistDashboardDto = {
  metrics: {
    activeBookingsCount: number;
    upcomingBookingsCount: number;
    expectedIncome: number;
    confirmedIncome: number;
    confirmedIncomeMoMPercent: number | null;
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
};
