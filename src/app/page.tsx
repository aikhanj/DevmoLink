"use client";
import { useEffect, useState, useCallback, useContext, useRef, RefObject } from "react";
import TinderCard from "react-tinder-card";
// Cast to any to allow passing untyped props like flickDuration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyTinderCard = TinderCard as any;
import AuthButton from "./AuthButton";
import dynamic from 'next/dynamic';
import { XMarkIcon, HeartIcon } from '@heroicons/react/24/solid';
import { useRouter } from "next/navigation";
const ProfileCard = dynamic(() => import('./components/ProfileCard'), { ssr: false });
import { useSession, signIn } from "next-auth/react";
import { LoadingContext } from "./MainLayout";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import ProfileForm from "./ProfileForm";

interface Profile {
  id: string;
  name: string;
  email: string;
  skills?: {
    languages?: string[];
    frameworks?: string[];
  };
  programmingLanguages?: string[];
  timeCommitment?: string;
  timezone?: string;
  projectVibe?: string;
  isBoosted?: boolean;
  age?: number;
  university?: string;
  photos: string[];
  gender?: string;
  professions?: string[];
  experienceLevel?: string;
  interests?: string[];
  tools?: string[];
}

interface UserProfile {
  name?: string;
  avatarUrl?: string;
  programmingLanguages?: string[];
  themes?: string[];
  timezone?: string;
  photos?: string[];
}

// Fetch profiles in batches, excluding already seen ones
async function fetchProfiles(excludeIds: string[] = [], limit: number = 3) {
  console.log('fetchProfiles called with:', { excludeIds, limit });
  try {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (excludeIds.length > 0) {
      params.set('exclude', excludeIds.join(','));
    }
    
    const url = `/api/profiles?${params}`;
    console.log('Fetching profiles from:', url);
    
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Failed to fetch profiles:", res.status, res.statusText);
      return { profiles: [], hasMore: false, total: 0 };
    }
    const data = await res.json();
    console.log('Profiles API response:', data);
    return {
      profiles: Array.isArray(data.profiles) ? data.profiles : [],
      hasMore: data.hasMore || false,
      total: data.total || 0
    };
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return { profiles: [], hasMore: false, total: 0 };
  }
}

