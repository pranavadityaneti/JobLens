// src/components/layout/avatar-menu.tsx
'use client'

import { LogOut, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { signOut } from '@/app/(app)/actions'

export function AvatarMenu({ phone }: { phone: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 transition-colors hover:bg-emerald-200"
      >
        <User className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-zinc-500">
            Signed in as
          </DropdownMenuLabel>
          <DropdownMenuLabel className="-mt-1 text-sm font-medium text-zinc-900">
            {phone}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOut}>
          <DropdownMenuItem
            render={<button type="submit" />}
            nativeButton
            className="w-full cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
