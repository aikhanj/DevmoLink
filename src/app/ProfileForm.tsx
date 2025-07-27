"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { db, storage } from "../firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { getAuth } from "firebase/auth"
import {
  Camera,
  X,
  ChevronDown,
  Github,
  Linkedin,
  Sparkles,
  GripVertical,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react"
import { toast } from 'react-hot-toast'

// Utility function for combining class names
const cn = (...classes: (string | undefined | false | null)[]) => {
  return classes.filter(Boolean).join(' ')
}

interface FormData {
  avatar: File | null
  photos: File[]
  name: string
  age: number
  timezone: string
  gender: string
  professions: string[]
  skills: {
    languages: string[]
    frameworks: string[]
    devops: string[]
    ml: string[]
    web3: string[]
    apis: string[]
  }
  tools: string[]
  experienceLevel: string
  interests: string[]
  description: string
  github: string
  linkedin: string
}

interface ProfileFormProps {
  onClose?: () => void
  hideClose?: boolean
  mode?: 'create' | 'edit'
}

const PROFESSION_OPTIONS = [
  "Frontend Developer",
  "Backend Developer",
  "AI Engineer",
  "Data Scientist",
  "Product Manager",
  "UX/UI Designer",
  "DevOps Engineer",
  "Cybersecurity Specialist",
  "Mobile Developer",
  "Indie Hacker",
  "Student",
  "Blockchain Developer",
  "Game Developer",
  "Technical Writer",
]

const SKILLS_OPTIONS = {
  languages: [
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "C++",
    "Go",
    "Rust",
    "Swift",
    "Kotlin",
    "PHP",
    "Ruby",
    "C#",
  ],
  frameworks: [
    "React",
    "Angular",
    "Vue",
    "Next.js",
    "Django",
    "Flask",
    "Express",
    "Spring Boot",
    "Flutter",
    "React Native",
    "Svelte",
  ],
  devops: ["Git", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "CI/CD", "Terraform", "Jenkins", "Ansible"],
  ml: ["TensorFlow", "PyTorch", "scikit-learn", "Hugging Face", "LangChain", "OpenAI API", "NLTK", "Pandas", "NumPy"],
  web3: ["Solidity", "Hardhat", "Truffle", "Ethers.js", "Web3.js", "IPFS", "Smart Contracts", "DeFi"],
  apis: ["REST", "GraphQL", "gRPC", "WebSockets", "Firebase", "Supabase", "Stripe API", "OAuth"],
}

const TOOLS_OPTIONS = [
  "Figma",
  "GitHub",
  "GitLab",
  "Postman",
  "Vercel",
  "Netlify",
  "VS Code",
  "IntelliJ",
  "Notion",
  "Jira",
  "Slack",
  "Discord",
  "Chrome DevTools",
  "Chrome Extensions",
  "Heroku",
  "MongoDB Atlas",
]

const EXPERIENCE_LEVELS = [
  "Beginner",
  "Junior",
  "Mid-level",
  "Senior",
  "Lead",
  "VC",
]

const INTEREST_OPTIONS = [
  "Startup team",
  "Hackathon squad",
  "Learn AI/ML",
  "Ship fast",
  "Win prizes",
  "Just vibe",
  "Looking for PM/designer",
  "Networking",
  "Career opportunities",
  "Side projects",
]

export default function CreateProfile({ onClose, hideClose = false, mode = 'create' }: ProfileFormProps) {
  const { data: session } = useSession()
  const sessionEmail = session?.user?.email

  const [formData, setFormData] = useState<FormData>({
    avatar: null,
    photos: [],
    name: "",
    age: 25,
    timezone: "",
    gender: "",
    professions: [],
    skills: {
      languages: [],
      frameworks: [],
      devops: [],
      ml: [],
      web3: [],
      apis: [],
    },
    tools: [],
    experienceLevel: "",
    interests: [],
    description: "",
    github: "",
    linkedin: "",
  })


  const [optionalExpanded, setOptionalExpanded] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [draggedPhoto, setDraggedPhoto] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])

  // Search and dropdown states
  const [skillsCategory, setSkillsCategory] = useState<keyof typeof SKILLS_OPTIONS>("languages")
  const [skillsSearchTerm, setSkillsSearchTerm] = useState("")
  const [toolsSearchTerm, setToolsSearchTerm] = useState("")
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false)
  const [showToolsDropdown, setShowToolsDropdown] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const skillsSearchRef = useRef<HTMLInputElement>(null)
  const toolsSearchRef = useRef<HTMLInputElement>(null)
  const skillsDropdownRef = useRef<HTMLDivElement>(null)
  const toolsDropdownRef = useRef<HTMLDivElement>(null)

  // Auto-detect timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setFormData((prev) => ({ ...prev, timezone }))
  }, [])

  // Load existing profile for edit mode
  useEffect(() => {
    if (!sessionEmail || mode === 'create') return
    setLoading(true)
    getDoc(doc(db, "profiles", sessionEmail)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        
        // Convert old format to new format
        const convertedSkills: FormData['skills'] = {
          languages: [],
          frameworks: [],
          devops: [],
          ml: [],
          web3: [],
          apis: [],
        }
        
        // Convert old programmingLanguages array to categorized skills
        if (data.programmingLanguages) {
          data.programmingLanguages.forEach((skill: string) => {
            // Try to categorize the skill
            if (SKILLS_OPTIONS.languages.includes(skill)) {
              convertedSkills.languages.push(skill)
            } else if (SKILLS_OPTIONS.frameworks.includes(skill)) {
              convertedSkills.frameworks.push(skill)
            } else if (SKILLS_OPTIONS.devops.includes(skill)) {
              convertedSkills.devops.push(skill)
            } else if (SKILLS_OPTIONS.ml.includes(skill)) {
              convertedSkills.ml.push(skill)
            } else if (SKILLS_OPTIONS.web3.includes(skill)) {
              convertedSkills.web3.push(skill)
            } else if (SKILLS_OPTIONS.apis.includes(skill)) {
              convertedSkills.apis.push(skill)
            } else {
              // Default to languages if uncategorized
              convertedSkills.languages.push(skill)
            }
          })
        }

        setFormData(prev => ({
          ...prev,
          name: data.name || "",
          age: data.age || 25,
          timezone: data.timezone || prev.timezone,
          gender: data.gender || "",
          professions: data.professions || [],
          skills: data.skills || convertedSkills,
          tools: data.tools || [],
          experienceLevel: data.experienceLevel || "",
          interests: data.interests || data.lookingFor || [],
          description: data.description || "",
          github: data.github || "",
          linkedin: data.linkedin || "",
        }))
        
        if (data.avatarUrl) {
          setAvatarPreview(data.avatarUrl)
        }
        if (data.photos) {
          setPhotoPreviews(data.photos)
        }
      }
      setLoading(false)
    })
  }, [sessionEmail, mode])

  // Calculate progress
  const calculateProgress = () => {
    let completed = 0
    const total = 6

    if (formData.avatar || avatarPreview) completed++
    if (formData.photos.length >= 3 || photoPreviews.length >= 3) completed++
    if (formData.name && formData.age && formData.timezone && formData.gender) completed++
    if (formData.professions.length > 0) completed++

    // Count skills across all categories
    const totalSkills = Object.values(formData.skills).flat().length
    if (totalSkills > 0 && formData.experienceLevel) completed++

    if (formData.interests.length > 0) completed++

    return Math.round((completed / total) * 100)
  }

  const progress = calculateProgress()
  const isFormValid =
    (formData.avatar || avatarPreview) &&
    (formData.photos.length >= 3 || photoPreviews.length >= 3) &&
    formData.name &&
    formData.age &&
    formData.gender &&
    formData.professions.length > 0 &&
    Object.values(formData.skills).some((arr) => arr.length > 0) &&
    formData.experienceLevel &&
    formData.interests.length > 0

  // Handle photo upload
  const handlePhotoUpload = (files: FileList | null) => {
    if (!files) return

    const existingKeys = new Set(formData.photos.map(f => `${f.name}-${f.size}`))
    const uniqueFiles: File[] = []
    let hadDuplicate = false

    Array.from(files).forEach(file => {
      const key = `${file.name}-${file.size}`
      if (existingKeys.has(key) || uniqueFiles.some(f => `${f.name}-${f.size}` === key)) {
        hadDuplicate = true
      } else {
        uniqueFiles.push(file)
      }
    })

    // Respect max 6 photos limit
    const spaceLeft = 6 - formData.photos.length
    const newPhotos = uniqueFiles.slice(0, spaceLeft)

    if (newPhotos.length === 0) {
      toast.error(
        'You dirty dog 😏, you can\'t use the same photo!',
        {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#1F2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          icon: '🐕',
        }
      )
      // Reset file input so selecting the same file again will trigger onChange
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    if (hadDuplicate) {
      toast(
        'Some duplicate photos were ignored 🐾',
        {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#1F2937',
            color: '#fff',
            border: '1px solid #374151',
          },
        }
      )
    }

    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos],
    }))

    // Create previews for new files
    newPhotos.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })

    // Reset file input to allow re-selection of the same file(s) later
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove photo
  const removePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Drag and drop for photos
  const handlePhotoDragStart = (index: number) => {
    setDraggedPhoto(index)
  }

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedPhoto === null || draggedPhoto === index) return

    const newPhotos = [...formData.photos]
    const newPreviews = [...photoPreviews]
    
    if (draggedPhoto < newPhotos.length && index < newPhotos.length) {
      const draggedItem = newPhotos[draggedPhoto]
      newPhotos.splice(draggedPhoto, 1)
      newPhotos.splice(index, 0, draggedItem)
      setFormData((prev) => ({ ...prev, photos: newPhotos }))
    }
    
    const draggedPreview = newPreviews[draggedPhoto]
    newPreviews.splice(draggedPhoto, 1)
    newPreviews.splice(index, 0, draggedPreview)
    setPhotoPreviews(newPreviews)
    setDraggedPhoto(index)
  }

  const handleAvatarUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setFormData((prev) => ({ ...prev, avatar: file }))
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Handle profession toggle
  const toggleProfession = (profession: string) => {
    setFormData((prev) => {
      if (prev.professions.includes(profession)) {
        return {
          ...prev,
          professions: prev.professions.filter((p) => p !== profession),
        }
      } else {
        // Limit to 3 selections
        if (prev.professions.length >= 3) {
          return prev
        }
        return {
          ...prev,
          professions: [...prev.professions, profession],
        }
      }
    })
  }

  // Handle skill toggle
  const toggleSkill = (skill: string, category: keyof typeof SKILLS_OPTIONS) => {
    setFormData((prev) => {
      const currentSkills = [...prev.skills[category]]

      if (currentSkills.includes(skill)) {
        return {
          ...prev,
          skills: {
            ...prev.skills,
            [category]: currentSkills.filter((s) => s !== skill),
          },
        }
      } else {
        return {
          ...prev,
          skills: {
            ...prev.skills,
            [category]: [...currentSkills, skill],
          },
        }
      }
    })
  }

  // Handle tool toggle
  const toggleTool = (tool: string) => {
    setFormData((prev) => {
      if (prev.tools.includes(tool)) {
        return {
          ...prev,
          tools: prev.tools.filter((t) => t !== tool),
        }
      } else {
        return {
          ...prev,
          tools: [...prev.tools, tool],
        }
      }
    })
  }

  // Handle interest toggle
  const toggleInterest = (interest: string) => {
    setFormData((prev) => {
      if (prev.interests.includes(interest)) {
        return {
          ...prev,
          interests: prev.interests.filter((i) => i !== interest),
        }
      } else {
        return {
          ...prev,
          interests: [...prev.interests, interest],
        }
      }
    })
  }

  // Filter skills based on search term
  const filteredSkills = skillsSearchTerm
    ? SKILLS_OPTIONS[skillsCategory].filter(
        (skill) =>
          skill.toLowerCase().includes(skillsSearchTerm.toLowerCase()) &&
          !formData.skills[skillsCategory].includes(skill),
      )
    : SKILLS_OPTIONS[skillsCategory].filter((skill) => !formData.skills[skillsCategory].includes(skill))

  // Filter tools based on search term
  const filteredTools = toolsSearchTerm
    ? TOOLS_OPTIONS.filter(
        (tool) => tool.toLowerCase().includes(toolsSearchTerm.toLowerCase()) && !formData.tools.includes(tool),
      )
    : TOOLS_OPTIONS.filter((tool) => !formData.tools.includes(tool))

  // Handle form submission
  const handleSubmit = async () => {
    if (!isFormValid) return

    const userEmail = sessionEmail ?? getAuth().currentUser?.email ?? null
    if (!userEmail) {
      alert('User not authenticated yet. Please wait a moment and try again.')
      return
    }

    setSaving(true)

    try {
      let avatarUrl = avatarPreview
      if (formData.avatar) {
        const avatarStorageRef = ref(storage, `avatars/${userEmail}_${Date.now()}`)
        await uploadBytes(avatarStorageRef, formData.avatar)
        avatarUrl = await getDownloadURL(avatarStorageRef)
      }

      // Upload only the new photo files and get their Firebase URLs
      const uploadedPhotoUrls: string[] = []
      for (let i = 0; i < formData.photos.length; i++) {
        const file = formData.photos[i]
        const photoStorageRef = ref(storage, `photos/${userEmail}_${Date.now()}_${i}`)
        await uploadBytes(photoStorageRef, file)
        const url = await getDownloadURL(photoStorageRef)
        uploadedPhotoUrls.push(url)
      }

      // Combine existing photo URLs with new uploads
      const allPhotoUrls = [
        ...photoPreviews.filter(url => url.startsWith('http')), // Keep existing URLs
        ...uploadedPhotoUrls // Add new uploads
      ]

      // Flatten skills for compatibility with existing code
      const allSkills = Object.values(formData.skills).flat()

      await setDoc(doc(db, "profiles", userEmail), {
        name: formData.name,
        age: formData.age,
        birthday: "", // Keep for compatibility
        gender: formData.gender,
        timezone: formData.timezone,
        professions: formData.professions,
        programmingLanguages: allSkills, // Keep for compatibility
        skills: formData.skills,
        tools: formData.tools,
        experienceLevel: formData.experienceLevel,
        interests: formData.interests,
        lookingFor: formData.interests, // Keep for compatibility
        avatarUrl,
        photos: allPhotoUrls,
        description: formData.description,
        github: formData.github,
        linkedin: formData.linkedin,
        email: userEmail,
        timeCommitment: "", // Keep for compatibility
        projectVibe: "", // Keep for compatibility
        isBoosted: false, // Keep for compatibility
      })

      setShowConfetti(true)
      setTimeout(() => {
        alert(mode === 'edit' ? 'Profile Updated!' : 'Profile Created!')
        if (onClose) onClose()
      }, 1500)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Get total skills count
  const getTotalSkillsCount = () => {
    return Object.values(formData.skills).reduce((total, skills) => total + skills.length, 0)
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(event.target as Node)) {
        setShowSkillsDropdown(false)
      }
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target as Node)) {
        setShowToolsDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="text-white text-lg animate-pulse">Loading profile…</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-[60vh] max-w-[90vw] max-h-[90vh] overflow-y-auto bg-[#0F0F14] rounded-lg space-y-6 px-6 py-4 scrollbar-gradient">
        {/* Header */}
        <div className="text-center mb-6 relative">
          {!hideClose && onClose && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-0 right-0 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFAB] rounded-full transition"
            >
              ×
            </button>
          )}
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00FF9A] to-[#60A5FA] bg-clip-text text-transparent mb-2">
            {mode === 'edit' ? 'Edit Your Profile' : 'Create Your Profile'}
          </h1>
          <p className="text-gray-400 text-sm">
            {mode === 'edit' ? 'Update your information' : 'Join our community of creators'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-400">
            <span>Setup Progress</span>
            <span>{progress}% complete</span>
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00FF9A] to-[#00CC7A] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 space-y-6">
          {/* Avatar Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Choose your avatar</h2>
              <p className="text-gray-400 text-sm">This will be your profile picture</p>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-600 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#00FF9A] rounded-full flex items-center justify-center hover:bg-[#00CC7A] transition-colors"
                  aria-label="Upload avatar"
                >
                  <Camera className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleAvatarUpload(e.target.files)}
              className="hidden"
            />
          </div>

          {/* Photos Section */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Add more photos</h2>
              <p className="text-gray-400 text-sm">Show different sides of yourself</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {photoPreviews.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden group cursor-move"
                  draggable
                  onDragStart={() => handlePhotoDragStart(index)}
                  onDragOver={(e) => handlePhotoDragOver(e, index)}
                  onDragEnd={() => setDraggedPhoto(null)}
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photoPreviews.length < 6 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center hover:border-[#00FF9A] transition-colors"
                  aria-label="Add photo"
                >
                  <Camera className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">Add</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handlePhotoUpload(e.target.files)}
              className="hidden"
            />

            {photoPreviews.length < 3 && (
              <p className="text-sm text-red-400 text-center">Add at least 3 photos to continue</p>
            )}
          </div>

          {/* Core Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">🕛 Core details</h3>

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
              <input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent"
                placeholder="Your full name"
                aria-label="Full name"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">Age: {formData.age}</label>
              <div className="px-2">
                <input
                  type="range"
                  value={formData.age}
                  onChange={(e) => setFormData((prev) => ({ ...prev, age: parseInt(e.target.value) }))}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  aria-label="Select your age"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-300">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent"
                aria-label="Select timezone"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="Europe/London">GMT</option>
                <option value="Europe/Paris">CET</option>
                <option value="Asia/Tokyo">JST</option>
                <option value={formData.timezone}>{formData.timezone}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Gender</label>
              <div className="grid grid-cols-2 gap-2">
                {["Male", "Female", "Non-binary", "Other"].map((option) => (
                  <label
                    key={option}
                    className={cn(
                      "flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all",
                      formData.gender === option
                        ? "bg-[#00FF9A]/10 border-2 border-[#00FF9A] text-[#00FF9A]"
                        : "bg-gray-800 border-2 border-gray-700 hover:border-gray-600",
                    )}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={option}
                      checked={formData.gender === option}
                      onChange={(e) => setFormData((prev) => ({ ...prev, gender: e.target.value }))}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Profession / Role Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">✅ Profession / Role</h3>
              <span className="text-xs text-gray-400">{formData.professions.length}/3 selected</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {PROFESSION_OPTIONS.map((profession) => (
                <button
                  key={profession}
                  onClick={() => toggleProfession(profession)}
                  disabled={!formData.professions.includes(profession) && formData.professions.length >= 3}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm transition-all",
                    formData.professions.includes(profession)
                      ? "bg-[#00FF9A]/10 border border-[#00FF9A] text-[#00FF9A]"
                      : formData.professions.length >= 3
                        ? "bg-gray-800/50 border border-gray-700 text-gray-500 cursor-not-allowed"
                        : "bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800",
                  )}
                  aria-label={`Toggle ${profession} profession`}
                >
                  {profession}
                </button>
              ))}
            </div>

            {formData.professions.length === 0 && (
              <p className="text-xs text-gray-400">Select up to 3 roles that best describe you</p>
            )}
          </div>

          {/* Skills / Technologies Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">🧠 Skills / Technologies</h3>
              <span className="text-xs text-gray-400">{getTotalSkillsCount()} selected</span>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-2">
              {(Object.keys(SKILLS_OPTIONS) as Array<keyof typeof SKILLS_OPTIONS>).map((category) => (
                <button
                  key={category}
                  onClick={() => setSkillsCategory(category)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-all",
                    skillsCategory === category
                      ? "bg-[#00FF9A]/10 border border-[#00FF9A] text-[#00FF9A]"
                      : "bg-gray-800/50 border border-gray-700 text-gray-300 hover:border-gray-500",
                  )}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                  {formData.skills[category].length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[#00FF9A]/20 rounded-full text-[10px]">
                      {formData.skills[category].length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative" ref={skillsDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={skillsSearchRef}
                  value={skillsSearchTerm}
                  onChange={(e) => setSkillsSearchTerm(e.target.value)}
                  onFocus={() => setShowSkillsDropdown(true)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent pl-10 pr-10"
                  placeholder={`Search ${skillsCategory}...`}
                />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                >
                  <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Dropdown */}
              {showSkillsDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto z-10"
                >
                  {filteredSkills.length > 0 ? (
                    filteredSkills.map((skill) => (
                      <button
                        key={skill}
                        onClick={() => {
                          toggleSkill(skill, skillsCategory)
                          setSkillsSearchTerm("")
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm flex items-center"
                      >
                        <span className="flex-grow">{skill}</span>
                        <span className="text-xs text-gray-400">{skillsCategory}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      {skillsSearchTerm ? "No matching skills found" : "No more skills available"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected skills */}
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(formData.skills).flatMap(([category, skills]) =>
                skills.map((skill) => (
                  <span
                    key={`${category}-${skill}`}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#00FF9A]/10 text-[#00FF9A] border border-[#00FF9A]/20 hover:bg-[#00FF9A]/20 pl-2 pr-1"
                  >
                    {skill}
                    <span className="mx-1 text-xs text-gray-400">({category.slice(0, 3)})</span>
                    <button
                      onClick={() => toggleSkill(skill, category as keyof typeof SKILLS_OPTIONS)}
                      className="ml-1 hover:text-red-400"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )),
              )}
            </div>
          </div>

          {/* Tools / Platforms Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">🧰 Tools / Platforms</h3>
              <span className="text-xs text-gray-400">{formData.tools.length} selected</span>
            </div>

            {/* Search input */}
            <div className="relative" ref={toolsDropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={toolsSearchRef}
                  value={toolsSearchTerm}
                  onChange={(e) => setToolsSearchTerm(e.target.value)}
                  onFocus={() => setShowToolsDropdown(true)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent pl-10 pr-10"
                  placeholder="Search tools..."
                />
                <button
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                >
                  <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Dropdown */}
              {showToolsDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-48 overflow-y-auto z-10"
                >
                  {filteredTools.length > 0 ? (
                    filteredTools.map((tool) => (
                      <button
                        key={tool}
                        onClick={() => {
                          toggleTool(tool)
                          setToolsSearchTerm("")
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                      >
                        {tool}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-400">
                      {toolsSearchTerm ? "No matching tools found" : "No more tools available"}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected tools */}
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tools.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
                >
                  {tool}
                  <button
                    onClick={() => toggleTool(tool)}
                    className="ml-1 hover:text-red-400"
                    aria-label={`Remove ${tool}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Experience Level Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">💻 Experience Level</h3>

            <div className="grid grid-cols-2 gap-2">
              {EXPERIENCE_LEVELS.map((level) => (
                <label
                  key={level}
                  className={cn(
                    "flex items-center space-x-2 p-3 rounded-lg cursor-pointer transition-all",
                    formData.experienceLevel === level
                      ? "bg-[#00FF9A]/10 border-2 border-[#00FF9A] text-[#00FF9A]"
                      : "bg-gray-800 border-2 border-gray-700 hover:border-gray-600",
                  )}
                >
                  <input
                    type="radio"
                    name="experienceLevel"
                    value={level}
                    checked={formData.experienceLevel === level}
                    onChange={(e) => setFormData((prev) => ({ ...prev, experienceLevel: e.target.value }))}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{level}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Looking For / Interests Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">🚀 Looking For / Interests</h3>
              <span className="text-xs text-gray-400">{formData.interests.length} selected</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {INTEREST_OPTIONS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    "p-3 rounded-lg text-sm font-medium transition-all text-left flex items-center",
                    formData.interests.includes(interest)
                      ? "bg-[#00FF9A]/10 border-2 border-[#00FF9A] text-[#00FF9A]"
                      : "bg-gray-800 border-2 border-gray-700 text-gray-300 hover:border-gray-600",
                  )}
                  aria-label={`Toggle ${interest} interest`}
                >
                  {formData.interests.includes(interest) && <Check className="w-4 h-4 mr-2 flex-shrink-0" />}
                  <span>{interest}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Description */}
          <div className="space-y-4">
            <button 
              onClick={() => setOptionalExpanded(!optionalExpanded)}
              className="flex items-center justify-between w-full p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span className="text-sm font-medium">Add a description (optional)</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", optionalExpanded && "rotate-180")} />
            </button>
            
            {optionalExpanded && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300">Tell us about yourself</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent resize-none"
                    placeholder="What makes you unique? What are you passionate about?"
                    maxLength={200}
                    rows={4}
                    aria-label="Personal description"
                  />
                  <p className="text-xs text-gray-400 text-right">{formData.description.length}/200</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="github" className="block text-sm font-medium text-gray-300">GitHub</label>
                    <div className="relative">
                      <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="github"
                        value={formData.github}
                        onChange={(e) => setFormData((prev) => ({ ...prev, github: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent"
                        placeholder="username"
                        aria-label="GitHub username"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="linkedin" className="block text-sm font-medium text-gray-300">LinkedIn</label>
                    <div className="relative">
                      <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="linkedin"
                        value={formData.linkedin}
                        onChange={(e) => setFormData((prev) => ({ ...prev, linkedin: e.target.value }))}
                        className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent"
                        placeholder="username"
                        aria-label="LinkedIn username"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save CTA */}
          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={!isFormValid || saving}
              className={cn(
                "w-full py-3 font-semibold transition-all relative overflow-hidden rounded-lg flex items-center justify-center",
                isFormValid && !saving
                  ? "bg-[#00FF9A] text-black hover:bg-[#00CC7A]"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed",
              )}
              aria-label={isFormValid ? (mode === 'edit' ? "Update profile" : "Create profile") : `${progress}% ready - complete required fields`}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : isFormValid ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {mode === 'edit' ? 'Update My Profile' : 'Create My Profile'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />✨ {progress}% ready
                </>
              )}

              {showConfetti && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-ping">🎉</div>
                </div>
              )}
            </button>

            {!isFormValid && progress > 80 && (
              <p className="text-xs text-gray-400 text-center mt-2">Almost there! Just one more field to go.</p>
            )}
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #00FF9A;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #00FF9A;
          cursor: pointer;
          border: none;
        }
        .scrollbar-gradient::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-gradient::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .scrollbar-gradient::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #00FF9A 0%, #00CC7A 50%, #009E6F 100%);
          border-radius: 4px;
          border: 1px solid rgba(0, 255, 154, 0.2);
        }
        .scrollbar-gradient::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #00CC7A 0%, #009E6F 50%, #007D56 100%);
        }
        .scrollbar-gradient {
          scrollbar-width: thin;
          scrollbar-color: #00FF9A rgba(31, 41, 55, 0.5);
        }
      `}</style>
    </div>
  )
} 