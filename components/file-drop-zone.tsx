'use client'

import { useState, useRef, useCallback, type ReactNode } from 'react'
import { Upload } from 'lucide-react'

interface FileDropZoneProps {
  children: ReactNode
  onFileDrop: (files: File[]) => void
  acceptedTypes?: string[]
  className?: string
  overlayClassName?: string
  disabled?: boolean
}

export function FileDropZone({
  children,
  onFileDrop,
  acceptedTypes = ['application/pdf'],
  className = '',
  overlayClassName = '',
  disabled = false
}: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return

    dragCounter.current++
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return

    dragCounter.current--
    
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }, [disabled])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return

    setIsDragging(false)
    dragCounter.current = 0

    const droppedFiles = Array.from(e.dataTransfer.files)
    
    // Filter by accepted types if specified
    const validFiles = acceptedTypes.length > 0
      ? droppedFiles.filter(file => acceptedTypes.includes(file.type))
      : droppedFiles

    if (validFiles.length > 0) {
      onFileDrop(validFiles)
    }
  }, [disabled, acceptedTypes, onFileDrop])

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Drop overlay */}
      {isDragging && (
        <div 
          className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg backdrop-blur-sm ${overlayClassName}`}
        >
          <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-card/90 shadow-lg">
            <div className="p-3 rounded-full bg-primary/20">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-card-foreground">
                Drop your files here
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {acceptedTypes.includes('application/pdf') 
                  ? 'PDF files will be imported automatically'
                  : 'Release to upload files'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
