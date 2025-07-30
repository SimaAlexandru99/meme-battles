"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";

interface LanguageSelectorProps {
  className?: string;
}

const languages = [
  {
    code: "ro",
    name: "Romanian",
    flag: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAqAgMAAAB+aLVxAAAADFBMVEX/xwD/MUxAR6HftBuUpB+tAAAAIklEQVR4nO3IQQ0AAAjDwJrEJCqQRipjye55rA6NaDQS4wGHbvCvmCK8owAAAABJRU5ErkJggg==",
  },
  {
    code: "en",
    name: "English",
    flag: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAqCAMAAAA02K3QAAAAWlBMVEX/Q072/Pv/SlT/TVdAR5v1//719fY0O5X/Pkn23d73zdD3ur5RUZ79dHz6l5z8hYxdYql+g7r7l534ur79dXyeocpvdLLGx96QkcDm5+7X2OeztdT6vL75ztB+UBQWAAABWklEQVR4nMWU244CIQyGGe1MPVQXVhnmsPv+r7ktoLMmBkh64RfzhQvTvxQYAyVoV8WUC+yrcAFr5b8vpmw6VDFAy0KINCcHQLRDNtqf2/lWhjvwHkYL62ZaJ0y2fRUuIMFzaiIGR3cBGdt3NbjAOMI0if3DzoJ34Eak72sNnkGKH5JzvLgPQKYOSLxzD/NvlPhobCsQZwDP+OReZgB0v1zuZbYOZNPZPpurVfk3g62JbsHURPMp8FVw+RRITmGEVYz2WOXdDPBxD9oeE3lPlu9duoMeZD2l+9j2mHJ8vIbSBLADQmyi7Rglco1NrLIOsaEgraD9PdVI34MlBs8SnD2sCK1vgYOJxJYkmKLjmrfRUiDFL+FpO0u8mL6qcAGK35+3bhkiloCGAt4VmBq2UJzQ0DDETok5KTFq9krMTok5KtGfwqDEXJSYz3NVoj+FXok5KzEHJZ9/TH8d/0hgCrCvhAAAAABJRU5ErkJggg==",
  },
  {
    code: "fr",
    name: "French",
    flag: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAqBAMAAADxKEDRAAAAD1BMVEX29vZBR5v/S1bp4un9XmbrFIbUAAAAKklEQVR4nO3KMREAAAgDsd6hAAsoQAP+RTFRA6yfOUprWUwdEQgEAuEXFkXFYUspv5PMAAAAAElFTkSuQmCC",
  },
];

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [isSoundOn, setIsSoundOn] = useState(true);

  return (
    <div
      className={cn(
        "fixed bottom-5 right-8 z-50 flex items-end justify-center gap-4",
        className,
      )}
    >
      {/* Language Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <div className="flex items-center justify-center">
              <Image
                width={24}
                height={24}
                className="h-4 w-6 rounded-sm border border-white object-cover"
                src={selectedLanguage.flag}
                alt={selectedLanguage.name}
                title={selectedLanguage.name}
              />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {languages.map((language) => (
            <DropdownMenuItem
              key={language.code}
              onClick={() => setSelectedLanguage(language)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Image
                width={24}
                height={24}
                className="h-4 w-6 rounded-sm border border-white object-cover"
                src={language.flag}
                alt={language.name}
              />
              <span>{language.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Settings with Language and Sound */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setIsSoundOn(!isSoundOn)}
            >
              {isSoundOn ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-2">
              <p className="font-medium">Settings</p>
              <div className="flex items-center gap-2">
                <Settings className="h-3 w-3" />
                <span>Sound</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
