export type EnquireAttachment = {
  id: string
  file: File
  name: string
  size: number
  type: string
}

export type EnquireDraft = {
  name: string
  email: string
  telephone: string
  message: string
}

const emptyDraft = (): EnquireDraft => ({
  name: '',
  email: '',
  telephone: '',
  message: '',
})

export const useEnquireSheet = () => {
  const isOpen = useState('enquire-sheet-open', () => false)
  const draft = useState<EnquireDraft>('enquire-sheet-draft', emptyDraft)
  const selectedIds = useState<string[]>('enquire-sheet-selections', () => [])
  const attachments = useState<EnquireAttachment[]>('enquire-sheet-files', () => [])
  const isSuccess = useState('enquire-sheet-success', () => false)
  const route = useRoute()

  const open = (message = '') => {
    if (route.path === '/enquire') return
    if (typeof message === 'string' && message) draft.value.message = message
    isOpen.value = true
  }

  const close = () => {
    isOpen.value = false
  }

  const clearDraft = () => {
    draft.value.name = ''
    draft.value.email = ''
    draft.value.telephone = ''
    draft.value.message = ''
    selectedIds.value = []
    attachments.value = []
    isSuccess.value = false
  }

  return { isOpen, draft, selectedIds, attachments, isSuccess, open, close, clearDraft }
}
