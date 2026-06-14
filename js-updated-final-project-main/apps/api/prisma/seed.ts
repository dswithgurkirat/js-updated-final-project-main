import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users = [
  { username: "admin", fullName: "Administrator", email: "admin@dsr.com", password: "admin123", role: Role.ADMIN, district: "", blockName: "", sectionName: "", accessScope: "Full" },
  { username: "dc", fullName: "District Commissioner (Jalandhar)", email: "dc@dsr.com", password: "dc123", role: Role.DISTRICT_OWNER, district: "Jalandhar", blockName: "", sectionName: "", accessScope: "District review" },
  { username: "officer", fullName: "Geology Officer", email: "officer@dsr.com", password: "officer123", role: Role.OFFICER, district: "Jalandhar", blockName: "", sectionName: "", accessScope: "Legacy data entry" },
  { username: "reviewer", fullName: "State Reviewer", email: "reviewer@dsr.com", password: "reviewer123", role: Role.REVIEWER, district: "", blockName: "", sectionName: "", accessScope: "Legacy reviewer" },
  { username: "iit@demo.com", fullName: "IIT Ropar Survey Team", email: "iit@demo.com", password: "password123", role: Role.IIT_ROPAR, district: "", blockName: "", sectionName: "", accessScope: "Front matter + Chapters 1-4 + Review" },
  { username: "sdlc@demo.com", fullName: "SDLC Committee", email: "sdlc@demo.com", password: "password123", role: Role.SDLC, district: "Jalandhar", blockName: "", sectionName: "", accessScope: "District-level SDLC data" },
  { username: "sdo@demo.com", fullName: "Sub-Divisional Officer", email: "sdo@demo.com", password: "password123", role: Role.SDO, district: "Jalandhar", blockName: "Block A", sectionName: "", accessScope: "Chapters 5-10" },
  { username: "je@demo.com", fullName: "Junior Engineer Field Team", email: "je@demo.com", password: "password123", role: Role.JE, district: "Jalandhar", blockName: "Block A", sectionName: "Field Data", accessScope: "Field data" },
  { username: "axen@demo.com", fullName: "Assistant Executive Engineer", email: "axen@demo.com", password: "password123", role: Role.AXEN, district: "Jalandhar", blockName: "", sectionName: "Section A", accessScope: "Assigned section" },
  { username: "gis@demo.com", fullName: "GIS Team", email: "gis@demo.com", password: "password123", role: Role.GIS, district: "", blockName: "", sectionName: "", accessScope: "Plates + Graphs + Annexures + Review" },
  { username: "reviewer1@gov.in", fullName: "Government Reviewer 1", email: "reviewer1@gov.in", password: "password123", role: Role.REVIEWER_1, district: "", blockName: "", sectionName: "", accessScope: "Govt review" },
  { username: "reviewer2@gov.in", fullName: "Government Reviewer 2", email: "reviewer2@gov.in", password: "password123", role: Role.REVIEWER_2, district: "", blockName: "", sectionName: "", accessScope: "Govt review" },
  { username: "admin@demo.com", fullName: "Portal Administrator", email: "admin@demo.com", password: "password123", role: Role.ADMIN, district: "", blockName: "", sectionName: "", accessScope: "Full" }
] as const;

async function main() {
  for (const user of users) {
    const { username, fullName, email, password, role, district, blockName, sectionName, accessScope } = user;
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.upsert({
      where: { username },
      update: {
        fullName,
        email,
        password: hashedPassword,
        role,
        district,
        blockName,
        sectionName,
        accessScope,
        active: true
      },
      create: {
        username,
        fullName,
        email,
        password: hashedPassword,
        role,
        district,
        blockName,
        sectionName,
        accessScope,
        active: true
      }
    });
  }
}

main()
  .then(async () => {
    console.log("Seed users created.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
