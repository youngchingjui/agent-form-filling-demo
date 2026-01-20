'use client'

import { create } from 'zustand'
import type { CertificationFormData } from './certification-form'
import { defaultFormValues } from './certification-form'

interface FormStore {
  formData: Partial<CertificationFormData>
  setFormData: (data: Partial<CertificationFormData>) => void
  updateField: <K extends keyof CertificationFormData>(
    field: K,
    value: CertificationFormData[K]
  ) => void
  resetForm: () => void
}

export const useFormStore = create<FormStore>((set) => ({
  formData: defaultFormValues,
  setFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  updateField: (field, value) =>
    set((state) => ({ formData: { ...state.formData, [field]: value } })),
  resetForm: () => set({ formData: defaultFormValues }),
}))
