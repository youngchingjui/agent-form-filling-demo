import { generateText, tool } from 'ai'
import { z } from 'zod'
import {
  certificationFormSchema,
  getMissingRequiredFields,
  getFormCompletionStatus,
  type CertificationFormData,
} from '@/lib/certification-form'

export const maxDuration = 30

// Tool definitions for the reasoning agent
const tools = {
  updateFormField: tool({
    description: 'Update a specific field in the certification form with the extracted information',
    inputSchema: z.object({
      field: z.string().describe('The form field to update (e.g., companyName, productName, voltage)'),
      value: z.union([z.string(), z.array(z.string()), z.boolean()]).describe('The value to set'),
    }),
    execute: async ({ field, value }) => {
      return { success: true, field, value }
    },
  }),
  
  getFormStatus: tool({
    description: 'Get the current completion status of the certification form',
    inputSchema: z.object({}),
    execute: async () => {
      return { status: 'retrieved' }
    },
  }),
  
  getMissingFields: tool({
    description: 'Get a list of required fields that are still missing',
    inputSchema: z.object({}),
    execute: async () => {
      return { retrieved: true }
    },
  }),
  
  explainCertification: tool({
    description: 'Provide information about a specific certification type',
    inputSchema: z.object({
      certificationType: z.enum(['CE', 'UL', 'FCC', 'RoHS', 'ISO9001', 'ISO14001', 'REACH', 'other']),
    }),
    execute: async ({ certificationType }) => {
      const explanations: Record<string, string> = {
        CE: 'CE marking indicates conformity with health, safety, and environmental protection standards for products sold within the European Economic Area. It covers a wide range of product categories including electronics, machinery, and medical devices.',
        UL: 'UL Certification is a safety certification from Underwriters Laboratories, primarily recognized in North America. It tests products for safety hazards like fire, electric shock, and mechanical dangers.',
        FCC: 'FCC compliance is required for electronic devices sold in the United States that emit radio frequency energy. It ensures devices do not cause harmful interference to radio communications.',
        RoHS: 'RoHS (Restriction of Hazardous Substances) compliance restricts the use of specific hazardous materials found in electrical and electronic products, including lead, mercury, and cadmium.',
        ISO9001: 'ISO 9001 is an international standard for quality management systems. It helps organizations ensure they meet customer and regulatory requirements consistently.',
        ISO14001: 'ISO 14001 is an international standard for environmental management systems. It helps organizations minimize their environmental impact and comply with applicable laws and regulations.',
        REACH: 'REACH is a European Union regulation concerning the Registration, Evaluation, Authorization, and Restriction of Chemicals. It requires manufacturers to identify and manage risks linked to substances they manufacture or market.',
        other: 'There are many other certification types depending on your product and target markets. Please specify what type of certification you are interested in.',
      }
      return { explanation: explanations[certificationType] }
    },
  }),
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RequestBody {
  message: string
  currentFormData: Partial<CertificationFormData>
  conversationHistory: ConversationMessage[]
}

export async function POST(req: Request) {
  try {
    const { message, currentFormData, conversationHistory }: RequestBody = await req.json()

    // Get form status for context
    const formStatus = getFormCompletionStatus(currentFormData)
    const missingFields = getMissingRequiredFields(currentFormData)

    // Build the system prompt
    const systemPrompt = `You are a helpful AI assistant specializing in product certification. You help clients fill out certification forms by:
1. Extracting relevant information from their messages and updating the form
2. Answering questions about certifications (CE, UL, FCC, RoHS, ISO, REACH, etc.)
3. Guiding them on what information is still needed

Current form completion: ${formStatus.overall.percentage}%
Missing required fields: ${missingFields.join(', ') || 'None'}

Current form data:
${JSON.stringify(currentFormData, null, 2)}

IMPORTANT GUIDELINES:
- When the user provides information, extract ALL relevant details and update the appropriate form fields
- Be conversational and helpful, but stay focused on the certification process
- If the user asks about a certification type, use the explainCertification tool
- After extracting information, confirm what was captured and ask about missing fields
- Map user input to the correct form fields:
  * Company info: companyName, companyAddress, contactName, contactEmail, contactPhone
  * Product info: productName, productModel, productDescription, productCategory, intendedUse
  * Technical specs: voltage, power, dimensions, weight, operatingTemperature, materials
  * Certifications: certificationTypes (array), targetMarkets (array), urgency
  * Additional: previousCertifications, technicalDocumentation (boolean), sampleAvailable (boolean), additionalNotes

For certification types, valid values are: CE, UL, FCC, RoHS, ISO9001, ISO14001, REACH, other
For target markets, valid values are: northAmerica, europe, asia, australia, global
For urgency, valid values are: standard, expedited, urgent
For product categories, valid values are: electronics, machinery, medical, automotive, consumer, industrial, other`

    // Build messages array
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    // Call the reasoning model with tools
    const { text, toolCalls, toolResults } = await generateText({
      model: 'anthropic/claude-sonnet-4',
      messages,
      tools,
      maxOutputTokens: 1500,
    })

    // Process tool calls to extract form updates
    const formUpdates: Partial<CertificationFormData> = {}
    
    if (toolResults) {
      for (const result of toolResults) {
        if (result.toolName === 'updateFormField' && result.result) {
          const { field, value } = result.result as { field: string; value: unknown }
          // Validate that the field exists in the schema
          if (field in certificationFormSchema.shape) {
            // Handle array fields (certificationTypes, targetMarkets)
            if (field === 'certificationTypes' || field === 'targetMarkets') {
              const currentArray = (currentFormData[field as keyof CertificationFormData] as string[]) || []
              if (Array.isArray(value)) {
                formUpdates[field as keyof CertificationFormData] = [...new Set([...currentArray, ...value])] as unknown as CertificationFormData[keyof CertificationFormData]
              } else if (typeof value === 'string') {
                formUpdates[field as keyof CertificationFormData] = [...new Set([...currentArray, value])] as unknown as CertificationFormData[keyof CertificationFormData]
              }
            } else {
              formUpdates[field as keyof CertificationFormData] = value as CertificationFormData[keyof CertificationFormData]
            }
          }
        }
      }
    }

    return Response.json({
      response: text,
      formUpdates,
      toolCalls: toolCalls?.map(tc => ({
        name: tc.toolName,
        args: tc.args,
      })),
    })
  } catch (error) {
    console.error('Reasoning agent error:', error)
    return Response.json(
      { error: 'Failed to process request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
