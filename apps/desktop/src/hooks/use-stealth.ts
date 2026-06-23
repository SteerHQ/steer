import { useCallback, useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { createLogger } from "../utils/logger";

const logger = createLogger("Stealth");

const STEALTH_KEY = "stealth_enabled";

/** Горячие клавиши (глобальные, работают даже когда окно не в фокусе) */
export const HOTKEYS = {
  toggleStealth: "CommandOrControl+Shift+S",
  toggleVisibility: "CommandOrControl+Shift+H",
} as const;

/**
 * Управляет "скрытым" режимом для онлайн-собеседований:
 * - Content protection (Windows WDA_EXCLUDEFROMCAPTURE): окно не попадает
 *   в демонстрацию экрана и запись (Zoom, Google Meet, OBS), но видно пользователю.
 * - Глобальные горячие клавиши для управления без переключения на окно.
 */
export function useStealth() {
  const [stealthEnabled, setStealthEnabled] = useState(
    () => localStorage.getItem(STEALTH_KEY) !== "false", // по умолчанию включён
  );
  const [windowVisible, setWindowVisible] = useState(true);

  const applyStealth = useCallback(async (enabled: boolean) => {
    try {
      await getCurrentWindow().setContentProtected(enabled);
      logger.info(`Stealth ${enabled ? "enabled" : "disabled"}`);
    } catch (e) {
      logger.error(
        "Failed to set content protection",
        e instanceof Error ? e : new Error(String(e)),
      );
    }
  }, []);

  const toggleStealth = useCallback(() => {
    setStealthEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STEALTH_KEY, String(next));
      void applyStealth(next);
      return next;
    });
  }, [applyStealth]);

  const toggleVisibility = useCallback(async () => {
    try {
      const w = getCurrentWindow();
      const visible = await w.isVisible();
      if (visible) {
        await w.hide();
        setWindowVisible(false);
      } else {
        await w.show();
        await w.setFocus();
        setWindowVisible(true);
      }
    } catch (e) {
      logger.error(
        "Failed to toggle window visibility",
        e instanceof Error ? e : new Error(String(e)),
      );
    }
  }, []);

  // Применяем сохранённое состояние stealth при монтировании
  useEffect(() => {
    void applyStealth(stealthEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Регистрируем глобальные горячие клавиши
  useEffect(() => {
    const setup = async () => {
      try {
        await register(HOTKEYS.toggleStealth, (event) => {
          if (event.state === "Released") return;
          toggleStealth();
        });
        await register(HOTKEYS.toggleVisibility, (event) => {
          if (event.state === "Released") return;
          void toggleVisibility();
        });
        logger.info("Global shortcuts registered");
      } catch (e) {
        logger.warn("Failed to register global shortcuts", {
          error: String(e),
        });
      }
    };
    void setup();

    return () => {
      void unregister(HOTKEYS.toggleStealth).catch(() => {});
      void unregister(HOTKEYS.toggleVisibility).catch(() => {});
    };
  }, [toggleStealth, toggleVisibility]);

  return { stealthEnabled, toggleStealth, windowVisible, toggleVisibility };
}
