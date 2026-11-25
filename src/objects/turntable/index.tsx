import { Focusable } from '../../scene/Focusable'
import { RECORD_CONSOLE } from '../../content/layout'
import { RecordConsole, Turntable, deck } from './Turntable'

const { x, z, len, depth, h } = RECORD_CONSOLE

/**
 * The turntable corner (replaces the old CD player): record console against the left wall, front facing +x.
 * Only the deck and speakers are clickable; the console is furniture.
 */
export function TurntableCorner() {
  return (
    <group>
      <group position={[x, 0, z]} rotation-y={Math.PI / 2}>
        <RecordConsole len={len} depth={depth} h={h} />
      </group>
      <Focusable id="turntable" position={[x, h, z]} distance={1.15} dir={[1, 0.8, 0.45]} hoverLift={0} squash={false} onActivate={() => (deck.want = !deck.want)}>
        <group rotation-y={Math.PI / 2}>
          <Turntable />
        </group>
      </Focusable>
    </group>
  )
}
