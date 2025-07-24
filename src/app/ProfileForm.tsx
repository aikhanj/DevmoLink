"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { db, storage } from "../firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { getAuth } from "firebase/auth"
import { getCroppedImg } from "./utils/cropUtils"
import Cropper, { Area } from "react-easy-crop"

interface FormData {
  avatar: File | null
  photos: File[]
  name: string
  age: number
  timezone: string
  skills: string[]
  themes: string[]
  description: string
  github: string
  linkedin: string
}

interface CropData {
  url: string
  aspect: number
  onConfirm: (url: string) => void
}

const SKILLS_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Vue",
  "Angular",
  "Node.js",
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
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "MongoDB",
  "PostgreSQL",
  "GraphQL",
  "REST APIs",
  "Machine Learning",
  "AI",
  "Blockchain",
]

const THEME_OPTIONS = [
  { label: "AI & Machine Learning", emoji: "🤖", value: "ai" },
  { label: "Fintech", emoji: "💰", value: "fintech" },
  { label: "Climate Tech", emoji: "🌱", value: "climate" },
  { label: "Education", emoji: "📚", value: "education" },
  { label: "Gaming", emoji: "🎮", value: "gaming" },
  { label: "Social Impact", emoji: "🌍", value: "social" },
  { label: "E-commerce", emoji: "🛒", value: "ecommerce" },
  { label: "Developer Tools", emoji: "🔧", value: "devtools" },
  { label: "Productivity", emoji: "⚡", value: "productivity" },
  { label: "Healthcare", emoji: "🏥", value: "healthcare" },
]

const Camera = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const Github = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
)

const Linkedin = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const GripVertical = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
  </svg>
)

