// src/utils/toast.ts
export type ToastType = "success" | "error" | "info" | "warning";

export function showToast(
  message: string,
  type: ToastType = "info",
  duration: number = 3000
): void {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  // Remove after duration
  setTimeout(() => {
    toast.classList.add("toast-hide");
    setTimeout(() => {
      if (toast.parentElement) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
}

export function showSuccessToast(message: string): void {
  showToast(message, "success");
}

export function showErrorToast(message: string): void {
  showToast(message, "error", 4000);
}

export function showInfoToast(message: string): void {
  showToast(message, "info");
}
