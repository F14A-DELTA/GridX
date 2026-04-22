import { getStoredProfile } from '~/services/SupabaseAuth'

const OVERVIEW_PATH =
  '/energy/nem/?range=7d&interval=30m&view=discrete-time&group=Detailed'

export default function ({ redirect }) {
  if (process.server) {
    return
  }

  const profile = getStoredProfile()
  const isOrgMember = profile && profile.account_type === 'org_member'
  if (!isOrgMember) {
    return redirect(OVERVIEW_PATH)
  }
}