export default function ProfileForm({ onClose, hideClose = false }: { onClose: () => void, hideClose?: boolean }) {
  const { data: session } = useSession()
  const sessionEmail = session?.user?.email

  const [formData, setFormData] = useState<FormData>({
    avatar: null,
    photos: [],
    name: "",
    age: 25,
    timezone: "",
    skills: [],
    themes: [],
    description: "",
    github: "",
    linkedin: "",
  })

  const [skillInput, setSkillInput] = useState("")
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
  const [optionalExpanded, setOptionalExpanded] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [draggedPhoto, setDraggedPhoto] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string>("")
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [cropData, setCropData] = useState<CropData | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const skillInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Auto-detect timezone
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setFormData((prev) => ({ ...prev, timezone }))
  }, [])

  // Load existing profile
  useEffect(() => {
    if (!sessionEmail) return
    setLoading(true)
    getDoc(doc(db, "profiles", sessionEmail)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setFormData(prev => ({
          ...prev,
          name: data.name || "",
          age: data.age || 25,
          timezone: data.timezone || prev.timezone,
          skills: data.programmingLanguages || [],
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
  }, [sessionEmail])

  // Calculate progress
  const calculateProgress = () => {
    let completed = 0
    const total = 4

    if (formData.avatar || avatarPreview) completed++
    if (formData.photos.length >= 3 || photoPreviews.length >= 3) completed++
    if (formData.name && formData.age && formData.timezone) completed++
    if (formData.skills.length > 0 && formData.themes.length > 0) completed++

    return Math.round((completed / total) * 100)
  }

  const progress = calculateProgress()
  const isFormValid =
    (formData.avatar || avatarPreview) &&
    (formData.photos.length >= 3 || photoPreviews.length >= 3) &&
    formData.name &&
    formData.age &&
    formData.skills.length > 0 &&
    formData.themes.length > 0

  // Handle photo upload
  const handlePhotoUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    setCropData({
      url: URL.createObjectURL(file),
      aspect: 3/4,
      onConfirm: (croppedUrl) => {
        setPhotoPreviews(prev => [...prev, croppedUrl])
        fetch(croppedUrl)
          .then(res => res.blob())
          .then(blob => {
            const croppedFile = new File([blob], file.name, { type: blob.type })
            setFormData(prev => ({...prev, photos: [...prev.photos, croppedFile]}))
          })
      }
    })
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
    setCropData({
      url: URL.createObjectURL(file),
      aspect: 1,
      onConfirm: (croppedUrl) => {
        setAvatarPreview(croppedUrl)
        fetch(croppedUrl)
          .then(res => res.blob())
          .then(blob => {
            const croppedFile = new File([blob], file.name, { type: blob.type })
            setFormData(prev => ({ ...prev, avatar: croppedFile }))
          })
      }
    })
  }

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }

  const handleCropConfirm = async () => {
    if (!cropData || !croppedAreaPixels) return
    const croppedImg = await getCroppedImg(cropData.url, croppedAreaPixels, cropData.aspect)
    cropData.onConfirm(croppedImg)
    setCropData(null)
  }

  const handleCropCancel = () => {
    setCropData(null)
  }

  // Handle skill input
  const handleSkillInput = (value: string) => {
    setSkillInput(value)
    setShowSkillSuggestions(value.length > 0)
  }

  const addSkill = (skill: string) => {
    if (!formData.skills.includes(skill)) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill],
      }))
    }
    setSkillInput("")
    setShowSkillSuggestions(false)
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }))
  }

  // Handle theme toggle
  const toggleTheme = (theme: string) => {
    setFormData((prev) => ({
      ...prev,
      themes: prev.themes.includes(theme) ? prev.themes.filter((t) => t !== theme) : [...prev.themes, theme],
    }))
  }

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

             const uploadedPhotoUrls: string[] = [...photoPreviews]
       
       for (let i = 0; i < formData.photos.length; i++) {
         const file = formData.photos[i]
         const photoStorageRef = ref(storage, `photos/${userEmail}_${Date.now()}_${i}`)
         await uploadBytes(photoStorageRef, file)
         const url = await getDownloadURL(photoStorageRef)
         uploadedPhotoUrls.push(url)
       }

      await setDoc(doc(db, "profiles", userEmail), {
        name: formData.name,
        age: formData.age,
        birthday: "", // Keep for compatibility
        gender: "", // Keep for compatibility
        timezone: formData.timezone,
        programmingLanguages: formData.skills,
        avatarUrl,
        photos: uploadedPhotoUrls,
        description: formData.description,
        github: formData.github,
        linkedin: formData.linkedin,
        themes: formData.themes,
        email: userEmail,
      })

      setShowConfetti(true)
      setTimeout(() => {
        alert('Profile Created!')
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const filteredSkills = SKILLS_OPTIONS.filter(
    (skill) => skill.toLowerCase().includes(skillInput.toLowerCase()) && !formData.skills.includes(skill),
  )

  const cn = (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' ')

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="text-white text-lg animate-pulse">Loading profile…</div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-[#0F0F14] text-white flex justify-center p-4 overflow-y-auto z-50">
        <div className="w-full max-w-[420px] space-y-6 py-8">
          {/* Header */}
          <div className="text-center mb-6 relative">
            {!hideClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-0 right-0 text-gray-400 hover:text-white text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#00FFAB] rounded-full transition"
              >
                ×
              </button>
            )}
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00FF9A] to-[#60A5FA] bg-clip-text text-transparent mb-2">
              Create Your Profile
            </h1>
            <p className="text-gray-400 text-sm">Join our community of creators</p>
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
              <h3 className="text-lg font-medium">Core details</h3>

              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Name</label>
                <input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent"
                  placeholder="Your first name"
                  aria-label="First name"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">Age: {formData.age}</label>
                <div className="px-2">
                  <input
                    type="range"
                    value={formData.age}
                    onChange={(e) => setFormData((prev) => ({ ...prev, age: parseInt(e.target.value) }))}
                    max={65}
                    min={16}
                    step={1}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    aria-label="Select your age"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>16</span>
                    <span>25</span>
                    <span>35</span>
                    <span>45</span>
                    <span>55</span>
                    <span>65+</span>
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
            </div>

            {/* Skills & Interests */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Skills & interests</h3>

              <div className="space-y-2">
                <label htmlFor="skills" className="block text-sm font-medium text-gray-300">Languages & Frameworks</label>
                <div className="relative">
                  <input
                    ref={skillInputRef}
                    id="skills"
                    value={skillInput}
                    onChange={(e) => handleSkillInput(e.target.value)}
                    onFocus={() => setShowSkillSuggestions(skillInput.length > 0)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00FF9A] focus:border-transparent"
                    placeholder="Type to search skills..."
                    aria-label="Search and add skills"
                  />

                  {showSkillSuggestions && filteredSkills.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-40 overflow-y-auto z-10">
                      {filteredSkills.slice(0, 6).map((skill) => (
                        <button
                          key={skill}
                          onClick={() => addSkill(skill)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm"
                        >
                          {skill}
                        </button>
                      ))}
                      {skillInput && !SKILLS_OPTIONS.includes(skillInput) && (
                        <button
                          onClick={() => addSkill(skillInput)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-700 text-sm border-t border-gray-700"
                        >
                                                   Add &quot;{skillInput}&quot;
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#00FF9A]/10 text-[#00FF9A] border border-[#00FF9A]/20"
                    >
                      {skill}
                      <button
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-red-400"
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {formData.skills.length > 0 && (
                                   <p className="text-xs text-gray-400">Not sure? Pick your top 3 &mdash; you can edit anytime.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Project themes you&apos;re excited about</label>
                <div className="grid grid-cols-2 gap-2">
                  {THEME_OPTIONS.map((theme) => (
                    <button
                      key={theme.value}
                      onClick={() => toggleTheme(theme.value)}
                      className={cn(
                        "p-3 rounded-lg text-sm font-medium transition-all text-left border-2",
                        formData.themes.includes(theme.value)
                          ? "bg-[#00FF9A]/10 border-[#00FF9A] text-[#00FF9A]"
                          : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600",
                      )}
                      aria-label={`Toggle ${theme.label} theme`}
                    >
                      <span className="mr-2">{theme.emoji}</span>
                      {theme.label}
                    </button>
                  ))}
                </div>
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
                aria-label={isFormValid ? "Create profile" : `${progress}% ready - complete required fields`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Saving...
                  </>
                ) : isFormValid ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create My Profile
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
        `}</style>
      </div>
      
      {cropData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#18181b] p-6 rounded-xl">
            <div className="relative w-72 h-72">
              <Cropper
                image={cropData.url}
                crop={crop}
                zoom={zoom}
                aspect={cropData.aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <button type="button" className="px-4 py-2 bg-gray-700 text-white rounded" onClick={handleCropCancel}>Cancel</button>
              <button type="button" className="px-4 py-2 bg-[#00FF9A] text-[#030712] rounded font-bold" onClick={handleCropConfirm}>Crop</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 