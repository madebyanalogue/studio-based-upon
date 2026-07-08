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

export type EnquirySource = 'bucket' | 'moodboard'

export type EnquiryFormData = {
  name: string
  email: string
  telephone: string
  message: string
}

const defaultForm = (): EnquiryFormData => ({
  name: '',
  email: '',
  telephone: '',
  message: '',
})

export const useEnquiryForm = () => {
  const isOpen = useState('enquiry-open', () => false)
  const source = useState<EnquirySource | null>('enquiry-source', () => null)
  const previewItems = useState<EnquiryPreviewItem[]>('enquiry-preview', () => [])
  const compositionImage = useState<string | null>('enquiry-composition', () => null)
  const form = useState<EnquiryFormData>('enquiry-form', defaultForm)
  const isSubmitting = useState('enquiry-submitting', () => false)
  const isSuccess = useState('enquiry-success', () => false)
  const error = useState<string | null>('enquiry-error', () => null)

  const reset = () => {
    form.value = defaultForm()
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
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
    reset()
    previewItems.value = []
    compositionImage.value = null
    source.value = null
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
        body: {
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
        },
      })
      isSuccess.value = true
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
    form,
    isSubmitting,
    isSuccess,
    error,
    openFromBucket,
    openFromMoodboard,
    close,
    submit,
  }
}
