"use client";

import type { UseEmblaCarouselType } from "embla-carousel-react";
import {
  ChevronRight,
  Download,
  Gamepad2,
  Share2,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const tutorialSteps = [
  {
    id: 1,
    title: "1. Gather your friends",
    description:
      "Invite your friends to a voice call (e.g. Discord) and create a lobby.",
    icon: Users,
    color: "bg-blue-500",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    id: 2,
    title: "2. Get your meme cards",
    description:
      "Each player receives seven random meme cards from our collection of 800+ memes.",
    icon: Gamepad2,
    color: "bg-green-500",
    gradient: "from-green-500 to-green-600",
  },
  {
    id: 3,
    title: "3. Match the situation",
    description:
      "An AI-generated situation appears. Choose your best meme card to match it!",
    icon: Star,
    color: "bg-yellow-500",
    gradient: "from-yellow-500 to-yellow-600",
  },
  {
    id: 4,
    title: "4. Vote for the best",
    description:
      "All players vote for their favorite meme submission (one vote per player).",
    icon: Trophy,
    color: "bg-purple-500",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    id: 5,
    title: "5. See the results",
    description:
      "The meme with the most votes wins the round and earns points for the player.",
    icon: Trophy,
    color: "bg-red-500",
    gradient: "from-red-500 to-red-600",
  },
  {
    id: 6,
    title: "6. Share the fun!",
    description:
      "Download and share your favorite meme combinations on social media.",
    icon: Share2,
    color: "bg-pink-500",
    gradient: "from-pink-500 to-pink-600",
  },
];

const faqItems = [
  {
    question: "What is Meme Battles?",
    answer:
      "Meme Battles is an online multiplayer party game where you compete to create the funniest meme matches. Each round, players get seven random meme cards and must choose one to match an AI-generated situation. Then everyone votes on their favorites, and the most entertaining memes score the most points. It's the perfect game for game nights, streams, or just having fun with friends!",
  },
  {
    question: "Do I need to register to play?",
    answer:
      "No, you can play Meme Battles without an account - but registering unlocks many cool features! Without an account, you won't be able to track your stats, unlock achievements, or create custom meme packs. Registration is free and only takes a minute - why miss out on all the fun?",
  },
  {
    question: "What game modes are available?",
    answer:
      "Meme Battles offers different ways to play: Normal mode is our classic experience where you get random meme cards and create your best matches. In Themed mode, each round has a specific theme to guide your creativity. Same Meme mode gives everyone the same situation, so it's all about who can come up with the most creative match. And if you just want to chill and practice your meme skills, try Relaxed mode where there are no points - just pure fun!",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "Currently, Meme Battles is available as a browser game on both desktop and mobile devices. But good news - we're working on a dedicated mobile app to make your meme-creating experience even better! Stay tuned to our social media channels for updates.",
  },
  {
    question: "How does the voting system work?",
    answer:
      "Each player can vote for only one meme per round, and players cannot vote for their own submission. The meme with the most votes wins the round. In case of a tie, the submission with the most unique voters wins. Players earn points based on their submission's vote count.",
  },
  {
    question: "What's next for Meme Battles?",
    answer:
      "We've got some exciting stuff in the works! We're currently working on a big Community Update that will make engaging with our community even more fun. Mobile apps are also planned, and we're building cool integrations with Discord and Twitch. But that's just the beginning - we've got lots more planned to make our little meme game even better!",
  },
];

export default function HowToPlay() {
  const [api, setApi] = React.useState<UseEmblaCarouselType[1]>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <section className="py-16 pb-32 bg-gradient-to-b from-background via-background to-muted/20 relative overflow-hidden mt-20 sm:mt-24 xl:mt-28">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />

      <div className="container mx-auto px-4 xl:px-8 relative z-10">
        {/* Tutorial Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Tutorial
            </span>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
            How to Play
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Learn the basics of Meme Battles and start creating hilarious meme
            combinations with your friends!
          </p>
        </div>

        {/* Tutorial Carousel */}
        <div className="max-w-6xl mx-auto mb-16 xl:mb-20">
          <Carousel
            setApi={setApi}
            className="w-full"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent>
              {tutorialSteps.map((step) => (
                <CarouselItem
                  key={step.id}
                  className="md:basis-1/2 lg:basis-1/3 xl:basis-1/3"
                >
                  <Card className="h-full border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group">
                    <CardHeader className="text-center">
                      <div
                        className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${step.gradient} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}
                      >
                        <step.icon className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors">
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-base leading-relaxed">
                        {step.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>

          {/* Carousel Indicators */}
          <div className="flex justify-center mt-8 gap-2">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === current - 1
                    ? "bg-primary scale-125"
                    : "bg-muted hover:bg-muted-foreground/50"
                }`}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto xl:mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                FAQ
              </span>
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-orange-500 via-red-500 to-red-600 bg-clip-text text-transparent">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Got questions? We&apos;ve got answers!
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4 ">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border rounded-lg px-6 hover:border-primary/50 transition-colors"
              >
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <span className="font-semibold text-lg">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground leading-relaxed pb-4">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Gamepad2 className="mr-2 h-5 w-5" />
                Play for Free!
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Download className="mr-2 h-5 w-5" />
                Download Memes
              </Button>
            </div>

            {/* Social Links */}
            <div className="flex justify-center gap-4 mt-8">
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 px-4 py-2"
              >
                Discord
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 px-4 py-2"
              >
                Twitter
              </Badge>
              <Badge
                variant="secondary"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 px-4 py-2"
              >
                Instagram
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
