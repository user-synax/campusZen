"use client"

import { useState, useRef } from 'react'
import { 
  Upload, 
  X, 
  FileText, 
  ImageIcon, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle 
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from 'sonner'
import { ID, Permission, Role, Storage } from 'appwrite'
import { createAppwriteClient } from '@/lib/appwrite/client'
import { CATEGORY_CONFIG, formatFileSize } from '@/utils/resource-helpers'

/**
 * ResourceUploadModal Component
 * Multi-step modal for uploading student resources (PDFs and Images).
 */
export default function ResourceUploadModal({ open, onOpenChange, onSuccess }) {
  // ━━━ State ━━━
  const [step, setStep] = useState(1) // 1: Metadata, 2: File, 3: Uploading, success, error
  
  // Step 1: Metadata
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [subject, setSubject] = useState('')
  const [semester, setSemester] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  
  // Step 2: File
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef(null)
  
  // Step 3: Uploading
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // Validation
  const [titleError, setTitleError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [fileError, setFileError] = useState('')

  // ━━━ Appwrite Storage upload handled in handleUpload ━━━

  // ━━━ Handlers ━━━
  const validateStep1 = () => {
    let valid = true
    const trimTitle = title.trim()

    if (!trimTitle || trimTitle.length < 5) {
      setTitleError('At least 5 characters required')
      valid = false
    } else if (trimTitle.length > 150) {
      setTitleError('Maximum 150 characters')
      valid = false
    } else {
      setTitleError('')
    }

    if (!category) {
      setCategoryError('Please select a category')
      valid = false
    } else {
      setCategoryError('')
    }

    return valid
  }

  const handleFileSelect = (file) => {
    if (!file) return
    setFileError('')

    // Client-side type check
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg',
      'image/png', 'image/webp'
    ]
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only PDF, JPG, PNG, or WebP files allowed')
      return
    }

    // Client-side size check
    const maxSize = 50 * 1024 * 1024   // 50MB

    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0)
      setFileError(
        `File too large. Max ${maxMB}MB for ${
          file.type.includes('pdf') ? 'PDFs' : 'images'
        }`
      )
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setUploadProgress(0)
    setStep(3)

    try {
      const client = createAppwriteClient()
      const storage = new Storage(client)
      const fileId = ID.unique()

      // Direct client-side upload to Appwrite Storage (current session)
      await storage.createFile(
        process.env.NEXT_PUBLIC_APPWRITE_RESOURCES_BUCKET_ID,
        fileId,
        selectedFile,
        [Permission.read(Role.any())],
        (progress) => setUploadProgress(Math.min(progress.progress ?? 0, 90))
      )

      setUploadProgress(95)

      // Finalize by saving metadata to MongoDB
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type, // mime type
          title: title.trim(),
          description: description.trim(),
          category,
          subject: subject.trim(),
          semester: semester || null,
          tags: tagsInput
        })
      })

      const data = await res.json()
      setUploadProgress(100)

      if (res.ok) {
        setStep('success')
        onSuccess?.()
      } else {
        setErrorMessage(
          data.errors?.join(', ') ||
          data.error ||
          'Failed to save resource details.'
        )
        setStep('error')
      }
    } catch (err) {
      let msg = 'Upload failed. Please try again.'
      const message = err?.message || ''
      if (message.includes('File size') || message.includes('limit') || message.includes('too large')) {
        msg = 'File too large. Max file size is 50 MB.'
      } else if (message.includes('session') || message.includes('unauthorized') || message.includes('401')) {
        msg = 'Session expired. Please refresh and try again.'
      } else if (message.includes('type') || message.includes('extension')) {
        msg = 'Invalid file type. Only PDF and images allowed.'
      } else {
        msg = message || msg
      }
      setErrorMessage(msg)
      setStep('error')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    // Reset all state before closing
    setStep(1)
    setTitle('')
    setDescription('')
    setCategory('')
    setSubject('')
    setSemester('')
    setTagsInput('')
    setSelectedFile(null)
    setFileError('')
    setUploadProgress(0)
    setIsUploading(false)
    setErrorMessage('')
    setTitleError('')
    setCategoryError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}> 
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto p-0 gap-0 border-border/50 bg-card/95 backdrop-blur-xl"> 
 
        {/* Header */} 
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50"> 
          <DialogTitle className="text-base font-black tracking-tight flex items-center gap-2"> 
            {step === 1 && <><FileText className="w-4 h-4 text-primary" /> Resource Details</>} 
            {step === 2 && <><Upload className="w-4 h-4 text-primary" /> Select File</>} 
            {step === 3 && <><Loader2 className="w-4 h-4 text-primary animate-spin" /> Uploading...</>} 
            {step === 'success' && <><CheckCircle className="w-4 h-4 text-green-500" /> Submitted!</>} 
            {step === 'error' && <><AlertCircle className="w-4 h-4 text-destructive" /> Failed</>} 
          </DialogTitle> 
        </div> 
 
        <div className="p-5"> 
 
          {/* ━━━ STEP 1: Metadata ━━━ */} 
          {step === 1 && ( 
            <div className="space-y-4"> 
              {/* Title */} 
              <div className="space-y-1.5"> 
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground"> 
                  Title <span className="text-destructive">*</span> 
                </label> 
                <Input 
                  value={title} 
                  onChange={(e) => { 
                    setTitle(e.target.value) 
                    if (titleError) setTitleError('') 
                  }} 
                  placeholder="e.g. Data Structures Complete Notes" 
                  maxLength={150} 
                  className={`bg-background/50 border-border/50 font-medium ${titleError ? 'border-destructive focus-visible:ring-destructive' : ''}`} 
                /> 
                <div className="flex justify-between"> 
                  {titleError 
                    ? <p className="text-[10px] font-bold text-destructive uppercase">{titleError}</p> 
                    : <span /> 
                  } 
                  <p className="text-[10px] font-mono text-muted-foreground">{title.length}/150</p> 
                </div> 
              </div> 
 
              {/* Category */} 
              <div className="space-y-1.5"> 
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground"> 
                  Category <span className="text-destructive">*</span> 
                </label> 
                <div className="grid grid-cols-2 gap-2"> 
                  {Object.entries(CATEGORY_CONFIG).map(([id, cat]) => ( 
                    <button 
                      key={id} 
                      type="button" 
                      onClick={() => { 
                        setCategory(id) 
                        if (categoryError) setCategoryError('') 
                      }} 
                      className={` 
                        p-2.5 rounded-xl border text-left text-xs transition-all 
                        ${category === id 
                          ? 'border-primary bg-primary/10 font-bold text-primary shadow-inner shadow-primary/10' 
                          : 'border-border/50 bg-background/30 hover:border-primary/30 hover:bg-accent/50 text-muted-foreground font-bold' 
                        } 
                      `} 
                    > 
                      {cat.emoji} {cat.label} 
                    </button> 
                  ))} 
                </div> 
                {categoryError && ( 
                  <p className="text-[10px] font-bold text-destructive uppercase">{categoryError}</p> 
                )} 
              </div> 
 
              {/* Subject */} 
              <div className="space-y-1.5"> 
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground"> 
                  Subject 
                  <span className="text-[10px] lowercase ml-1 opacity-50 font-bold">(optional)</span> 
                </label> 
                <Input 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  placeholder="e.g. Data Structures, DBMS" 
                  maxLength={100} 
                  className="bg-background/50 border-border/50 font-medium"
                /> 
              </div> 
 
              {/* Semester */} 
              <div className="space-y-1.5"> 
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground"> 
                  Semester 
                  <span className="text-[10px] lowercase ml-1 opacity-50 font-bold">(optional)</span> 
                </label> 
                <select 
                  value={semester} 
                  onChange={(e) => setSemester(e.target.value)} 
                  className="w-full bg-background/50 border border-border/50 rounded-xl 
                             px-3 h-10 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none" 
                > 
                  <option value="">Not specific to a semester</option> 
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => ( 
                    <option key={s} value={s}>Semester {s}</option> 
                  ))} 
                </select> 
              </div> 
 
              {/* Tags */} 
              <div className="space-y-1.5"> 
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground"> 
                  Tags 
                  <span className="text-[10px] lowercase ml-1 opacity-50 font-bold">(comma-separated, max 5)</span> 
                </label> 
                <Input 
                  value={tagsInput} 
                  onChange={(e) => setTagsInput(e.target.value)} 
                  placeholder="algorithms, trees, sorting" 
                  className="bg-background/50 border-border/50 font-medium"
                /> 
              </div> 
 
              {/* Description */} 
              <div className="space-y-1.5"> 
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground"> 
                  Description 
                  <span className="text-[10px] lowercase ml-1 opacity-50 font-bold">(optional)</span> 
                </label> 
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Briefly describe what's inside..." 
                  rows={2} 
                  maxLength={500} 
                  className="resize-none bg-background/50 border-border/50 font-medium rounded-xl" 
                /> 
              </div> 
 
              <Button 
                className="w-full h-11 rounded-xl font-black tracking-tight" 
                onClick={() => { if (validateStep1()) setStep(2) }} 
              > 
                Next: Select File → 
              </Button> 
            </div> 
          )} 
 
          {/* ━━━ STEP 2: File Selection ━━━ */} 
          {step === 2 && ( 
            <div className="space-y-4"> 
              <button 
                onClick={() => setStep(1)} 
                className="text-xs font-black text-muted-foreground hover:text-foreground uppercase tracking-widest 
                           flex items-center gap-1 transition-colors" 
              > 
                ← Back to details 
              </button> 
 
              {/* Drop zone */} 
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }} 
                onDragLeave={() => setDragging(false)} 
                onDrop={(e) => { 
                  e.preventDefault() 
                  setDragging(false) 
                  handleFileSelect(e.dataTransfer.files[0]) 
                }} 
                onClick={() => fileRef.current?.click()} 
                className={` 
                  border-2 border-dashed rounded-2xl p-10 text-center 
                  cursor-pointer transition-all duration-300 relative
                  ${dragging 
                    ? 'border-primary bg-primary/5 scale-[1.02] shadow-2xl shadow-primary/10' 
                    : selectedFile 
                      ? 'border-green-500/50 bg-green-500/5' 
                      : 'border-border/50 bg-background/30 hover:border-primary/30 hover:bg-accent/50' 
                  } 
                `} 
              > 
                {selectedFile ? ( 
                  <div className="flex items-center justify-center gap-4"> 
                    <div className="w-12 h-12 rounded-2xl bg-green-500/20 
                                    flex items-center justify-center shadow-lg shadow-green-500/10"> 
                      {selectedFile.type === 'application/pdf' 
                        ? <FileText className="w-6 h-6 text-green-500" /> 
                        : <ImageIcon className="w-6 h-6 text-green-500" /> 
                      } 
                    </div> 
                    <div className="text-left flex-1 min-w-0"> 
                      <p className="font-black text-sm truncate tracking-tight"> 
                        {selectedFile.name} 
                      </p> 
                      <p className="text-[10px] font-black text-green-500 uppercase tracking-widest"> 
                        {formatFileSize(selectedFile.size)} — Ready 
                      </p> 
                    </div> 
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation() 
                        setSelectedFile(null) 
                      }} 
                      className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors" 
                    > 
                      <X className="w-4 h-4" /> 
                    </button> 
                  </div> 
                ) : ( 
                  <> 
                    <div className="w-14 h-14 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4 border border-primary/10 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-primary" /> 
                    </div>
                    <p className="text-sm font-black tracking-tight"> 
                      Drop file here or click to browse 
                    </p> 
                    <p className="text-[10px] font-bold text-muted-foreground/60 mt-2 uppercase tracking-widest"> 
                       Max file size: 50 MB · PDF or image
                    </p> 
                  </> 
                )} 
              </div> 
 
              <input 
                ref={fileRef} 
                type="file" 
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp" 
                className="hidden" 
                onChange={(e) => handleFileSelect(e.target.files?.[0])} 
              /> 
 
              {fileError && ( 
                <div className="flex items-center gap-2 text-xs font-bold text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20"> 
                  <AlertCircle className="w-4 h-4 flex-shrink-0" /> 
                  {fileError} 
                </div> 
              )} 
 
              {/* Review notice */} 
              <div className="bg-amber-500/10 border border-amber-500/20 
                              rounded-2xl p-4 shadow-inner shadow-amber-500/5"> 
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[11px] text-amber-200/80 font-bold leading-snug"> 
                      Resources are reviewed before going public. 
                      Usually approved within 24 hours. 
                    </p> 
                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-tighter"> 
                      Do NOT upload copyrighted books or materials. 
                    </p> 
                  </div>
                </div>
              </div> 
 
              <Button 
                className="w-full h-11 rounded-xl font-black tracking-tight" 
                onClick={handleUpload} 
                disabled={!selectedFile || isUploading} 
              > 
                🚀 Submit for Review 
              </Button> 
            </div> 
          )} 
 
          {/* ━━━ STEP 3: Uploading ━━━ */} 
          {step === 3 && ( 
            <div className="space-y-8 py-6 text-center"> 
              <div className="relative inline-flex">
                <div className="w-20 h-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black font-mono">{uploadProgress}%</span>
                </div>
              </div>

              <div> 
                <p className="text-lg font-black tracking-tight"> 
                  {uploadProgress < 90 
                    ? 'Uploading File...' 
                    : uploadProgress < 100 
                      ? 'Processing...' 
                      : 'Saving Details...' 
                  } 
                </p> 
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2"> 
                  Please don&apos;t close this window
                </p> 
              </div> 
 
              {/* Progress bar */} 
              <div className="space-y-3 px-4"> 
                <div className="h-2 bg-accent rounded-full overflow-hidden shadow-inner"> 
                  <div 
                    className="h-full bg-linear-to-r from-blue-500 via-primary to-purple-500 
                               rounded-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" 
                    style={{ width: `${uploadProgress}%` }} 
                  /> 
                </div> 
              </div> 
 
              {/* File summary */} 
              {selectedFile && ( 
                <div className="bg-accent/30 rounded-2xl p-4 border border-border/50 text-left mx-4"> 
                  <p className="font-black text-xs truncate tracking-tight">{title}</p> 
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1"> 
                    {selectedFile.name} · {formatFileSize(selectedFile.size)} 
                  </p> 
                </div> 
              )} 
            </div> 
          )} 
 
          {/* ━━━ SUCCESS ━━━ */} 
          {step === 'success' && ( 
            <div className="text-center py-8 space-y-6"> 
              <div className="w-20 h-20 rounded-full bg-green-500/10 
                              flex items-center justify-center mx-auto border border-green-500/20 shadow-2xl shadow-green-500/10"> 
                <CheckCircle className="w-10 h-10 text-green-500" /> 
              </div> 
              <div className="space-y-2"> 
                <h3 className="text-xl font-black tracking-tight text-foreground">Resource Submitted!</h3> 
                <p className="text-xs font-bold text-muted-foreground/80 leading-relaxed px-4"> 
                  Your resource is under review and will be published 
                  once approved. We&apos;ll notify you!
                </p> 
              </div> 
              <div className="flex gap-3 px-4 pt-2"> 
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-xl font-black tracking-tight border-border/50 hover:bg-accent/50" 
                  onClick={() => { 
                    setStep(1) 
                    setTitle(''); setCategory(''); setSelectedFile(null) 
                    setUploadProgress(0) 
                  }} 
                > 
                  Upload Another 
                </Button> 
                <Button className="flex-1 h-11 rounded-xl font-black tracking-tight" onClick={handleClose}> 
                  Done 
                </Button> 
              </div> 
            </div> 
          )} 
 
          {/* ━━━ ERROR ━━━ */} 
          {step === 'error' && ( 
            <div className="text-center py-8 space-y-6"> 
              <div className="w-16 h-16 rounded-full bg-destructive/10 
                              flex items-center justify-center mx-auto border border-destructive/20 shadow-2xl shadow-destructive/10"> 
                <AlertCircle className="w-8 h-8 text-destructive" /> 
              </div> 
              <div className="space-y-2"> 
                <h3 className="text-lg font-black tracking-tight text-foreground">Upload Failed</h3> 
                <p className="text-xs font-bold text-destructive/80 px-6 leading-relaxed"> 
                  {errorMessage} 
                </p> 
              </div> 
              <div className="flex gap-3 px-4 pt-2"> 
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 rounded-xl font-black tracking-tight border-border/50 hover:bg-accent/50" 
                  onClick={() => { 
                    setStep(2) 
                    setUploadProgress(0) 
                    setIsUploading(false) 
                  }} 
                > 
                  Try Again 
                </Button> 
                <Button variant="ghost" className="flex-1 h-11 rounded-xl font-black tracking-tight" onClick={handleClose}> 
                  Cancel 
                </Button> 
              </div> 
            </div> 
          )} 
        </div> 
      </DialogContent> 
    </Dialog> 
  )
}
