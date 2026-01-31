import { createFileRoute } from '@tanstack/react-router'
import { SignedIn, SignedOut, SignInButton, UserProfile } from '@clerk/clerk-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl mx-auto px-4 py-8">
        <SignedIn>
          <UserProfile />
        </SignedIn>
        <SignedOut>
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="text-lg font-medium text-foreground">Profile</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Sign in to view your profile.
            </div>
            <div className="mt-4">
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>
      </main>
    </div>
  )
}

