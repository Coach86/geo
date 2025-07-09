"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Shield } from "lucide-react";

// Liste des pays avec leurs indicatifs téléphoniques
const countryCodes = [
  {
    code: "US",
    name: "United States",
    dial_code: "+1",
    flag: "🇺🇸",
    display: "USA",
  },
  {
    code: "GB",
    name: "United Kingdom",
    dial_code: "+44",
    flag: "🇬🇧",
    display: "UK",
  },
  {
    code: "CA",
    name: "Canada",
    dial_code: "+1",
    flag: "🇨🇦",
    display: "Canada",
  },
  {
    code: "AU",
    name: "Australia",
    dial_code: "+61",
    flag: "🇦🇺",
    display: "Australia",
  },
  {
    code: "FR",
    name: "France",
    dial_code: "+33",
    flag: "🇫🇷",
    display: "France",
  },
  {
    code: "DE",
    name: "Germany",
    dial_code: "+49",
    flag: "🇩🇪",
    display: "Germany",
  },
  { code: "JP", name: "Japan", dial_code: "+81", flag: "🇯🇵", display: "Japan" },
  { code: "CN", name: "China", dial_code: "+86", flag: "🇨🇳", display: "China" },
  { code: "IN", name: "India", dial_code: "+91", flag: "🇮🇳", display: "India" },
  {
    code: "BR",
    name: "Brazil",
    dial_code: "+55",
    flag: "🇧🇷",
    display: "Brazil",
  },
  {
    code: "MX",
    name: "Mexico",
    dial_code: "+52",
    flag: "🇲🇽",
    display: "Mexico",
  },
  { code: "ES", name: "Spain", dial_code: "+34", flag: "🇪🇸", display: "Spain" },
  { code: "IT", name: "Italy", dial_code: "+39", flag: "🇮🇹", display: "Italy" },
  {
    code: "NL",
    name: "Netherlands",
    dial_code: "+31",
    flag: "🇳🇱",
    display: "Netherlands",
  },
  {
    code: "SE",
    name: "Sweden",
    dial_code: "+46",
    flag: "🇸🇪",
    display: "Sweden",
  },
  {
    code: "CH",
    name: "Switzerland",
    dial_code: "+41",
    flag: "🇨🇭",
    display: "Switzerland",
  },
  {
    code: "SG",
    name: "Singapore",
    dial_code: "+65",
    flag: "🇸🇬",
    display: "Singapore",
  },
  {
    code: "KR",
    name: "South Korea",
    dial_code: "+82",
    flag: "🇰🇷",
    display: "S. Korea",
  },
  {
    code: "RU",
    name: "Russia",
    dial_code: "+7",
    flag: "🇷🇺",
    display: "Russia",
  },
  {
    code: "ZA",
    name: "South Africa",
    dial_code: "+27",
    flag: "🇿🇦",
    display: "S. Africa",
  },
];

interface PhoneVerificationProps {
  initialData?: {
    phoneNumber: string;
    phoneCountry?: string;
  };
  onDataReady?: (data: { phoneNumber: string; phoneCountry: string }) => void;
}

