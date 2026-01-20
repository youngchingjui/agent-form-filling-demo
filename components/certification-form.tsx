'use client'

import { useFormStore } from '@/lib/form-store'
import {
  productCategories,
  certificationTypes,
  targetMarkets,
  urgencyLevels,
  getFormCompletionStatus,
} from '@/lib/certification-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Building2, Package, Wrench, ShieldCheck, CheckCircle2 } from 'lucide-react'

export function CertificationForm() {
  const { formData, updateField } = useFormStore()
  const status = getFormCompletionStatus(formData)

  return (
    <div className="flex flex-col gap-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Form Progress</CardTitle>
            <Badge variant={status.overall.percentage === 100 ? 'default' : 'secondary'}>
              {status.overall.percentage}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={status.overall.percentage} className="h-2" />
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Company:</span>
              <span className="font-medium">{status.sections.company.percentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium">{status.sections.product.percentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Technical:</span>
              <span className="font-medium">{status.sections.technical.percentage}%</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Certification:</span>
              <span className="font-medium">{status.sections.certification.percentage}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName || ''}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="Enter company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact Name *</Label>
              <Input
                id="contactName"
                value={formData.contactName || ''}
                onChange={(e) => updateField('contactName', e.target.value)}
                placeholder="Enter contact name"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Company Address *</Label>
            <Input
              id="companyAddress"
              value={formData.companyAddress || ''}
              onChange={(e) => updateField('companyAddress', e.target.value)}
              placeholder="Enter full address"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => updateField('contactEmail', e.target.value)}
                placeholder="email@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone *</Label>
              <Input
                id="contactPhone"
                type="tel"
                value={formData.contactPhone || ''}
                onChange={(e) => updateField('contactPhone', e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Product Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={formData.productName || ''}
                onChange={(e) => updateField('productName', e.target.value)}
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productModel">Model Number *</Label>
              <Input
                id="productModel"
                value={formData.productModel || ''}
                onChange={(e) => updateField('productModel', e.target.value)}
                placeholder="e.g., XYZ-1000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="productCategory">Product Category *</Label>
            <Select
              value={formData.productCategory}
              onValueChange={(value) => updateField('productCategory', value as typeof formData.productCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {productCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="productDescription">Product Description *</Label>
            <Textarea
              id="productDescription"
              value={formData.productDescription || ''}
              onChange={(e) => updateField('productDescription', e.target.value)}
              placeholder="Describe your product, its function, and key features"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="intendedUse">Intended Use *</Label>
            <Textarea
              id="intendedUse"
              value={formData.intendedUse || ''}
              onChange={(e) => updateField('intendedUse', e.target.value)}
              placeholder="Describe how the product will be used"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Technical Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5" />
            Technical Specifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voltage">Voltage Rating</Label>
              <Input
                id="voltage"
                value={formData.voltage || ''}
                onChange={(e) => updateField('voltage', e.target.value)}
                placeholder="e.g., 110-240V AC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="power">Power Consumption</Label>
              <Input
                id="power"
                value={formData.power || ''}
                onChange={(e) => updateField('power', e.target.value)}
                placeholder="e.g., 500W"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dimensions">Dimensions (LxWxH)</Label>
              <Input
                id="dimensions"
                value={formData.dimensions || ''}
                onChange={(e) => updateField('dimensions', e.target.value)}
                placeholder="e.g., 30x20x15 cm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight</Label>
              <Input
                id="weight"
                value={formData.weight || ''}
                onChange={(e) => updateField('weight', e.target.value)}
                placeholder="e.g., 2.5 kg"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="operatingTemperature">Operating Temperature Range</Label>
              <Input
                id="operatingTemperature"
                value={formData.operatingTemperature || ''}
                onChange={(e) => updateField('operatingTemperature', e.target.value)}
                placeholder="e.g., -10°C to 40°C"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materials">Primary Materials</Label>
              <Input
                id="materials"
                value={formData.materials || ''}
                onChange={(e) => updateField('materials', e.target.value)}
                placeholder="e.g., ABS plastic, aluminum"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Certification Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            Certification Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Required Certifications *</Label>
            <div className="grid gap-2 md:grid-cols-2">
              {certificationTypes.map((cert) => (
                <div key={cert.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cert-${cert.value}`}
                    checked={formData.certificationTypes?.includes(cert.value) || false}
                    onCheckedChange={(checked) => {
                      const current = formData.certificationTypes || []
                      if (checked) {
                        updateField('certificationTypes', [...current, cert.value])
                      } else {
                        updateField('certificationTypes', current.filter((c) => c !== cert.value))
                      }
                    }}
                  />
                  <Label htmlFor={`cert-${cert.value}`} className="text-sm font-normal">
                    {cert.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Target Markets *</Label>
            <div className="grid gap-2 md:grid-cols-3">
              {targetMarkets.map((market) => (
                <div key={market.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`market-${market.value}`}
                    checked={formData.targetMarkets?.includes(market.value) || false}
                    onCheckedChange={(checked) => {
                      const current = formData.targetMarkets || []
                      if (checked) {
                        updateField('targetMarkets', [...current, market.value])
                      } else {
                        updateField('targetMarkets', current.filter((m) => m !== market.value))
                      }
                    }}
                  />
                  <Label htmlFor={`market-${market.value}`} className="text-sm font-normal">
                    {market.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Project Urgency *</Label>
            <div className="grid gap-2 md:grid-cols-3">
              {urgencyLevels.map((level) => (
                <div
                  key={level.value}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    formData.urgency === level.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => updateField('urgency', level.value)}
                >
                  <div className="flex items-center gap-2">
                    {formData.urgency === level.value && (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium">{level.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{level.description}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="previousCertifications">Previous Certifications</Label>
            <Textarea
              id="previousCertifications"
              value={formData.previousCertifications || ''}
              onChange={(e) => updateField('previousCertifications', e.target.value)}
              placeholder="List any existing certifications the product holds"
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="technicalDocumentation"
                checked={formData.technicalDocumentation || false}
                onCheckedChange={(checked) => updateField('technicalDocumentation', !!checked)}
              />
              <Label htmlFor="technicalDocumentation" className="text-sm font-normal">
                Technical documentation is available
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sampleAvailable"
                checked={formData.sampleAvailable || false}
                onCheckedChange={(checked) => updateField('sampleAvailable', !!checked)}
              />
              <Label htmlFor="sampleAvailable" className="text-sm font-normal">
                Product sample is available for testing
              </Label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              value={formData.additionalNotes || ''}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
              placeholder="Any other information that might be relevant"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