function useTypingEffect(text: string, speed = 30) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return displayed;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [swipedIds, setSwipedIds] = useState<string[]>([]);
  const [hasMoreProfiles, setHasMoreProfiles] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loading, setLocalLoading] = useState(true);
  const { setLoading } = useContext(LoadingContext);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean>(false);
  // Control when to show the underlying (next) card to prevent initial flash
  const [showNextCard, setShowNextCard] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  type TinderCardRef = { swipe: (dir: 'left' | 'right' | 'up' | 'down') => Promise<void>; restoreCard: () => Promise<void> } | null;
  const tinderCardRef = useRef<TinderCardRef>(null);
  const [current, setCurrent] = useState(0);

  // Reveal the next card once the component has mounted to prevent an initial flash
  useEffect(() => {
    setShowNextCard(true);
  }, []);

  // Function to load more profiles in batches
  const loadMoreProfiles = useCallback(async () => {
    if (isLoadingMore || !hasMoreProfiles) return;
    
    setIsLoadingMore(true);
    try {
      // Always exclude swiped profiles - they're persisted in the database
      const result = await fetchProfiles(swipedIds, 3);
      
      if (result.profiles.length > 0) {
        setProfiles(prev => [...prev, ...result.profiles]);
      }
      
      setHasMoreProfiles(result.hasMore);
    } catch (error) {
      console.error("Error loading more profiles:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreProfiles, swipedIds]);

  // Initial load of profiles
  const loadInitialProfiles = useCallback(async () => {
    console.log('loadInitialProfiles called with swipedIds:', swipedIds);
    try {
      const result = await fetchProfiles(swipedIds, 3);
      console.log('Initial profiles loaded:', result);
      setProfiles(result.profiles);
      setHasMoreProfiles(result.hasMore);
    } catch (error) {
      console.error("Error loading initial profiles:", error);
    }
  }, [swipedIds]);

  // Load initial profiles when swipedIds are available
  useEffect(() => {
    if (swipedIds.length >= 0 && !loading) { // >= 0 to handle empty array
      console.log('Loading initial profiles with swipedIds:', swipedIds);
      loadInitialProfiles();
    }
  }, [swipedIds, loading, loadInitialProfiles]);

  const MOCK_PROFILES = [
    {
      id: "1",
      name: "Aikhan Jumashukurov",
      age: 22,
      email: "ajumashukurov@gmail.com",
      university: "Sydney University",
      skills: ["React", "TypeScript", "Figma"],
      timezone: "Australia/Sydney",
      projectVibe: "Let's build something amazing!",
      isBoosted: true,
      photos: [
        "https://randomuser.me/api/portraits/men/1.jpg",
        "https://randomuser.me/api/portraits/men/2.jpg",
        "https://randomuser.me/api/portraits/men/3.jpg"
      ]
    },
    {
      id: "2",
      name: "Priya Singh",
      age: 24,
      email: "priya.singh@example.com",
      university: "IIT Delhi",
      skills: ["Python", "ML", "UI/UX"],
      timezone: "Asia/Kolkata",
      projectVibe: "Hackathons are my jam.",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/1.jpg",
        "https://randomuser.me/api/portraits/women/2.jpg",
        "https://randomuser.me/api/portraits/women/3.jpg"
      ]
    },
    {
      id: "3",
      name: "Sam Lee",
      age: 21,
      email: "sam.lee@example.com",
      university: "UC Berkeley",
      skills: ["Go", "Kubernetes", "Cloud"],
      timezone: "America/Los_Angeles",
      projectVibe: "Cloud-native or bust.",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/4.jpg",
        "https://randomuser.me/api/portraits/men/5.jpg",
        "https://randomuser.me/api/portraits/men/6.jpg"
      ]
    },
    {
      id: "4",
      name: "Maria Garcia",
      age: 23,
      email: "maria.garcia@example.com",
      university: "Universidad de Buenos Aires",
      skills: ["Java", "Spring", "Docker"],
      timezone: "America/Argentina/Buenos_Aires",
      projectVibe: "Let's ship it!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/4.jpg",
        "https://randomuser.me/api/portraits/women/5.jpg",
        "https://randomuser.me/api/portraits/women/6.jpg"
      ]
    },
    {
      id: "5",
      name: "Liam O'Connor",
      age: 25,
      email: "liam.oconnor@example.com",
      university: "Trinity College Dublin",
      skills: ["C++", "Rust", "Game Dev"],
      timezone: "Europe/Dublin",
      projectVibe: "Code, coffee, repeat.",
      isBoosted: true,
      photos: [
        "https://randomuser.me/api/portraits/men/7.jpg",
        "https://randomuser.me/api/portraits/men/8.jpg",
        "https://randomuser.me/api/portraits/men/9.jpg"
      ]
    },
    {
      id: "6",
      name: "Emily Chen",
      age: 23,
      email: "emily.chen@example.com",
      university: "University of Toronto",
      skills: ["JavaScript", "Node.js", "UI Design"],
      timezone: "America/Toronto",
      projectVibe: "Let's innovate together!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/7.jpg",
        "https://randomuser.me/api/portraits/women/8.jpg",
        "https://randomuser.me/api/portraits/women/9.jpg"
      ]
    },
    {
      id: "7",
      name: "David Kim",
      age: 22,
      email: "david.kim@example.com",
      university: "KAIST",
      skills: ["Python", "AI", "Robotics"],
      timezone: "Asia/Seoul",
      projectVibe: "AI for good!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/10.jpg",
        "https://randomuser.me/api/portraits/men/11.jpg",
        "https://randomuser.me/api/portraits/men/12.jpg"
      ]
    },
    {
      id: "8",
      name: "Sophia Rossi",
      age: 24,
      email: "sophia.rossi@example.com",
      university: "Politecnico di Milano",
      skills: ["UX", "React", "Illustration"],
      timezone: "Europe/Rome",
      projectVibe: "Design meets code!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/10.jpg",
        "https://randomuser.me/api/portraits/women/11.jpg",
        "https://randomuser.me/api/portraits/women/12.jpg"
      ]
    },
    {
      id: "9",
      name: "Carlos Mendez",
      age: 26,
      email: "carlos.mendez@example.com",
      university: "UNAM",
      skills: ["Android", "Kotlin", "Firebase"],
      timezone: "America/Mexico_City",
      projectVibe: "Mobile first!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/13.jpg",
        "https://randomuser.me/api/portraits/men/14.jpg",
        "https://randomuser.me/api/portraits/men/15.jpg"
      ]
    },
    {
      id: "10",
      name: "Julia Nowak",
      age: 23,
      email: "julia.nowak@example.com",
      university: "University of Warsaw",
      skills: ["C#", ".NET", "Azure"],
      timezone: "Europe/Warsaw",
      projectVibe: "Cloud all the way!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/13.jpg",
        "https://randomuser.me/api/portraits/women/14.jpg",
        "https://randomuser.me/api/portraits/women/15.jpg"
      ]
    },
    {
      id: "11",
      name: "Lucas Martin",
      age: 22,
      email: "lucas.martin@example.com",
      university: "Sorbonne University",
      skills: ["Vue.js", "TypeScript", "GraphQL"],
      timezone: "Europe/Paris",
      projectVibe: "Frontend magic!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/16.jpg",
        "https://randomuser.me/api/portraits/men/17.jpg",
        "https://randomuser.me/api/portraits/men/18.jpg"
      ]
    },
    {
      id: "12",
      name: "Hannah Müller",
      age: 24,
      email: "hannah.mueller@example.com",
      university: "TU Munich",
      skills: ["Java", "Spring Boot", "Microservices"],
      timezone: "Europe/Berlin",
      projectVibe: "Let's build scalable systems!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/16.jpg",
        "https://randomuser.me/api/portraits/women/17.jpg",
        "https://randomuser.me/api/portraits/women/18.jpg"
      ]
    },
    {
      id: "13",
      name: "Mateo Silva",
      age: 25,
      email: "mateo.silva@example.com",
      university: "University of São Paulo",
      skills: ["React Native", "Expo", "UI/UX"],
      timezone: "America/Sao_Paulo",
      projectVibe: "Mobile and beautiful!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/19.jpg",
        "https://randomuser.me/api/portraits/men/20.jpg",
        "https://randomuser.me/api/portraits/men/21.jpg"
      ]
    },
    {
      id: "14",
      name: "Isabella Costa",
      age: 23,
      email: "isabella.costa@example.com",
      university: "UFRJ",
      skills: ["Python", "Data Science", "Pandas"],
      timezone: "America/Sao_Paulo",
      projectVibe: "Data-driven!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/19.jpg",
        "https://randomuser.me/api/portraits/women/20.jpg",
        "https://randomuser.me/api/portraits/women/21.jpg"
      ]
    },
    {
      id: "15",
      name: "Ethan Brown",
      age: 22,
      email: "ethan.brown@example.com",
      university: "MIT",
      skills: ["C++", "Robotics", "AI"],
      timezone: "America/New_York",
      projectVibe: "Robots for the win!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/22.jpg",
        "https://randomuser.me/api/portraits/men/23.jpg",
        "https://randomuser.me/api/portraits/men/24.jpg"
      ]
    },
    {
      id: "16",
      name: "Mia Johansson",
      age: 24,
      email: "mia.johansson@example.com",
      university: "KTH Royal Institute of Technology",
      skills: ["Swift", "iOS", "UI Design"],
      timezone: "Europe/Stockholm",
      projectVibe: "iOS all day!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/22.jpg",
        "https://randomuser.me/api/portraits/women/23.jpg",
        "https://randomuser.me/api/portraits/women/24.jpg"
      ]
    },
    {
      id: "17",
      name: "Noah Wilson",
      age: 23,
      email: "noah.wilson@example.com",
      university: "University of Michigan",
      skills: ["Go", "Cloud", "APIs"],
      timezone: "America/Detroit",
      projectVibe: "API-first!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/25.jpg",
        "https://randomuser.me/api/portraits/men/26.jpg",
        "https://randomuser.me/api/portraits/men/27.jpg"
      ]
    },
    {
      id: "18",
      name: "Olivia Dubois",
      age: 22,
      email: "olivia.dubois@example.com",
      university: "École Polytechnique",
      skills: ["JavaScript", "Vue.js", "UI"],
      timezone: "Europe/Paris",
      projectVibe: "UI is everything!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/25.jpg",
        "https://randomuser.me/api/portraits/women/26.jpg",
        "https://randomuser.me/api/portraits/women/27.jpg"
      ]
    },
    {
      id: "19",
      name: "Benjamin Evans",
      age: 25,
      email: "benjamin.evans@example.com",
      university: "University of Oxford",
      skills: ["Python", "ML", "NLP"],
      timezone: "Europe/London",
      projectVibe: "AI for everyone!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/28.jpg",
        "https://randomuser.me/api/portraits/men/29.jpg",
        "https://randomuser.me/api/portraits/men/30.jpg"
      ]
    },
    {
      id: "20",
      name: "Emma Fischer",
      age: 24,
      email: "emma.fischer@example.com",
      university: "LMU Munich",
      skills: ["Java", "Spring", "Backend"],
      timezone: "Europe/Berlin",
      projectVibe: "Backend power!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/28.jpg",
        "https://randomuser.me/api/portraits/women/29.jpg",
        "https://randomuser.me/api/portraits/women/30.jpg"
      ]
    },
    {
      id: "21",
      name: "Lucas Wang",
      age: 22,
      email: "lucas.wang@example.com",
      university: "Tsinghua University",
      skills: ["Python", "Django", "ML"],
      timezone: "Asia/Shanghai",
      projectVibe: "Machine learning for all!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/31.jpg",
        "https://randomuser.me/api/portraits/men/32.jpg",
        "https://randomuser.me/api/portraits/men/33.jpg"
      ]
    },
    {
      id: "22",
      name: "Amelia Clark",
      age: 23,
      email: "amelia.clark@example.com",
      university: "University of Edinburgh",
      skills: ["JavaScript", "React", "Redux"],
      timezone: "Europe/London",
      projectVibe: "Frontend fun!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/31.jpg",
        "https://randomuser.me/api/portraits/women/32.jpg",
        "https://randomuser.me/api/portraits/women/33.jpg"
      ]
    },
    {
      id: "23",
      name: "Oscar Perez",
      age: 24,
      email: "oscar.perez@example.com",
      university: "Universidad de Chile",
      skills: ["Ruby", "Rails", "PostgreSQL"],
      timezone: "America/Santiago",
      projectVibe: "Full stack magic!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/34.jpg",
        "https://randomuser.me/api/portraits/men/35.jpg",
        "https://randomuser.me/api/portraits/men/36.jpg"
      ]
    },
    {
      id: "24",
      name: "Chloe Dubois",
      age: 22,
      email: "chloe.dubois@example.com",
      university: "Université de Montréal",
      skills: ["PHP", "Laravel", "Vue.js"],
      timezone: "America/Toronto",
      projectVibe: "Web apps for everyone!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/34.jpg",
        "https://randomuser.me/api/portraits/women/35.jpg",
        "https://randomuser.me/api/portraits/women/36.jpg"
      ]
    },
    {
      id: "25",
      name: "Jack Wilson",
      age: 25,
      email: "jack.wilson@example.com",
      university: "University of Auckland",
      skills: ["Java", "Android", "Firebase"],
      timezone: "Pacific/Auckland",
      projectVibe: "Mobile innovation!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/37.jpg",
        "https://randomuser.me/api/portraits/men/38.jpg",
        "https://randomuser.me/api/portraits/men/39.jpg"
      ]
    },
    {
      id: "26",
      name: "Ella Schmidt",
      age: 23,
      email: "ella.schmidt@example.com",
      university: "Heidelberg University",
      skills: ["C", "Embedded", "IoT"],
      timezone: "Europe/Berlin",
      projectVibe: "Hardware meets software!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/37.jpg",
        "https://randomuser.me/api/portraits/women/38.jpg",
        "https://randomuser.me/api/portraits/women/39.jpg"
      ]
    },
    {
      id: "27",
      name: "Mohammed Ali",
      age: 24,
      email: "mohammed.ali@example.com",
      university: "King Saud University",
      skills: ["Python", "Flask", "APIs"],
      timezone: "Asia/Riyadh",
      projectVibe: "APIs for everything!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/40.jpg",
        "https://randomuser.me/api/portraits/men/41.jpg",
        "https://randomuser.me/api/portraits/men/42.jpg"
      ]
    },
    {
      id: "28",
      name: "Sofia Rossi",
      age: 22,
      email: "sofia.rossi@example.com",
      university: "Sapienza University of Rome",
      skills: ["HTML", "CSS", "Bootstrap"],
      timezone: "Europe/Rome",
      projectVibe: "Beautiful UIs!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/40.jpg",
        "https://randomuser.me/api/portraits/women/41.jpg",
        "https://randomuser.me/api/portraits/women/42.jpg"
      ]
    },
    {
      id: "29",
      name: "William Brown",
      age: 23,
      email: "william.brown@example.com",
      university: "University of Cape Town",
      skills: ["Python", "Django", "REST"],
      timezone: "Africa/Johannesburg",
      projectVibe: "RESTful everything!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/43.jpg",
        "https://randomuser.me/api/portraits/men/44.jpg",
        "https://randomuser.me/api/portraits/men/45.jpg"
      ]
    },
    {
      id: "30",
      name: "Megan Lee",
      age: 24,
      email: "megan.lee@example.com",
      university: "National University of Singapore",
      skills: ["JavaScript", "React", "Redux"],
      timezone: "Asia/Singapore",
      projectVibe: "React all the way!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/43.jpg",
        "https://randomuser.me/api/portraits/women/44.jpg",
        "https://randomuser.me/api/portraits/women/45.jpg"
      ]
    },
    {
      id: "31",
      name: "James Smith",
      age: 25,
      email: "james.smith@example.com",
      university: "University of Manchester",
      skills: ["C#", ".NET", "Azure"],
      timezone: "Europe/London",
      projectVibe: "Enterprise apps!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/46.jpg",
        "https://randomuser.me/api/portraits/men/47.jpg",
        "https://randomuser.me/api/portraits/men/48.jpg"
      ]
    },
    {
      id: "32",
      name: "Charlotte Martin",
      age: 22,
      email: "charlotte.martin@example.com",
      university: "Université de Lyon",
      skills: ["Python", "Flask", "SQLAlchemy"],
      timezone: "Europe/Paris",
      projectVibe: "Backend brilliance!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/46.jpg",
        "https://randomuser.me/api/portraits/women/47.jpg",
        "https://randomuser.me/api/portraits/women/48.jpg"
      ]
    },
    {
      id: "33",
      name: "Daniel Kim",
      age: 23,
      email: "daniel.kim@example.com",
      university: "Seoul National University",
      skills: ["Java", "Spring", "Kotlin"],
      timezone: "Asia/Seoul",
      projectVibe: "Spring into action!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/49.jpg",
        "https://randomuser.me/api/portraits/men/50.jpg",
        "https://randomuser.me/api/portraits/men/51.jpg"
      ]
    },
    {
      id: "34",
      name: "Grace Lee",
      age: 24,
      email: "grace.lee@example.com",
      university: "Yonsei University",
      skills: ["JavaScript", "Vue.js", "UI"],
      timezone: "Asia/Seoul",
      projectVibe: "UI/UX for all!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/50.jpg",
        "https://randomuser.me/api/portraits/women/51.jpg",
        "https://randomuser.me/api/portraits/women/52.jpg"
      ]
    },
    {
      id: "35",
      name: "Henry Walker",
      age: 25,
      email: "henry.walker@example.com",
      university: "University of Sydney",
      skills: ["Go", "Kubernetes", "Cloud"],
      timezone: "Australia/Sydney",
      projectVibe: "Cloud-native!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/52.jpg",
        "https://randomuser.me/api/portraits/men/53.jpg",
        "https://randomuser.me/api/portraits/men/54.jpg"
      ]
    },
    {
      id: "36",
      name: "Zoe Evans",
      age: 22,
      email: "zoe.evans@example.com",
      university: "University of Bristol",
      skills: ["Python", "ML", "Data Science"],
      timezone: "Europe/London",
      projectVibe: "Data for good!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/53.jpg",
        "https://randomuser.me/api/portraits/women/54.jpg",
        "https://randomuser.me/api/portraits/women/55.jpg"
      ]
    },
    {
      id: "37",
      name: "Leo Dubois",
      age: 23,
      email: "leo.dubois@example.com",
      university: "Université de Strasbourg",
      skills: ["PHP", "Symfony", "MySQL"],
      timezone: "Europe/Paris",
      projectVibe: "Web backend!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/55.jpg",
        "https://randomuser.me/api/portraits/men/56.jpg",
        "https://randomuser.me/api/portraits/men/57.jpg"
      ]
    },
    {
      id: "38",
      name: "Lily Brown",
      age: 24,
      email: "lily.brown@example.com",
      university: "University of Glasgow",
      skills: ["JavaScript", "React", "Node.js"],
      timezone: "Europe/London",
      projectVibe: "Full stack!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/56.jpg",
        "https://randomuser.me/api/portraits/women/57.jpg",
        "https://randomuser.me/api/portraits/women/58.jpg"
      ]
    },
    {
      id: "39",
      name: "Mason Clark",
      age: 25,
      email: "mason.clark@example.com",
      university: "University of Alberta",
      skills: ["C++", "OpenGL", "Game Dev"],
      timezone: "America/Edmonton",
      projectVibe: "Game on!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/58.jpg",
        "https://randomuser.me/api/portraits/men/59.jpg",
        "https://randomuser.me/api/portraits/men/60.jpg"
      ]
    },
    {
      id: "40",
      name: "Ruby Wilson",
      age: 22,
      email: "ruby.wilson@example.com",
      university: "University of Leeds",
      skills: ["Python", "Flask", "APIs"],
      timezone: "Europe/London",
      projectVibe: "API wizard!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/59.jpg",
        "https://randomuser.me/api/portraits/women/60.jpg",
        "https://randomuser.me/api/portraits/women/61.jpg"
      ]
    },
    {
      id: "41",
      name: "Sebastian Müller",
      age: 23,
      email: "sebastian.mueller@example.com",
      university: "RWTH Aachen University",
      skills: ["Java", "Spring", "Microservices"],
      timezone: "Europe/Berlin",
      projectVibe: "Microservices for all!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/61.jpg",
        "https://randomuser.me/api/portraits/men/62.jpg",
        "https://randomuser.me/api/portraits/men/63.jpg"
      ]
    },
    {
      id: "42",
      name: "Eva Fischer",
      age: 24,
      email: "eva.fischer@example.com",
      university: "University of Vienna",
      skills: ["Python", "Data Science", "Pandas"],
      timezone: "Europe/Vienna",
      projectVibe: "Data-driven!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/62.jpg",
        "https://randomuser.me/api/portraits/women/63.jpg",
        "https://randomuser.me/api/portraits/women/64.jpg"
      ]
    },
    {
      id: "43",
      name: "Adam Novak",
      age: 25,
      email: "adam.novak@example.com",
      university: "Charles University",
      skills: ["JavaScript", "Angular", "TypeScript"],
      timezone: "Europe/Prague",
      projectVibe: "Angular all the way!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/64.jpg",
        "https://randomuser.me/api/portraits/men/65.jpg",
        "https://randomuser.me/api/portraits/men/66.jpg"
      ]
    },
    {
      id: "44",
      name: "Maya Patel",
      age: 22,
      email: "maya.patel@example.com",
      university: "IIT Bombay",
      skills: ["Python", "ML", "TensorFlow"],
      timezone: "Asia/Kolkata",
      projectVibe: "ML for all!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/65.jpg",
        "https://randomuser.me/api/portraits/women/66.jpg",
        "https://randomuser.me/api/portraits/women/67.jpg"
      ]
    },
    {
      id: "45",
      name: "Ryan Lee",
      age: 23,
      email: "ryan.lee@example.com",
      university: "University of British Columbia",
      skills: ["JavaScript", "React", "Node.js"],
      timezone: "America/Vancouver",
      projectVibe: "React for life!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/67.jpg",
        "https://randomuser.me/api/portraits/men/68.jpg",
        "https://randomuser.me/api/portraits/men/69.jpg"
      ]
    },
    {
      id: "46",
      name: "Layla Ahmed",
      age: 24,
      email: "layla.ahmed@example.com",
      university: "American University in Cairo",
      skills: ["Python", "Flask", "APIs"],
      timezone: "Africa/Cairo",
      projectVibe: "APIs for Africa!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/68.jpg",
        "https://randomuser.me/api/portraits/women/69.jpg",
        "https://randomuser.me/api/portraits/women/70.jpg"
      ]
    },
    {
      id: "47",
      name: "Nathan Scott",
      age: 25,
      email: "nathan.scott@example.com",
      university: "University of Melbourne",
      skills: ["Go", "Cloud", "DevOps"],
      timezone: "Australia/Melbourne",
      projectVibe: "DevOps for all!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/70.jpg",
        "https://randomuser.me/api/portraits/men/71.jpg",
        "https://randomuser.me/api/portraits/men/72.jpg"
      ]
    },
    {
      id: "48",
      name: "Sienna Turner",
      age: 22,
      email: "sienna.turner@example.com",
      university: "University of Birmingham",
      skills: ["JavaScript", "React", "UI"],
      timezone: "Europe/London",
      projectVibe: "UI/UX for all!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/71.jpg",
        "https://randomuser.me/api/portraits/women/72.jpg",
        "https://randomuser.me/api/portraits/women/73.jpg"
      ]
    },
    {
      id: "49",
      name: "Owen Murphy",
      age: 23,
      email: "owen.murphy@example.com",
      university: "Trinity College Dublin",
      skills: ["C++", "Game Dev", "OpenGL"],
      timezone: "Europe/Dublin",
      projectVibe: "Game on!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/men/73.jpg",
        "https://randomuser.me/api/portraits/men/74.jpg",
        "https://randomuser.me/api/portraits/men/75.jpg"
      ]
    },
    {
      id: "50",
      name: "Harper White",
      age: 24,
      email: "harper.white@example.com",
      university: "University of Toronto",
      skills: ["Python", "Data Science", "ML"],
      timezone: "America/Toronto",
      projectVibe: "Data for all!",
      isBoosted: false,
      photos: [
        "https://randomuser.me/api/portraits/women/74.jpg",
        "https://randomuser.me/api/portraits/women/75.jpg",
        "https://randomuser.me/api/portraits/women/76.jpg"
      ]
    }
  ];

  // Check user's profile completion status
  useEffect(() => {
    if (!session?.user?.email) return;
    
    const checkProfileCompletion = async () => {
      try {
        const userEmail = session.user?.email;
        if (!userEmail) return;
        
        const profileSnap = await getDoc(doc(db, "profiles", userEmail));
        if (!profileSnap.exists()) {
          setUserProfile(null);
          setProfileComplete(false);
          return;
        }
        
        const profile = profileSnap.data();
        setUserProfile(profile);
        
                          // Define required fields for a complete profile
          const requiredFields = [
            "name",
            "age", 
            "avatarUrl",
            "photos",
            "timezone",
            "gender",
            "professions",
            "skills",
            "tools",
            "experienceLevel",
            "interests"
          ];
        
        const isComplete = requiredFields.every(field => {
          if (field === "skills") {
            // Special handling for skills object - check if any skill category has content
            const skills = profile[field];
            if (!skills || typeof skills !== "object") return false;
            return Object.values(skills).some(category => 
              Array.isArray(category) && category.length > 0
            );
          }
          if (Array.isArray(profile[field])) {
            return profile[field].length > 0;
          }
          return Boolean(profile[field]);
        });
        
        setProfileComplete(isComplete);
      } catch (error) {
        console.error("Error checking profile:", error);
        setProfileComplete(false);
      }
    };
    
    checkProfileCompletion();
  }, [session?.user?.email]);

  useEffect(() => {
    setLoading(true);
    
    // Check if we should use mock data (for testing environment)
    // Command-line env vars should take precedence over .env files
    const useMockData = process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === 'true' || 
                       (process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === undefined && process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true');
    
    console.log('Environment check:', {
      NEXT_PUBLIC_FORCE_MOCK_DATA: process.env.NEXT_PUBLIC_FORCE_MOCK_DATA,
      NEXT_PUBLIC_USE_MOCK_DATA: process.env.NEXT_PUBLIC_USE_MOCK_DATA,
      NODE_ENV: process.env.NODE_ENV,
      useMockData
    });
    
    if (useMockData) {
      // Use mock data for testing
      console.log('Using MOCK data');
      // Transform mock data to match new interface
      const transformedProfiles = MOCK_PROFILES.map(profile => ({
        ...profile,
        programmingLanguages: Array.isArray(profile.skills) ? profile.skills : [],
        skills: Array.isArray(profile.skills) 
          ? { languages: profile.skills, frameworks: [] }
          : profile.skills
      }));
      setProfiles(transformedProfiles as Profile[]);
      fetch("/api/swipes").then(res => {
        if (!res.ok) {
          console.error("Failed to fetch swipes:", res.status, res.statusText);
          return { swipedIds: [] }; // Return empty swipedIds on error
        }
        return res.json();
      }).then(data => setSwipedIds(data.swipedIds || []))
        .finally(() => {
          setLocalLoading(false);
          setLoading(false);
        });
    } else {
      // Use real data from API for production
      console.log('Using REAL data from API');
      
      // First load swiped IDs, then profiles will be loaded by the loadInitialProfiles useEffect
      fetch("/api/swipes").then(res => {
        if (!res.ok) {
          console.error("Failed to fetch swipes:", res.status, res.statusText);
          return { swipedIds: [] };
        }
        return res.json();
      }).then(data => {
        setSwipedIds(data.swipedIds || []);
      }).finally(() => {
        setLocalLoading(false);
        setLoading(false);
      });
    }
  }, []);

  // Filter out already-swiped profiles (current user is already excluded by backend)
  const filteredProfiles = (Array.isArray(profiles) ? profiles : []).filter(
    (profile) => !swipedIds.includes(profile.id)
  );
  const showProfile = filteredProfiles[current];
  const isEmpty = !loading && current >= filteredProfiles.length;

  // Check if we need to load more profiles when user is close to the end
  useEffect(() => {
    const remainingProfiles = filteredProfiles.length - current;
    // Load more when we have 2 or fewer profiles remaining (current + 1 ahead)
    if (remainingProfiles <= 2 && hasMoreProfiles && !isLoadingMore && filteredProfiles.length > 0) {
      console.log('Auto-loading more profiles...', { remainingProfiles, current, filteredProfilesLength: filteredProfiles.length });
      loadMoreProfiles();
    }
  }, [current, filteredProfiles.length, hasMoreProfiles, isLoadingMore, loadMoreProfiles]);

  // Remove card only after swipe animation completes
  const handleCardLeftScreen = useCallback((identifier: string) => {
    if (!identifier) return;
    // Update swipedIds immediately for UI filtering
    setSwipedIds((prev) => [...prev, identifier]);
  }, []);

  const handleSwipe = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      if (!showProfile) return;
      if (dir === "left" || dir === "right") {
        // Record swipe in backend and determine if it's a match
        (async () => {
          try {
            const response = await fetch("/api/swipes", {
              method: "POST",
              body: JSON.stringify({ to: showProfile.id, direction: dir }),
              headers: { "Content-Type": "application/json" },
            });
            const result = await response.json();
            
            // Only show match if both users swiped right (mutual match)
            if (dir === "right" && result.matched) {
              // For matched users, we need to get the email for chat functionality
              // This could be improved by having the API return the matched user's info
              alert(`🎉 It's a Match! You and ${showProfile.name} liked each other!`);
              // Note: Chat functionality might need updating to work with profile IDs
              // For now, we'll need to handle this differently or update chat logic
              console.log(`Match with profile ID: ${showProfile.id}`);
            } else if (dir === "right" && !result.matched) {
              // Just a like, not a match yet
              console.log(`You liked ${showProfile.name}, waiting for them to like you back`);
            }
          } catch (error) {
            console.error("Error recording swipe:", error);
          }
        })();
        setSwipedIds((prev) => [...prev, showProfile.id]);
      }
    },
    [showProfile, router]
  );

  const mainHeadline1 = "Welcome to";
  const mainHeadline2 = "devmolink";
  
  // Check if we're in testing mode to show reset button
  const isTestingMode = process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === 'true' || 
                       (process.env.NEXT_PUBLIC_FORCE_MOCK_DATA === undefined && process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true');

  const handleGoogleSignup = () => {
    signIn("google");
  };

  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030712] font-mono transition-colors duration-500 px-4 overflow-hidden">
        {/* Grid pattern overlay - covers entire viewport */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-10">
          <svg width="100%" height="100%" className="absolute inset-0" style={{ minHeight: '100vh' }}>
            <defs>
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#fff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Noise overlay - covers entire viewport */}
        <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.02] mix-blend-soft-light" style={{backgroundSize: '200px 200px'}} />
        <div className="relative z-20 flex flex-col items-center justify-center w-full max-w-2xl mx-auto animate-fade-in transition-opacity duration-700 min-h-screen mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-2 drop-shadow-lg text-center select-none tracking-tight font-mono">
            <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {mainHeadline1}
            </span>
            <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {mainHeadline2}
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-8 max-w-xl text-center font-mono text-white/80">
            Find your perfect hackathon team, connect with like-minded builders, and join exciting projects. Sign up to start matching and chatting with other hackers!
          </p>
          <button
            // onClick={() => router.push('/create-account')}
            onClick={handleGoogleSignup}
            className="relative px-8 py-4 bg-[#00FFAB] text-[#030712] rounded-full font-bold shadow-lg transition-transform text-xl focus:outline-none focus:ring-2 focus:ring-[#00FFAB] mb-4 overflow-hidden group hover:scale-105"
          >
            <span id="createAccount" className="relative z-10">Create Account</span>
            {/* Shine effect */}
            <span className="absolute left-0 top-0 h-full w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <span className="absolute left-[-75%] top-0 h-full w-1/2 bg-gradient-to-r from-white/60 to-transparent blur-lg rotate-12 group-hover:animate-shine" />
            </span>
          </button>
          <div className="text-[#00FFAB] text-xs mt-2 font-mono text-center">
            Trusted by 1,200+ hackers &bull; Built for late-night code
          </div>
        </div>
      </div>
    );
  }

  // Show profile lock screen if profile is incomplete
  if (!profileComplete && !showProfileForm) {
    return (
      <div className="relative min-h-screen w-full flex items-center justify-center bg-[#030712] font-mono transition-colors duration-500 px-4 overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="pointer-events-none fixed inset-0 z-0 opacity-10">
          <svg width="100%" height="100%" className="absolute inset-0" style={{ minHeight: '100vh' }}>
            <defs>
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#fff" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        {/* Lock Screen UI */}
        <div className="relative z-20 text-center max-w-md mx-auto px-6">
          {/* Animated Lock Icon */}
          <div className="relative mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center border-4 border-red-500/30 animate-pulse">
              <div className="text-4xl">🔒</div>
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-white text-xl font-bold">!</span>
            </div>
          </div>

          {/* Main Message */}
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Profile Locked
          </h1>
          
          <p className="text-gray-300 text-lg mb-2 leading-relaxed">
            <span className="text-red-400 font-semibold">Whoa there, eager beaver!</span>
          </p>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            You need to complete your profile before you can start matching with other hackers. 
            Trust us, a complete profile gets <span className="text-[#00FFAB] font-semibold">3x more matches!</span>
          </p>

          {/* Psychology elements */}
          <div className="bg-gradient-to-r from-[#00FFAB]/10 to-cyan-400/10 border border-[#00FFAB]/30 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <span className="text-2xl mr-2">⚡</span>
              <span className="text-[#00FFAB] font-semibold">Quick Setup</span>
            </div>
            <p className="text-xs text-gray-400">
              Just 2 minutes to unlock unlimited matching
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setShowProfileForm(true)}
            className="relative px-8 py-4 bg-gradient-to-r from-[#00FFAB] to-cyan-400 text-[#030712] rounded-full font-bold shadow-xl transition-all text-lg focus:outline-none focus:ring-4 focus:ring-[#00FFAB]/50 mb-4 w-full overflow-hidden group hover:scale-105 hover:shadow-2xl"
          >
            <span className="relative z-10 flex items-center justify-center">
              <span className="mr-2">🚀</span>
              Complete My Profile
            </span>
            {/* Shine effect */}
            <span className="absolute left-0 top-0 h-full w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <span className="absolute left-[-75%] top-0 h-full w-1/2 bg-gradient-to-r from-white/60 to-transparent blur-lg rotate-12 group-hover:animate-shine" />
            </span>
          </button>

          {/* Social proof */}
          <div className="text-[#00FFAB] text-xs opacity-70">
            Join 1,200+ verified hackers already matching
          </div>
        </div>
      </div>
    );
  }

     // Show profile form if requested
   if (showProfileForm) {
     return (
       <ProfileForm 
         mode={userProfile ? "edit" : "create"}
         onClose={() => {
           setShowProfileForm(false);
           // Recheck profile completion after form is closed
           if (session?.user?.email) {
             const recheckProfile = async () => {
               const userEmail = session.user?.email;
               if (!userEmail) return;
               
               const profileSnap = await getDoc(doc(db, "profiles", userEmail));
               if (profileSnap.exists()) {
                                 const profile = profileSnap.data();
                                   const requiredFields = ["name", "age", "avatarUrl", "photos", "timezone", "gender", "professions", "skills", "tools", "experienceLevel", "interests"];
                 const isComplete = requiredFields.every(field => {
                   if (field === "skills") {
                     // Special handling for skills object - check if any skill category has content
                     const skills = profile[field];
                     if (!skills || typeof skills !== "object") return false;
                     return Object.values(skills).some(category => 
                       Array.isArray(category) && category.length > 0
                     );
                   }
                   if (Array.isArray(profile[field])) {
                     return profile[field].length > 0;
                   }
                   return Boolean(profile[field]);
                 });
                 setProfileComplete(isComplete);
               }
             };
             recheckProfile();
           }
         }} 
       />
     );
   }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#030712] font-mono transition-colors duration-500 px-4 pb-[110px]">
      <div className="flex-1 flex flex-col items-center w-full mt-10">
        {loading ? (
          null
        ) : isEmpty ? (
          <div className="w-full" style={{ height: "calc(100vh - 96px)" }}>
            <div className="flex flex-col items-center justify-center h-full">
              <div className="text-5xl mb-4">🎉</div>
              <div className="text-white text-xl font-semibold mb-2 font-mono">You&apos;re all caught up!</div>
              <div className="text-base mb-4 font-mono bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">We&apos;ll ping you when new hackers join.</div>
              <button className="px-4 py-2 bg-[#00FFAB] text-[#030712] rounded-full opacity-50 cursor-not-allowed font-mono" disabled>
                Refresh
              </button>
              {/* Reset Button for Mock Data (isEmpty state) */}
              {isTestingMode && (
                              <button
                onClick={() => {
                  setSwipedIds([]);
                  setCurrent(0);
                }}
                className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-full font-semibold shadow hover:scale-105 transition-transform text-base"
              >
                Reset Profiles
              </button>
              )}
            </div>
          </div>
        ) : (
          <>
          <div className="relative flex flex-col items-center z-10" style={{ minHeight: 570, height: 570, width: '100%' }}>
            {/* Render the next card underneath, if it exists */}
            {filteredProfiles[current + 1] && showNextCard && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center"
                style={{ pointerEvents: 'none', height: 500, zIndex: 0}}
                aria-hidden="true"
              >
                <div className="w-full max-w-md mx-auto">
                  <div style={{ height: 500 }}>
                    <ProfileCard profile={filteredProfiles[current + 1]} onSwipe={() => {}} isActive={false} />
                  </div>
                </div>
              </div>
            )}
            {/* Top card (swipeable) */}
            {filteredProfiles[current] && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full flex justify-center" style={{ height: 500 }}>
                <div className="w-full max-w-md mx-auto">
                  <AnyTinderCard
                    key={filteredProfiles[current].id}
                    ref={tinderCardRef}
                    flickDuration={30}
                    swipeRequirementType="position"
                    swipeThreshold={120}
                    flickOnSwipe={true}
                    onSwipe={handleSwipe}
                    onCardLeftScreen={() => handleCardLeftScreen(filteredProfiles[current].id)}
                    preventSwipe={['up', 'down']}
                    className="select-none"
                    style={{ height: 500 }}
                  >
                    <ProfileCard profile={filteredProfiles[current]} onSwipe={handleSwipe} isActive={true} />
                  </AnyTinderCard>
                </div>
              </div>
            )}
          </div>
          {/* Reset Button for Mock Data */}
          {isTestingMode && (
            <div className="fixed left-1/2 -translate-x-1/2 z-30" style={{ bottom: 20 }}>
              <button
                onClick={() => {
                  setSwipedIds([]);
                  setCurrent(0);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold shadow hover:scale-105 transition-transform text-base"
              >
                Reset Profiles
              </button>
            </div>
          )}
          </>
        )}
      </div>
      {/* <footer className="text-[#34B6FF] text-xs mt-10 mb-4 opacity-80 select-none font-mono">
                  &copy; {new Date().getFullYear()} devmolink. Not affiliated with any university.
      </footer> */}
    </div>
  );
}
