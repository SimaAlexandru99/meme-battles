"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RiEditLine, RiDiceLine } from "react-icons/ri";
import { useState } from "react";
import { generateFunnyName } from "@/lib/utils";

export default function AvatarSetupCard() {
  const [nickname, setNickname] = useState("MemeLord");

  const generateRandomName = () => {
    const newName = generateFunnyName();
    setNickname(newName);
  };

  return (
    <Card className="relative w-64 h-[320px] bg-gradient-to-br from-slate-800 to-slate-700 border-0 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-105">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-lg"></div>
      <CardContent className="relative h-full flex flex-col items-center justify-center p-6 gap-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-purple-400/50 shadow-lg">
              <AvatarImage src="/memes/Angry doge.jpg" alt="Avatar" />
              <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                ML
              </AvatarFallback>
            </Avatar>
            <Button
              size="sm"
              className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-purple-600 hover:bg-purple-700"
            >
              <RiEditLine className="w-3 h-3" />
            </Button>
          </div>

          {/* Nickname Input */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-purple-200 text-center text-sm font-bangers font-medium tracking-wide">
              Choose your meme identity
            </p>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Meme name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 w-28 text-sm"
                maxLength={20}
              />
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-600 w-6 h-6 p-0"
                onClick={generateRandomName}
                title="Generate random funny name"
              >
                <RiDiceLine className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
