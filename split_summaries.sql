-- Split Summaries Table for Payout Flow
CREATE TABLE IF NOT EXISTS split_summaries (
  booking_id UUID PRIMARY KEY,
  artist_fee NUMERIC(12,2) NOT NULL,
  artime_commission NUMERIC(12,2) NOT NULL,
  manager_involved BOOLEAN NOT NULL,
  manager_commission NUMERIC(12,2),
  payment_costs NUMERIC(12,2) NOT NULL,
  artist_net_amount NUMERIC(12,2) NOT NULL,
  total_payable NUMERIC(12,2) NOT NULL,
  currency VARCHAR(8) NOT NULL,
  frozen_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_split_summaries_booking_id ON split_summaries(booking_id);
