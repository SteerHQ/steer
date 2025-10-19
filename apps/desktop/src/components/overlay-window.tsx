import { useEffect } from 'react';
import './overlay-window.css';

interface OverlayWindowProps {
  message: string;
  visible: boolean;
  autoHideDuration?: number;
  onHide?: () => void;
}

export const OverlayWindow: React.FC<OverlayWindowProps> = ({
  message,
  visible,
  autoHideDuration = 10000,
  onHide
}) => {
  useEffect(() => {
    if (visible && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        if (onHide) {
          onHide();
        }
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [visible, autoHideDuration, onHide]);

  if (!visible) {
    return null;
  }

  return (
    <div className="overlay-window">
      <div className="overlay-content">
        {message}
      </div>
    </div>
  );
};
