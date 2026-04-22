import { getStoredProfile } from '~/services/SupabaseAuth'

const OVERVIEW_PATH =
  '/energy/nem/?range=7d&interval=30m&view=discrete-time&group=Detailed'

export default function ({ redirect }) {
  if (process.server) {
    return
  }

  const profile = getStoredProfile()
  const isOrgAdmin =
    profile &&
    profile.account_type === 'org_member' &&
    profile.role === 'admin'

  if (!isOrgAdmin) {
    return redirect(OVERVIEW_PATH)
  }
}
