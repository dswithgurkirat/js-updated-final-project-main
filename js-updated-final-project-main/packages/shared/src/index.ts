export const roles = [
  "ADMIN",
  "STATE_ADMIN",
  "DISTRICT_OWNER",
  "OFFICER",
  "REVIEWER",
  "IIT_ROPAR",
  "SDLC",
  "SDO",
  "JE",
  "AXEN",
  "GIS",
  "REVIEWER_1",
  "REVIEWER_2"
] as const;

export type Role = (typeof roles)[number];
