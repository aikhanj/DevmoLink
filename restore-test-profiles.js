// Quick script to restore test profiles after nuclear reset
// Run this with: node restore-test-profiles.js

const admin = require("firebase-admin");

// Initialize Firebase Admin (you'll need to set up credentials)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Add your Firebase config here
  });
}

const db = admin.firestore();

const testProfiles = [
  {
    email: "alice@example.com",
    name: "Alice Developer",
    age: 25,
    gender: "woman",
    timezone: "America/New_York",
    description: "Full-stack developer passionate about React and Node.js",
    professions: ["Software Engineer"],
    skills: ["JavaScript", "React", "Node.js", "Python"],
    experienceLevel: "intermediate",
    interests: ["coding", "coffee", "hiking"],
    tools: ["VS Code", "Git", "Docker"],
    programmingLanguages: ["JavaScript", "Python", "TypeScript"],
    themes: ["Web Development", "AI/ML"],
    photos: [],
    avatarUrl: null,
  },
  {
    email: "bob@example.com",
    name: "Bob Backend",
    age: 28,
    gender: "man",
    timezone: "America/Los_Angeles",
    description:
      "Backend engineer specializing in microservices and cloud architecture",
    professions: ["Backend Engineer"],
    skills: ["Java", "Spring", "AWS", "Kubernetes"],
    experienceLevel: "senior",
    interests: ["architecture", "scalability", "gaming"],
    tools: ["IntelliJ", "Postman", "AWS CLI"],
    programmingLanguages: ["Java", "Go", "Python"],
    themes: ["Cloud Computing", "DevOps"],
    photos: [],
    avatarUrl: null,
  },
  {
    email: "carol@example.com",
    name: "Carol Frontend",
    age: 23,
    gender: "woman",
    timezone: "Europe/London",
    description:
      "Frontend developer with a passion for user experience and design",
    professions: ["Frontend Developer"],
    skills: ["React", "Vue.js", "CSS", "UX Design"],
    experienceLevel: "junior",
    interests: ["design", "user experience", "travel"],
    tools: ["Figma", "Chrome DevTools", "Webpack"],
    programmingLanguages: ["JavaScript", "TypeScript", "CSS"],
    themes: ["UI/UX", "Web Development"],
    photos: [],
    avatarUrl: null,
  },
  {
    email: "dave@example.com",
    name: "Dave DevOps",
    age: 30,
    gender: "man",
    timezone: "America/Chicago",
    description: "DevOps engineer focused on automation and infrastructure",
    professions: ["DevOps Engineer"],
    skills: ["Docker", "Kubernetes", "Terraform", "CI/CD"],
    experienceLevel: "senior",
    interests: ["automation", "infrastructure", "music"],
    tools: ["Jenkins", "Ansible", "Prometheus"],
    programmingLanguages: ["Bash", "Python", "Go"],
    themes: ["DevOps", "Cloud Computing"],
    photos: [],
    avatarUrl: null,
  },
  {
    email: "eve@example.com",
    name: "Eve ML Engineer",
    age: 26,
    gender: "woman",
    timezone: "Asia/Tokyo",
    description: "Machine learning engineer working on computer vision and NLP",
    professions: ["ML Engineer"],
    skills: ["Python", "TensorFlow", "PyTorch", "Data Science"],
    experienceLevel: "intermediate",
    interests: ["AI", "research", "anime"],
    tools: ["Jupyter", "Google Colab", "MLflow"],
    programmingLanguages: ["Python", "R", "SQL"],
    themes: ["AI/ML", "Data Science"],
    photos: [],
    avatarUrl: null,
  },
];

async function restoreProfiles() {
  console.log("🔄 Restoring test profiles...");

  for (const profile of testProfiles) {
    try {
      await db.collection("profiles").doc(profile.email).set(profile);
      console.log(`✅ Created profile: ${profile.name} (${profile.email})`);
    } catch (error) {
      console.error(`❌ Failed to create ${profile.email}:`, error);
    }
  }

  console.log("🎉 Profile restoration complete!");
}

restoreProfiles().catch(console.error);
