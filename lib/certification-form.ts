import { z } from 'zod'

export const certificationFormSchema = z.object({
  // Company Information
  companyName: z.string().min(1, 'Company name is required'),
  companyAddress: z.string().min(1, 'Company address is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: z.string().email('Valid email is required'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
  
  // Product Information
  productName: z.string().min(1, 'Product name is required'),
  productModel: z.string().min(1, 'Product model is required'),
  productDescription: z.string().min(1, 'Product description is required'),
  productCategory: z.enum(['electronics', 'machinery', 'medical', 'automotive', 'consumer', 'industrial', 'other']),
  intendedUse: z.string().min(1, 'Intended use is required'),
  
  // Technical Specifications
  voltage: z.string().optional(),
  power: z.string().optional(),
  dimensions: z.string().optional(),
  weight: z.string().optional(),
  operatingTemperature: z.string().optional(),
  materials: z.string().optional(),
  
  // Certification Requirements
  certificationTypes: z.array(z.enum(['CE', 'UL', 'FCC', 'RoHS', 'ISO9001', 'ISO14001', 'REACH', 'other'])).min(1, 'Select at least one certification'),
  targetMarkets: z.array(z.enum(['northAmerica', 'europe', 'asia', 'australia', 'global'])).min(1, 'Select at least one market'),
  urgency: z.enum(['standard', 'expedited', 'urgent']),
  
  // Additional Information
  previousCertifications: z.string().optional(),
  technicalDocumentation: z.boolean().default(false),
  sampleAvailable: z.boolean().default(false),
  additionalNotes: z.string().optional(),
})

export type CertificationFormData = z.infer<typeof certificationFormSchema>

export const defaultFormValues: Partial<CertificationFormData> = {
  productCategory: 'electronics',
  certificationTypes: [],
  targetMarkets: [],
  urgency: 'standard',
  technicalDocumentation: false,
  sampleAvailable: false,
}

export const productCategories = [
  { value: 'electronics', label: 'Electronics & Electrical' },
  { value: 'machinery', label: 'Machinery & Equipment' },
  { value: 'medical', label: 'Medical Devices' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'consumer', label: 'Consumer Products' },
  { value: 'industrial', label: 'Industrial Equipment' },
  { value: 'other', label: 'Other' },
] as const

export const certificationTypes = [
  { value: 'CE', label: 'CE Marking (Europe)' },
  { value: 'UL', label: 'UL Certification (USA/Canada)' },
  { value: 'FCC', label: 'FCC Compliance (USA)' },
  { value: 'RoHS', label: 'RoHS Compliance' },
  { value: 'ISO9001', label: 'ISO 9001 Quality Management' },
  { value: 'ISO14001', label: 'ISO 14001 Environmental' },
  { value: 'REACH', label: 'REACH Compliance (EU)' },
  { value: 'other', label: 'Other Certification' },
] as const

export const targetMarkets = [
  { value: 'northAmerica', label: 'North America' },
  { value: 'europe', label: 'Europe' },
  { value: 'asia', label: 'Asia Pacific' },
  { value: 'australia', label: 'Australia/NZ' },
  { value: 'global', label: 'Global' },
] as const

export const urgencyLevels = [
  { value: 'standard', label: 'Standard (4-6 weeks)', description: 'Regular processing timeline' },
  { value: 'expedited', label: 'Expedited (2-3 weeks)', description: 'Priority processing' },
  { value: 'urgent', label: 'Urgent (1-2 weeks)', description: 'Rush processing with additional fees' },
] as const

export function getFormCompletionStatus(data: Partial<CertificationFormData>) {
  const sections = {
    company: ['companyName', 'companyAddress', 'contactName', 'contactEmail', 'contactPhone'],
    product: ['productName', 'productModel', 'productDescription', 'productCategory', 'intendedUse'],
    technical: ['voltage', 'power', 'dimensions', 'weight'],
    certification: ['certificationTypes', 'targetMarkets', 'urgency'],
  }

  const status: Record<string, { completed: number; total: number; percentage: number }> = {}
  
  for (const [section, fields] of Object.entries(sections)) {
    const completed = fields.filter(field => {
      const value = data[field as keyof CertificationFormData]
      if (Array.isArray(value)) return value.length > 0
      return value !== undefined && value !== ''
    }).length
    
    status[section] = {
      completed,
      total: fields.length,
      percentage: Math.round((completed / fields.length) * 100),
    }
  }

  const allFields = Object.values(sections).flat()
  const totalCompleted = allFields.filter(field => {
    const value = data[field as keyof CertificationFormData]
    if (Array.isArray(value)) return value.length > 0
    return value !== undefined && value !== ''
  }).length

  return {
    sections: status,
    overall: {
      completed: totalCompleted,
      total: allFields.length,
      percentage: Math.round((totalCompleted / allFields.length) * 100),
    },
  }
}

export function getMissingRequiredFields(data: Partial<CertificationFormData>): string[] {
  const requiredFields = [
    'companyName',
    'companyAddress', 
    'contactName',
    'contactEmail',
    'contactPhone',
    'productName',
    'productModel',
    'productDescription',
    'productCategory',
    'intendedUse',
    'certificationTypes',
    'targetMarkets',
    'urgency',
  ]

  return requiredFields.filter(field => {
    const value = data[field as keyof CertificationFormData]
    if (Array.isArray(value)) return value.length === 0
    return value === undefined || value === ''
  })
}
