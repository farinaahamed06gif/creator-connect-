import { supabaseAdmin } from "../src/config/supabase.js";

interface MockCreator {
  id: string;
  email: string;
  display_name: string;
  bio: string;
  niche: string;
  platforms: string[];
  audience_size: string;
  availability_hrs: number;
}

const mockCreators: MockCreator[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    email: "aarav@creatorconnect.dev",
    display_name: "Aarav Sharma",
    bio: "Full-stack engineer building developer tools and tutorials.",
    niche: "Tech & Coding",
    platforms: ["YouTube", "Twitter"],
    audience_size: "1k-10k",
    availability_hrs: 12
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    email: "priya@creatorconnect.dev",
    display_name: "Priya Patel",
    bio: "Product designer sharing UI motion prototypes and Figma workflows.",
    niche: "Design & UI/UX",
    platforms: ["Instagram", "Behance"],
    audience_size: "10k-50k",
    availability_hrs: 8
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    email: "rohan@creatorconnect.dev",
    display_name: "Rohan Verma",
    bio: "Calisthenics coach focused on sustainable mobility and posture.",
    niche: "Fitness & Wellness",
    platforms: ["YouTube", "Instagram"],
    audience_size: "<1k",
    availability_hrs: 15
  },
  {
    id: "d4444444-4444-4444-4444-444444444444",
    email: "sneha@creatorconnect.dev",
    display_name: "Sneha Roy",
    bio: "Indie game dev documenting Godot and pixel art experiments.",
    niche: "Gaming & Dev",
    platforms: ["Twitch", "YouTube"],
    audience_size: "1k-10k",
    availability_hrs: 10
  }
];

async function seed() {
  console.log("Seeding test creator profiles into Supabase...");

  for (const creator of mockCreators) {
    // 1. Ensure user exists in auth.users
    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      id: creator.id,
      email: creator.email,
      password: "Password123!",
      email_confirm: true
    });

    if (authError && !authError.message.toLowerCase().includes("already registered")) {
      console.warn(`Auth user note for ${creator.display_name}:`, authError.message);
    }

    // 2. Upsert profile record
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: creator.id,
      display_name: creator.display_name,
      bio: creator.bio,
      niche: creator.niche,
      platforms: creator.platforms,
      audience_size: creator.audience_size,
      availability_hrs: creator.availability_hrs
    });

    if (profileError) {
      console.error(`Failed to upsert profile for ${creator.display_name}:`, profileError.message);
    } else {
      console.log(`Successfully seeded: ${creator.display_name}`);
    }
  }

  console.log("Database seeding completed.");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});