export default function PhoneVerification({ initialData, onDataReady }: PhoneVerificationProps) {
  // Combined approach for country detection
  const getDefaultCountry = async () => {
    console.log('🌍 Starting country detection...');
    
    // 1. Check if initial data has a country
    if (initialData?.phoneCountry) {
      console.log('✅ Country from initial data:', initialData.phoneCountry);
      return initialData.phoneCountry;
    }
    
    // 2. Check localStorage for previously selected country
    try {
      const savedCountry = localStorage.getItem('preferredPhoneCountry');
      if (savedCountry && countryCodes.find(c => c.code === savedCountry)) {
        console.log('✅ Country from localStorage:', savedCountry);
        return savedCountry;
      }
    } catch (error) {
      console.log('⚠️ localStorage not available:', error);
    }
    
    // 3. Try IP geolocation with short timeout
    try {
      console.log('🔍 Trying IP geolocation...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout
      
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📍 IP geolocation response:', data);
        if (data.country_code && countryCodes.find(c => c.code === data.country_code)) {
          console.log('✅ Country from IP:', data.country_code);
          return data.country_code;
        }
      }
    } catch (error) {
      console.log('❌ IP geolocation failed:', error);
    }
    
    // 4. Try timezone detection
    try {
      console.log('🕐 Trying timezone detection...');
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('📍 Detected timezone:', timezone);
      
      // Timezone to country mapping
      const timezoneMap: Record<string, string> = {
        'America/New_York': 'US',
        'America/Chicago': 'US',
        'America/Denver': 'US',
        'America/Los_Angeles': 'US',
        'America/Toronto': 'CA',
        'America/Vancouver': 'CA',
        'America/Mexico_City': 'MX',
        'America/Sao_Paulo': 'BR',
        'Europe/London': 'GB',
        'Europe/Paris': 'FR',
        'Europe/Berlin': 'DE',
        'Europe/Rome': 'IT',
        'Europe/Madrid': 'ES',
        'Europe/Amsterdam': 'NL',
        'Europe/Stockholm': 'SE',
        'Europe/Zurich': 'CH',
        'Europe/Moscow': 'RU',
        'Asia/Tokyo': 'JP',
        'Asia/Shanghai': 'CN',
        'Asia/Hong_Kong': 'CN',
        'Asia/Seoul': 'KR',
        'Asia/Singapore': 'SG',
        'Asia/Kolkata': 'IN',
        'Australia/Sydney': 'AU',
        'Australia/Melbourne': 'AU',
        'Africa/Johannesburg': 'ZA',
      };
      
      // Check exact match
      if (timezoneMap[timezone]) {
        console.log('✅ Country from timezone (exact match):', timezoneMap[timezone]);
        return timezoneMap[timezone];
      }
      
      // Check by continent
      if (timezone.startsWith('America/')) {
        console.log('✅ Country from timezone (America):', 'US');
        return 'US';
      }
      if (timezone.startsWith('Europe/')) {
        console.log('✅ Country from timezone (Europe):', 'GB');
        return 'GB';
      }
      if (timezone.startsWith('Asia/')) {
        console.log('✅ Country from timezone (Asia):', 'CN');
        return 'CN';
      }
      if (timezone.startsWith('Australia/')) {
        console.log('✅ Country from timezone (Australia):', 'AU');
        return 'AU';
      }
    } catch (error) {
      console.log('❌ Timezone detection failed:', error);
    }
    
    // 5. Fall back to browser language
    try {
      console.log('🌐 Trying browser language detection...');
      const locale = navigator.language || navigator.languages?.[0] || 'en-US';
      console.log('📍 Browser locale:', locale);
      const localeParts = locale.split('-');
      
      if (localeParts.length > 1) {
        const countryCode = localeParts[localeParts.length - 1].toUpperCase();
        if (countryCodes.find(c => c.code === countryCode)) {
          console.log('✅ Country from locale:', countryCode);
          return countryCode;
        }
      }
      
      // Language to default country mapping
      const langDefaults: Record<string, string> = {
        'en': 'US',
        'es': 'ES',
        'fr': 'FR',
        'de': 'DE',
        'it': 'IT',
        'pt': 'BR',
        'zh': 'CN',
        'ja': 'JP',
        'ko': 'KR',
        'ru': 'RU',
        'nl': 'NL',
        'sv': 'SE',
      };
      
      const lang = localeParts[0];
      if (langDefaults[lang]) {
        console.log('✅ Country from language mapping:', langDefaults[lang]);
        return langDefaults[lang];
      }
    } catch (error) {
      console.log('❌ Browser language detection failed:', error);
    }
    
    // Default to US
    console.log('⚠️ All detection methods failed, defaulting to US');
    return 'US';
  };

  // Local state - no localStorage updates
  const [phoneNumber, setPhoneNumber] = useState(initialData?.phoneNumber || "");
  const [phoneCountry, setPhoneCountry] = useState("US"); // Default until detection completes
  const [isDetectingCountry, setIsDetectingCountry] = useState(true);
  
  // Run country detection on mount
  useEffect(() => {
    getDefaultCountry().then(detectedCountry => {
      console.log('🎯 Final detected country:', detectedCountry);
      setPhoneCountry(detectedCountry);
      setIsDetectingCountry(false);
    });
  }, []);

  // Notify parent when data changes (for validation purposes)
  useEffect(() => {
    if (onDataReady) {
      onDataReady({ phoneNumber, phoneCountry });
    }
  }, [phoneNumber, phoneCountry]); // Remove onDataReady from deps to avoid infinite loop

  // Fonction pour formater le numéro de téléphone
  const formatPhoneNumber = (value: string) => {
    // Supprimer tous les caractères non numériques
    const cleaned = value.replace(/\D/g, "");
    return cleaned;
  };

  // Gérer le changement de numéro de téléphone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  // Gérer le changement de pays
  const handleCountryChange = (value: string) => {
    setPhoneCountry(value);
    // Save user's preference for next time
    try {
      localStorage.setItem('preferredPhoneCountry', value);
    } catch (error) {
      // localStorage might not be available
    }
  };

  // Obtenir l'indicatif téléphonique du pays sélectionné
  const getDialCode = () => {
    const country = countryCodes.find((c) => c.code === phoneCountry);
    return country ? country.dial_code : "+1";
  };


  return (
    <div className="py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 text-mono-900">
          Finish your account setup
        </h1>
      </div>

      <Card className="border border-gray-200 shadow-sm max-w-md mx-auto">
        <CardContent className="p-6">
          {/* Sélection du pays et saisie du numéro de téléphone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Phone number
            </label>
            <div className="flex space-x-2">
              <div className="w-[110px] flex-shrink-0">
                <Select
                  value={phoneCountry}
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger className="h-10 w-[110px]">
                    <SelectValue>
                      {phoneCountry && (
                        <div className="flex items-center">
                          <span className="mr-1">
                            {
                              countryCodes.find((c) => c.code === phoneCountry)
                                ?.flag
                            }
                          </span>
                          <span>
                            {
                              countryCodes.find((c) => c.code === phoneCountry)
                                ?.dial_code
                            }
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] w-[200px]">
                    {countryCodes.map((country) => (
                      <SelectItem
                        key={country.code}
                        value={country.code}
                        className="flex items-center py-1.5"
                      >
                        <div className="flex items-center">
                          <span className="mr-2">{country.flag}</span>
                          <span className="mr-1.5">{country.dial_code}</span>
                          <span className="text-xs text-gray-600 truncate max-w-[120px]">
                            {country.display}
                          </span>
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
          <div className="flex items-start mt-4">
            <Shield className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              Your phone number will be used for important notifications, security, and support. We respect your privacy and will never share your  information with third parties.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
