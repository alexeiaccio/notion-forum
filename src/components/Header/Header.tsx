import { Menu, MenuButton, MenuItem, useMenuState } from 'ariakit'
import { format, parseISO } from 'date-fns'
import { signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { twMerge } from 'tailwind-merge'
import { trpc } from '~/utils/trpc'
import { Button, buttonStyles } from '../Button'

export function Header() {
  return (
    <header className="flex items-baseline justify-between gap-8 p-4 bg-slate-200">
      <h1 className="font-semibold">
        <Link href="/">Lorem</Link>
      </h1>
      <Breadcrumbs />
      <div className="ml-auto">
        <User />
      </div>
    </header>
  )
}

function Breadcrumbs() {
  const { query } = useRouter()
  const { data } = trpc.proxy.page.getBreadcrambs.useQuery(
    {
      breadcrambs: [
        query.page as string,
        ...((query.comments as string[]) || []),
      ],
    },
    {
      enabled: Boolean(query.page),
      keepPreviousData: true,
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: false,
    },
  )
  const page = data?.page

  return (
    <nav>
      <ul className="flex items-baseline gap-2 text-xs">
        <li>
          <Link href={`/page/${page?.id}`} passHref>
            <a className="flex items-baseline gap-1 text-slate-700 hover:underline">
              <span className="font-semibold">{page?.title}</span>
              {page?.created ? (
                <small>
                  {format(parseISO(page.created), 'HH:mm, yyyy-MM-dd')}
                </small>
              ) : null}
            </a>
          </Link>
        </li>
        {data?.comments?.map((comment, idx) => (
          <li key={comment?.id} className="flex items-baseline gap-1">
            <span>{'/'}</span>
            <Link
              href={`/page/${page?.id}/comments/${data?.comments
                ?.slice(0, idx + 1)
                .map((item) => item?.id)
                .join('/')}`}
              passHref
            >
              <a
                className={twMerge(
                  'flex items-baseline gap-1 text-slate-700 hover:underline',
                  idx === (data.comments?.length ?? 0) - 1 && 'text-slate-900',
                )}
              >
                <span className="font-medium">
                  {'@'}
                  {comment?.header?.author}
                </span>
                {comment?.header?.date ? (
                  <small>
                    {format(parseISO(comment.header.date), 'HH:mm, yyyy-MM-dd')}
                  </small>
                ) : null}
              </a>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function User() {
  const { data: session, isLoading } = trpc.proxy.auth.getSession.useQuery(
    undefined,
    { refetchOnWindowFocus: false, requestContext: { skipBatch: true } },
  )
  const menu = useMenuState({ gutter: 8, placement: 'bottom-end' })
  if (isLoading) return <Button>...</Button>
  if (!session?.user)
    return <Button onClick={() => signIn('email')}>Login</Button>
  return (
    <>
      <MenuButton
        state={menu}
        as={Button}
        className="[&[aria-expanded='true']]:ring-1 [&[aria-expanded='true']]:ring-slate-400"
      >
        {session?.user.name || 'Account'}
      </MenuButton>
      <Menu
        state={menu}
        className="grid gap-1 p-2 rounded-sm shadow-lg bg-slate-200 ring-1 ring-inset ring-slate-400 shadow-slate-400"
      >
        <Link href="/account" passHref>
          <MenuItem as="a" className={buttonStyles()}>
            Profile
          </MenuItem>
        </Link>
        <MenuItem as={Button} onClick={() => signOut()}>
          Logout
        </MenuItem>
      </Menu>
    </>
  )
}
