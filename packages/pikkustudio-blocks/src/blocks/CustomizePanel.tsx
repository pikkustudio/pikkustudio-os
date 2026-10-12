import { CustomizeHost, type CustomizePanelShell } from '@pikku/theme-studio'
import { CUSTOMIZE_ENABLED, SlidersHorizontal, blobMotionItem, studioLabels } from '../lib/customize'
import type { CustomizeItem } from '@pikku/theme-studio'
import { SidePanel } from './SidePanel'

const shell: CustomizePanelShell = ({ title, sub, onClose, children }) => (
  <SidePanel icon={SlidersHorizontal} title={title as never} sub={sub as never} label={title as never} onClose={onClose}>
    {children as never}
  </SidePanel>
)

export function StudioCustomize({ extraItems = [] }: { extraItems?: CustomizeItem[] }) {
  return <CustomizeHost enabled={CUSTOMIZE_ENABLED} labels={studioLabels()} extraItems={[...extraItems, blobMotionItem]} shell={shell} />
}
