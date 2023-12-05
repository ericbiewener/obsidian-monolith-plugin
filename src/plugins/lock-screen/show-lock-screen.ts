import * as o from "obsidian";
import { getSettings } from "./settings/init-settings";
import { domService } from "../../dom-service";

let isVisible = false;

const hideLockScreen = (plugin: o.Plugin, container: HTMLElement) => {
  container.remove();
  isVisible = false;
  plugin.app.workspace.getActiveViewOfType(o.MarkdownView)?.editor.focus();
};

const showNoPasswordMsg = (plugin: o.Plugin, container: HTMLElement) => {
  const msg = container.createEl("div");
  Object.assign(msg.style, {
    fontSize: "2rem",
    height: "auto",
    width: "100%",
    textAlign: "center",
    margin: "auto",
  } as CSSStyleDeclaration);

  const txt = msg.createEl("p");
  txt.innerText =
    "No lock screen password has been set yet. Add one in the plugin settings.";
  const okBtn = msg.createEl("button");
  Object.assign(okBtn.style, {
    fontSize: "2rem",
  } as CSSStyleDeclaration);
  okBtn.innerText = "Ok";
  okBtn.addEventListener("click", () => {
    hideLockScreen(plugin, container);
  });
};

const showPasswordField = (plugin: o.Plugin, container: HTMLElement) => {
  const settings = getSettings();

  const checkPassword = (showError: boolean) => (e: Event) => {
    e.stopPropagation();
    e.preventDefault();

    if (input.value !== settings.password) {
      if (showError) {
        const { color } = input.style;
        input.style.color = "#C00";
        setTimeout(() => {
          input.style.color = color;
        }, 250);
      }
      return;
    }
    hideLockScreen(plugin, container);
  };

  const form = container.createEl("form");
  form.onsubmit = checkPassword(true);
  Object.assign(form.style, {
    margin: "auto",
    padding: "0 2rem",
  });

  const input = form.createEl("input");
  input.type = "password";

  Object.assign(input.style, {
    fontSize: "5rem",
    height: "auto",
    width: "100%",
    textAlign: "center",
    borderTop: "none",
    borderRight: "none",
    borderLeft: "none",
    boxShadow: "none",
  } as CSSStyleDeclaration);

  input.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    input.value = "";
    input.focus();
  });

  input.addEventListener("keyup", checkPassword(false));
  input.addEventListener("blur", () => input.focus());
  input.focus();
};

export const showLockScreen = (plugin: o.Plugin) => {
  if (isVisible) return;
  isVisible = true;

  const settings = getSettings();

  const container = domService.createEl(
    document.body,
    "div",
    "edb--lock-screen--container",
  );

  Object.assign(container.style, {
    background: "var(--background-secondary)",
    position: "fixed",
    top: "0",
    bottom: "0",
    left: "0",
    right: "0",
    zIndex: "999999999",
    display: "flex",
  } as CSSStyleDeclaration);

  if (settings.password) {
    showPasswordField(plugin, container);
  } else {
    showNoPasswordMsg(plugin, container);
  }
};
