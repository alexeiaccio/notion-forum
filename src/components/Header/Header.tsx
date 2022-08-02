import { Menu, MenuButton, MenuItem, useMenuState } from 'ariakit'
import { signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { trpc } from '~/utils/trpc'
import { Button } from '../Button'

export function Header() {
  return (
    <header className="flex items-center justify-between p-4 bg-slate-200">
      <h1 className="font-semibold">
        <Link href="/">Lorem</Link>
      </h1>
      <div className="ml-auto">
        <User />
      </div>
    </header>
  )
}

function User() {
  const { data: session, isLoading } = trpc.proxy.auth.getSession.useQuery()
  const menu = useMenuState({ gutter: 8, placement: 'bottom-end' })

  if (isLoading) return <Button>...</Button>
  if (!session?.user) return <Button onClick={() => signIn()}>Login</Button>
  return (
    <>
      <MenuButton
        state={menu}
        as={Button}
        className="[&[aria-expanded='true']]:ring-1 [&[aria-expanded='true']]:ring-slate-400"
      >
        {session.user.name}
      </MenuButton>
      <Menu
        state={menu}
        className="p-2 rounded-sm shadow-lg bg-slate-200 ring-1 ring-inset ring-slate-400 shadow-slate-400"
      >
        <MenuItem as={Button} onClick={() => signOut()}>
          Logout
        </MenuItem>
      </Menu>
    </>
  )
}
