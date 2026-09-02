import { SignInButton } from '@clerk/clerk-react'
import { LogIn, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SignInPromptProps {
  icon: LucideIcon
  title: string
  description: string
}

export function SignInPrompt({
  icon: Icon,
  title,
  description,
}: SignInPromptProps) {
  return (
    <div className="mx-auto flex min-h-[22rem] max-w-xl -translate-y-4 flex-col items-center justify-center p-6 text-center sm:min-h-[26rem] sm:-translate-y-5 sm:p-8">
      <div className="mx-auto mb-5 flex size-24 items-center justify-center text-foreground sm:mb-6 sm:size-32">
        <Icon className="size-16 sm:size-24" strokeWidth={1.6} />
      </div>
      <div className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </div>
      <div className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
        {description}
      </div>
      <SignInButton mode="modal">
        <Button className="mt-6 h-10 rounded-md px-5 text-sm">
          <LogIn className="mr-2 size-4" />
          Sign In
        </Button>
      </SignInButton>
    </div>
  )
}
