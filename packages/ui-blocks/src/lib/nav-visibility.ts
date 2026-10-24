import { navEntries, type NavArea, type NavScreen } from './nav-registry'
import { useCanSee } from './scopes'

/** An area's nav entries the viewer's scopes let them see. */
export const useNavEntries = (area: NavArea): NavScreen[] => {
  const canSee = useCanSee()
  return navEntries(area).filter((s) => canSee(s.scopes))
}
