import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, Platform, type View } from 'react-native';

const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Whether the soft keyboard is up (screens use it to drop the home-indicator / navigation-bar padding). */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener(SHOW, () => setVisible(true));
    const hide = Keyboard.addListener(HIDE, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/**
 * Android keyboard avoidance, one mechanism for the whole app. With edge-to-edge the system draws the window
 * behind the keyboard instead of resizing it, so nothing above the keyboard moves by itself. This measures how far
 * the keyboard reaches into `ref`'s own frame and returns that many pixels, to be used as bottom padding on that
 * view — the content then shrinks exactly as it would with adjustResize. Measuring the view's frame (not the
 * keyboard height) means a device that does resize the window ends up with a lift of 0, never a double correction.
 * iOS keeps its KeyboardAvoidingView; there this returns 0.
 */
export function useKeyboardLift(ref: RefObject<View | null>): number {
  const [lift, setLift] = useState(0);
  const keyboardTop = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const measure = useCallback(() => {
    const top = keyboardTop.current;
    if (top == null) return;
    ref.current?.measureInWindow((_x, y, _w, h) => {
      if (keyboardTop.current == null) return;
      setLift(Math.max(0, Math.round(y + h - top)));
    });
  }, [ref]);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      clear();
      measure();
      // The window may still be settling (a resize after the event): measure again and let the last one win.
      timers.current = [setTimeout(measure, 90), setTimeout(measure, 320)];
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
      clear();
      setLift(0);
    });
    return () => {
      show.remove();
      hide.remove();
      clear();
    };
  }, [measure]);
  return lift;
}
