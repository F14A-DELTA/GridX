const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://zniepvuiqjhdornngynp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_8_8YFK2ZuEXFPv5SLBszVA_W6G7UJfl'

const SESSION_KEY = 'gridx_session'
const PROFILE_KEY = 'gridx_profile'

function jsonHeaders(prefer) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
  }
  if (typeof window !== 'undefined') {
    const profile = readProfile()
    const session = readSession()
    if (profile && profile.org_id) {
      headers['x-gridx-org-id'] = profile.org_id
    }
    if (profile && profile.role) {
      headers['x-gridx-role'] = profile.role
    }
    if (session && session.user && session.user.id) {
      headers['x-gridx-user-id'] = session.user.id
    }
  }
  if (prefer) {
    headers.Prefer = prefer
  }
  return headers
}

async function request(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: jsonHeaders(prefer),
    body: body ? JSON.stringify(body) : undefined
  })
  const isJson = (res.headers.get('content-type') || '').includes('application/json')
  const data = isJson ? await res.json() : null
  if (!res.ok) {
    const message = (data && (data.error_description || data.msg || data.message)) || 'Request failed'
    throw new Error(message)
  }
  return data
}

function saveSession(session) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

function readSession() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

function saveProfile(profile) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

function readProfile() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (_) {
    return null
  }
}

async function sha256(input) {
  const bytes = new TextEncoder().encode(input)
  const digest = await window.crypto.subtle.digest('SHA-256', bytes)
  const digestArray = Array.from(new Uint8Array(digest))
  return digestArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function signInWithPassword(email, password) {
  const rows = await request(
    `/rest/v1/gridx_users?email=eq.${encodeURIComponent(
      email.toLowerCase()
    )}&select=id,email,password_hash`,
    { method: 'GET' }
  )
  const user = rows && rows.length ? rows[0] : null
  if (!user) {
    throw new Error('Invalid email or password.')
  }
  const passwordHash = await sha256(password)
  if (passwordHash !== user.password_hash) {
    throw new Error('Invalid email or password.')
  }
  const session = {
    user: {
      id: user.id,
      email: user.email
    }
  }
  saveSession(session)
  return session
}

export async function signUpWithPassword({
  email,
  password,
  displayName,
  accountType,
  organisationName
}) {
  const normalizedEmail = email.toLowerCase()
  const existing = await request(
    `/rest/v1/gridx_users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email`,
    { method: 'GET' }
  )
  if (existing && existing.length) {
    throw new Error('An account with this email already exists. Please log in.')
  }

  const passwordHash = await sha256(password)
  const users = await request('/rest/v1/gridx_users?select=id,email', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      email: normalizedEmail,
      password_hash: passwordHash
    }
  })
  const user = users && users.length ? users[0] : null
  if (!user) {
    throw new Error('Could not create account.')
  }

  let orgId = null
  let role = 'member'
  if (accountType === 'org_member') {
    const orgs = await request('/rest/v1/gridx_organisations?select=id,name', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        name: organisationName || `${displayName || 'New'} Organisation`
      }
    })
    const org = orgs && orgs.length ? orgs[0] : null
    orgId = org && org.id ? org.id : null
    role = 'admin'
  }

  await request('/rest/v1/gridx_profiles?select=user_id', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      user_id: user.id,
      display_name: displayName || null,
      account_type: accountType || 'user',
      org_id: orgId,
      role
    }
  })

  const session = {
    user: {
      id: user.id,
      email: user.email
    }
  }
  saveSession(session)
  return session
}

export async function fetchProfile(userId) {
  const rows = await request(
    `/rest/v1/gridx_profiles?user_id=eq.${userId}&select=user_id,display_name,account_type,org_id,role`,
    { method: 'GET' }
  )
  const profile = rows && rows.length ? rows[0] : null
  if (profile) saveProfile(profile)
  return profile
}

export async function fetchOrganisation(orgId) {
  if (!orgId) return null
  const rows = await request(
    `/rest/v1/gridx_organisations?id=eq.${orgId}&select=id,name`,
    { method: 'GET' }
  )
  return rows && rows.length ? rows[0] : null
}

export async function createOrganisationMember({
  email,
  password,
  displayName
}) {
  const profile = readProfile()
  if (!profile || profile.account_type !== 'org_member' || profile.role !== 'admin') {
    throw new Error('Only organisation admins can add members.')
  }
  if (!profile.org_id) {
    throw new Error('Admin profile is missing organisation id.')
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.')
  }

  const existing = await request(
    `/rest/v1/gridx_users?email=eq.${encodeURIComponent(normalizedEmail)}&select=id,email`,
    { method: 'GET' }
  )
  if (existing && existing.length) {
    throw new Error('A user with this email already exists.')
  }

  const passwordHash = await sha256(password)
  const users = await request('/rest/v1/gridx_users?select=id,email', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      email: normalizedEmail,
      password_hash: passwordHash
    }
  })
  const user = users && users.length ? users[0] : null
  if (!user) {
    throw new Error('Could not create organisation member user.')
  }

  await request('/rest/v1/gridx_profiles?select=user_id', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      user_id: user.id,
      display_name: displayName || null,
      account_type: 'org_member',
      org_id: profile.org_id,
      role: 'member'
    }
  })

  return {
    userId: user.id,
    email: user.email
  }
}

export async function listOrganisationMembers() {
  const profile = readProfile()
  if (!profile || profile.account_type !== 'org_member' || !profile.org_id) {
    throw new Error('Organisation context not found.')
  }

  const profiles = await request(
    `/rest/v1/gridx_profiles?org_id=eq.${profile.org_id}&select=user_id,display_name,role,account_type`,
    { method: 'GET' }
  )
  if (!profiles || !profiles.length) {
    return []
  }

  const userIds = profiles.map((item) => item.user_id).filter(Boolean)
  if (!userIds.length) {
    return []
  }

  const users = await request(
    `/rest/v1/gridx_users?id=in.(${userIds.join(',')})&select=id,email`,
    { method: 'GET' }
  )
  const emailMap = (users || []).reduce((acc, user) => {
    acc[user.id] = user.email
    return acc
  }, {})

  return profiles.map((item) => ({
    userId: item.user_id,
    displayName: item.display_name || '',
    role: item.role || 'member',
    accountType: item.account_type || 'org_member',
    email: emailMap[item.user_id] || ''
  }))
}

export async function updateOrganisationMember({
  userId,
  displayName,
  role,
  password
}) {
  const profile = readProfile()
  if (!profile || profile.account_type !== 'org_member' || profile.role !== 'admin') {
    throw new Error('Only organisation admins can update members.')
  }
  if (!profile.org_id) {
    throw new Error('Admin profile is missing organisation id.')
  }
  if (!userId) {
    throw new Error('Member user id is required.')
  }
  const safeRole = role === 'admin' ? 'admin' : 'member'

  await request(
    `/rest/v1/gridx_profiles?user_id=eq.${userId}&org_id=eq.${profile.org_id}`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        display_name: displayName || null,
        role: safeRole
      }
    }
  )

  if (password && String(password).trim()) {
    const passwordHash = await sha256(String(password))
    await request(`/rest/v1/gridx_users?id=eq.${userId}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        password_hash: passwordHash
      }
    })
  }

  return true
}

export function getStoredSession() {
  return readSession()
}

export function getStoredProfile() {
  return readProfile()
}

export function signOut() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(SESSION_KEY)
  window.localStorage.removeItem(PROFILE_KEY)
}

