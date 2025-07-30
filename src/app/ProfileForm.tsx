"use client"

import React, { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { db, storage } from "../firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { getAuth } from "firebase/auth"
import Cropper from 'react-easy-crop'
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
import { COUNTRIES } from './utils/countries'

// Utility function for combining class names
const cn = (...classes: (string | undefined | false | null)[]) => {
  return classes.filter(Boolean).join(' ')
}

// Utility function to generate SHA-256 hash from file
const generateFileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Crop helper function
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', error => reject(error))
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to the cropped size
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      resolve(blob)
    }, 'image/jpeg')
  })
}

interface FormData {
  avatar: File | null
  photos: File[]
  name: string
  age: number
  timezone: string // Now stores country code (e.g., 'US', 'CA', 'DE')
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
  photoHashes: string[] // Added for tracking uploaded photo hashes
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
    professions: ["Student"],
    skills: {
      languages: ["Python"],
      frameworks: [],
      devops: [],
      ml: [],
      web3: [],
      apis: [],
    },
    tools: ["GitHub"],
    experienceLevel: "Beginner",
    interests: ["Just vibe"],
    description: "",
    github: "",
    linkedin: "",
    photoHashes: [], // Initialize photoHashes
  })


  const [optionalExpanded, setOptionalExpanded] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [draggedPhoto, setDraggedPhoto] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [existingPhotoHashes, setExistingPhotoHashes] = useState<string[]>([]) // Track existing photo hashes
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [tempFile, setTempFile] = useState<File | null>(null)

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

  // Auto-detect country based on timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Map common timezones to country codes
    const timezoneToCountry: Record<string, string> = {
      'America/New_York': 'US',
      'America/Chicago': 'US', 
      'America/Denver': 'US',
      'America/Los_Angeles': 'US',
      'America/Toronto': 'CA',
      'Europe/London': 'GB',
      'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE',
      'Europe/Amsterdam': 'NL',
      'Europe/Stockholm': 'SE',
      'Asia/Tokyo': 'JP',
      'Asia/Shanghai': 'CN',
      'Asia/Seoul': 'KR',
      'Asia/Kolkata': 'IN',
      'Asia/Singapore': 'SG',
      'Australia/Sydney': 'AU',
      'America/Sao_Paulo': 'BR',
      'America/Mexico_City': 'MX',
      'Africa/Lagos': 'NG',
      'Africa/Cairo': 'EG'
    }
    
    const detectedCountry = timezoneToCountry[timezone] || ''
    setFormData((prev) => ({ ...prev, timezone: detectedCountry }))
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
                      photoHashes: data.photoHashes || [], // Load existing photo hashes
        }))
        
        if (data.avatarUrl) {
          setAvatarPreview(data.avatarUrl)
        }
        if (data.photos) {
          setPhotoPreviews(data.photos)
        }
        if (data.photoHashes) {
          setExistingPhotoHashes(data.photoHashes)
        }
      }
      setLoading(false)
    })
  }, [sessionEmail, mode])

  // Calculate progress
  const calculateProgress = () => {
    let completed = 0
    const total = 8 // Total number of requirement groups

    // Core requirements (avatar, photos, personal info)
    if (formData.avatar || avatarPreview) completed++
    if (formData.photos.length >= 3 || photoPreviews.length >= 3) completed++
    if (formData.name && formData.age && formData.timezone && formData.gender) completed++

    // Professional info
    if (formData.professions.length > 0) completed++
    if (Object.values(formData.skills).some(arr => arr.length > 0)) completed++
    if (formData.tools.length > 0) completed++
    if (formData.experienceLevel) completed++
    if (formData.interests.length > 0) completed++

    return Math.min(100, Math.round((completed / total) * 100)) // Ensure it never exceeds 100%
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
    formData.tools.length > 0 &&
    formData.experienceLevel &&
    formData.interests.length > 0

  // Handle photo upload
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files) return

    const file = files[0] // Handle one file at a time for cropping
    if (!file) return

    // Generate hash for the new file
    let fileHash: string
    try {
      fileHash = await generateFileHash(file)
    } catch (error) {
      console.error('Error generating file hash:', error)
      toast.error('Failed to process image. Please try again.')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Check if hash already exists in stored hashes or current session hashes
    const allExistingHashes = [...existingPhotoHashes, ...formData.photoHashes]
    const isDuplicateHash = allExistingHashes.includes(fileHash)

    if (isDuplicateHash) {
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
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Check if it's a duplicate file by name/size (fallback check)
    const isDuplicateFile = formData.photos.some(existingFile => 
      existingFile.name === file.name && existingFile.size === file.size
    )

    if (isDuplicateFile) {
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
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Check against existing uploaded photos by comparing file content
    const reader = new FileReader()
    reader.onload = () => {
      const newFileDataUrl = reader.result as string
      
      // Check if this data URL matches any existing photo preview
      const isDuplicateContent = photoPreviews.some(existingPreview => {
        // For data URLs, compare the base64 content part
        if (existingPreview.startsWith('data:')) {
          return existingPreview === newFileDataUrl
        }
        return false
      })

      if (isDuplicateContent) {
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
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }

      // If no duplicate found, proceed with cropping and store the hash
      setCropImage(newFileDataUrl)
      setTempFile(file)
      setCropModalOpen(true)
      
      // Store the hash for this file temporarily (will be added to formData after cropping)
      setTempFile(Object.assign(file, { hash: fileHash }))
    }
    reader.readAsDataURL(file)

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Remove photo
  const removePhoto = (index: number) => {
    // Always remove preview at this index
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))

    // Determine if this index corresponds to a local File in formData.photos
    const remoteCount = photoPreviews.length - formData.photos.length
    if (index >= remoteCount) {
      const fileIndex = index - remoteCount
      setFormData((prev) => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== fileIndex),
        photoHashes: prev.photoHashes.filter((_, i) => i !== fileIndex), // Also remove corresponding hash
      }))
    }
  }

  // Drag and drop for photos
  const handlePhotoDragStart = (index: number) => {
    setDraggedPhoto(index)
  }

  const handlePhotoDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedPhoto === null || draggedPhoto === index) return

    // Simple array reorder - just move what the user sees
    const newPreviews = [...photoPreviews]
    const draggedItem = newPreviews[draggedPhoto]
    newPreviews.splice(draggedPhoto, 1)
    newPreviews.splice(index, 0, draggedItem)
    setPhotoPreviews(newPreviews)
    
    setDraggedPhoto(index)
  }

  // Touch-based drag for mobile - REMOVED

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

  const handleRemoveAvatar = () => {
    setFormData((prev) => ({ ...prev, avatar: null }))
    setAvatarPreview("")
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
      toast.error('User not authenticated yet. Please wait a moment and try again.')
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
      const uploadedPhotoHashes: string[] = []
      for (let i = 0; i < formData.photos.length; i++) {
        const file = formData.photos[i]
        const photoStorageRef = ref(storage, `photos/${userEmail}_${Date.now()}_${i}`)
        await uploadBytes(photoStorageRef, file)
        const url = await getDownloadURL(photoStorageRef)
        uploadedPhotoUrls.push(url)
        
        // Get the corresponding hash (should be at the same index)
        if (formData.photoHashes[i]) {
          uploadedPhotoHashes.push(formData.photoHashes[i])
        }
      }

      // Combine existing photo URLs with new uploads
      const allPhotoUrls = [
        ...photoPreviews.filter(url => url.startsWith('http')), // Keep existing URLs
        ...uploadedPhotoUrls // Add new uploads
      ]

      // Combine existing photo hashes with new hashes
      const allPhotoHashes = [
        ...existingPhotoHashes, // Keep existing hashes
        ...uploadedPhotoHashes // Add new hashes
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
        photoHashes: allPhotoHashes, // Save hashes
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
        toast.success(mode === 'edit' ? 'Profile Updated!' : 'Profile Created!',
          {
            duration: 3000,
          position: 'top-center',
          style: {
            background: '#1F2937',
            color: '#fff',
            border: '1px solid #374151',
          },
          icon: '✅',
          }
        )
        if (onClose) onClose()
      }, 1500)
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile. Please try again.')
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

  // Add validation states
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({
    name: false,
    age: false,
    gender: false,
    professions: false,
    skills: false,
    tools: false,
    experienceLevel: false,
    interests: false,
  })

  // Validation helper functions
  const getFieldError = (field: string) => {
    if (!touchedFields[field]) return null
    
    switch (field) {
      case 'name':
        if (!formData.name) return 'Name is required'
        if (formData.name.length > 30) return 'Name must be 30 characters or less'
        return null
      case 'age':
        return formData.age === 0 ? 'Age is required' : null
      case 'gender':
        return !formData.gender ? 'Gender is required' : null
      case 'professions':
        return formData.professions.length === 0 ? 'Select at least one profession' : null
      case 'skills':
        return Object.values(formData.skills).every(arr => arr.length === 0) ? 'Select at least one skill' : null
      case 'tools':
        return formData.tools.length === 0 ? 'Select at least one tool' : null
      case 'experienceLevel':
        return !formData.experienceLevel ? 'Experience level is required' : null
      case 'interests':
        return formData.interests.length === 0 ? 'Select at least one interest' : null
      default:
        return null
    }
  }

  // Function to get all missing fields
  const getMissingFields = () => {
    const missing = []
    if (!formData.avatar && !avatarPreview) missing.push('Avatar')
    if (!formData.name) missing.push('Name')
    if (formData.age === 0) missing.push('Age')
    if (!formData.gender) missing.push('Gender')
    if (formData.professions.length === 0) missing.push('Professions')
    if (Object.values(formData.skills).every(arr => arr.length === 0)) missing.push('Skills')
    if (formData.tools.length === 0) missing.push('Tools')
    if (!formData.experienceLevel) missing.push('Experience Level')
    if (formData.interests.length === 0) missing.push('Interests')
    return missing
  }

  const handleBlur = (field: string) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }))
  }

  interface CroppedArea {
    x: number
    y: number
    width: number
    height: number
  }

  const handleCropComplete = (
    croppedArea: CroppedArea,
    croppedAreaPixels: CroppedArea
  ) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleCropConfirm = async () => {
    if (!cropImage || !croppedAreaPixels || !tempFile) return

    try {
      const croppedBlob = await getCroppedImg(cropImage, croppedAreaPixels)
      const croppedFile = new File([croppedBlob], tempFile.name, { type: 'image/jpeg' })

      // Generate hash for the cropped image
      let croppedFileHash: string
      try {
        croppedFileHash = await generateFileHash(croppedFile)
      } catch (error) {
        console.error('Error generating hash for cropped image:', error)
        toast.error('Failed to process cropped image. Please try again.')
        return
      }

      // Check if the cropped image hash already exists
      const allExistingHashes = [...existingPhotoHashes, ...formData.photoHashes]
      const isDuplicateHash = allExistingHashes.includes(croppedFileHash)

      if (isDuplicateHash) {
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
        // Close modal and reset crop state without adding the image
        setCropModalOpen(false)
        setCropImage(null)
        setTempFile(null)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
        return
      }

      // Check for duplicates of the cropped image by content (fallback)
      const reader = new FileReader()
      reader.onload = (e) => {
        const croppedDataUrl = e.target?.result as string
        
        // Check if this cropped image matches any existing photo
        const isDuplicateContent = photoPreviews.some(existingPreview => {
          if (existingPreview.startsWith('data:')) {
            return existingPreview === croppedDataUrl
          }
          return false
        })

        // Also check against files in formData by comparing file properties (fallback)
        const isDuplicateFile = formData.photos.some(existingFile => 
          existingFile.name === croppedFile.name && 
          existingFile.size === croppedFile.size
        )

        if (isDuplicateContent || isDuplicateFile) {
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
          // Close modal and reset crop state without adding the image
          setCropModalOpen(false)
          setCropImage(null)
          setTempFile(null)
          setCrop({ x: 0, y: 0 })
          setZoom(1)
          return
        }

        // If no duplicate found, add to formData with hash and create preview
        const isFirstPhoto = formData.photos.length === 0
        const shouldSetAsAvatar = !formData.avatar && !avatarPreview && isFirstPhoto
        
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, croppedFile],
          photoHashes: [...prev.photoHashes, croppedFileHash], // Add hash to tracking
          ...(shouldSetAsAvatar && { avatar: croppedFile }) // Auto-set as avatar if conditions met
        }))

        setPhotoPreviews(prev => [...prev, croppedDataUrl])

        // Auto-set avatar preview if no avatar is currently set (first photo only)
        if (shouldSetAsAvatar) {
          setAvatarPreview(croppedDataUrl)
        }

        // Close modal and reset crop state
        setCropModalOpen(false)
        setCropImage(null)
        setTempFile(null)
        setCrop({ x: 0, y: 0 })
        setZoom(1)
      }
      reader.readAsDataURL(croppedFile)
    } catch (error) {
      console.error('Error cropping image:', error)
      toast.error('Failed to crop image. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="text-white text-lg animate-pulse">Loading profile…</div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Crop Modal */}
      {cropModalOpen && cropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-gray-900 p-4 rounded-lg w-full max-w-lg">
            <div className="relative h-[400px] mb-4">
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={3/4}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>
            <div className="flex justify-between gap-4">
              <button
                onClick={() => {
                  setCropModalOpen(false)
                  setCropImage(null)
                  setTempFile(null)
                }}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                className="flex-1 px-4 py-2 bg-[#00FF9A] text-black rounded-lg hover:bg-[#00CC7A]"
              >
                Crop & Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing modal content */}
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
              <div className="flex items-center justify-center gap-2 mb-2">
                <h2 className="text-xl font-semibold">Choose your avatar</h2>
                {!formData.avatar && !avatarPreview && (
                  <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                    Required
                  </span>
                )}
              </div>
              <p className="text-gray-400 text-sm">This will be your profile picture</p>
              {!formData.avatar && !avatarPreview && (
                <p className="text-[#00FF9A] text-sm font-medium mt-1">
                  👆 Tap the camera icon to add your avatar
                </p>
              )}
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div className={`w-24 h-24 rounded-full bg-gray-800 border-2 overflow-hidden flex items-center justify-center transition-colors ${
                  !formData.avatar && !avatarPreview 
                    ? 'border-red-500/50 ring-2 ring-red-500/20' 
                    : 'border-gray-600'
                }`}>
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
                  className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    !formData.avatar && !avatarPreview
                      ? 'bg-[#00FF9A] hover:bg-[#00CC7A] animate-pulse'
                      : 'bg-[#00FF9A] hover:bg-[#00CC7A]'
                  }`}
                  aria-label="Upload avatar"
                >
                  <Camera className="w-4 h-4 text-black" />
                </button>
                {(formData.avatar || avatarPreview) && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label="Remove avatar"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            </div>

            {!formData.avatar && !avatarPreview && (
              <div className="text-center">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="px-4 py-2 bg-[#00FF9A] text-black rounded-lg hover:bg-[#00CC7A] transition-colors font-medium"
                >
                  Add Avatar Photo
                </button>
              </div>
            )}

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
                  className={`relative aspect-square bg-gray-800 rounded-lg overflow-hidden group transition-all md:cursor-move ${
                    draggedPhoto === index ? 'scale-105 opacity-70 z-30' : ''
                  }`}
                  draggable
                  onDragStart={() => handlePhotoDragStart(index)}
                  onDragOver={(e) => handlePhotoDragOver(e, index)}
                  onDragEnd={() => setDraggedPhoto(null)}
                  data-photo-index={index}
                >
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Drag overlay - only visible on desktop hover */}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>
                  <button
                    onClick={(_e) => {
                      removePhoto(index)
                    }}
                    className="absolute top-1 right-1 z-20 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove photo ${index + 1}`}
                  >
                    <X className="w-3 h-3 text-white" />
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
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value.slice(0, 30) }))}
                onBlur={() => handleBlur('name')}
                className={cn(
                  "w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent",
                  getFieldError('name') ? "border-red-500" : "border-gray-700"
                )}
                placeholder="Your name"
                aria-label="Name"
                maxLength={30}
              />
              {getFieldError('name') && (
                <p className="text-sm text-red-500 mt-1">{getFieldError('name')}</p>
              )}
            </div>

            {/* Age Section */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Age: {formData.age} <span className="text-red-500">*</span>
              </label>
              <div className={cn(
                "px-2",
                touchedFields.age && formData.age === 0 && "border border-red-500 rounded-lg p-2"
              )}>
                <input
                  type="range"
                  value={formData.age}
                  onChange={(e) => setFormData((prev) => ({ ...prev, age: parseInt(e.target.value) }))}
                  onBlur={() => handleBlur('age')}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  aria-label="Select your age"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  
                </div>
              </div>
              {getFieldError('age') && (
                <p className="text-sm text-red-500 mt-1">{getFieldError('age')}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-300">Country where you reside</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent"
                aria-label="Select your location"
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Gender <span className="text-red-500">*</span>
              </label>
              <div 
                className={cn(
                  "grid grid-cols-2 gap-2",
                  touchedFields.gender && !formData.gender && "border border-red-500 rounded-lg p-1"
                )}
              >
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
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, gender: e.target.value }))
                        handleBlur('gender')
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{option}</span>
                  </label>
                ))}
              </div>
              {getFieldError('gender') && (
                <p className="text-sm text-red-500 mt-1">{getFieldError('gender')}</p>
              )}
            </div>
          </div>

          {/* Profession / Role Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Professions <span className="text-red-500">*</span>
              </h3>
              <span className="text-xs text-gray-400">{formData.professions.length}/3 selected</span>
            </div>

            <div 
              className={cn(
                "flex flex-wrap gap-2",
                touchedFields.professions && formData.professions.length === 0 && "border border-red-500 rounded-lg p-2"
              )}
            >
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

            {getFieldError('professions') && (
              <p className="text-sm text-red-500">{getFieldError('professions')}</p>
            )}
            {formData.professions.length === 0 && (
              <p className="text-xs text-gray-400">Select up to 3 roles that best describe you</p>
            )}
          </div>

          {/* Skills / Technologies Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Skills <span className="text-red-500">*</span>
              </h3>
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
            {getFieldError('skills') && (
              <p className="text-sm text-red-500">{getFieldError('skills')}</p>
            )}
          </div>

          {/* Tools / Platforms Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Tools <span className="text-red-500">*</span>
              </h3>
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
                  onBlur={() => handleBlur('tools')}
                  className={cn(
                    "w-full px-3 py-2 bg-gray-800 border rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent pl-10 pr-10",
                    touchedFields.tools && formData.tools.length === 0 ? "border-red-500" : "border-gray-700"
                  )}
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
            {getFieldError('tools') && (
              <p className="text-sm text-red-500">{getFieldError('tools')}</p>
            )}
          </div>

          {/* Experience Level Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              Experience <span className="text-red-500">*</span>
            </h3>

            <div 
              className={cn(
                "grid grid-cols-2 gap-2",
                touchedFields.experienceLevel && !formData.experienceLevel && "border border-red-500 rounded-lg p-1"
              )}
            >
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
                    onBlur={() => handleBlur('experienceLevel')}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{level}</span>
                </label>
              ))}
            </div>
            {getFieldError('experienceLevel') && (
              <p className="text-sm text-red-500">{getFieldError('experienceLevel')}</p>
            )}
          </div>

          {/* Looking For / Interests Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">
                Interests <span className="text-red-500">*</span>
              </h3>
              <span className="text-xs text-gray-400">{formData.interests.length} selected</span>
            </div>

            <div 
              className={cn(
                "grid grid-cols-2 gap-2",
                touchedFields.interests && formData.interests.length === 0 && "border border-red-500 rounded-lg p-1"
              )}
            >
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
            {getFieldError('interests') && (
              <p className="text-sm text-red-500">{getFieldError('interests')}</p>
            )}
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
                        onBlur={() => handleBlur('github')}
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
                        onBlur={() => handleBlur('linkedin')}
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

          {/* Missing Fields Summary - Add this before the Save CTA */}
          {getMissingFields().length > 0 && (
            <div className="space-y-2 border border-red-500/20 rounded-lg p-4 bg-red-500/5">
              <h4 className="text-sm font-medium text-red-400">Required Fields Missing:</h4>
              <ul className="list-disc list-inside text-sm text-red-400/80 space-y-1">
                {getMissingFields().map(field => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </div>
          )}

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