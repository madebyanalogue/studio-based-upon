import type { BucketItem } from './useBucket'
import type { MoodboardItem } from './useMoodboard'

export type EnquiryPreviewItem = {
  id: string
  title: string
  kind: 'image' | 'colour' | 'text'
  imageUrl?: string
  colour?: string
  text?: string
}

export type EnquirySource = 'bucket' | 'moodboard' | 'product' | 'enquire-page'

export type EnquiryAttachment = {
  id: string
  file: File
  name: string
  size: number
  type: string
}

export type EnquiryFormData = {
  name: string
  email: string
  telephone: string
  message: string
}

const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_FILES = 8
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const defaultForm = (): EnquiryFormData => ({
  name: '',
  email: '',
  telephone: '',
  message: '',
})

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

export const useEnquiryForm = () => {
  const isOpen = useState('enquiry-open', () => false)
  const source = useState<EnquirySource | null>('enquiry-source', () => null)
  const previewItems = useState<EnquiryPreviewItem[]>('enquiry-preview', () => [])
  const compositionImage = useState<string | null>('enquiry-composition', () => null)
  const attachments = useState<EnquiryAttachment[]>('enquiry-attachments', () => [])
  const form = useState<EnquiryFormData>('enquiry-form', defaultForm)
  const isSubmitting = useState('enquiry-submitting', () => false)
  const isSuccess = useState('enquiry-success', () => false)
  const error = useState<string | null>('enquiry-error', () => null)

  const reset = () => {
    form.value = defaultForm()
    attachments.value = []
    isSubmitting.value = false
    isSuccess.value = false
    error.value = null
  }

  const openFromBucket = (items: BucketItem[]) => {
    reset()
    source.value = 'bucket'
    compositionImage.value = null
    previewItems.value = items.map((item) => ({
      id: item.id,
      title: item.title,
      kind: 'image',
      imageUrl: item.imageUrl,
    }))
    if (!isOpen.value) lockPageScroll()
    isOpen.value = true
  }

  const openFromMoodboard = (
    placements: MoodboardItem[],
    screenshot: string | null = null,
  ) => {
    reset()
    source.value = 'moodboard'
    compositionImage.value = screenshot
    previewItems.value = placements.map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      imageUrl: item.imageUrl,
      colour: item.colour,
      text: item.text,
    }))
    if (!isOpen.value) lockPageScroll()
    isOpen.value = true
  }

  const openFromProduct = (product: {
    id: string
    title: string
    imageUrl?: string
    slug?: string
  }) => {
    reset()
    source.value = 'product'
    compositionImage.value = null
    previewItems.value = [
      {
        id: product.id,
        title: product.title,
        kind: 'image',
        imageUrl: product.imageUrl,
      },
    ]
    form.value.message = product.slug
      ? `Enquiry about ${product.title} (/materials-and-forms/${product.slug})`
      : `Enquiry about ${product.title}`
    if (!isOpen.value) lockPageScroll()
    isOpen.value = true
  }

  const close = () => {
    const wasOpen = isOpen.value
    isOpen.value = false
    reset()
    previewItems.value = []
    compositionImage.value = null
    source.value = null
    if (wasOpen) unlockPageScroll()
  }

  const addAttachments = (files: FileList | File[]) => {
    const next = [...attachments.value]
    const incoming = Array.from(files)

    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        error.value = `You can attach up to ${MAX_FILES} files.`
        break
      }
      if (file.size > MAX_FILE_BYTES) {
        error.value = `"${file.name}" is larger than 10MB.`
        continue
      }
      if (file.type && !ACCEPTED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
        error.value = `"${file.name}" is not a supported file type.`
        continue
      }
      if (next.some((item) => item.name === file.name && item.size === file.size)) continue

      next.push({
        id: `file-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
      })
    }

    attachments.value = next
  }

  const removeAttachment = (id: string) => {
    attachments.value = attachments.value.filter((item) => item.id !== id)
  }

  const buildPayload = async (extra: Record<string, unknown> = {}) => {
    const files = await Promise.all(
      attachments.value.map(async (item) => ({
        name: item.name,
        type: item.type,
        size: item.size,
        data: await fileToBase64(item.file),
      })),
    )

    return {
      ...form.value,
      source: source.value,
      items: previewItems.value.map((item) => ({
        id: item.id,
        title: item.title,
        kind: item.kind,
        imageUrl: item.imageUrl,
        colour: item.colour,
        text: item.text,
      })),
      hasComposition: Boolean(compositionImage.value),
      files,
      ...extra,
    }
  }

  const submit = async () => {
    if (!form.value.name.trim() || !form.value.email.trim()) {
      error.value = 'Please enter your name and email.'
      return
    }

    isSubmitting.value = true
    error.value = null

    try {
      await $fetch('/api/enquiry', {
        method: 'POST',
        body: await buildPayload(),
      })
      isSuccess.value = true
      attachments.value = []
    } catch {
      error.value = 'Something went wrong. Please try again or email us directly.'
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    isOpen,
    source,
    previewItems,
    compositionImage,
    attachments,
    form,
    isSubmitting,
    isSuccess,
    error,
    openFromBucket,
    openFromMoodboard,
    openFromProduct,
    addAttachments,
    removeAttachment,
    buildPayload,
    close,
    submit,
    MAX_FILES,
    MAX_FILE_BYTES,
  }
}
