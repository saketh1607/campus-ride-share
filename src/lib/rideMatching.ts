/**
 * Ride Matching Algorithm
 * Matches passengers with drivers based on preferences and compatibility
 */

interface Profile {
  id: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  user_type?: "student" | "faculty";
  current_year?: number | null;
}

interface RidePreferences {
  accept_opposite_gender: boolean;
  accept_seniors: boolean;
}

interface DriverDetails {
  vehicle_type: "two_wheeler" | "four_wheeler";
}

/**
 * Check if a passenger is compatible with a driver's ride
 */
export const isRideMatch = (
  passenger: Profile,
  driver: Profile,
  passengerPrefs: RidePreferences,
  driverPrefs: RidePreferences,
  driverDetails?: DriverDetails
): { compatible: boolean; reasons: string[] } => {
  const reasons: string[] = [];

  // Gender compatibility check
  if (passenger.gender && driver.gender) {
    const isOppositeGender = passenger.gender !== driver.gender;
    if (isOppositeGender) {
      if (!passengerPrefs.accept_opposite_gender) {
        reasons.push("Passenger doesn't accept opposite gender");
      }
      if (!driverPrefs.accept_opposite_gender) {
        reasons.push("Driver doesn't accept opposite gender");
      }
    }
  }

  // Senior/Junior compatibility (only for students)
  if (
    passenger.user_type === "student" &&
    driver.user_type === "student" &&
    passenger.current_year &&
    driver.current_year
  ) {
    const passengerIsSenior = passenger.current_year >= 3;
    const driverIsSenior = driver.current_year >= 3;

    // If passenger is junior and driver is senior
    if (!passengerIsSenior && driverIsSenior && !passengerPrefs.accept_seniors) {
      reasons.push("Passenger (junior) doesn't accept rides with seniors");
    }

    // If passenger is senior and driver is junior
    if (passengerIsSenior && !driverIsSenior && !driverPrefs.accept_seniors) {
      reasons.push("Driver (junior) doesn't accept seniors as passengers");
    }
  }

  const compatible = reasons.length === 0;
  return { compatible, reasons };
};

/**
 * Calculate a compatibility score (0-100) for ride matching
 */
export const calculateCompatibilityScore = (
  passenger: Profile,
  driver: Profile,
  passengerPrefs: RidePreferences,
  driverPrefs: RidePreferences
): number => {
  let score = 100;

  // Gender preference match (weight: 30)
  if (passenger.gender && driver.gender) {
    const isOppositeGender = passenger.gender !== driver.gender;
    if (isOppositeGender) {
      if (!passengerPrefs.accept_opposite_gender || !driverPrefs.accept_opposite_gender) {
        score -= 30;
      }
    }
  }

  // Year compatibility (weight: 40)
  if (
    passenger.user_type === "student" &&
    driver.user_type === "student" &&
    passenger.current_year &&
    driver.current_year
  ) {
    const yearDiff = Math.abs(passenger.current_year - driver.current_year);
    
    // Reduce score based on year difference
    score -= yearDiff * 10;

    const passengerIsSenior = passenger.current_year >= 3;
    const driverIsSenior = driver.current_year >= 3;

    if (!passengerIsSenior && driverIsSenior && !passengerPrefs.accept_seniors) {
      score -= 40;
    }
    if (passengerIsSenior && !driverIsSenior && !driverPrefs.accept_seniors) {
      score -= 40;
    }
  }

  // Faculty-student match bonus (weight: 30)
  if (passenger.user_type === "faculty" || driver.user_type === "faculty") {
    score += 15; // Faculty rides are generally considered safer
  }

  return Math.max(0, Math.min(100, score));
};
