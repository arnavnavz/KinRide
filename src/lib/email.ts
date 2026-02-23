interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  console.log(`[EMAIL] To: ${options.to} | Subject: ${options.subject}`);
  console.log(`[EMAIL] Body: ${options.body.substring(0, 200)}...`);
  return true;
}

export function buildReceiptEmail(ride: {
  pickupAddress: string;
  dropoffAddress: string;
  estimatedFare: number;
  platformFee: number | null;
  driverName: string;
  date: string;
}): EmailOptions {
  return {
    to: "",
    subject: `Your KinRide receipt - $${ride.estimatedFare.toFixed(2)}`,
    body: `
KinRide Trip Receipt

Date: ${ride.date}
Driver: ${ride.driverName}

Route:
  From: ${ride.pickupAddress}
  To: ${ride.dropoffAddress}

Fare: $${ride.estimatedFare.toFixed(2)}
${ride.platformFee ? `Platform Fee: $${ride.platformFee.toFixed(2)}` : ""}
${ride.platformFee ? `Driver Earnings: $${(ride.estimatedFare - ride.platformFee).toFixed(2)}` : ""}

Thank you for riding with KinRide!
    `.trim(),
  };
}

export function buildWeeklyEarningsEmail(driver: {
  name: string;
  weeklyGross: number;
  weeklyFees: number;
  weeklyNet: number;
  ridesCount: number;
}): EmailOptions {
  return {
    to: "",
    subject: `Your weekly earnings: $${driver.weeklyNet.toFixed(2)}`,
    body: `
Hi ${driver.name},

Here's your weekly earnings summary:

Rides completed: ${driver.ridesCount}
Gross earnings: $${driver.weeklyGross.toFixed(2)}
Platform fees: $${driver.weeklyFees.toFixed(2)}
Net earnings: $${driver.weeklyNet.toFixed(2)}

Keep driving with KinRide!
    `.trim(),
  };
}
