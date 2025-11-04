"use client"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface GameModeSelectorProps {
  selectedMode: string
  onSelectMode: (mode: string) => void
}

export function GameModeSelector({ selectedMode, onSelectMode }: GameModeSelectorProps) {
  return (
    <RadioGroup value={selectedMode} onValueChange={onSelectMode} className="grid grid-cols-3 gap-2">
      <div>
        <RadioGroupItem value="classic" id="classic" className="peer sr-only" />
        <Label
          htmlFor="classic"
          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-2 hover:bg-accent/20 hover:border-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200 min-h-[130px]"
        >
          <div className="mb-1.5 rounded-full bg-primary/20 p-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M2 15h20"></path>
              <path d="M2 7h20"></path>
              <path d="M6 7v8"></path>
              <path d="M18 7v8"></path>
            </svg>
          </div>
          <div className="font-medieval text-base mb-1">Classic</div>
          <p className="text-xs text-muted-foreground text-center leading-tight">Traditional rules</p>
        </Label>
      </div>

      <div>
        <RadioGroupItem value="frenzy" id="frenzy" className="peer sr-only" />
        <Label
          htmlFor="frenzy"
          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card p-2 hover:bg-accent/20 hover:border-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all duration-200 min-h-[130px]"
        >
          <div className="mb-1.5 rounded-full bg-accent/20 p-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-accent"
            >
              <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"></path>
              <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"></path>
              <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"></path>
            </svg>
          </div>
          <div className="font-medieval text-base mb-1">Frenzy</div>
          <p className="text-xs text-muted-foreground text-center leading-tight">Special powers</p>
        </Label>
      </div>

      {/* Add Tutorial Mode with Coming Soon label */}
      <div>
        <RadioGroupItem value="tutorial" id="tutorial" className="peer sr-only" disabled />
        <Label
          htmlFor="tutorial"
          className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-card/50 p-2 opacity-80 cursor-not-allowed relative min-h-[130px]"
        >
          <div className="mb-1.5 rounded-full bg-secondary/20 p-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-secondary"
            >
              <path d="M12 9V4"></path>
              <path d="M15.17 6 12 9.17 8.83 6"></path>
              <path d="m18 16-2 2-2-2"></path>
              <path d="M14 17v-4.17L12 11l-2 1.83V17"></path>
              <path d="m6 16 2 2 2-2"></path>
              <rect width="20" height="14" x="2" y="6" rx="2"></rect>
            </svg>
          </div>
          <div className="font-medieval text-base mb-1">Tutorial</div>
          <p className="text-xs text-muted-foreground text-center leading-tight">Guided lessons</p>
          <div className="absolute bottom-1 right-1 bg-secondary/80 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            Soon
          </div>
        </Label>
      </div>
    </RadioGroup>
  )
}

