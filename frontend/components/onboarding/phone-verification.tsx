"use client"

import type React from "react"

import { useState } from "react"
import { useOnboarding } from "@/providers/onboarding-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Shield, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Liste des pays avec leurs indicatifs téléphoniques
const countryCodes = [
  { code: "US", name: "United States", dial_code: "+1", flag: "🇺🇸", display: "USA" },
  { code: "GB", name: "United Kingdom", dial_code: "+44", flag: "🇬🇧", display: "UK" },
  { code: "CA", name: "Canada", dial_code: "+1", flag: "🇨🇦", display: "Canada" },
  { code: "AU", name: "Australia", dial_code: "+61", flag: "🇦🇺", display: "Australia" },
  { code: "FR", name: "France", dial_code: "+33", flag: "🇫🇷", display: "France" },
  { code: "DE", name: "Germany", dial_code: "+49", flag: "🇩🇪", display: "Germany" },
  { code: "JP", name: "Japan", dial_code: "+81", flag: "🇯🇵", display: "Japan" },
  { code: "CN", name: "China", dial_code: "+86", flag: "🇨🇳", display: "China" },
  { code: "IN", name: "India", dial_code: "+91", flag: "🇮🇳", display: "India" },
  { code: "BR", name: "Brazil", dial_code: "+55", flag: "🇧🇷", display: "Brazil" },
  { code: "MX", name: "Mexico", dial_code: "+52", flag: "🇲🇽", display: "Mexico" },
  { code: "ES", name: "Spain", dial_code: "+34", flag: "🇪🇸", display: "Spain" },
  { code: "IT", name: "Italy", dial_code: "+39", flag: "🇮🇹", display: "Italy" },
  { code: "NL", name: "Netherlands", dial_code: "+31", flag: "🇳🇱", display: "Netherlands" },
  { code: "SE", name: "Sweden", dial_code: "+46", flag: "🇸🇪", display: "Sweden" },
  { code: "CH", name: "Switzerland", dial_code: "+41", flag: "🇨🇭", display: "Switzerland" },
  { code: "SG", name: "Singapore", dial_code: "+65", flag: "🇸🇬", display: "Singapore" },
  { code: "KR", name: "South Korea", dial_code: "+82", flag: "🇰🇷", display: "S. Korea" },
  { code: "RU", name: "Russia", dial_code: "+7", flag: "🇷🇺", display: "Russia" },
  { code: "ZA", name: "South Africa", dial_code: "+27", flag: "🇿🇦", display: "S. Africa" },
]

export default function PhoneVerification() {
  const { formData, updateFormData } = useOnboarding()
  const [phoneNumber, setPhoneNumber] = useState(formData.phoneNumber || "")
  const [phoneCountry, setPhoneCountry] = useState(formData.phoneCountry || "US")

  // Fonction pour formater le numéro de téléphone
  const formatPhoneNumber = (value: string) => {
    // Supprimer tous les caractères non numériques
    const cleaned = value.replace(/\D/g, "")
    return cleaned
  }

  // Gérer le changement de numéro de téléphone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    updateFormData({ phoneNumber: formatted })
  }

  // Gérer le changement de pays
  const handleCountryChange = (value: string) => {
    setPhoneCountry(value)
    updateFormData({ phoneCountry: value })
  }

  // Obtenir l'indicatif téléphonique du pays sélectionné
  // const getDialCode = () => {
  //   const country = countryCodes.find((c) => c.code === phoneCountry)
  //   return country ? country.dial_code : "+1"
  // }

  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-md bg-accent-100 text-accent-500 mb-4">
          <Phone className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2 text-mono-900">Contact information</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Please provide your phone number to complete your account setup
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm max-w-md mx-auto">
        <CardContent className="p-6 space-y-6">
          {/* Email déjà fourni */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
            <div className="flex items-center bg-gray-50 p-3 rounded-md border border-gray-200">
              <span className="text-gray-700">{formData.email || "example@company.com"}</span>
              <Badge className="ml-auto bg-green-100 text-green-700 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </div>

          {/* Sélection du pays et saisie du numéro de téléphone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone number
            </label>
            <div className="flex space-x-2">
              <div className="w-[110px] flex-shrink-0">
                <Select value={phoneCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger className="h-10 w-[110px]">
                    <SelectValue>
                      {phoneCountry && (
                        <div className="flex items-center">
                          <span className="mr-1">{countryCodes.find((c) => c.code === phoneCountry)?.flag}</span>
                          <span>{countryCodes.find((c) => c.code === phoneCountry)?.dial_code}</span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] w-[200px]">
                    {countryCodes.map((country) => (
                      <SelectItem key={country.code} value={country.code} className="flex items-center py-1.5">
                        <div className="flex items-center">
                          <span className="mr-2">{country.flag}</span>
                          <span className="mr-1.5">{country.dial_code}</span>
                          <span className="text-xs text-gray-600 truncate max-w-[120px]">{country.display}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  id="phone"
                  type="tel"
                  className="h-10"
                  placeholder="Phone number"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                />
              </div>
            </div>
          </div>

          {/* Note de confidentialité */}
          <div className="flex items-start pt-4 border-t border-gray-200">
            <Shield className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              Your phone number will be used for important notifications and support. We respect your privacy and will
              never share your information with third parties.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
