import { Link, Outlet, useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { ProjectRpcCtx } from '../lib/projectRpc'
import { Button } from '../ui/button'
import { AiLitellmPanel } from '../blocks/AiConnectPanels'
import { useSlots } from '../lib/slots'
import { useAccount, useProjectRun, useRecentProjects, useStartProjectRun, projectNameFrom, useNameTaken, type ProjectRun } from '../lib/onboarding'
import { ArrowRight, Bell, Check, CircleAlert, FolderOpen, Laptop, MessageCircle, Pin, ShieldCheck, User, X } from 'lucide-react'

// The onboarding layout: setup rail (Getting set up), Pikku button + bubble, side panels.
// Sign in, Choose AI and New project are children of this layout. Page content lives in the route files.

export type OnbState = 'empty' | 'normal' | 'loading' | 'error'
export type PanelId = 'chat' | 'updates' | 'workspace' | 'diff' | 'why' | 'local' | 'accounts' | 'keys' | 'litellm' | 'fabric'

export const OnbCtx = createContext<{
  st: OnbState
  go: () => void
  retry: () => void
  open: (id: PanelId | '') => void
  cancel: () => void
  idea: string
  setIdea: (v: string) => void
  taken?: string
  example: string
  run?: ProjectRun
}>(null as never)

const EXAMPLE = 'A booking page for my baking classes, where people pick a day and pay.'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keep: any = { search: true }


const SPRITE = `<symbol id="pikku-mark" viewBox="0 0 300 300" overflow="visible"><g transform="translate(0.000000,300.000000) scale(0.100000,-0.100000)" fill="currentColor"><path d="M1161 2505 c-181 -41 -356 -131 -456 -234 -21 -23 -44 -41 -50 -41 -26 0 -118 -53 -159 -90 -117 -108 -136 -299 -42 -430 23 -33 34 -60 38 -96 10 -108 90 -220 203 -285 73 -42 80 -35 10 11 -124 83 -191 175 -202 282 -4 33 -16 66 -39 100 -44 65 -57 117 -52 203 5 79 29 134 84 194 31 35 125 91 152 91 6 0 40 25 74 56 173 155 390 241 587 232 79 -3 105 -9 147 -30 61 -32 113 -87 143 -153 49 -109 34 -99 151 -106 119 -7 223 -35 321 -84 60 -30 207 -145 257 -200 129 -141 218 -328 247 -521 40 -267 -8 -482 -158 -702 -55 -80 -170 -193 -253 -248 -89 -59 -222 -104 -371 -125 -80 -11 -98 -10 -192 9 -275 55 -438 216 -458 452 -4 47 -1 83 11 124 18 62 15 89 -5 40 -18 -45 -23 -179 -9 -243 17 -79 65 -163 128 -226 66 -67 132 -105 242 -140 196 -64 473 -23 654 95 206 135 356 346 418 592 18 72 20 102 15 238 -6 183 -25 270 -91 407 -81 167 -168 276 -300 374 -152 114 -273 159 -445 168 l-114 6 -12 42 c-30 101 -116 198 -203 228 -67 23 -194 28 -271 10z"/><path d="M1140 2451 c-93 -23 -166 -52 -243 -97 -66 -39 -162 -110 -190 -142 -10 -11 -44 -30 -76 -42 -65 -24 -132 -83 -163 -144 -32 -62 -35 -157 -8 -228 12 -32 34 -70 49 -86 22 -21 28 -37 28 -68 0 -22 8 -65 18 -95 23 -71 115 -161 211 -209 38 -19 70 -35 72 -35 1 -1 -5 -16 -13 -33 -10 -19 -26 -33 -44 -37 -29 -6 -80 -53 -100 -92 -14 -27 -14 -68 -1 -94 10 -18 24 -19 290 -19 l279 0 -24 -36 c-73 -107 -63 -281 22 -412 47 -70 98 -112 191 -157 107 -52 193 -68 322 -62 166 8 312 61 440 160 199 153 331 394 355 652 7 80 -8 240 -31 330 -23 85 -119 276 -176 349 -58 72 -150 153 -195 173 -18 7 -33 17 -33 22 0 15 -98 66 -185 97 -71 26 -93 29 -202 29 l-122 0 -11 48 c-21 99 -75 174 -154 214 -68 35 -196 41 -306 14z m230 -42 c32 -7 65 -23 86 -42 38 -32 84 -113 84 -146 0 -13 18 -31 50 -52 28 -18 50 -36 50 -41 0 -14 -27 -9 -41 9 -26 30 -101 56 -164 57 -235 0 -360 -304 -199 -483 57 -64 127 -95 214 -95 69 0 105 13 171 65 22 17 39 41 42 59 7 33 23 40 31 13 7 -25 0 -58 -12 -56 -5 1 -12 -16 -15 -37 -19 -146 -186 -291 -367 -320 -87 -13 -316 -13 -382 1 -68 15 -171 67 -226 114 -43 38 -84 106 -96 160 l-7 30 51 -3 c51 -4 72 5 90 38 8 16 4 17 -36 12 -63 -7 -116 19 -154 76 -93 140 -20 334 129 344 28 2 45 -1 48 -9 3 -8 -4 -13 -19 -13 -12 -1 -43 -11 -68 -23 -108 -53 -118 -237 -17 -309 45 -32 124 -36 159 -9 72 57 61 284 -18 388 -28 37 -29 43 -8 43 9 0 41 23 72 51 85 77 255 156 384 178 76 12 110 12 168 0z m154 -283 c48 -20 107 -75 127 -121 26 -57 25 -154 -2 -207 -73 -143 -245 -171 -360 -58 -35 33 -51 59 -63 99 -20 67 -20 75 -1 137 38 126 182 199 299 150z m327 -15 c41 -11 106 -32 144 -48 83 -34 86 -46 26 -126 -37 -48 -151 -239 -151 -251 0 -4 13 -6 30 -6 25 0 33 7 51 43 31 61 161 248 176 254 18 7 125 -88 179 -158 24 -31 44 -60 44 -63 0 -3 -33 -24 -72 -48 -104 -61 -239 -161 -265 -197 -22 -29 -24 -30 -58 -16 -72 31 -197 5 -247 -51 -30 -35 -58 -108 -58 -156 0 -27 -4 -48 -10 -48 -16 0 -81 -62 -90 -86 -7 -17 -14 -20 -35 -17 -21 5 -24 9 -18 27 11 28 10 146 -1 168 -6 14 -2 20 17 27 68 26 153 133 187 236 19 58 24 96 27 219 3 159 -4 192 -57 266 -12 17 -18 34 -15 40 10 16 116 11 196 -9z m-1150 -61 c10 0 39 -53 39 -74 0 -8 -12 -28 -26 -45 -19 -23 -34 -31 -59 -31 -59 0 -96 76 -61 123 15 20 63 38 84 31 8 -2 18 -4 23 -4z m-72 -181 c20 -7 31 -18 31 -31 0 -10 5 -29 11 -40 6 -12 7 -24 2 -29 -12 -12 -93 67 -93 91 0 23 5 24 49 9z m149 -11 c27 -27 -2 -78 -44 -78 -22 0 -44 25 -44 49 0 33 63 54 88 29z m1645 -236 c14 -31 37 -99 51 -150 26 -99 25 -102 -24 -100 -53 3 -350 -58 -367 -75 -9 -10 8 -47 21 -47 8 0 33 7 57 16 55 19 172 40 268 48 l74 6 -6 -108 c-7 -123 -47 -299 -65 -290 -212 109 -320 145 -401 132 -38 -6 -39 -5 -46 27 -4 19 -11 39 -15 44 -4 6 -12 30 -17 55 -7 39 -12 45 -33 45 -24 0 -25 -2 -22 -66 l3 -67 -123 -4 c-97 -3 -130 -1 -155 12 -18 8 -33 19 -33 23 0 5 13 22 29 38 36 35 77 38 115 8 35 -27 42 -19 25 28 -11 27 -22 39 -38 41 -22 4 -23 7 -18 58 7 70 37 117 91 143 53 26 81 26 151 0 38 -14 65 -33 87 -60 29 -36 63 -57 74 -46 9 9 -23 72 -49 98 l-26 26 37 35 c56 54 191 146 281 194 32 17 42 8 74 -64z m-974 -354 c0 -29 -3 -70 -7 -92 -6 -34 -11 -40 -52 -53 -25 -8 -50 -20 -57 -25 -11 -9 -323 -20 -323 -12 0 16 31 72 48 88 21 18 74 19 114 2 16 -7 17 -4 12 23 -10 49 22 77 96 85 32 4 78 13 102 20 68 22 68 22 67 -36z m-272 24 c18 -12 -28 -65 -58 -67 -13 -1 -34 -4 -45 -8 -19 -7 -21 -4 -21 32 l0 40 46 4 c25 2 51 4 56 5 6 1 15 -2 22 -6z m-175 -16 c16 -1 28 -4 28 -8 0 -5 0 -14 0 -21 0 -8 -15 -34 -34 -58 -18 -24 -38 -57 -42 -72 l-9 -28 -113 -5 c-77 -3 -112 0 -112 7 0 39 69 99 115 99 21 0 75 -28 75 -39 0 -5 7 -11 14 -14 11 -4 13 -1 9 11 -9 23 -35 66 -46 73 -5 4 -6 21 -2 38 7 32 8 32 48 25 23 -4 54 -8 69 -8z m951 -194 c23 -53 22 -56 -13 -31 -22 17 -27 26 -19 35 6 7 8 18 4 24 -3 5 -2 10 2 10 5 0 17 -17 26 -38z m-367 -25 c72 -37 124 -124 124 -206 0 -45 -29 -109 -64 -141 -24 -22 -37 -25 -98 -25 -69 0 -71 1 -104 39 -44 51 -53 99 -28 145 37 70 103 79 146 20 15 -20 17 -30 9 -52 -13 -32 -45 -36 -61 -7 -14 27 -30 16 -30 -20 0 -23 7 -33 30 -45 38 -20 61 -13 95 26 40 48 35 92 -19 145 -37 37 -50 44 -83 44 -78 0 -153 -77 -153 -157 0 -47 18 -100 43 -125 14 -14 11 -20 -33 -66 l-49 -51 -38 76 c-64 130 -57 233 23 338 27 35 63 60 114 76 37 12 141 4 176 -14z m348 -64 c-16 -89 -38 -136 -84 -174 -25 -21 -62 -45 -83 -54 l-38 -16 17 26 c26 40 22 131 -9 199 l-26 56 115 0 115 0 -7 -37z m221 -8 c68 -17 186 -73 228 -107 l27 -23 -38 -63 c-38 -64 -157 -202 -173 -202 -5 0 -9 6 -9 13 0 20 -158 194 -199 219 -20 12 -37 22 -39 24 -6 4 43 139 53 146 17 12 87 9 150 -7z m-154 -244 c41 -38 93 -95 115 -128 l41 -60 -51 -29 c-47 -27 -181 -84 -197 -84 -4 0 -10 19 -14 43 -9 62 -34 135 -64 191 -25 47 -25 49 -7 60 11 6 36 26 55 43 20 18 39 33 42 33 3 0 39 -31 80 -69z m-213 -96 c28 -59 65 -194 57 -213 -3 -10 -32 -12 -117 -10 -106 3 -113 4 -111 23 1 11 4 57 6 103 l5 82 49 35 c64 45 82 42 111 -20z m-305 -10 c20 -8 50 -15 67 -15 l31 0 -6 -82 c-9 -116 -5 -112 -72 -83 -65 29 -154 86 -150 97 4 12 81 97 88 98 4 0 23 -7 42 -15z"/><path d="M1205 2355 c-157 -31 -283 -89 -375 -175 -25 -22 -36 -37 -25 -31 11 5 31 20 45 33 13 13 32 28 42 33 9 6 43 25 74 44 100 58 201 83 341 85 75 1 116 4 106 10 -27 15 -135 16 -208 1z"/><path d="M956 2147 c-12 -9 -17 -23 -14 -42 3 -28 6 -30 51 -33 55 -4 77 9 77 44 0 39 -76 59 -114 31z m73 -43 c-10 -13 -44 -11 -59 3 -10 9 22 20 46 15 20 -3 22 -7 13 -18z"/><path d="M944 1976 c-10 -43 1 -56 49 -56 50 0 70 16 65 52 -3 20 -9 23 -55 26 -49 3 -53 1 -59 -22z m70 -2 c26 -10 18 -24 -14 -24 -30 0 -41 14 -17 23 6 3 13 6 14 6 1 1 8 -2 17 -5z"/><path d="M958 1839 c-21 -12 -24 -49 -6 -67 17 -17 74 -15 92 4 22 21 20 40 -6 58 -26 18 -55 20 -80 5z m60 -37 c2 -7 -7 -12 -22 -12 -27 0 -35 15 -13 23 17 7 30 3 35 -11z"/><path d="M687 1603 c-12 -11 -8 -43 6 -44 44 -3 703 3 706 7 2 2 -4 13 -14 24 -17 19 -30 20 -355 20 -185 0 -340 -3 -343 -7z"/><path d="M1355 2085 c-57 -22 -84 -52 -101 -114 -19 -65 -11 -105 36 -170 42 -57 84 -81 143 -81 151 0 238 152 160 278 -50 81 -153 119 -238 87z m75 -45 c26 -26 26 -80 -1 -114 -45 -58 -139 -19 -139 57 0 67 92 105 140 57z m89 -4 c51 -27 82 -103 66 -163 -6 -24 -8 -26 -19 -13 -16 21 -52 40 -75 40 -15 0 -19 5 -15 23 3 12 8 32 11 44 3 12 0 36 -5 53 -12 34 -5 37 37 16z m-190 -162 c19 -10 44 -14 61 -11 26 6 28 4 27 -28 -1 -23 7 -43 23 -60 l23 -25 -27 0 c-15 0 -40 7 -55 14 -38 20 -91 82 -91 106 0 24 -1 24 39 4z m205 -20 c20 -20 20 -33 -1 -56 -29 -32 -93 -14 -93 27 0 21 29 45 55 45 13 0 31 -7 39 -16z"/><path d="M1700 2069 c0 -5 4 -9 9 -9 5 0 19 -21 32 -47 17 -37 24 -74 30 -163 l7 -115 -3 120 c-3 131 -23 210 -57 218 -10 3 -18 1 -18 -4z"/><path d="M1790 2058 c25 -6 83 -23 130 -38 46 -16 86 -27 88 -25 14 14 -191 76 -243 74 -11 -1 0 -6 25 -11z"/><path d="M2167 1868 c31 -29 71 -69 89 -88 19 -19 34 -30 34 -24 0 13 -155 164 -169 164 -5 0 16 -24 46 -52z"/><path d="M2070 1830 c-25 -25 -25 -35 0 -60 25 -25 42 -25 63 -2 29 32 20 59 -26 75 -11 4 -25 -1 -37 -13z m59 -14 c13 -16 6 -42 -14 -50 -21 -8 -57 26 -50 47 8 20 48 23 64 3z"/><path d="M1754 1625 c-7 -33 -10 -62 -9 -64 7 -6 26 81 23 102 -2 12 -8 -5 -14 -38z"/><path d="M2340 1637 c0 -7 4 -17 9 -22 12 -13 58 -132 66 -172 7 -33 25 -55 25 -30 0 36 -81 237 -95 237 -3 0 -5 -6 -5 -13z"/><path d="M1823 1395 c-41 -18 -73 -69 -72 -115 1 -19 3 -27 6 -17 2 9 9 14 15 11 6 -4 8 -2 4 4 -7 11 11 59 29 77 5 6 24 16 40 23 32 13 72 4 140 -32 38 -20 56 -20 30 0 -31 25 -118 64 -140 64 -11 -1 -35 -7 -52 -15z"/><path d="M2446 1230 c4 -36 8 -67 10 -69 9 -10 3 106 -6 119 -8 10 -9 -5 -4 -50z"/><path d="M1662 1138 c-19 -19 -14 -30 7 -18 11 5 35 10 53 10 25 0 29 3 18 10 -21 13 -64 12 -78 -2z"/><path d="M1378 1214 c-4 -3 -39 -12 -80 -20 l-73 -14 62 5 c57 4 149 32 112 34 -9 1 -18 -2 -21 -5z"/><path d="M1094 1140 c-32 -13 -43 -35 -13 -24 13 5 41 9 61 8 21 0 35 3 30 7 -13 13 -57 18 -78 9z"/><path d="M808 1148 c-16 -5 -28 -14 -28 -19 0 -5 12 -4 27 2 14 5 40 7 57 3 21 -4 28 -3 21 4 -17 16 -49 21 -77 10z"/><path d="M1405 1011 c-60 -28 -84 -53 -105 -115 -21 -57 -25 -146 -10 -181 6 -14 9 5 9 58 1 82 19 143 46 154 13 4 14 8 4 14 -8 4 -11 10 -9 12 3 2 27 18 54 35 37 24 52 29 62 21 15 -12 44 -5 44 11 0 16 -51 11 -95 -9z"/><path d="M1510 1025 c0 -2 20 -13 44 -23 88 -39 128 -137 88 -214 -11 -21 -16 -38 -10 -38 13 0 38 64 38 100 0 36 -23 96 -48 123 -27 30 -112 70 -112 52z"/><path d="M1459 870 l-24 -20 33 16 c18 9 42 14 53 11 10 -3 17 -1 13 4 -9 16 -51 10 -75 -11z"/><path d="M1795 960 c3 -14 8 -44 12 -67 3 -24 9 -43 14 -43 12 0 36 39 53 87 l14 41 -49 4 c-49 3 -50 2 -44 -22z"/><path d="M2022 908 c-25 -64 -24 -85 3 -45 20 32 35 82 26 95 -3 5 -17 -17 -29 -50z"/><path d="M2307 806 c-47 -55 -63 -83 -29 -53 20 18 86 107 80 107 -3 0 -25 -24 -51 -54z"/><path d="M1897 721 c-48 -37 -48 -52 2 -31 25 10 61 55 50 63 -2 2 -25 -12 -52 -32z"/><path d="M1701 628 c-28 -6 -40 -13 -33 -20 12 -12 78 0 93 18 14 17 6 17 -60 2z"/><path d="M2107 2292 c-22 -24 -21 -45 2 -66 23 -21 56 -14 72 16 9 16 6 24 -12 44 -27 29 -40 30 -62 6z"/><path d="M714 1251 c-18 -11 -44 -36 -60 -56 -36 -47 -40 -130 -9 -166 39 -43 73 -50 268 -48 100 1 193 6 207 10 14 4 -54 8 -155 8 -99 0 -199 0 -222 1 -61 0 -103 38 -103 92 0 67 33 119 106 165 11 6 15 12 9 12 -5 1 -24 -8 -41 -18z"/></g></symbol>`

const item =
  'flex w-full items-center gap-3 rounded-lg px-3 text-left font-semibold no-underline transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'
const iconBtn =
  'grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'


type Mood = 'calm' | 'ask' | 'worry' | 'busy'
const RING: Record<Mood, string> = {
  calm: 'border-success',
  ask: 'border-warning',
  worry: 'border-destructive',
  busy: 'border-info border-dashed animate-[spin_6s_linear_infinite]',
}

function Avatar({ mood, size = 'lg', ring = true }: { mood: Mood; size?: 'lg' | 'md' | 'sm' | 'xs'; ring?: boolean }) {
  const box = { lg: 'size-15', md: 'size-11', sm: 'size-9', xs: 'size-10' }[size]
  const mark = { lg: 'size-13.5', md: 'size-10', sm: 'size-8', xs: 'size-9.5' }[size]
  const ringBox = size === 'sm' ? '-inset-0.75 border-2' : '-inset-1 border-3'
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full ${box}`}>
      <svg viewBox="0 0 300 300" className={`overflow-visible ${mark}`} aria-hidden="true">
        <use href="#pikku-mark" />
      </svg>
      {ring ? <span className={`absolute rounded-full opacity-90 ${ringBox} ${RING[mood]}`} /> : null}
    </span>
  )
}

const STEPS = [
  ['/sign-in', 'Sign in', 'Pick how you want to use Fabric.'],
  ['/your-name', 'About you', 'So I know what to call you.'],
  ['/choose-ai', 'Choose your AI', 'The helper that does the building.'],
  ['/new-project', 'Start a project', 'Say what you want to make.'],
] as const

const MOODS: Record<OnbState, Mood> = { empty: 'calm', normal: 'calm', loading: 'busy', error: 'worry' }

type Msg = { kind: 'me' | 'pikku'; text: string }

export function OnboardingLayout() {
  const navigate = useNavigate()
  const q = useSearch({ strict: false }) as { look?: 'light' | 'dark'; panel?: PanelId; show?: string; pitch?: 'a' | 'b'; via?: string; run?: string }
  const panel: PanelId | '' = q.panel ?? ''
  const { Pitch } = useSlots()
  const path = useLocation({ select: (l) => l.pathname })
  const choose = path === '/choose-ai'
  const proj = path === '/new-project'
  const account = useAccount()
  const projects = useRecentProjects()
  const yourName = path === '/your-name'
  const fromQueries = (rs: UseQueryResult<unknown>[], ready: () => OnbState): OnbState =>
    rs.some((r) => r.isPending || (r.isError && r.isFetching)) ? 'loading' : rs.some((r) => r.isError) ? 'error' : ready()
  const run = useProjectRun(q.run)
  const base: OnbState = proj
    ? q.show === 'empty' || q.show === 'loading' || q.show === 'error'
      ? q.show
      : q.run
        ? run.isError || run.data?.status === 'failed' || run.data?.status === 'cancelled'
          ? 'error'
          : 'loading'
        : 'normal'
    : choose
      ? fromQueries([account], () => 'normal')
      : yourName
        ? fromQueries([account], () => 'normal')
        : fromQueries(account.data?.signIn ? [account, projects] : [account], () =>
            projects.data?.length ? 'normal' : 'empty',
          )
  const [override, setSt] = useState<OnbState | null>(null)
  useEffect(() => setSt(null), [base, path])
  const st = override ?? base
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const signIn = path === '/sign-in'
  const mood: Mood = signIn || choose || proj || yourName ? MOODS[st] : 'calm'
  const stepNow = Math.max(0, STEPS.findIndex(([to]) => to === path))

  const set = (patch: Record<string, unknown>) =>
    navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })
  const open = (id: PanelId | '') => set({ panel: id || undefined })
  const start = useStartProjectRun()
  const begin = (key?: string) => {
    setSt('loading')
    const name = projectNameFrom(idea)
    start.mutate(
      { name, idea: idea.trim(), ...(key ? { key } : {}) },
      { onSuccess: (r: { runId: string }) => set({ run: r.runId }), onError: () => setSt('error') },
    )
  }
  const done = proj && run.data?.status === 'completed'
  const invoke = useContext(ProjectRpcCtx)
  const made = usePikkuQuery('studio:listProjects', {}, { enabled: false })
  useEffect(() => {
    if (!done) return
    made.refetch().then((r) => {
      const made = (r.data as { projects: { key: string; slug: string; owner?: string }[] } | undefined)?.projects.find((p) => p.key === run.data?.key)
      const slug = made ? (made.owner ? `${made.owner}/${made.slug}` : made.slug) : undefined
      const land = (to: '/overview' | '/projects' | '/artifacts' | '/artifacts/$id', params?: { id: string }) =>
        navigate({ to, ...(params ? { params } : {}), search: ((prev: object) => ({ ...prev, run: undefined, project: slug })) as never })
      if (!slug) return land('/projects')
      const first = async () => {
        for (let i = 0; i < 90; i++) {
          const found = await invoke(run.data!.key!, 'console:listArtifacts').catch(() => null)
          if (found?.artifacts?.length) return found.artifacts[0].id as string
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
      first().then((id) => (id ? land('/artifacts/$id', { id }) : land('/artifacts')))
    })
  }, [done])
  const go = () => {
    if (proj) return begin()
    setSt('loading')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => navigate({ to: proj ? '/overview' : choose ? '/new-project' : yourName || account.data?.name ? '/choose-ai' : '/your-name', search: ((prev: object) => prev) as never }),
      proj ? 2600 : 1500,
    )
  }
  const cancel = () => {
    window.clearTimeout(timer.current)
    if (proj) set({ run: undefined })
    setSt('normal')
  }
  const [idea, setIdea] = useState('')
  const { taken, name: checked } = useNameTaken(idea)
  const fillExample = () => {
    setIdea(EXAMPLE)
    document.getElementById('idea')?.focus()
  }
  const retry = () => {
    if (!proj) {
      ;(choose ? [account] : yourName ? [account] : account.data?.signIn ? [account, projects] : [account]).forEach((r) => r.refetch())
      return
    }
    begin(run.data?.key)
  }

  const [pinned, setPinned] = useState(false)
  const [draft, setDraft] = useState('')
  const [bubbleDraft, setBubbleDraft] = useState('')
  const [extra, setExtra] = useState<Msg[]>([])
  const [bubbleOpen, setBubbleOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pinned) open('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  const say = (text: string) => {
    open('chat')
    setExtra((x) => [...x, { kind: 'me', text }])
    window.setTimeout(
      () =>
        setExtra((x) => [
          ...x,
          { kind: 'pikku', text: 'Good question. I will look into that and tell you what I find. I will not change anything until you say so.' },
        ]),
      1200,
    )
  }

  const panelTitle = { chat: 'Talk to Pikku', updates: 'Updates', workspace: 'This workspace', diff: 'The difference', why: 'Why this one', local: 'Set up on this computer', accounts: 'Connect an account', keys: 'Use your own key', litellm: 'Connect your LiteLLM', fabric: 'What Fabric adds' }
  const tabs = panel === 'chat' || panel === 'updates'
  const tab =
    '-mb-px inline-flex h-11.5 items-center gap-2 rounded-t-[10px] border-b-3 px-3.5 text-[15px] font-bold transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'

  const chips: [string, boolean, () => void][] = choose
    ? st === 'normal'
      ? [
          ['Connect my LiteLLM', false, () => open('litellm')],
        ]
      : st === 'empty'
        ? [['Use it', true, go]]
        : st === 'error'
          ? [
              ['Try again', true, retry],
              ['Connect my LiteLLM', false, () => open('litellm')],
            ]
          : []
    : proj
    ? st === 'normal' || st === 'empty'
      ? [['Give me an example', false, fillExample]]
      : st === 'error'
        ? [['Try again', true, retry]]
        : []
    : !signIn
    ? []
    : st === 'empty'
      ? [['Which should I pick?', false, () => open('diff')]]
      : st === 'error'
        ? [
            ['Use this computer', true, go],
            ['Try again', false, retry],
          ]
        : []

  return (
    <OnbCtx.Provider value={{ st: signIn || choose || proj || yourName ? st : 'empty', go, retry, open, cancel, idea, setIdea, taken: taken ? checked : undefined, example: EXAMPLE, run: run.data }}>
      <div
        className="@container/app fixed inset-0 z-0 overflow-hidden bg-background font-sans text-[16px] leading-[1.5] text-foreground antialiased"
      >
        <svg width={0} height={0} className="absolute" aria-hidden="true" dangerouslySetInnerHTML={{ __html: `<defs>${SPRITE}</defs>` }} />

        <div className="group/shell relative flex h-full overflow-hidden" data-open={panel !== '' ? '' : undefined}>
          {/* Rail */}
          <aside
            className="flex min-h-0 w-63 shrink-0 flex-col gap-5 overflow-auto border-r border-border bg-muted px-4 py-5 @min-[1700px]/app:w-70"
            aria-label="Getting set up"
          >
            <Link {...keep} to="/sign-in" className="flex items-center gap-2.5 px-2 py-1 font-heading text-[24px] font-extrabold tracking-[-0.02em] no-underline">
              <svg viewBox="0 0 100 100" fill="none" className="size-8 shrink-0" role="img" aria-label="Pikku Fabric">
                <g className="stroke-fabric" strokeWidth={17} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 48H63" />
                  <path d="M35.5 14V64C35.5 78 49 86 63 86" />
                  <path d="M23 22H77" />
                </g>
              </svg>
              Fabric
            </Link>
            <div>
              <div className="mb-1.5 px-3 text-[13px] font-semibold text-muted-foreground">Getting set up</div>
              <ol className="flex list-none flex-col px-2">
                {STEPS.map(([to, title, hint], i) => {
                  const state = i < stepNow ? 'done' : i === stepNow ? 'current' : 'upcoming'
                  const inner = (
                    <>
                      <span
                        className={`grid size-7 place-items-center rounded-full border-2 ${
                          state === 'done'
                            ? 'border-success bg-success text-primary-foreground'
                            : state === 'current'
                              ? 'border-primary bg-primary'
                              : 'border-dashed border-input text-muted-foreground'
                        }`}
                      >
                        {state === 'done' ? <Check className="size-4" strokeWidth={2.5} /> : null}
                        {state === 'current' ? <span className="size-2 rounded-full bg-primary-foreground" /> : null}
                      </span>
                      <div>
                        <div className={`text-[15px] leading-7 font-semibold ${state === 'upcoming' ? 'text-muted-foreground' : ''}`}>{title}</div>
                        {state === 'current' ? <div className="-mt-0.5 text-[14px] leading-[1.4] text-ink-2">{hint}</div> : null}
                      </div>
                    </>
                  )
                  const line = `relative grid grid-cols-[28px_1fr] gap-3 text-left no-underline ${
                    i < STEPS.length - 1
                      ? `pb-5.5 before:absolute before:top-7.5 before:bottom-0.5 before:left-3.25 before:w-0.5 before:rounded-sm ${state === 'done' ? 'before:bg-success' : 'before:bg-input'}`
                      : ''
                  }`
                  return (
                    <li key={to} aria-current={state === 'current' ? 'step' : undefined}>
                      {state === 'done' ? (
                        <Link {...keep} to={to} className={line}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={line}>{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
            <p className="px-3 text-[14px] leading-[1.45] text-ink-2 text-pretty">Build it like a website. Fabric keeps it running, and fixes it when something breaks.</p>
            <div className="mt-auto flex flex-col gap-2.5">
              <button
                type="button"
                aria-expanded={panel === 'workspace'}
                onClick={() => open('workspace')}
                className={`grid grid-cols-[auto_1fr] items-center gap-2.5 rounded-[14px] border border-border px-3 py-2.5 text-left transition-colors duration-140 hover:border-input hover:bg-secondary active:bg-surface-3 ${panel === 'workspace' ? 'border-input bg-secondary' : ''}`}
              >
                <Laptop className="size-5 text-muted-foreground" />
                <span className="min-w-0">
                  <b className="block text-[14px] leading-[1.3] font-bold">On this computer</b>
                  <small className="block text-[13px] leading-[1.3] text-muted-foreground">Only you can see your work</small>
                </span>
              </button>
            </div>
          </aside>

          {/* Page area */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col pr-0 transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] group-data-open/shell:pr-102 @min-[1700px]/app:group-data-open/shell:pr-120">
            <div className="min-h-0 flex-1 overflow-auto scroll-smooth px-12 pt-9 pb-7 @min-[1700px]/app:px-16 @min-[1700px]/app:pt-11 @min-[1700px]/app:pb-8">
              <Outlet />
            </div>
          </div>

          {/* Side panel: Chat, Updates, This workspace, The difference */}
          <aside
            aria-hidden={panel === ''}
            className={`absolute inset-y-0 right-0 z-5 flex w-102 flex-col border-l border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.35)] transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] @min-[1700px]/app:w-120 ${panel !== '' ? 'visible translate-x-0' : 'invisible translate-x-full'}`}
          >
            <div className="flex items-center gap-0.5 pt-4 pr-3 pb-2.5 pl-6">
              <h2 className="flex-1 text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{panel ? panelTitle[panel] : ''}</h2>
              <button
                type="button"
                aria-pressed={pinned}
                aria-label={pinned ? 'Unpin, let this panel close' : 'Keep this panel open'}
                onClick={() => setPinned((p) => !p)}
                className={`${iconBtn} ${pinned ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <Pin className={pinned ? 'size-5.5 fill-current' : 'size-5.5'} />
              </button>
              <button type="button" aria-label="Close panel" onClick={() => open('')} className={iconBtn}>
                <X className="size-5.5" />
              </button>
            </div>
            {tabs ? (
              <div className="flex gap-1 border-b border-border px-5" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'chat'}
                  onClick={() => open('chat')}
                  className={`${tab} ${panel === 'chat' ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}
                >
                  <MessageCircle className="size-4.5" />
                  Chat
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'updates'}
                  onClick={() => open('updates')}
                  className={`${tab} ${panel === 'updates' ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}
                >
                  <Bell className="size-4.5" />
                  Updates
                </button>
              </div>
            ) : null}

            {panel === 'diff' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
                  <Avatar mood="calm" size="md" />
                  <p className="font-heading text-[17px] leading-[1.4] text-pretty">I would start on this computer. You lose nothing by switching later.</p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-[18px] border border-border p-4.5">
                  <h3 className="text-[19px] font-bold tracking-[-0.012em] text-balance">Use on this computer</h3>
                  <p className="text-[15px] text-ink-2 text-pretty">
                    Your projects live here, and it works without the internet. Best for trying Fabric out. To put something online later, you will add a Fabric account.
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-[18px] border border-border p-4.5">
                  <h3 className="text-[19px] font-bold tracking-[-0.012em] text-balance">Fabric, when you want it</h3>
                  <p className="text-[15px] text-ink-2 text-pretty">
                    Fabric can host what you build and keep it running for you. It is optional, and you can read more about it any time.
                  </p>
                </div>
                <Button variant="default" size="compact" className="self-start" type="button" onClick={() => open('')}>
                  Got it
                </Button>
              </div>
            ) : null}

            {panel === 'why' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
                  <Avatar mood="calm" size="md" />
                  <p className="font-heading text-[17px] leading-[1.4] text-pretty">Here is my reasoning, in plain words.</p>
                </div>
                <ul className="flex list-none flex-col">
                  {[
                    ['It is quick', 'Answers come back in a few seconds.', 'bg-accent text-accent-foreground'],
                    ['Nothing to set up', 'No download and no extra account.', 'bg-success-soft text-success-foreground'],
                    ['No extra bill', 'It is part of your Fabric plan.', 'bg-indigo text-white'],
                  ].map(([t, d, tone]) => (
                    <li key={t} className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0">
                      <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                        <Check className="size-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <b className="block text-[16px]">{t}</b>
                        <small className="text-[14px] text-muted-foreground">{d}</small>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[14px] text-muted-foreground text-pretty">
                  The one on this computer is more private, but you would wait longer for each answer. If privacy matters most to you, say so and I will change my pick.
                </p>
                <Button variant="default" size="page" type="button" onClick={() => open('')}>
                  Okay, got it
                </Button>
              </div>
            ) : null}

            {panel === 'fabric' && Pitch ? (
              <Pitch href={account.data?.consoleUrl ?? 'https://pikkufabric.com'} variant={q.pitch} avatar={<Avatar mood="calm" size="md" />} onClose={() => open('')} />
            ) : null}

            {panel === 'litellm' ? <AiLitellmPanel intro={<Avatar mood="calm" size="md" />} via={q.via} onDone={() => { open(''); go() }} onBack={() => open('')} /> : null}

            {panel === 'chat' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b border-border bg-secondary px-6 py-3 text-[14px] text-ink-2">
                  <FolderOpen className="size-4.5 text-accent-foreground" />
                  <span className="font-semibold text-muted-foreground">About</span>
                  <b className="text-foreground">{proj ? 'Your new project' : choose ? 'Choosing your AI' : 'Signing in'}</b>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-auto px-6 py-5" tabIndex={0} aria-label="Chat" role="log">
                  <div className="self-center text-[13px] font-semibold text-muted-foreground">Today</div>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5">
                      <Avatar mood="calm" size="sm" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-2 text-[16px] leading-[1.5] text-foreground">
                      {proj ? (
                        <p className="text-pretty">Tell me what you want to make and I will start a first draft. Nothing goes online until you say so.</p>
                      ) : choose ? (
                        <p className="text-pretty">This is the step where you pick the AI that does the building. I would go with Fabric’s own, but it is your call.</p>
                      ) : (
                        <>
                          <p className="text-pretty">Hi, I am Pikku. I will be here the whole way, and I will always ask before I change anything that matters.</p>
                          <p className="text-pretty">Ask me anything about signing in, or about what happens next.</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ml-12 flex flex-wrap gap-2">
                    {(proj ? ['What can I build here?', 'How long does a first draft take?'] : choose ? ['Which one should I pick?', 'Is my key kept private?'] : ['Which one should I pick?', 'Can I switch later?']).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => say(s)}
                        className="inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-input bg-card px-4 text-[14px] font-bold transition-colors duration-140 hover:border-muted-foreground hover:bg-secondary active:bg-surface-3"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {extra.map((m, i) =>
                    m.kind === 'me' ? (
                      <div key={i} className="flex min-w-0 items-start justify-end gap-3">
                        <div className="flex max-w-5/6 min-w-0 flex-col gap-2 rounded-t-[18px] rounded-bl-[18px] rounded-br-[4px] bg-accent px-4 py-2.5 text-[16px] leading-[1.5] text-foreground">
                          {m.text}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5">
                          <Avatar mood="calm" size="sm" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-2 text-[16px] leading-[1.5] text-foreground">
                          <p className="text-pretty">{m.text}</p>
                        </div>
                      </div>
                    ),
                  )}
                  {proj && st === 'loading' ? (
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5">
                        <Avatar mood="busy" size="sm" />
                      </span>
                      <div className="flex gap-1.25 px-1 py-3.5" role="status" aria-label="Pikku is typing">
                        <i className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                        <i className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                        <i className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                      </div>
                    </div>
                  ) : null}
                  {proj && st === 'error' ? (
                    <div role="alert" className="ml-12 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-card border-[1.5px] border-destructive bg-destructive-soft px-4.5 py-4 text-foreground">
                      <CircleAlert className="size-7 text-destructive-foreground" />
                      <div>
                        <b className="mb-0.5 block text-[17px]">I could not send that.</b>
                        <p className="text-[15px] text-ink-2 text-pretty">Nothing was lost. Your message is still here.</p>
                      </div>
                      <div className="col-span-full flex flex-wrap gap-2">
                        <Button variant="bordered" size="compact" type="button" onClick={retry}>
                          Try again
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <form
                  className="flex items-end gap-2 border-t border-border bg-card px-5 pt-3.5 pb-4.5"
                  aria-label="Message Pikku"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!draft.trim()) return
                    say(draft.trim())
                    setDraft('')
                  }}
                >
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label="Message Pikku"
                    placeholder="Ask Pikku, or tell it something"
                    className="max-h-35 min-h-12 flex-1 resize-none rounded-[24px] border-[1.5px] border-input bg-background px-4.5 py-3 text-[15px] leading-[1.4] text-foreground hover:border-muted-foreground focus:border-primary focus:ring-4 focus:ring-accent focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label="Send"
                    disabled={!draft.trim()}
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors duration-140 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowRight className="size-5.5" />
                  </button>
                </form>
              </div>
            ) : null}

            {panel === 'updates' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                {proj && st === 'loading' ? (
                  <div role="status" aria-label="Loading updates" className="flex flex-col gap-3.5">
                    <div className="min-h-32.5 animate-pulse rounded-[22px] bg-secondary" />
                    <div className="min-h-32.5 animate-pulse rounded-[22px] bg-secondary" />
                  </div>
                ) : proj && st === 'error' ? (
                  <div role="alert" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-card border-[1.5px] border-destructive bg-destructive-soft px-6 py-5 text-foreground">
                    <CircleAlert className="size-7 text-destructive-foreground" />
                    <div>
                      <b className="mb-0.5 block text-[17px]">I could not load your updates.</b>
                      <p className="text-[15px] text-ink-2 text-pretty">Nothing is lost. If something urgent happens, I will still tell you.</p>
                    </div>
                    <div className="col-span-full flex flex-wrap gap-2">
                      <Button variant="bordered" size="compact" type="button" onClick={retry}>
                        Try again
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start gap-5 rounded-empty border-2 border-dashed border-input p-7 text-ink-2">
                    <span className="block size-21 shrink-0 overflow-hidden rounded-art">
                      <svg viewBox="0 0 40 40" className="block size-full" aria-hidden="true">
                        <rect width="40" height="40" fill="#D5E8EB" />
                        <circle cx="34" cy="6" r="22" fill="#BCD6DA" />
                        <circle cx="20" cy="20" r="8" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <b className="mb-1 block font-heading text-[20px] text-foreground">You are all caught up.</b>
                      <p className="max-w-ch56 text-[16px] text-pretty">Nothing needs you right now. If something does, I will put it here and tell you in plain words.</p>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {panel === 'workspace' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
                  <Avatar mood="calm" size="md" />
                  <p className="font-heading text-[17px] leading-[1.4] text-pretty">Here is where your work lives, who can see it, and what has happened. Nothing is hidden.</p>
                </div>
                <section className="flex flex-col gap-3.5">
                  <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">Where it runs</h3>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                      <Laptop className="size-5" />
                    </span>
                    <div>
                      <b className="block text-[16px]">This computer</b>
                      <p className="text-[15px] text-ink-2 text-pretty">Your work is stored here and works without the internet. It is not backed up anywhere else.</p>
                    </div>
                  </div>
                </section>
                <section className="flex flex-col gap-3.5">
                  <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">Who can see what</h3>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                      <User className="size-5" />
                    </span>
                    <div>
                      <b className="block text-[16px]">You</b>
                      <p className="text-[15px] text-ink-2 text-pretty">Everything, and you can change any of it.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <b className="block text-[16px]">Nobody else</b>
                      <p className="text-[15px] text-ink-2 text-pretty">Not your team and not Fabric, unless you choose to share something.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center">
                      <Avatar mood="calm" size="xs" ring={false} />
                    </span>
                    <div>
                      <b className="block text-[16px]">Pikku</b>
                      <p className="text-[15px] text-ink-2 text-pretty">Only what you ask it to work on. It asks before it changes anything that matters.</p>
                    </div>
                  </div>
                </section>
                <section className="flex flex-col gap-3.5">
                  <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">What has happened</h3>
                  <ol className="ml-1.5 flex flex-col border-l-2 border-border">
                    {(proj
                      ? [
                          ['Today, 9:40 am', 'Pikku asked to connect card payments. Waiting for you.'],
                          ['Today, 9:31 am', 'Pikku put together the first draft of Sunrise Bakery Classes.'],
                          ['Today, 9:29 am', 'You asked for a booking page for baking classes.'],
                          ['Today, 9:26 am', 'You chose your own AI.'],
                          ['Tuesday, 3:12 am', 'Pikku made one photo smaller so the home page opens quickly again.'],
                          ['Today, 9:02 am', 'You opened Fabric.'],
                        ]
                      : [
                          ['Today, 9:02 am', 'You opened Fabric.'],
                          ['Today, 9:03 am', 'Nothing has been changed on your behalf yet.'],
                        ]
                    ).map(([time, text]) => (
                      <li key={time + text} className="relative flex flex-col gap-0.5 pb-3.5 pl-4.5 text-[15px] text-foreground">
                        <span className="absolute top-1.5 -left-1.75 size-3 rounded-full border-2 border-input bg-card" />
                        <span className="text-[13px] font-semibold text-muted-foreground">{time}</span>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            ) : null}
          </aside>

          {/* Pikku button and speech bubble */}
          <div className="absolute right-6 bottom-6 z-4 flex flex-col items-end gap-4 transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] group-data-open/shell:right-114 @min-[1700px]/app:group-data-open/shell:right-126">
            {bubbleOpen ? (
              <section className="relative flex w-85 flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-[0_6px_20px_-4px_rgba(8,40,52,0.16),0_2px_4px_rgba(8,40,52,0.06)]" aria-label="Pikku" aria-live="polite">
                <span className="absolute -bottom-1.5 right-7 size-3 rotate-45 border-r border-b border-border bg-card" />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-muted-foreground">Pikku</span>
                  <button
                    type="button"
                    aria-label="Dismiss"
                    onClick={() => setBubbleOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="font-heading text-[17px] leading-[1.32] font-medium text-foreground text-pretty">
                  {choose ? (
                    st === 'normal' ? (
                      <>
                        I would go with <b>Fabric’s AI</b>. It is the quickest start, and you can change your mind any time.
                      </>
                    ) : st === 'empty' ? (
                      <>
                        <b>Only one choice for now</b>, and it is a good one.
                      </>
                    ) : st === 'loading' ? (
                      <>Looking at your computer. One moment.</>
                    ) : (
                      <>
                        I could not reach Fabric’s AI. <b>Want me to try again?</b>
                      </>
                    )
                  ) : proj ? (
                    st === 'normal' ? (
                      <>
                        Tell me what you are picturing. <b>Rough is fine.</b> I will ask before I build anything.
                      </>
                    ) : st === 'empty' ? (
                      <>
                        No ideas for you just yet, so <b>tell me in your own words.</b> I will ask before I build anything.
                      </>
                    ) : st === 'loading' ? (
                      <>
                        I am sketching your first draft. <b>I will tell you the moment it is ready.</b>
                      </>
                    ) : (
                      <>
                        That did not work, and <b>nothing was changed.</b> Your words are safe. Want me to try again?
                      </>
                    )
                  ) : !signIn ? (
                    <>
                      This step is <b>not built yet.</b> You can go back to the first step.
                    </>
                  ) : st === 'empty' ? (
                    <>
                      Hi, I am <b>Pikku.</b> I will be here the whole way, and I will always ask before I change anything that matters.
                    </>
                  ) : st === 'normal' ? (
                    <>
                      Welcome back, Maya. <b>Everything on this computer is just as you left it.</b>
                    </>
                  ) : st === 'loading' ? (
                    <>One moment. I am getting your workspace ready.</>
                  ) : (
                    <>
                      Something did not load. <b>Your work is safe</b>, and this computer works fine without it.
                    </>
                  )}
                </p>
                {chips.length ? (
                  <div className="flex flex-wrap gap-2">
                    {chips.map(([label, yes, run]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={run}
                        className={`inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] px-4 text-[14px] font-bold transition-colors duration-140 ${
                          yes
                            ? 'border-primary bg-primary text-primary-foreground hover:border-primary/90 hover:bg-primary/90'
                            : 'border-input bg-card hover:border-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <form
                  className="flex h-11 items-center gap-1 rounded-full border-[1.5px] border-input bg-background pr-1 pl-4 focus-within:border-primary"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!bubbleDraft.trim()) return
                    say(bubbleDraft.trim())
                    setBubbleDraft('')
                  }}
                >
                  <input
                    value={bubbleDraft}
                    onChange={(e) => setBubbleDraft(e.target.value)}
                    aria-label="Ask Pikku"
                    placeholder="Ask anything"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground focus:outline-none"
                  />
                  <button type="submit" aria-label="Send" className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowRight className="size-4.5" />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => open('chat')}
                  className="inline-flex items-center gap-2 self-start rounded-sm py-1 text-[14px] font-bold text-accent-foreground hover:underline"
                >
                  <MessageCircle className="size-4.5" />
                  Talk to Pikku
                </button>
              </section>
            ) : null}
            <button
              type="button"
              aria-label="Pikku, your helper"
              aria-expanded={bubbleOpen}
              onClick={() => setBubbleOpen(!bubbleOpen)}
              className="relative grid size-17 place-items-center rounded-full border border-border bg-card shadow-[0_6px_20px_-4px_rgba(8,40,52,0.16),0_2px_4px_rgba(8,40,52,0.06)] transition-transform duration-140 hover:-translate-y-0.5 active:scale-95"
            >
              <Avatar mood={mood} size="lg" />
            </button>
          </div>
        </div>
      </div>
    </OnbCtx.Provider>
  )
}
